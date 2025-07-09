import { sendDailyDigest } from './emailNotifications.js';

// Simple scheduler for daily digest
// Runs every hour and checks if it's time to send the daily digest
let lastDigestDate = null;

export const startScheduler = () => {
  console.log('📅 Email scheduler started');
  
  // Check every hour
  setInterval(async () => {
    const now = new Date();
    const currentDate = now.toDateString();
    const currentHour = now.getHours();
    
    // Send daily digest at 9 AM local time, once per day
    if (currentHour === 9 && lastDigestDate !== currentDate) {
      console.log('📧 Sending daily digest...');
      
      try {
        await sendDailyDigest();
        lastDigestDate = currentDate;
        console.log('✅ Daily digest completed');
      } catch (error) {
        console.error('❌ Daily digest failed:', error);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
};

// Manual trigger for testing
export const triggerDailyDigest = async () => {
  console.log('🧪 Manually triggering daily digest...');
  await sendDailyDigest();
};