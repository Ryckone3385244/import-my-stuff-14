import { useQuery } from "@tanstack/react-query";
import { fetchEventSettings } from "@/lib/supabaseQueries";
import { QUERY_KEYS } from "@/lib/constants";

export const useEventSettings = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.EVENT_SETTINGS],
    queryFn: fetchEventSettings,
  });
};
