interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  passwordHash: string; // Store actual password hash
}

interface AdminAction {
  id: string;
  adminId: string;
  action: 'user_created' | 'user_deleted' | 'user_suspended' | 'user_activated' | 'message_flagged' | 'message_deleted' | 'password_changed';
  targetId: string;
  targetType: 'user' | 'message' | 'conversation' | 'admin';
  reason?: string;
  timestamp: Date;
  details?: any;
}

interface UserManagement {
  id: string;
  email: string;
  name: string;
  type: 'client' | 'talent';
  status: 'active' | 'suspended' | 'banned';
  createdAt: Date;
  lastLogin?: Date;
  totalProjects?: number;
  totalEarnings?: number;
  flaggedMessages?: number;
  suspensionReason?: string;
}

class AdminService {
  private adminStorageKey = 'admin_users';
  private actionsStorageKey = 'admin_actions';
  private currentAdmin: AdminUser | null = null;

  constructor() {
    this.initializeDefaultAdmin();
  }

  private initializeDefaultAdmin() {
    const admins = this.getAdmins();
    if (admins.length === 0) {
      // Create default super admin with the exact credentials expected
      const defaultAdmin: AdminUser = {
        id: 'admin_super_001',
        email: 'superadmin@voicecastingpro.com',
        name: 'Super Administrator',
        role: 'super_admin',
        permissions: ['all'],
        createdAt: new Date(),
        isActive: true,
        passwordHash: this.hashPassword('VCP_Admin_2024!') // Hash the default password
      };
      
      this.saveAdmin(defaultAdmin);
      console.log('✅ Default admin created');
    } else {
      console.log('✅ Admin system initialized with existing admins');
    }
  }

  // Simple password hashing for demo (in production, use bcrypt or similar)
  private hashPassword(password: string): string {
    // Simple hash for demo - in production use proper bcrypt
    return btoa(password + 'voicecast_salt_2024');
  }

  private verifyPassword(password: string, hash: string): boolean {
    const computedHash = this.hashPassword(password);
    console.log('🔍 Password verification:', {
      inputPassword: password,
      computedHash,
      storedHash: hash,
      match: computedHash === hash
    });
    return computedHash === hash;
  }

  async authenticateAdmin(email: string, password: string): Promise<AdminUser> {
    console.log('🔐 Attempting admin authentication for:', email);
    
    const admins = this.getAdmins();
    console.log('📋 Available admins:', admins.map(a => ({ email: a.email, active: a.isActive })));
    
    const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
    
    if (!admin) {
      console.error('❌ Admin account not found for email:', email);
      throw new Error('Admin account not found. Please check your email address.');
    }

    if (!admin.isActive) {
      console.error('❌ Admin account is deactivated:', email);
      throw new Error('Admin account is deactivated. Please contact system administrator.');
    }

    console.log('🔍 Verifying password for admin:', admin.email);
    console.log('🔍 Stored password hash:', admin.passwordHash);
    
    // Verify password against stored hash
    if (!this.verifyPassword(password, admin.passwordHash)) {
      console.error('❌ Invalid password for admin:', email);
      throw new Error('Invalid password. Please check your credentials.');
    }

    console.log('✅ Admin authentication successful for:', email);

    // Update last login
    admin.lastLogin = new Date();
    this.updateAdmin(admin);
    this.currentAdmin = admin;
    
    return admin;
  }

  getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }

  signOut() {
    console.log('🚪 Admin signed out');
    this.currentAdmin = null;
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admins = this.getAdmins();
    const adminIndex = admins.findIndex(a => a.id === adminId);
    
    if (adminIndex === -1) {
      throw new Error('Admin not found');
    }

    const admin = admins[adminIndex];

    // Verify current password
    if (!this.verifyPassword(currentPassword, admin.passwordHash)) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Update password with new hash
    admin.passwordHash = this.hashPassword(newPassword);
    
    // Save updated admin
    this.updateAdmin(admin);

    // Update current admin if it's the same user
    if (this.currentAdmin && this.currentAdmin.id === adminId) {
      this.currentAdmin = admin;
    }

    console.log('✅ Password changed successfully for admin:', admin.email);

    // Log the action
    this.logAction({
      adminId,
      action: 'password_changed',
      targetId: adminId,
      targetType: 'admin',
      reason: 'Admin password changed successfully'
    });
  }

  // Create new admin
  async createAdmin(email: string, password: string, name: string, role: 'admin' | 'moderator' = 'admin'): Promise<AdminUser> {
    const admins = this.getAdmins();
    
    // Check if admin already exists
    if (admins.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Admin with this email already exists');
    }

    // Validate password
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const newAdmin: AdminUser = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      permissions: role === 'admin' ? ['user_management', 'content_moderation'] : ['content_moderation'],
      createdAt: new Date(),
      isActive: true,
      passwordHash: this.hashPassword(password)
    };

    this.saveAdmin(newAdmin);

    // Log the action
    if (this.currentAdmin) {
      this.logAction({
        adminId: this.currentAdmin.id,
        action: 'user_created',
        targetId: newAdmin.id,
        targetType: 'admin',
        reason: `Created new ${role} account`,
        details: { email: newAdmin.email, name: newAdmin.name }
      });
    }

    return newAdmin;
  }

  // Reset admin password (super admin only)
  async resetAdminPassword(adminId: string, newPassword: string, resetByAdminId: string): Promise<void> {
    const resetByAdmin = this.getAdmins().find(a => a.id === resetByAdminId);
    if (!resetByAdmin || resetByAdmin.role !== 'super_admin') {
      throw new Error('Only super administrators can reset passwords');
    }

    const admins = this.getAdmins();
    const adminIndex = admins.findIndex(a => a.id === adminId);
    
    if (adminIndex === -1) {
      throw new Error('Admin not found');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Update password
    admins[adminIndex].passwordHash = this.hashPassword(newPassword);
    this.updateAdmin(admins[adminIndex]);

    // Log the action
    this.logAction({
      adminId: resetByAdminId,
      action: 'password_changed',
      targetId: adminId,
      targetType: 'admin',
      reason: 'Password reset by super administrator',
      details: { targetEmail: admins[adminIndex].email }
    });
  }

  // User Management
  getAllUsers(): UserManagement[] {
    const users = JSON.parse(localStorage.getItem('voicecast_database') || '{"users":[]}').users;
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const escrows = JSON.parse(localStorage.getItem('escrow_payments') || '[]');

    return users.map((user: any) => {
      const userMessages = messages.filter((m: any) => m.senderId === user.id);
      const flaggedMessages = userMessages.filter((m: any) => m.flagged).length;
      
      let totalEarnings = 0;
      let totalProjects = 0;
      
      if (user.type === 'talent') {
        const talentEscrows = escrows.filter((e: any) => e.talentId === user.id && e.status === 'released');
        totalEarnings = talentEscrows.reduce((sum: number, e: any) => sum + e.talentReceives, 0);
        totalProjects = talentEscrows.length;
      } else {
        const clientEscrows = escrows.filter((e: any) => e.clientId === user.id);
        totalProjects = clientEscrows.length;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        status: user.status || 'active',
        createdAt: new Date(user.createdAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        totalProjects,
        totalEarnings,
        flaggedMessages,
        suspensionReason: user.suspensionReason
      };
    });
  }

  async suspendUser(userId: string, reason: string, adminId: string): Promise<void> {
    const database = JSON.parse(localStorage.getItem('voicecast_database') || '{"users":[]}');
    const userIndex = database.users.findIndex((u: any) => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    database.users[userIndex].status = 'suspended';
    database.users[userIndex].suspensionReason = reason;
    localStorage.setItem('voicecast_database', JSON.stringify(database));

    this.logAction({
      adminId,
      action: 'user_suspended',
      targetId: userId,
      targetType: 'user',
      reason,
      details: { userEmail: database.users[userIndex].email }
    });
  }

  async activateUser(userId: string, adminId: string): Promise<void> {
    const database = JSON.parse(localStorage.getItem('voicecast_database') || '{"users":[]}');
    const userIndex = database.users.findIndex((u: any) => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    database.users[userIndex].status = 'active';
    delete database.users[userIndex].suspensionReason;
    localStorage.setItem('voicecast_database', JSON.stringify(database));

    this.logAction({
      adminId,
      action: 'user_activated',
      targetId: userId,
      targetType: 'user',
      details: { userEmail: database.users[userIndex].email }
    });
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    const database = JSON.parse(localStorage.getItem('voicecast_database') || '{"users":[]}');
    const userIndex = database.users.findIndex((u: any) => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = database.users[userIndex];
    database.users.splice(userIndex, 1);
    localStorage.setItem('voicecast_database', JSON.stringify(database));

    // Clean up user data
    this.cleanupUserData(userId);

    this.logAction({
      adminId,
      action: 'user_deleted',
      targetId: userId,
      targetType: 'user',
      details: { userEmail: user.email, userName: user.name }
    });
  }

  private cleanupUserData(userId: string) {
    // Remove user messages
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const filteredMessages = messages.filter((m: any) => m.senderId !== userId && m.receiverId !== userId);
    localStorage.setItem('messages', JSON.stringify(filteredMessages));

    // Remove user conversations
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const filteredConversations = conversations.filter((c: any) => !c.participants.includes(userId));
    localStorage.setItem('conversations', JSON.stringify(filteredConversations));

    // Remove user files
    const files = JSON.parse(localStorage.getItem('file_attachments') || '[]');
    const filteredFiles = files.filter((f: any) => f.userId !== userId);
    localStorage.setItem('file_attachments', JSON.stringify(filteredFiles));

    // Remove user escrows
    const escrows = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    const filteredEscrows = escrows.filter((e: any) => e.clientId !== userId && e.talentId !== userId);
    localStorage.setItem('escrow_payments', JSON.stringify(filteredEscrows));
  }

  // Message Moderation
  getFlaggedMessages(): any[] {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    return messages.filter((m: any) => m.flagged || this.containsOffPlatformContact(m.content));
  }

  private containsOffPlatformContact(content: string): boolean {
    const patterns = [
      // Email patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      // Phone patterns
      /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      // Social media patterns
      /(?:instagram|insta|ig)[\s:@]*[a-zA-Z0-9._]+/gi,
      /(?:twitter|tweet)[\s:@]*[a-zA-Z0-9._]+/gi,
      /(?:facebook|fb)[\s:@]*[a-zA-Z0-9._]+/gi,
      /(?:linkedin)[\s:@]*[a-zA-Z0-9._]+/gi,
      /(?:skype)[\s:@]*[a-zA-Z0-9._]+/gi,
      /(?:discord)[\s:@]*[a-zA-Z0-9._#]+/gi,
      // Website patterns
      /(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
      // Contact me patterns
      /contact\s+me\s+(?:at|on|via)/gi,
      /reach\s+me\s+(?:at|on|via)/gi,
      /find\s+me\s+(?:at|on|via)/gi,
      // External platform mentions
      /(?:whatsapp|telegram|signal|zoom|teams)/gi
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  async flagMessage(messageId: string, reason: string, adminId: string): Promise<void> {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex((m: any) => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    messages[messageIndex].flagged = true;
    messages[messageIndex].flagReason = reason;
    messages[messageIndex].flaggedBy = adminId;
    messages[messageIndex].flaggedAt = new Date().toISOString();
    
    localStorage.setItem('messages', JSON.stringify(messages));

    this.logAction({
      adminId,
      action: 'message_flagged',
      targetId: messageId,
      targetType: 'message',
      reason,
      details: { content: messages[messageIndex].content.substring(0, 100) }
    });
  }

  async deleteMessage(messageId: string, adminId: string): Promise<void> {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex((m: any) => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = messages[messageIndex];
    messages.splice(messageIndex, 1);
    localStorage.setItem('messages', JSON.stringify(messages));

    this.logAction({
      adminId,
      action: 'message_deleted',
      targetId: messageId,
      targetType: 'message',
      details: { content: message.content.substring(0, 100), senderId: message.senderId }
    });
  }

  // Admin Management
  getAdmins(): AdminUser[] {
    try {
      const admins = JSON.parse(localStorage.getItem(this.adminStorageKey) || '[]');
      return admins.map((admin: any) => ({
        ...admin,
        createdAt: new Date(admin.createdAt),
        lastLogin: admin.lastLogin ? new Date(admin.lastLogin) : undefined
      }));
    } catch {
      return [];
    }
  }

  saveAdmin(admin: AdminUser): void {
    const admins = this.getAdmins();
    const existingIndex = admins.findIndex(a => a.id === admin.id);
    
    if (existingIndex >= 0) {
      admins[existingIndex] = admin;
    } else {
      admins.push(admin);
    }
    
    localStorage.setItem(this.adminStorageKey, JSON.stringify(admins));
  }

  updateAdmin(admin: AdminUser): void {
    this.saveAdmin(admin);
  }

  // Action Logging
  private logAction(action: Omit<AdminAction, 'id' | 'timestamp'>): void {
    const actions = this.getAdminActions();
    const newAction: AdminAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    actions.unshift(newAction); // Add to beginning
    
    // Keep only last 1000 actions
    if (actions.length > 1000) {
      actions.splice(1000);
    }
    
    localStorage.setItem(this.actionsStorageKey, JSON.stringify(actions));
  }

  getAdminActions(limit: number = 100): AdminAction[] {
    try {
      const actions = JSON.parse(localStorage.getItem(this.actionsStorageKey) || '[]');
      return actions.slice(0, limit).map((action: any) => ({
        ...action,
        timestamp: new Date(action.timestamp)
      }));
    } catch {
      return [];
    }
  }

  // Analytics
  getSystemStats(): any {
    const users = this.getAllUsers();
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const escrows = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    const flaggedMessages = this.getFlaggedMessages();

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const clients = users.filter(u => u.type === 'client').length;
    const talents = users.filter(u => u.type === 'talent').length;

    const totalMessages = messages.length;
    const totalEscrows = escrows.length;
    const totalVolume = escrows.reduce((sum: number, e: any) => sum + e.amount, 0);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        clients,
        talents
      },
      messages: {
        total: totalMessages,
        flagged: flaggedMessages.length
      },
      escrows: {
        total: totalEscrows,
        volume: totalVolume
      }
    };
  }

  // Debug function to reset admin system
  resetAdminSystem(): void {
    localStorage.removeItem(this.adminStorageKey);
    localStorage.removeItem(this.actionsStorageKey);
    this.currentAdmin = null;
    this.initializeDefaultAdmin();
    console.log('🔄 Admin system reset and reinitialized');
  }
}

export const adminService = new AdminService();
export type { AdminUser, AdminAction, UserManagement };