import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in ms
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export const useExhibitorSessionTimeout = () => {
  const navigate = useNavigate();

  const handleLogout = useCallback(async (reason: 'idle' | 'absolute') => {
    await supabase.auth.signOut();
    localStorage.removeItem('exhibitor_login_time');
    localStorage.removeItem('exhibitor_last_activity');
    
    const message = reason === 'idle' 
      ? 'Your session expired due to inactivity. Please log in again.'
      : 'Your session expired. Please log in again.';
    
    toast.error(message);
    navigate('/exhibitor-login');
  }, [navigate]);

  const updateActivity = useCallback(() => {
    localStorage.setItem('exhibitor_last_activity', Date.now().toString());
  }, []);

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check timeouts periodically
    const intervalId = setInterval(() => {
      const loginTime = localStorage.getItem('exhibitor_login_time');
      const lastActivity = localStorage.getItem('exhibitor_last_activity');
      const now = Date.now();

      if (!loginTime || !lastActivity) return;

      const loginTimeNum = parseInt(loginTime);
      const lastActivityNum = parseInt(lastActivity);

      // Check absolute timeout (8 hours since login)
      if (now - loginTimeNum >= ABSOLUTE_TIMEOUT) {
        handleLogout('absolute');
        return;
      }

      // Check idle timeout (30 minutes since last activity)
      if (now - lastActivityNum >= IDLE_TIMEOUT) {
        handleLogout('idle');
        return;
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [updateActivity, handleLogout]);
};
