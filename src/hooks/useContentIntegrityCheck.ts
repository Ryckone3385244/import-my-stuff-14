import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Defensive guard that verifies content integrity before allowing empty results.
 *
 * For this single-event app (no event_id scoping), this catches cases where:
 * - A network blip causes a Supabase query to silently return empty results
 * - The Supabase client session expires or becomes invalid
 * - A stale browser tab returns and shows blank content
 *
 * This is a READ-ONLY, additive safety net — it never modifies data.
 */

interface ConnectionHealth {
  healthy: boolean;
  timestamp: number;
}

// Module-level cache shared across all hook instances
let connectionHealthCache: ConnectionHealth | null = null;
const CONNECTION_CACHE_TTL = 30_000; // 30 seconds

/**
 * Verify that Supabase is reachable by performing a lightweight query.
 * Cached for 30 seconds to avoid excessive checks.
 */
const checkConnectionHealth = async (): Promise<boolean> => {
  const now = Date.now();

  if (
    connectionHealthCache &&
    now - connectionHealthCache.timestamp < CONNECTION_CACHE_TTL
  ) {
    return connectionHealthCache.healthy;
  }

  try {
    // Use a minimal query against a table we know exists
    const { error } = await supabase
      .from('event_settings')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const healthy = !error;
    connectionHealthCache = { healthy, timestamp: now };
    return healthy;
  } catch {
    connectionHealthCache = { healthy: false, timestamp: now };
    return false;
  }
};

/**
 * Invalidate the connection health cache so the next check is fresh.
 * Called on window focus to detect recovered connectivity.
 */
const invalidateConnectionCache = () => {
  connectionHealthCache = null;
};

export const useContentIntegrityCheck = () => {
  const lastVerifiedContentRef = useRef<Map<string, { hasContent: boolean; timestamp: number }>>(
    new Map()
  );

  // Invalidate cache when tab regains focus after idle
  useEffect(() => {
    const handleFocus = () => {
      invalidateConnectionCache();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  /**
   * Check if the Supabase connection is healthy.
   * Use this before accepting an empty query result at face value.
   */
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    return checkConnectionHealth();
  }, []);

  /**
   * Verify that a page/section truly has no content (vs a transient query failure).
   *
   * When a content query returns 0 blocks, call this to confirm.
   * It does a broader check (no content_key filter) to rule out filter bugs,
   * and verifies the connection is healthy.
   *
   * Returns:
   * - `confirmedEmpty: true` → content is genuinely empty, safe to show empty state
   * - `confirmedEmpty: false` → the empty result is suspicious (connection issue or filter bug)
   * - `shouldRetry: true` → caller should retry the original query
   */
  const verifyEmptyContent = useCallback(
    async (
      pageName: string,
      sectionName: string
    ): Promise<{
      confirmedEmpty: boolean;
      shouldRetry: boolean;
      reason: string;
    }> => {
      const cacheKey = `${pageName}::${sectionName}`;
      const now = Date.now();

      // Check cached verification (avoid hammering the DB)
      const cached = lastVerifiedContentRef.current.get(cacheKey);
      if (cached && now - cached.timestamp < CONNECTION_CACHE_TTL) {
        if (!cached.hasContent) {
          return { confirmedEmpty: true, shouldRetry: false, reason: 'cached-empty' };
        }
        // Cache says content exists but query returned empty → suspicious
        return { confirmedEmpty: false, shouldRetry: true, reason: 'cached-mismatch' };
      }

      // Step 1: Check connection health
      const isHealthy = await checkConnectionHealth();
      if (!isHealthy) {
        console.warn(
          `[ContentIntegrity] Connection unhealthy when checking "${pageName}/${sectionName}". ` +
          'Empty result may be false.'
        );
        return { confirmedEmpty: false, shouldRetry: true, reason: 'connection-unhealthy' };
      }

      // Step 2: Do a broader existence check (no content_key filter)
      try {
        const { count, error } = await supabase
          .from('page_content')
          .select('id', { count: 'exact', head: true })
          .eq('page_name', pageName)
          .eq('section_name', sectionName);

        if (error) {
          console.warn(
            `[ContentIntegrity] Verification query failed for "${pageName}/${sectionName}":`,
            error.message
          );
          return { confirmedEmpty: false, shouldRetry: true, reason: 'query-error' };
        }

        const hasContent = (count ?? 0) > 0;
        lastVerifiedContentRef.current.set(cacheKey, { hasContent, timestamp: now });

        if (hasContent) {
          // Content exists but the original query with filters returned empty
          // This means the content_key pattern didn't match — suspicious
          console.warn(
            `[ContentIntegrity] "${pageName}/${sectionName}" has ${count} rows but ` +
            'filtered query returned empty. Suggesting retry.'
          );
          return { confirmedEmpty: false, shouldRetry: true, reason: 'filter-mismatch' };
        }

        // Genuinely empty
        return { confirmedEmpty: true, shouldRetry: false, reason: 'verified-empty' };
      } catch (err) {
        console.warn('[ContentIntegrity] Verification error:', err);
        return { confirmedEmpty: false, shouldRetry: true, reason: 'exception' };
      }
    },
    []
  );

  /**
   * Verify that a page exists in website_pages before declaring 404.
   * Performs a connectivity check first — if the connection is down,
   * advises against showing a 404.
   */
  const verifyPageNotFound = useCallback(
    async (
      pageUrl: string
    ): Promise<{
      confirmed404: boolean;
      shouldRetry: boolean;
      reason: string;
    }> => {
      // Step 1: Check connection health
      const isHealthy = await checkConnectionHealth();
      if (!isHealthy) {
        console.warn(
          `[ContentIntegrity] Connection unhealthy when resolving "${pageUrl}". ` +
          'Avoiding false 404.'
        );
        return { confirmed404: false, shouldRetry: true, reason: 'connection-unhealthy' };
      }

      // Step 2: Double-check with a fresh query (no cache)
      try {
        const { data, error } = await supabase
          .from('website_pages')
          .select('id')
          .eq('page_url', pageUrl)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn(
            `[ContentIntegrity] Page verification query failed for "${pageUrl}":`,
            error.message
          );
          return { confirmed404: false, shouldRetry: true, reason: 'query-error' };
        }

        if (data) {
          // Page exists (maybe status changed since last check)
          console.warn(
            `[ContentIntegrity] Page "${pageUrl}" found on integrity check ` +
            '(may have been a race condition).'
          );
          return { confirmed404: false, shouldRetry: true, reason: 'page-found-on-recheck' };
        }

        // Genuinely not found
        return { confirmed404: true, shouldRetry: false, reason: 'verified-404' };
      } catch (err) {
        console.warn('[ContentIntegrity] Page verification error:', err);
        return { confirmed404: false, shouldRetry: true, reason: 'exception' };
      }
    },
    []
  );

  return {
    verifyConnection,
    verifyEmptyContent,
    verifyPageNotFound,
    invalidateCache: invalidateConnectionCache,
  };
};
