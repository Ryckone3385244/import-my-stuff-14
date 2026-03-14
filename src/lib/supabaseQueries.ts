// Shared Supabase query functions
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches active menu items for a specific menu type
 * @param menuType - Type of menu: 'navbar' or 'footer'
 * @param filterPortalPages - Whether to filter out portal pages except login
 */
export const fetchMenuItems = async (
  menuType: "navbar" | "footer",
  filterPortalPages = true
) => {
  const tableName = menuType === "navbar" ? "navbar_menu_items" : "footer_menu_items";
  
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("is_active", true)
    .order("menu_order", { ascending: true });
  
  if (error) throw error;
  
  if (!filterPortalPages) return data;
  
  // Filter out portal pages except exhibitor login
  return data?.filter(item => {
    const isPortalPage = item.url.startsWith('/exhibitor/');
    const isLoginPage = item.url === '/exhibitor/login';
    return !isPortalPage || isLoginPage;
  });
};

/**
 * Fetches event settings
 */
export const fetchEventSettings = async () => {
  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Checks if a user has admin role (includes admin, customer_service, and project_manager)
 */
export const checkIsAdmin = async (userId: string | null) => {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_admin_or_cs_or_pm", { _user_id: userId });
  if (error) throw error;
  return data;
};

/**
 * Checks if a user has admin, CS, or PM role
 */
export const checkIsAdminOrCSOrPM = async (userId: string | null) => {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_admin_or_cs_or_pm", { _user_id: userId });
  if (error) throw error;
  return data;
};
