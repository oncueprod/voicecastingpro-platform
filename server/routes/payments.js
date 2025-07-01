import express from 'express';
import dotenv from 'dotenv';
import paypal from '@paypal/checkout-server-sdk';
import { authenticateToken } from '../middleware/auth.js';
import { pool, transaction } from '../db/index.js';

dotenv.config();

const router = express.Router();

// Set up PayPal environment
let environment;
if (process.env.PAYPAL_ENVIRONMENT === 'production') {
  environment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
} else {
  environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
}
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Create escrow payment
router.post('/escrow', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, talentId, projectId, projectTitle, description } = req.body;
    const clientId = req.user.userId;
    
    if (!amount || !talentId || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify client is authorized
    if (req.user.type !== 'client') {
      return res.status(403).json({ error: 'Only clients can create escrow payments' });
    }
    
    // Calculate platform fee (5%)
    const platformFee = parseFloat((amount * 0.05).toFixed(2));
    const talentReceives = parseFloat((amount - platformFee).toFixed(2));
    
    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString()
        },
        description: `Escrow payment for project: ${projectTitle || projectId}`
      }],
      application_context: {
        brand_name: 'VoiceCastingPro',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      }
    });
    
    const order = await paypalClient.execute(request);
    
    // Get approval URL
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    
    // Create escrow record in database
    const escrowResult = await pool.query(
      `INSERT INTO escrow_transactions 
       (client_id, talent_id, project_title, amount, currency, status, paypal_order_id, description, platform_fee, talent_receives) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        clientId,
        talentId,
        projectTitle || `Project ${projectId}`,
        amount,
        currency,
        'pending',
        order.result.id,
        description || `Payment for ${projectTitle || `Project ${projectId}`}`,
        platformFee,
        talentReceives
      ]
    );
    
    const escrow = escrowResult.rows[0];
    
    res.status(201).json({
      escrow,
      approvalUrl,
      orderId: order.result.id
    });
    
  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ error: error.message || 'Failed to create escrow payment' });
  }
});

// Capture escrow payment (after PayPal approval)
router.post('/escrow/:id/capture', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'PayPal order ID is required' });
    }
    
    // Get escrow transaction
    const escrowResult = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = $1',
      [id]
    );
      
    if (escrowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow transaction not found' });
    }
    
    const escrow = escrowResult.rows[0];
    
    // Verify client is authorized
    if (escrow.client_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to capture this payment' });
    }
    
    // Capture PayPal payment
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const capture = await paypalClient.execute(request);
    
    // Update escrow status
    const updatedEscrowResult = await pool.query(
      `UPDATE escrow_transactions 
       SET status = 'funded', funded_at = NOW(), paypal_capture_id = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [
        capture.result.purchase_units[0].payments.captures[0].id,
        id
      ]
    );
      
    const updatedEscrow = updatedEscrowResult.rows[0];
    
    res.status(200).json({ escrow: updatedEscrow });
    
  } catch (error) {
    console.error('Capture escrow error:', error);
    res.status(500).json({ error: error.message || 'Failed to capture payment' });
  }
});

// Release escrow payment to talent
router.post('/escrow/:id/release', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { talentPayPalEmail } = req.body;
    
    if (!talentPayPalEmail) {
      return res.status(400).json({ error: 'Talent PayPal email is required' });
    }
    
    // Get escrow transaction
    const escrowResult = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = $1',
      [id]
    );
      
    if (escrowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow transaction not found' });
    }
    
    const escrow = escrowResult.rows[0];
    
    // Verify client is authorized
    if (escrow.client_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to release this payment' });
    }
    
    // Verify escrow is funded
    if (escrow.status !== 'funded') {
      return res.status(400).json({ error: 'Escrow must be funded before release' });
    }
    
    // In production, this would create a PayPal payout to the talent
    // For demo purposes, we'll just update the status
    
    // Update escrow status
    const updatedEscrowResult = await pool.query(
      `UPDATE escrow_transactions 
       SET status = 'released', released_at = NOW(), updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
      
    const updatedEscrow = updatedEscrowResult.rows[0];
    
    res.status(200).json({ escrow: updatedEscrow });
    
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({ error: error.message || 'Failed to release payment' });
  }
});

// Get escrow payments for user
router.get('/escrow', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.type;
    
    let query;
    if (userType === 'client') {
      query = {
        text: 'SELECT * FROM escrow_transactions WHERE client_id = $1 ORDER BY created_at DESC',
        values: [userId]
      };
    } else if (userType === 'talent') {
      query = {
        text: 'SELECT * FROM escrow_transactions WHERE talent_id = $1 ORDER BY created_at DESC',
        values: [userId]
      };
    } else {
      return res.status(403).json({ error: 'Unauthorized user type' });
    }
    
    const result = await pool.query(query);
    
    res.status(200).json({ escrows: result.rows });
    
  } catch (error) {
    console.error('Get escrow payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to get escrow payments' });
  }
});

// Create subscription
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can subscribe to plans' });
    }
    
    // Get plan details
    let planDetails;
    if (planId === 'P-MONTHLY-PLAN-ID') {
      planDetails = {
        name: 'Monthly Plan',
        price: 35,
        interval: 'MONTH'
      };
    } else if (planId === 'P-ANNUAL-PLAN-ID') {
      planDetails = {
        name: 'Annual Plan',
        price: 348,
        interval: 'YEAR'
      };
    } else {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    
    // Create PayPal subscription
    // In production, this would create a real PayPal subscription
    // For demo purposes, we'll create a mock subscription
    
    // Create subscription record in database
    const subscriptionResult = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, plan_type, status, amount, currency, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        userId,
        planId === 'P-MONTHLY-PLAN-ID' ? 'monthly' : 'annual',
        'pending',
        planDetails.price,
        'USD',
        new Date(Date.now() + (planId === 'P-MONTHLY-PLAN-ID' ? 30 : 365) * 24 * 60 * 60 * 1000)
      ]
    );
    
    const subscription = subscriptionResult.rows[0];
    
    // Generate mock approval URL
    const approvalUrl = `${process.env.FRONTEND_URL}/subscription/approve?id=${subscription.id}`;
    
    res.status(201).json({
      subscription,
      approvalUrl,
      id: subscription.id
    });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// Activate subscription (after PayPal approval)
router.post('/subscription/:id/activate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get subscription
    const subscriptionResult = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );
      
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Verify user is authorized
    if (subscription.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to activate this subscription' });
    }
    
    // Update subscription status
    const updatedSubscriptionResult = await pool.query(
      `UPDATE subscriptions 
       SET status = 'active', paypal_subscription_id = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [
        `PAYPAL_SUB_${Date.now()}`,
        id
      ]
    );
      
    const updatedSubscription = updatedSubscriptionResult.rows[0];
    
    res.status(200).json({ subscription: updatedSubscription });
    
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to activate subscription' });
  }
});

// Cancel subscription
router.post('/subscription/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get subscription
    const subscriptionResult = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );
      
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Verify user is authorized
    if (subscription.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this subscription' });
    }
    
    // Update subscription status
    const updatedSubscriptionResult = await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
      
    const updatedSubscription = updatedSubscriptionResult.rows[0];
    
    res.status(200).json({ subscription: updatedSubscription });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

export default router;