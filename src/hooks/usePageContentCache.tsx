import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CacheEntry {
  content_value: string;
  content_type: string;
  content_key: string;
  section_name: string;
}

interface PageContentCacheContextType {
  pageName: string;
  getContent: (sectionName: string, contentKey: string) => string | null;
  getContentEntry: (sectionName: string, contentKey: string) => CacheEntry | null;
  getContentBySection: (sectionName: string, keyPrefix?: string) => CacheEntry[];
  updateCacheEntry: (sectionName: string, contentKey: string, contentValue: string, contentType?: string) => void;
  removeCacheEntry: (sectionName: string, contentKey: string) => void;
  refreshPage: () => Promise<void>;
  isLoaded: boolean;
}

const PageContentCacheContext = createContext<PageContentCacheContextType | null>(null);

/**
 * Returns the page content cache if inside a PageContentCacheProvider, or null otherwise.
 * Components should fall back to direct queries when this returns null.
 */
export const usePageContentCacheOptional = (): PageContentCacheContextType | null =>
  useContext(PageContentCacheContext);

const makeKey = (section: string, key: string) => `${section}::${key}`;

/**
 * Provider that fetches ALL page_content rows for a given pageName in a single query,
 * then exposes them via context for child components to read from.
 * 
 * Write operations still go directly to the database — this cache is read-optimised.
 */
export const PageContentCacheProvider = ({ pageName, children }: { pageName: string; children: ReactNode }) => {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const currentPageRef = useRef(pageName);

  const fetchAll = useCallback(async (page: string) => {
    setIsLoaded(false);
    const { data, error } = await supabase
      .from('page_content')
      .select('section_name, content_key, content_value, content_type')
      .eq('page_name', page);

    if (!error && data) {
      const newCache = new Map<string, CacheEntry>();
      data.forEach(row => {
        newCache.set(makeKey(row.section_name, row.content_key), {
          content_value: row.content_value,
          content_type: row.content_type,
          content_key: row.content_key,
          section_name: row.section_name,
        });
      });
      if (currentPageRef.current === page) {
        setCache(newCache);
        setIsLoaded(true);
      }
    } else {
      if (currentPageRef.current === page) {
        setIsLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    currentPageRef.current = pageName;
    setCache(new Map());
    setIsLoaded(false);
    fetchAll(pageName);
  }, [pageName, fetchAll]);

  const getContent = useCallback((sectionName: string, contentKey: string): string | null => {
    const entry = cache.get(makeKey(sectionName, contentKey));
    return entry?.content_value ?? null;
  }, [cache]);

  const getContentEntry = useCallback((sectionName: string, contentKey: string): CacheEntry | null => {
    return cache.get(makeKey(sectionName, contentKey)) ?? null;
  }, [cache]);

  const getContentBySection = useCallback((sectionName: string, keyPrefix?: string): CacheEntry[] => {
    const results: CacheEntry[] = [];
    cache.forEach((entry) => {
      if (entry.section_name === sectionName) {
        if (!keyPrefix || entry.content_key.startsWith(keyPrefix)) {
          results.push(entry);
        }
      }
    });
    return results;
  }, [cache]);

  const updateCacheEntry = useCallback((sectionName: string, contentKey: string, contentValue: string, contentType?: string) => {
    setCache(prev => {
      const next = new Map(prev);
      next.set(makeKey(sectionName, contentKey), {
        content_value: contentValue,
        content_type: contentType || 'text',
        content_key: contentKey,
        section_name: sectionName,
      });
      return next;
    });
  }, []);

  const removeCacheEntry = useCallback((sectionName: string, contentKey: string) => {
    setCache(prev => {
      const next = new Map(prev);
      next.delete(makeKey(sectionName, contentKey));
      return next;
    });
  }, []);

  const refreshPage = useCallback(async () => {
    await fetchAll(pageName);
  }, [pageName, fetchAll]);

  const value: PageContentCacheContextType = {
    pageName,
    getContent,
    getContentEntry,
    getContentBySection,
    updateCacheEntry,
    removeCacheEntry,
    refreshPage,
    isLoaded,
  };

  return (
    <PageContentCacheContext.Provider value={value}>
      {children}
    </PageContentCacheContext.Provider>
  );
};
