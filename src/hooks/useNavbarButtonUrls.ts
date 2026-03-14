import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NavbarButtonUrls {
  exhibitButtonUrl: string;
  registerButtonUrl: string;
}

const DEFAULT_URLS: NavbarButtonUrls = {
  exhibitButtonUrl: "/book-booth",
  registerButtonUrl: "/registration",
};

export const useNavbarButtonUrls = () => {
  return useQuery({
    queryKey: ["navbar-button-urls"],
    queryFn: async (): Promise<NavbarButtonUrls> => {
      const { data } = await supabase
        .from("page_content")
        .select("content_key, content_value")
        .eq("page_name", "navbar")
        .eq("section_name", "buttons")
        .in("content_key", ["exhibit_button_url", "register_button_url"]);

      const urls = { ...DEFAULT_URLS };

      if (data) {
        for (const item of data) {
          if (item.content_key === "exhibit_button_url" && item.content_value) {
            urls.exhibitButtonUrl = item.content_value;
          }
          if (item.content_key === "register_button_url" && item.content_value) {
            urls.registerButtonUrl = item.content_value;
          }
        }
      }

      return urls;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
