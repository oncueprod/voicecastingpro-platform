import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NotificationPreferences {
  email_notifications: boolean;
  message_email_notifications: boolean;
  daily_digest: boolean;
}

const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    message_email_notifications: true,
    daily_digest: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Show error message to user
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Email Notifications
        </h3>
      </div>

      <div className="space-y-6">
        {/* Master Email Toggle */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-gray-500" />
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
            </div>
            <p className="text-sm text-gray-600">
              Receive email notifications from VoiceCasting Pro
            </p>
          </div>
          <button
            onClick={() => handleToggle('email_notifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Message Notifications */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-2">New Message Alerts</h4>
            <p className="text-sm text-gray-600">
              Get notified when someone sends you a message (only when you're offline)
            </p>
          </div>
          <button
            onClick={() => handleToggle('message_email_notifications')}
            disabled={!preferences.email_notifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.message_email_notifications && preferences.email_notifications 
                ? 'bg-blue-600' 
                : 'bg-gray-200'
            } ${!preferences.email_notifications ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.message_email_notifications && preferences.email_notifications 
                  ? 'translate-x-6' 
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Digest */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <h4 className="font-medium text-gray-900">Daily Digest</h4>
            </div>
            <p className="text-sm text-gray-600">
              Receive a daily summary of unread messages (sent once per day)
            </p>
          </div>
          <button
            onClick={() => handleToggle('daily_digest')}
            disabled={!preferences.email_notifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.daily_digest && preferences.email_notifications 
                ? 'bg-blue-600' 
                : 'bg-gray-200'
            } ${!preferences.email_notifications ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.daily_digest && preferences.email_notifications 
                  ? 'translate-x-6' 
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={updatePreferences}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </>
            )}
          </button>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Smart Notifications:</strong> You'll only receive message emails when you're offline. 
            If you're actively using the platform, you'll see messages in real-time without email clutter.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;