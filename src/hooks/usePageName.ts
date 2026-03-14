import { useLocation } from "react-router-dom";
import { toPageKey, normalizePageName } from "@/lib/pageMigration";

/**
 * Hook for deriving pageName from URL
 * All hybrid pages should use this hook instead of hardcoded pageName strings
 * 
 * CRITICAL: All page names are normalized to lowercase kebab-case to prevent
 * content from becoming invisible due to case mismatches.
 * 
 * Usage:
 *   const pageName = usePageName();
 *   // or with override:
 *   const pageName = usePageName(propsPageName);
 */
export const usePageName = (propsPageName?: string): string => {
  const location = useLocation();
  // Always normalize: if propsPageName is provided, normalize it; otherwise derive from URL
  if (propsPageName) {
    return normalizePageName(propsPageName);
  }
  return toPageKey(location.pathname);
};

export default usePageName;
