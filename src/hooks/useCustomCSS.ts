import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCustomCSS = () => {
  useEffect(() => {
    let cancelled = false;

    const loadCustomCSS = async () => {
      try {
        const { data, error } = await supabase
          .from("global_html_snippets")
          .select("custom_css")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || error) return;

        // Check if style element already exists
        let styleElement = document.getElementById("custom-css-styles") as
          | HTMLStyleElement
          | null;

        if (!styleElement) {
          styleElement = document.createElement("style");
          styleElement.id = "custom-css-styles";
          document.head.appendChild(styleElement);
        }

        styleElement.textContent = data?.custom_css || "";
      } catch (error) {
        console.error("Error loading custom CSS:", error);
      }
    };

    loadCustomCSS();

    // Live-update when admin changes Custom CSS
    const channel = supabase
      .channel("custom_css_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_html_snippets" },
        () => loadCustomCSS()
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
      document.getElementById("custom-css-styles")?.remove();
    };
  }, []);
};
