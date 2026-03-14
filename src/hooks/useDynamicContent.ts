import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditMode } from '@/contexts/EditModeContext';
import { useContentIntegrityCheck } from './useContentIntegrityCheck';
import { usePageContentCacheOptional } from './usePageContentCache';
export interface ContentBlock {
  id: string;
  type: 'image' | 'text' | 'title' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'toggle' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage' | 'hover-overlay-card' | 'countdown' | 'theater-agenda' | 'exhibitor-carousel' | 'exhibitor-grid' | 'speaker-carousel' | 'speaker-grid' | 'register-form' | 'hero' | 'event-countdown';
  content: string;
  order: number;
  version: number;
}

export const useDynamicContent = (pageName: string, cardId: string) => {
  const { markStructuralChange } = useEditMode();
  const cache = usePageContentCacheOptional();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use ref to always have access to latest blocks in async callbacks
  const blocksRef = useRef<ContentBlock[]>([]);
  blocksRef.current = blocks;
  
  // Track pending operations to prevent reload conflicts
  const pendingOperationRef = useRef<boolean>(false);
  
  // Content integrity guard
  const { verifyEmptyContent } = useContentIntegrityCheck();
  const integrityRetryRef = useRef<boolean>(false);

  useEffect(() => {
    setBlocks([]);
    setIsLoading(true);

    // If cache is available and loaded, read from it
    if (cache?.isLoaded) {
      const cachedEntries = cache.getContentBySection(cardId, 'block_');

      // Cache can be stale right after structural duplication (new section exists in DB
      // but is not yet present in in-memory cache). Fall back to direct DB read.
      if (cachedEntries.length === 0) {
        loadBlocks();
        return;
      }

      const loadedBlocks: ContentBlock[] = cachedEntries.map(entry => {
        try {
          const parsed = JSON.parse(entry.content_value);
          return {
            id: entry.content_key,
            type: parsed.type,
            content: parsed.content,
            order: parsed.order || 0,
            version: parsed.version || 1
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as ContentBlock[];

      setBlocks(loadedBlocks.sort((a, b) => a.order - b.order));
      setIsLoading(false);
      return;
    }

    loadBlocks();
  }, [pageName, cardId, retryCount, cache?.isLoaded]);

  useEffect(() => {
    // Reset retry counter and integrity flag when switching to a different card
    setRetryCount(0);
    integrityRetryRef.current = false;
  }, [pageName, cardId]);

  const loadBlocks = async () => {
    // Don't reload if an operation is pending
    if (pendingOperationRef.current) {
      return;
    }
    
    const { data, error } = await supabase
      .from('page_content')
      .select('content_key, content_value')
      .eq('page_name', pageName)
      .eq('section_name', cardId)
      .like('content_key', 'block_%')
      .order('content_key');

    if (error) {
      setIsLoading(false);
      return;
    }

    const loadedBlocks: ContentBlock[] = (data || []).map(item => {
      try {
        const parsed = JSON.parse(item.content_value);
        return {
          id: item.content_key,
          type: parsed.type,
          content: parsed.content,
          order: parsed.order || 0,
          version: parsed.version || 1
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as ContentBlock[];

    // For freshly duplicated columns/cards, the content rows might not exist yet.
    // If this looks like a duplicate ("-copy-") and nothing is loaded, retry a few times
    // before giving up to avoid showing an empty card.
    if (loadedBlocks.length === 0 && cardId.includes('-copy-') && retryCount < 5) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 300);
      return;
    }

    // Content integrity guard: verify empty results are genuine (not a network blip)
    if (loadedBlocks.length === 0 && !integrityRetryRef.current && !cardId.includes('-copy-')) {
      integrityRetryRef.current = true; // Prevent infinite retry loops
      const integrity = await verifyEmptyContent(pageName, cardId);
      if (integrity.shouldRetry) {
        console.warn(
          `[useDynamicContent] Empty result for "${pageName}/${cardId}" flagged as suspicious ` +
          `(reason: ${integrity.reason}). Retrying...`
        );
        // Wait briefly then retry the load
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData } = await supabase
          .from('page_content')
          .select('content_key, content_value')
          .eq('page_name', pageName)
          .eq('section_name', cardId)
          .like('content_key', 'block_%')
          .order('content_key');

        if (retryData && retryData.length > 0) {
          const retryBlocks: ContentBlock[] = retryData.map(item => {
            try {
              const parsed = JSON.parse(item.content_value);
              return {
                id: item.content_key,
                type: parsed.type,
                content: parsed.content,
                order: parsed.order || 0,
                version: parsed.version || 1
              };
            } catch {
              return null;
            }
          }).filter(Boolean) as ContentBlock[];

          if (retryBlocks.length > 0) {
            console.warn(
              `[useDynamicContent] Integrity retry recovered ${retryBlocks.length} blocks ` +
              `for "${pageName}/${cardId}".`
            );
            setBlocks(retryBlocks.sort((a, b) => a.order - b.order));
            setIsLoading(false);
            return;
          }
        }
      }
    }

    setBlocks(loadedBlocks.sort((a, b) => a.order - b.order));
    setIsLoading(false);
  };

  const addBlock = async (type: 'image' | 'text' | 'title' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'toggle' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage' | 'hover-overlay-card' | 'countdown' | 'theater-agenda') => {
    const newBlock: ContentBlock = {
      id: `block_${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: blocks.length,
      version: 1
    };

    // Mark operation as pending to prevent reload conflicts
    pendingOperationRef.current = true;
    
    // Optimistic update - show immediately
    setBlocks(prevBlocks => [...prevBlocks, newBlock]);

    // Save to database and wait for completion
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: cardId,
        content_key: newBlock.id,
        content_value: JSON.stringify({
          type: newBlock.type,
          content: newBlock.content,
          order: newBlock.order,
          version: newBlock.version
        }),
        content_type: 'text'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });
    
    // Clear pending flag
    pendingOperationRef.current = false;

    if (error) {
      console.error('Failed to add block:', error);
      // Rollback on error
      setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== newBlock.id));
    } else {
      // Sync cache so re-renders pick up the new block
      cache?.updateCacheEntry(cardId, newBlock.id, JSON.stringify({
        type: newBlock.type,
        content: newBlock.content,
        order: newBlock.order,
        version: newBlock.version
      }), 'text');
      // Mark structural change for versioning
      markStructuralChange(pageName);
    }
  };

  const updateBlock = useCallback(async (blockId: string, content: string): Promise<boolean> => {
    // Use ref to get latest blocks, avoiding stale closure issues
    const currentBlocks = blocksRef.current;
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block) {
      console.error('Block not found:', blockId);
      return false;
    }

    const newVersion = (block.version || 0) + 1;
    const previousContent = block.content;

    // Mark operation as pending to prevent reload conflicts
    pendingOperationRef.current = true;
    
    // Optimistic update - show immediately
    setBlocks(prevBlocks => 
      prevBlocks.map(b => b.id === blockId ? { ...b, content, version: newVersion } : b)
    );

    // Save to database and wait for completion
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: cardId,
        content_key: blockId,
        content_value: JSON.stringify({
          type: block.type,
          content,
          order: block.order,
          version: newVersion
        }),
        content_type: 'text'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });
    
    // Clear pending flag
    pendingOperationRef.current = false;

    if (error) {
      console.error('Failed to update block:', error);
      // Rollback on error
      setBlocks(prevBlocks => 
        prevBlocks.map(b => b.id === blockId ? { ...b, content: previousContent, version: block.version } : b)
      );
      return false;
    }

    // Sync cache
    cache?.updateCacheEntry(cardId, blockId, JSON.stringify({
      type: block.type,
      content,
      order: block.order,
      version: newVersion
    }), 'text');

    return true;
  }, [pageName, cardId, cache]);

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
      .eq('section_name', cardId)
      .eq('content_key', blockId);
    
    // Clear pending flag
    pendingOperationRef.current = false;

    if (error) {
      console.error('Failed to delete block:', error);
      // Rollback on error
      setBlocks(previousBlocks);
    } else {
      // Sync cache
      cache?.removeCacheEntry(cardId, blockId);
      // Mark structural change for versioning
      markStructuralChange(pageName);
    }
  }, [pageName, cardId, markStructuralChange, cache]);

  const moveBlock = useCallback(async (blockId: string, direction: 'up' | 'down') => {
    const currentBlocks = blocksRef.current;
    const currentIndex = currentBlocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentBlocks.length) return;

    const newBlocks = [...currentBlocks];
    [newBlocks[currentIndex], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[currentIndex]];
    
    // Update order values
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index
    }));

    // Mark operation as pending to prevent reload conflicts
    pendingOperationRef.current = true;
    
    setBlocks(reorderedBlocks);

    // Save to database and wait for completion
    await Promise.all(
      reorderedBlocks.map(block =>
        supabase
          .from('page_content')
          .upsert({
            page_name: pageName,
            section_name: cardId,
            content_key: block.id,
            content_value: JSON.stringify({
              type: block.type,
              content: block.content,
              order: block.order,
              version: block.version + 1
            })
          }, {
            onConflict: 'page_name,section_name,content_key'
          })
      )
    );
    
    // Clear pending flag
    pendingOperationRef.current = false;
    
    // Sync cache with reordered blocks
    reorderedBlocks.forEach(block => {
      cache?.updateCacheEntry(cardId, block.id, JSON.stringify({
        type: block.type,
        content: block.content,
        order: block.order,
        version: block.version + 1
      }), 'text');
    });
    
    // Mark structural change for versioning
    markStructuralChange(pageName);
  }, [pageName, cardId, markStructuralChange, cache]);

  const duplicateBlock = useCallback(async (blockId: string) => {
    const currentBlocks = blocksRef.current;
    const currentIndex = currentBlocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;

    const source = currentBlocks[currentIndex];
    const timestamp = Date.now();
    const newId = `block_${timestamp}`;

    const cloneContent = (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        // If this block has nested items with IDs (accordion), regenerate them.
        if (parsed?.items && Array.isArray(parsed.items)) {
          parsed.items = parsed.items.map((item: any, index: number) => ({
            ...item,
            id: `accordion-item-${timestamp}-${index}-${Math.random().toString(36).slice(2, 9)}`,
          }));
        }
        return JSON.stringify(parsed);
      } catch {
        return raw;
      }
    };

    const newBlock: ContentBlock = {
      ...source,
      id: newId,
      content: cloneContent(source.content),
      order: source.order + 1,
      version: 1,
    };

    const nextBlocks = [...currentBlocks];
    nextBlocks.splice(currentIndex + 1, 0, newBlock);

    // Recompute orders for all blocks
    const reorderedBlocks = nextBlocks.map((block, index) => {
      const isNew = block.id === newId;
      return {
        ...block,
        order: index,
        version: isNew ? 1 : (block.version || 0) + 1,
      };
    });

    pendingOperationRef.current = true;
    setBlocks(reorderedBlocks);

    await Promise.all(
      reorderedBlocks.map(block =>
        supabase
          .from('page_content')
          .upsert({
            page_name: pageName,
            section_name: cardId,
            content_key: block.id,
            content_value: JSON.stringify({
              type: block.type,
              content: block.content,
              order: block.order,
              version: block.version,
            }),
            content_type: 'text',
          }, {
            onConflict: 'page_name,section_name,content_key'
          })
      )
    );

    pendingOperationRef.current = false;

    reorderedBlocks.forEach(block => {
      cache?.updateCacheEntry(cardId, block.id, JSON.stringify({
        type: block.type,
        content: block.content,
        order: block.order,
        version: block.version,
      }), 'text');
    });

    markStructuralChange(pageName);
  }, [pageName, cardId, markStructuralChange, cache]);

  return {
    blocks,
    isLoading,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    duplicateBlock,
  };
};

function getDefaultContent(type: 'image' | 'text' | 'title' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'toggle' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage' | 'hover-overlay-card' | 'countdown' | 'theater-agenda'): string {
  switch (type) {
    case 'image':
      return '/placeholder.svg';
    case 'text':
      return '<p>Your text content here</p>';
    case 'title':
      return 'Your Title Here';
    case 'button': {
      // Resolve Button 1 colors immediately for new buttons
      const computed = getComputedStyle(document.documentElement);
      const getVar = (suffix: string) => {
        const rawValue = computed.getPropertyValue(`--button${suffix}`).trim();
        if (!rawValue || rawValue === 'undefined' || rawValue === 'null') return null;
        // Ignore unresolved CSS variable chains like hsl(var(--primary)) and resolve inner var instead
        if (rawValue.includes('var(')) {
          const match = rawValue.match(/var\((--[^)]+)\)/);
          if (match) {
            const inner = computed.getPropertyValue(match[1]).trim();
            if (!inner || inner === 'undefined' || inner === 'null') return null;
            if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(inner)) return `hsl(${inner})`;
            return inner;
          }
          return null;
        }
        if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) return `hsl(${rawValue})`;
        return rawValue;
      };
      // Resolve actual color values instead of CSS variable strings
      const resolveColor = (cssVar: string, fallback: string) => {
        const varName = cssVar.replace('var(', '').replace(')', '');
        const rawValue = computed.getPropertyValue(varName).trim();
        if (rawValue && /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) {
          return `hsl(${rawValue})`;
        }
        return rawValue || fallback;
      };
      
      return JSON.stringify({ 
        text: 'Click Me', 
        url: '', 
        target: '_self', 
        fileUrl: '',
        styleType: 'button1',
        buttonColor: getVar('-color') || resolveColor('var(--primary)', '#000000'),
        buttonForeground: getVar('-foreground') || resolveColor('var(--primary-foreground)', '#ffffff'),
        padding: getVar('-padding'),
        borderRadius: getVar('-border-radius'),
        border: getVar('-border'),
        fontSize: getVar('-font-size'),
        fontWeight: getVar('-font-weight'),
        fontStyle: getVar('-font-style'),
        textTransform: getVar('-text-transform')
      });
    }
    case 'video':
      return '';
    case 'icon-with-text':
      return JSON.stringify({ icon: 'CheckCircle', text: 'Your text here' });
    case 'photo-gallery':
      return JSON.stringify({ 
        images: [], 
        config: { 
          desktop: 3, 
          tablet: 2, 
          mobile: 2, 
          aspectRatio: 'square',
          objectFit: 'cover'
        } 
      });
    case 'image-carousel':
      return JSON.stringify({ images: [] });
    case 'toggle':
      return JSON.stringify({ title: 'Click to expand', content: '<p>Hidden content here</p>', isOpen: false });
    case 'accordion':
      return JSON.stringify({ 
        items: [
          { title: 'Accordion Item 1', content: '<p>Content for item 1</p>' },
          { title: 'Accordion Item 2', content: '<p>Content for item 2</p>' }
        ] 
      });
    case 'embed':
      return '';
    case 'sectionTitle':
      return JSON.stringify({ text: 'Section Title', color: 'gradient', alignment: 'center' });
    case 'popupImage':
      return JSON.stringify({
        imageUrl: '/placeholder.svg',
        popupTitle: 'Popup Title',
        popupContent: '<p>Your popup content here</p>'
      });
    case 'hover-overlay-card':
      return JSON.stringify({
        imageUrl: '/placeholder.svg',
        overlayText: '',
        buttonText: 'Learn More',
        buttonUrl: ''
      });
    case 'countdown':
      return JSON.stringify({ value: '10,000+', label: 'Visitors' });
    case 'theater-agenda':
      return JSON.stringify({ theaterName: 'Main Stage', showFullAgendaLink: true });
    default:
      return '';
  }
}
