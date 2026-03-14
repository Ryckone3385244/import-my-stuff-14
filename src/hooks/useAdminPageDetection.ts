import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to detect if current page is an admin page and set a data attribute on the body.
 * This allows CSS to conditionally apply styles (like custom fonts) only on non-admin pages.
 * Admin styles page is excluded so the font preview works correctly.
 */
export const useAdminPageDetection = () => {
  const location = useLocation();

  useEffect(() => {
    // Admin pages except /admin/styles (to allow font preview to work)
    const isAdminPage = location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/styles');
    document.body.setAttribute('data-admin-page', isAdminPage ? 'true' : 'false');
  }, [location.pathname]);
};
