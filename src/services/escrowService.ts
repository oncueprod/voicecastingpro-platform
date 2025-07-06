interface EscrowPayment {
  id: string;
  amount: number;
  currency: string;
  clientId: string;
  talentId: string;
  projectId: string;
  projectTitle: string;
  projectTitle: string;
  description: string;
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  paypalOrderId?: string;
  createdAt: Date;
  fundedAt?: Date;
  releasedAt?: Date;
  platformFee: number;
  talentReceives: number;
  platformFee: number;
  talentReceives: number;
}

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
  escrowEmail: string;
}

class EscrowService {
  private config: PayPalConfig;
  private baseUrl: string;
  private storageKey = 'escrow_payments';

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || '',
      environment: (import.meta.env.VITE_PAYPAL_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
      escrowEmail: import.meta.env.VITE_PAYPAL_ESCROW_EMAIL || 'escrow@voicecastingpro.com'
    };
    
    this.baseUrl = this.config.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  async createEscrowPayment(
    amount: number,
    currency: string,
    clientId: string,
    talentId: string,
    projectId: string,
    projectTitle: string,
    projectTitle: string,
    description: string
  ): Promise<EscrowPayment> {
    const platformFee = amount * 0.05; // 5% platform fee
    const talentReceives = amount - platformFee;

    const platformFee = amount * 0.05; // 5% platform fee
    const talentReceives = amount - platformFee;

    const escrowPayment: EscrowPayment = {
      id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency,
      clientId,
      talentId,
      projectId,
      projectTitle,
      projectTitle,
      description,
      status: 'pending',
      createdAt: new Date(),
      platformFee,
      talentReceives
      platformFee,
      talentReceives
    };

    try {
      // In production, this would create a PayPal order
      const paypalOrder = await this.createPayPalOrder(escrowPayment);
      escrowPayment.paypalOrderId = paypalOrder.id;
      
      // Store escrow payment
      const existingPayments = this.getEscrowPayments();
      existingPayments.push(escrowPayment);
      localStorage.setItem(this.storageKey, JSON.stringify(existingPayments));

      return escrowPayment;
    } catch (error) {
      throw new Error(`Failed to create escrow payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createPayPalOrder(escrow: EscrowPayment): Promise<any> {
    // Simulate PayPal order creation for demo
    // In production, this would make actual PayPal API calls
    return {
      id: `PAYPAL_ORDER_${Date.now()}`,
      status: 'CREATED',
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_TOKEN_${Date.now()}`,
          rel: 'approve',
          method: 'GET'
        }
      ]
    };
  }

  async fundEscrow(escrowId: string): Promise<void> {
    const payments = this.getEscrowPayments();
    const paymentIndex = payments.findIndex(p => p.id === escrowId);
    
    if (paymentIndex === -1) {
      throw new Error('Escrow payment not found');
    }

    // Simulate PayPal payment capture
    payments[paymentIndex].status = 'funded';
    payments[paymentIndex].fundedAt = new Date();
    
    localStorage.setItem(this.storageKey, JSON.stringify(payments));
  }

  async releaseEscrow(escrowId: string, talentPayPalEmail: string): Promise<void> {
    const payments = this.getEscrowPayments();
    const paymentIndex = payments.findIndex(p => p.id === escrowId);
    
    if (paymentIndex === -1) {
      throw new Error('Escrow payment not found');
    }

    const payment = payments[paymentIndex];
    
    if (payment.status !== 'funded') {
      throw new Error('Escrow must be funded before release');
    }

    try {
      // In production, this would create a PayPal payout to the talent
      await this.createPayPalPayout(payment, talentPayPalEmail);
      
      payment.status = 'released';
      payment.releasedAt = new Date();
      
      localStorage.setItem(this.storageKey, JSON.stringify(payments));
    } catch (error) {
      throw new Error(`Failed to release escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createPayPalPayout(payment: EscrowPayment, talentEmail: string): Promise<void> {
    // Simulate PayPal payout creation for demo
    // In production, this would make actual PayPal Payouts API calls
    console.log(`Creating PayPal payout of $${payment.talentReceives} to ${talentEmail}`);
  }

  getEscrowPayments(userId?: string, userType?: 'client' | 'talent'): EscrowPayment[] {
    try {
      const payments = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return payments
        .map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          fundedAt: p.fundedAt ? new Date(p.fundedAt) : undefined,
          releasedAt: p.releasedAt ? new Date(p.releasedAt) : undefined
        }))
        .filter((p: EscrowPayment) => {
          if (!userId) return true;
          if (userType === 'client') return p.clientId === userId;
          if (userType === 'talent') return p.talentId === userId;
          return p.clientId === userId || p.talentId === userId;
        });
    } catch (error) {
      console.error('Failed to load escrow payments:', error);
      return [];
    }
  }

  getEscrowPayment(escrowId: string): EscrowPayment | null {
    const payments = this.getEscrowPayments();
    return payments.find(p => p.id === escrowId) || null;
  }

  getProjectEscrows(projectId: string): EscrowPayment[] {
    return this.getEscrowPayments().filter(p => p.projectId === projectId);
  }

  calculateFees(amount: number): { platformFee: number; talentReceives: number } {
    const platformFee = amount * 0.05; // 5% platform fee
    const talentReceives = amount - platformFee;
    return { platformFee, talentReceives };
  }

  calculateFees(amount: number): { platformFee: number; talentReceives: number } {
    const platformFee = amount * 0.05; // 5% platform fee
    const talentReceives = amount - platformFee;
    return { platformFee, talentReceives };
  }
}

export const escrowService = new EscrowService();
export type { EscrowPayment };