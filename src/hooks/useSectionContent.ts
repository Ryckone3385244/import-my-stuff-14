import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContentIntegrityCheck } from './useContentIntegrityCheck';
import { usePageContentCacheOptional } from './usePageContentCache';
export interface SectionBlock {
  id: string;
  type: 'sectionTitle';
  content: string;
  order: number;
}

export const useSectionContent = (pageName: string, sectionId: string) => {
  const cache = usePageContentCacheOptional();
  const [blocks, setBlocks] = useState<SectionBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to always have access to latest blocks in async callbacks
  const blocksRef = useRef<SectionBlock[]>([]);
  blocksRef.current = blocks;
  
  // Track pending operations to prevent reload conflicts
  const pendingOperationRef = useRef<boolean>(false);
  
  // Content integrity guard
  const { verifyEmptyContent } = useContentIntegrityCheck();
  const integrityRetryRef = useRef<boolean>(false);

  useEffect(() => {
    setBlocks([]);
    setIsLoading(true);
    integrityRetryRef.current = false;

    // If cache is available and loaded, read from it
    const sectionNameDb = `${sectionId}_section`;
    if (cache?.isLoaded) {
      const cachedEntries = cache.getContentBySection(sectionNameDb, 'sectionBlock_');
      const loadedBlocks: SectionBlock[] = cachedEntries.map(entry => {
        try {
          const parsed = JSON.parse(entry.content_value);
          return {
            id: entry.content_key,
            type: parsed.type,
            content: parsed.content,
            order: parsed.order || 0
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as SectionBlock[];

      setBlocks(loadedBlocks.sort((a, b) => a.order - b.order));
      setIsLoading(false);
      return;
    }

    loadBlocks();
  }, [pageName, sectionId, cache?.isLoaded]);

  const loadBlocks = async () => {
    // Don't reload if an operation is pending
    if (pendingOperationRef.current) {
      return;
    }
    
    const { data, error } = await supabase
      .from('page_content')
      .select('content_key, content_value')
      .eq('page_name', pageName)
      .eq('section_name', `${sectionId}_section`)
      .like('content_key', 'sectionBlock_%')
      .order('content_key');

    if (!error && data) {
      const loadedBlocks: SectionBlock[] = data.map(item => {
        try {
          const parsed = JSON.parse(item.content_value);
          return {
            id: item.content_key,
            type: parsed.type,
            content: parsed.content,
            order: parsed.order || 0
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as SectionBlock[];

      // Content integrity guard: verify empty results are genuine
      if (loadedBlocks.length === 0 && !integrityRetryRef.current) {
        integrityRetryRef.current = true;
        const sectionNameDb = `${sectionId}_section`;
        const integrity = await verifyEmptyContent(pageName, sectionNameDb);
        if (integrity.shouldRetry) {
          console.warn(
            `[useSectionContent] Empty result for "${pageName}/${sectionNameDb}" flagged ` +
            `(reason: ${integrity.reason}). Retrying...`
          );
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: retryData } = await supabase
            .from('page_content')
            .select('content_key, content_value')
            .eq('page_name', pageName)
            .eq('section_name', sectionNameDb)
            .like('content_key', 'sectionBlock_%')
            .order('content_key');

          if (retryData && retryData.length > 0) {
            const retryBlocks: SectionBlock[] = retryData.map(item => {
              try {
                const parsed = JSON.parse(item.content_value);
                return {
                  id: item.content_key,
                  type: parsed.type,
                  content: parsed.content,
                  order: parsed.order || 0
                };
              } catch {
                return null;
              }
            }).filter(Boolean) as SectionBlock[];

            if (retryBlocks.length > 0) {
              console.warn(
                `[useSectionContent] Integrity retry recovered ${retryBlocks.length} blocks.`
              );
              setBlocks(retryBlocks.sort((a, b) => a.order - b.order));
              setIsLoading(false);
              return;
            }
          }
        }
      }

      setBlocks(loadedBlocks.sort((a, b) => a.order - b.order));
    }
    
    setIsLoading(false);
  };

  const addBlock = useCallback(async (type: 'sectionTitle') => {
    const currentBlocks = blocksRef.current;
    const newBlock: SectionBlock = {
      id: `sectionBlock_${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: currentBlocks.length
    };

    // Optimistic update - show immediately
    setBlocks(prevBlocks => [...prevBlocks, newBlock]);

    // Then save to database in background
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: `${sectionId}_section`,
        content_key: newBlock.id,
        content_value: JSON.stringify({
          type: newBlock.type,
          content: newBlock.content,
          order: newBlock.order
        })
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      console.error('Failed to add section block:', error);
      // Rollback on error
      setBlocks(prev => prev.filter(b => b.id !== newBlock.id));
    }
  }, [pageName, sectionId]);

  const updateBlock = useCallback(async (blockId: string, content: string) => {
    const currentBlocks = blocksRef.current;
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block) return;

    const previousContent = block.content;

    // Optimistic update - show immediately
    setBlocks(prevBlocks => prevBlocks.map(b => b.id === blockId ? { ...b, content } : b));

    // Then save to database in background
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: `${sectionId}_section`,
        content_key: blockId,
        content_value: JSON.stringify({
          type: block.type,
          content,
          order: block.order
        })
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      console.error('Failed to update section block:', error);
      // Rollback on error
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: previousContent } : b));
    }
  }, [pageName, sectionId]);

  const deleteBlock = useCallback(async (blockId: string) => {
    // Store previous state for rollback using ref
    const previousBlocks = [...blocksRef.current];

    // Mark operation as pending to prevent reload conflicts
    pendingOperationRef.current = true;
    
    // Optimistic update - remove immediately
    setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== blockId));

    // Delete from database and wait for completion
    const { error } = await supabase
      .from('page_content')
      .delete()
      .eq('page_name', pageName)
      .eq('section_name', `${sectionId}_section`)
      .eq('content_key', blockId);
    
    // Clear pending flag
    pendingOperationRef.current = false;

    if (error) {
      console.error('Failed to delete section block:', error);
      // Rollback on error
      setBlocks(previousBlocks);
    }
  }, [pageName, sectionId]);

  return {
    blocks,
    isLoading,
    addBlock,
    updateBlock,
    deleteBlock
  };
};

function getDefaultContent(type: 'sectionTitle'): string {
  switch (type) {
    case 'sectionTitle':
      return JSON.stringify({ text: 'Section Title', color: 'auto', alignment: 'center' });
    default:
      return '';
  }
}
