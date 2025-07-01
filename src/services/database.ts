interface User {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  name: string;
  type: 'client' | 'talent';
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
}

interface DatabaseSchema {
  users: User[];
}

class DatabaseService {
  private storageKey = 'voicecast_database';
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): DatabaseSchema {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsed.users = parsed.users.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
        }));
        return parsed;
      } catch (error) {
        console.error('Failed to parse database:', error);
      }
    }
    
    return {
      users: []
    };
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // User management
  async createUser(email: string, password: string, name: string, type: 'client' | 'talent'): Promise<User> {
    // Check if user already exists
    const existingUser = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    // Validate password strength
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate name
    if (name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase().trim(),
      password, // In production, this would be hashed with bcrypt
      name: name.trim(),
      type,
      avatar: `https://images.pexels.com/photos/${type === 'client' ? '614810' : '415829'}/pexels-photo-${type === 'client' ? '614810' : '415829'}.jpeg?auto=compress&cs=tinysrgb&w=100`,
      createdAt: new Date()
    };

    this.data.users.push(user);
    this.saveToStorage();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async authenticateUser(email: string, password: string, userType: 'client' | 'talent'): Promise<User> {
    // Find user by email
    const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error('No account found with this email address. Please sign up first.');
    }

    // Check password
    if (user.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Check user type matches
    if (user.type !== userType) {
      throw new Error(`This account is registered as a ${user.type}. Please select the correct account type.`);
    }

    // Update last login
    user.lastLogin = new Date();
    this.saveToStorage();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<User> {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates
    };

    this.saveToStorage();

    const { password: _, ...userWithoutPassword } = this.data.users[userIndex];
    return userWithoutPassword as User;
  }

  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const userIndex = this.data.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      return false;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Update password
    this.data.users[userIndex].password = newPassword;
    this.saveToStorage();
    return true;
  }

  async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return false;
    }

    this.data.users.splice(userIndex, 1);
    this.saveToStorage();
    return true;
  }

  // Database utilities
  getAllUsers(): Omit<User, 'password'>[] {
    return this.data.users.map(({ password, ...user }) => user);
  }

  getUserStats(): { totalUsers: number; clients: number; talent: number } {
    const totalUsers = this.data.users.length;
    const clients = this.data.users.filter(u => u.type === 'client').length;
    const talent = this.data.users.filter(u => u.type === 'talent').length;

    return { totalUsers, clients, talent };
  }

  // Clear all data (for testing purposes)
  clearDatabase(): void {
    this.data = { users: [] };
    this.saveToStorage();
  }

  // Export/Import for backup
  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData);
      this.data = imported;
      this.saveToStorage();
    } catch (error) {
      throw new Error('Invalid data format');
    }
  }
}

export const database = new DatabaseService();
export type { User };