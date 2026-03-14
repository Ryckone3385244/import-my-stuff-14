import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorHandling';

// Generate or retrieve session ID from localStorage
const getSessionId = () => {
  let sessionId = localStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
};

// Get device type from user agent
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Get browser name
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Other';
};

// Get OS name
const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const sessionId = useRef(getSessionId());
  const pageStartTime = useRef<number>(Date.now());
  const previousPath = useRef<string>('');
  const isAdminChecked = useRef<boolean>(false);
  const isAdmin = useRef<boolean>(false);

  // Check if user is admin on mount and track session after
  useEffect(() => {
    const initializeTracking = async () => {
      // First check admin status
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          const allowedRoles = ['admin', 'customer_service', 'project_manager'];
          isAdmin.current = roleData?.some(r => allowedRoles.includes(r.role)) ?? false;
        }
      } catch (error) {
        logError('Check admin status', error);
      }
      
      isAdminChecked.current = true;

      // Skip tracking if user is admin/CS/PM
      if (isAdmin.current) return;

      // Track session using upsert to prevent duplicate key errors
      try {
        await supabase.from('visitor_sessions').upsert(
          {
            session_id: sessionId.current,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        );
      } catch (error) {
        logError('Track session', error);
      }
    };

    initializeTracking();
  }, []);

  // Track page views on route change
  useEffect(() => {
    const trackPageView = async () => {
      // Wait for admin check to complete before tracking
      if (!isAdminChecked.current) {
        // Retry after a short delay
        setTimeout(trackPageView, 50);
        return;
      }

      // Skip tracking if user is admin/CS/PM
      if (isAdmin.current) return;

      // Calculate time on previous page
      const timeOnPage = previousPath.current 
        ? Math.round((Date.now() - pageStartTime.current) / 1000)
        : null;

      // Update previous page's time_on_page if it exists
      if (previousPath.current && timeOnPage) {
        try {
          const { data: lastPageView } = await supabase
            .from('page_views')
            .select('id')
            .eq('session_id', sessionId.current)
            .eq('page_path', previousPath.current)
            .order('viewed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastPageView) {
            await supabase
              .from('page_views')
              .update({ time_on_page: timeOnPage })
              .eq('id', lastPageView.id);
          }
        } catch (error) {
          logError('Update time on page', error);
        }
      }

      // Track new page view
      try {
        await supabase.from('page_views').insert({
          session_id: sessionId.current,
          page_path: location.pathname,
          page_title: document.title,
          viewed_at: new Date().toISOString(),
        });

        // Update last_seen in session using upsert to prevent race conditions
        await supabase.from('visitor_sessions').upsert(
          {
            session_id: sessionId.current,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        );
      } catch (error) {
        logError('Track page view', error);
      }

      // Update refs for next page
      previousPath.current = location.pathname;
      pageStartTime.current = Date.now();
    };

    trackPageView();
  }, [location.pathname]);

  // Track time on page when user leaves
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Skip tracking if admin check not done or user is admin/CS/PM
      if (!isAdminChecked.current || isAdmin.current) return;

      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      
      try {
        const { data: lastPageView } = await supabase
          .from('page_views')
          .select('id')
          .eq('session_id', sessionId.current)
          .eq('page_path', location.pathname)
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastPageView) {
          await supabase
            .from('page_views')
            .update({ time_on_page: timeOnPage })
            .eq('id', lastPageView.id);
        }
      } catch (error) {
        logError('Update final time on page', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);
};
