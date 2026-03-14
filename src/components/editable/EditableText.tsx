import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { useEventSettingsContext } from '@/contexts/EventSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Pencil } from 'lucide-react';
import { sanitizeHtml } from '@/lib/utils';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';

interface EditableTextProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultValue: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  style?: React.CSSProperties;
  onSave?: (newValue: string) => void;
  allowFormatting?: boolean;
}

export const EditableText = ({
  pageName,
  sectionName,
  contentKey,
  defaultValue,
  className = '',
  as: Component = 'p',
  style,
  onSave,
  allowFormatting = true
}: EditableTextProps) => {
  const { 
    isEditMode, 
    registerChange, 
    registerDraftChange, 
    registerFlushCallback, 
    unregisterFlushCallback 
  } = useEditMode();
  const { replacePlaceholders } = useEventSettingsContext();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const [text, setText] = useState(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement & HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>(null);
  const isEditingRef = useRef(false);
  const inputDebounceRef = useRef<number | null>(null);
  const instanceId = useRef(`text-${pageName}-${sectionName}-${contentKey}`);

  useEffect(() => {
    setText(defaultValue);

    // Try cache first, fall back to direct query
    if (cache?.isLoaded) {
      const cached = cache.getContent(sectionName, contentKey);
      if (cached !== null) {
        // Try to parse as JSON first (for DynamicCard blocks)
        try {
          const parsed = JSON.parse(cached);
          if (parsed.content !== undefined) {
            setText(parsed.content);
            return;
          }
        } catch {
          // Not JSON, use raw value
        }
        setText(cached);
      }
    } else {
      loadContent();
    }
  }, [pageName, sectionName, contentKey, defaultValue, cache?.isLoaded]);

  // Handle edit mode being turned off while editing
  useEffect(() => {
    if (!isEditMode && isEditing) {
      contentRef.current?.blur();
    }
  }, [isEditMode, isEditing]);

  const loadContent = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', contentKey)
      .maybeSingle();

    if (data) {
      // Try to parse as JSON first (for DynamicCard blocks)
      try {
        const parsed = JSON.parse(data.content_value);
        if (parsed.content !== undefined) {
          setText(parsed.content);
          return;
        }
      } catch {
        // Not JSON or doesn't have content field, use raw value
      }
      setText(data.content_value);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.stopPropagation();
      e.preventDefault();
      
      // Register with builder to show in settings panel
      if (builder && !isEditing) {
        const elementId = `text-${pageName}-${sectionName}-${contentKey}`;
        builder.selectElement({
          id: elementId,
          type: 'component',
          pageName,
          componentType: 'text',
          label: `Text: ${contentKey}`,
          actions: [
            { id: 'edit', label: 'Edit Text (click to type)', tone: 'primary', onClick: () => {
              isEditingRef.current = true;
              setIsEditing(true);
              registerDraftChange(pageName);
              setTimeout(() => contentRef.current?.focus(), 0);
            }},
          ],
        });
      }
      
      if (!isEditing) {
        isEditingRef.current = true;
        setIsEditing(true);
        // Mark page dirty immediately when entering edit on a field
        registerDraftChange(pageName);
        setTimeout(() => {
          contentRef.current?.focus();
        }, 0);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Always strip formatting from pasted content to follow project styling
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, plainText);
  };

  const handleInput = () => {
    if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
    inputDebounceRef.current = window.setTimeout(() => {
      registerDraftChange(pageName); // Mark dirty while typing
    }, 250);

    if (!allowFormatting && contentRef.current) {
      // Strip formatting except for line breaks
      const sanitized = sanitizeHtml(contentRef.current.innerHTML, 'paragraphs-only');
      if (contentRef.current.innerHTML !== sanitized) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        const offset = range?.startOffset || 0;
        
        contentRef.current.innerHTML = sanitized;
        
        // Restore cursor position
        if (selection && range && contentRef.current.firstChild) {
          const newRange = document.createRange();
          newRange.setStart(contentRef.current.firstChild, Math.min(offset, contentRef.current.firstChild.textContent?.length || 0));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  };

  const commitCurrentEdit = useCallback(() => {
    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
      inputDebounceRef.current = null;
    }
    
    if (!isEditingRef.current || !contentRef.current) return;
    
    isEditingRef.current = false;
    setIsEditing(false);

    let currentHtml = contentRef.current.innerHTML || '';
    
    // Apply sanitization based on formatting mode
    currentHtml = sanitizeHtml(currentHtml, allowFormatting ? 'full' : 'paragraphs-only');
    
    // Compare with current state to detect actual changes
    const normalizedCurrent = currentHtml.trim();
    const normalizedPrevious = text.trim();
    
    if (normalizedCurrent !== normalizedPrevious) {
      setText(currentHtml);
      
      // Register change for deferred save instead of saving immediately
      registerChange({
        pageName,
        sectionName,
        contentKey,
        contentValue: currentHtml,
        contentType: 'text'
      });
      
      onSave?.(currentHtml);
    }
  }, [pageName, sectionName, contentKey, text, allowFormatting, registerChange, onSave]);

  // Register flush callback for edit mode transitions
  useEffect(() => {
    registerFlushCallback(instanceId.current, commitCurrentEdit);
    return () => unregisterFlushCallback(instanceId.current);
  }, [registerFlushCallback, unregisterFlushCallback, commitCurrentEdit]);

  const handleBlur = () => {
    commitCurrentEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (contentRef.current) contentRef.current.innerHTML = text;
      isEditingRef.current = false;
      setIsEditing(false);
      contentRef.current?.blur();
    }
    
    // Prevent formatting shortcuts when formatting is disabled
    if (!allowFormatting) {
      if ((e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
  };

  // Check if content is empty or only whitespace
  const sanitizedText = sanitizeHtml(text, allowFormatting ? 'full' : 'paragraphs-only');
  const isContentEmpty = !sanitizedText || sanitizedText.trim() === '' || sanitizedText === '<br>' || sanitizedText === '<br/>';

  // Check if whitespace-nowrap is in className
  const hasWhitespaceNowrap = className.includes('whitespace-nowrap');

  // Replace placeholders for display (but not when editing - show raw template syntax)
  const displayText = isEditing ? sanitizedText : replacePlaceholders(sanitizedText);

  return (
    <div className={`relative inline-block group ${hasWhitespaceNowrap ? 'w-auto' : 'w-full'}`}>
      <Component
        ref={contentRef}
        className={`${className} ${isEditMode ? 'cursor-pointer' : ''} ${isEditing ? 'outline outline-2 outline-primary' : ''} ${hasWhitespaceNowrap ? '' : 'whitespace-pre-wrap'} ${isContentEmpty && isEditMode && !isEditing ? 'min-h-[1.5em] border border-dashed border-muted-foreground/30' : ''}`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onClick={handleClick}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onInput={handleInput}
        style={style}
        dangerouslySetInnerHTML={{ __html: isContentEmpty && isEditMode ? '&nbsp;' : displayText }}
      />
      {isEditMode && !isEditing && (
        <Pencil className="absolute -right-6 top-0 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
