interface PayPalEscrowPayment {
  id: string;
  amount: number;
  currency: string;
  clientId: string;
  talentId: string;
  projectId: string;
  status: 'pending' | 'held' | 'released' | 'disputed' | 'refunded';
  createdAt: Date;
  releasedAt?: Date;
}

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
}

class PayPalEscrowService {
  private config: PayPalConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AYSq3RDGsmBLJE-otTkBtM-jBRd1TCQwFf9RGfwddNXWz0uFU9ztymylOhRS',
      clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || 'EGnHDxD_qRPdaLdZz8iCr8N7_MzF-YHPTkjs6NKYQvQSBngp4PTTVWkPZRbL',
      environment: (import.meta.env.VITE_PAYPAL_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox'
    };
    
    this.baseUrl = this.config.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  async getAccessToken(): Promise<string> {
    // In a real implementation, this would make an actual API call
    // For the sandbox tester, we'll simulate it
    console.log('Simulating PayPal access token request');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a mock access token
    return 'A21AAGfRPVWxl5S3puqZQVIFIXIY0LTJz1VlmYDjnY0m4Ks7TjKXGGq3yaryQPq_r7GEa_gFq1hoYgP0kdgqZKzPYqNUQ7rZQ';
  }

  async createEscrowPayment(
    amount: number,
    currency: string,
    clientId: string,
    talentId: string,
    projectId: string,
    description: string
  ): Promise<PayPalEscrowPayment> {
    console.log('Creating PayPal escrow payment', { amount, currency, clientId, talentId, projectId });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create a mock order ID
    const orderId = `PAYPAL_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Store escrow payment in local storage
    const escrowPayment: PayPalEscrowPayment = {
      id: orderId,
      amount,
      currency,
      clientId,
      talentId,
      projectId,
      status: 'pending',
      createdAt: new Date()
    };

    const existingPayments = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    existingPayments.push(escrowPayment);
    localStorage.setItem('escrow_payments', JSON.stringify(existingPayments));

    return escrowPayment;
  }

  async capturePayment(orderId: string): Promise<void> {
    console.log('Capturing PayPal payment', { orderId });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update payment status to held
    const payments = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    const paymentIndex = payments.findIndex((p: PayPalEscrowPayment) => p.id === orderId);
    
    if (paymentIndex !== -1) {
      payments[paymentIndex].status = 'held';
      localStorage.setItem('escrow_payments', JSON.stringify(payments));
    }
  }

  async releasePayment(orderId: string, talentPayPalEmail: string): Promise<void> {
    console.log('Releasing PayPal payment', { orderId, talentPayPalEmail });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update payment status to released
    const payments = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    const paymentIndex = payments.findIndex((p: PayPalEscrowPayment) => p.id === orderId);
    
    if (paymentIndex !== -1) {
      payments[paymentIndex].status = 'released';
      payments[paymentIndex].releasedAt = new Date();
      localStorage.setItem('escrow_payments', JSON.stringify(payments));
    }
  }

  getEscrowPayments(userId: string, userType: 'client' | 'talent'): PayPalEscrowPayment[] {
    const payments = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    return payments
      .filter((p: PayPalEscrowPayment) => 
        userType === 'client' ? p.clientId === userId : p.talentId === userId
      )
      .map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        releasedAt: p.releasedAt ? new Date(p.releasedAt) : undefined
      }));
  }
  
  // Create a subscription
  async createSubscription(
    planId: string,
    userId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ id: string; approvalUrl: string }> {
    console.log('Creating PayPal subscription', { planId, userId });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create a mock subscription ID
    const subscriptionId = `PAYPAL_SUB_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Create a mock approval URL
    const approvalUrl = `https://www.sandbox.paypal.com/webapps/billing/subscriptions/activate?ba_token=${subscriptionId}`;
    
    // Store subscription in local storage
    const subscription = {
      id: subscriptionId,
      planId,
      userId,
      status: 'APPROVAL_PENDING',
      createdAt: new Date(),
      returnUrl,
      cancelUrl
    };
    
    const existingSubscriptions = JSON.parse(localStorage.getItem('paypal_subscriptions') || '[]');
    existingSubscriptions.push(subscription);
    localStorage.setItem('paypal_subscriptions', JSON.stringify(existingSubscriptions));
    
    return {
      id: subscriptionId,
      approvalUrl
    };
  }
  
  // Activate a subscription (simulate user approval)
  async activateSubscription(subscriptionId: string): Promise<void> {
    console.log('Activating PayPal subscription', { subscriptionId });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update subscription status
    const subscriptions = JSON.parse(localStorage.getItem('paypal_subscriptions') || '[]');
    const subscriptionIndex = subscriptions.findIndex((s: any) => s.id === subscriptionId);
    
    if (subscriptionIndex !== -1) {
      subscriptions[subscriptionIndex].status = 'ACTIVE';
      subscriptions[subscriptionIndex].activatedAt = new Date();
      localStorage.setItem('paypal_subscriptions', JSON.stringify(subscriptions));
    }
  }
  
  // Cancel a subscription
  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    console.log('Canceling PayPal subscription', { subscriptionId, reason });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update subscription status
    const subscriptions = JSON.parse(localStorage.getItem('paypal_subscriptions') || '[]');
    const subscriptionIndex = subscriptions.findIndex((s: any) => s.id === subscriptionId);
    
    if (subscriptionIndex !== -1) {
      subscriptions[subscriptionIndex].status = 'CANCELLED';
      subscriptions[subscriptionIndex].cancelledAt = new Date();
      subscriptions[subscriptionIndex].cancelReason = reason;
      localStorage.setItem('paypal_subscriptions', JSON.stringify(subscriptions));
    }
  }
}

export const paypalEscrowService = new PayPalEscrowService();
export type { PayPalEscrowPayment };