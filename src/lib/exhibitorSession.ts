import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'selected_exhibitor_id';

/**
 * Store the selected exhibitor ID in sessionStorage.
 */
export const setSelectedExhibitorId = (exhibitorId: string) => {
  sessionStorage.setItem(STORAGE_KEY, exhibitorId);
};

/**
 * Get the currently selected exhibitor ID from sessionStorage.
 */
export const getSelectedExhibitorId = (): string | null => {
  return sessionStorage.getItem(STORAGE_KEY);
};

/**
 * Clear the selected exhibitor ID.
 */
export const clearSelectedExhibitorId = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

/**
 * Fetches the exhibitor for the current user.
 * Checks both exhibitors.user_id and exhibitor_contacts.user_id for access.
 * If a selection is stored in sessionStorage, validates and returns that exhibitor.
 * Otherwise falls back to .limit(1) to avoid multi-row errors.
 */
export const fetchExhibitorForUser = async (userId: string) => {
  const storedId = getSelectedExhibitorId();

  if (storedId) {
    // Validate stored selection belongs to this user (via exhibitors.user_id or contacts.user_id)
    const { data, error } = await supabase
      .from('exhibitors')
      .select('*')
      .eq('id', storedId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    // Try via exhibitor_contacts.user_id
    const { data: contactMatch } = await supabase
      .from('exhibitor_contacts')
      .select('exhibitor_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (contactMatch) {
      const { data: exhibitorData } = await supabase
        .from('exhibitors')
        .select('*')
        .eq('id', contactMatch.exhibitor_id)
        .maybeSingle();

      if (exhibitorData) {
        setSelectedExhibitorId(exhibitorData.id);
        return exhibitorData;
      }
    }

    // Invalid stored selection, clear it
    clearSelectedExhibitorId();
  }

  // Fallback: get first exhibitor for this user (direct link)
  const { data, error } = await supabase
    .from('exhibitors')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    setSelectedExhibitorId(data.id);
    return data;
  }

  // Also check via exhibitor_contacts.user_id
  const { data: contactMatch } = await supabase
    .from('exhibitor_contacts')
    .select('exhibitor_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (contactMatch) {
    const { data: exhibitorData } = await supabase
      .from('exhibitors')
      .select('*')
      .eq('id', contactMatch.exhibitor_id)
      .maybeSingle();

    if (exhibitorData) {
      setSelectedExhibitorId(exhibitorData.id);
      return exhibitorData;
    }
  }

  return null;
};

/**
 * Fetches ALL exhibitors for a user (for selection screen).
 * Checks both exhibitors.user_id and exhibitor_contacts.user_id.
 */
export const fetchAllExhibitorsForUser = async (userId: string) => {
  // Get exhibitors directly linked
  const { data: directExhibitors, error: directError } = await supabase
    .from('exhibitors')
    .select('id, name, logo_url, booth_number')
    .eq('user_id', userId)
    .order('name');

  if (directError) throw directError;

  // Get exhibitors via contacts
  const { data: contactLinks } = await supabase
    .from('exhibitor_contacts')
    .select('exhibitor_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  const contactExhibitorIds = (contactLinks || [])
    .map(c => c.exhibitor_id)
    .filter(id => !(directExhibitors || []).some(e => e.id === id));

  let contactExhibitors: typeof directExhibitors = [];
  if (contactExhibitorIds.length > 0) {
    const { data } = await supabase
      .from('exhibitors')
      .select('id, name, logo_url, booth_number')
      .in('id', contactExhibitorIds)
      .order('name');
    contactExhibitors = data || [];
  }

  return [...(directExhibitors || []), ...contactExhibitors];
};
