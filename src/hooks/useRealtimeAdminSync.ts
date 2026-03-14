import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Keeps public UI in sync with admin changes (event settings + menus) without requiring a refresh.
 */
export const useRealtimeAdminSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = (key: string) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    };

    const channel = supabase
      .channel("admin_live_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_settings" },
        () => invalidate(QUERY_KEYS.EVENT_SETTINGS)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "navbar_menu_items" },
        () => invalidate(QUERY_KEYS.NAVBAR_MENU_ITEMS)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "footer_menu_items" },
        () => invalidate(QUERY_KEYS.FOOTER_MENU_ITEMS)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "website_styles" },
        () => invalidate("website_styles")
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);
};
