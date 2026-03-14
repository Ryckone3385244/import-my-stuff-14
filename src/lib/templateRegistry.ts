import { LazyExoticComponent, ComponentType } from 'react';

/**
 * Template Registry
 * 
 * Previously auto-discovered page templates. Now all content pages are fully
 * dynamic (DB-driven via DynamicPage). This registry is kept for backward
 * compatibility but contains no entries.
 * 
 * Functional pages (admin, auth, portals, data-listing) still use explicit
 * routes in App.tsx.
 */

export const RENDERER_MAP: Record<string, LazyExoticComponent<ComponentType<{ pageName?: string }>>> = {};

/**
 * URL Aliases — maps migrated URL slugs to their original template keys.
 * Kept for reference but no longer used since all content is dynamic.
 */
const URL_ALIASES: Record<string, string> = {};

export const getAvailableRenderers = (): string[] => Object.keys(RENDERER_MAP);

export const getRenderer = (key: string): LazyExoticComponent<ComponentType<{ pageName?: string }>> | null => {
  return RENDERER_MAP[key] || RENDERER_MAP[URL_ALIASES[key]] || null;
};

export const hasRenderer = (key: string): boolean => {
  return key in RENDERER_MAP || (key in URL_ALIASES && URL_ALIASES[key] in RENDERER_MAP);
};
