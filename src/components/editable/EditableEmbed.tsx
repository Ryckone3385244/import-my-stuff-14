import { useState, useEffect, useCallback } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Code } from 'lucide-react';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { BC } from '@/components/builder/builderColors';

interface EditableEmbedProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultSrc: string;
  className?: string;
  height?: string;
}

export const EditableEmbed = ({
  pageName,
  sectionName,
  contentKey,
  defaultSrc,
  className = '',
  height = '800px',
}: EditableEmbedProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const [embedSrc, setEmbedSrc] = useState(defaultSrc);
  const [editingCode, setEditingCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadEmbedSrc = useCallback(async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', contentKey)
      .maybeSingle();

    if (data?.content_value) {
      setEmbedSrc(data.content_value);
    }
  }, [pageName, sectionName, contentKey]);

  useEffect(() => {
    setEmbedSrc(defaultSrc);

    if (cache?.isLoaded) {
      const cached = cache.getContent(sectionName, contentKey);
      if (cached !== null) {
        setEmbedSrc(cached);
      }
    } else {
      loadEmbedSrc();
    }
  }, [pageName, sectionName, contentKey, cache?.isLoaded, loadEmbedSrc]);

  const handleSave = async () => {
    if (!editingCode.trim()) {
      toast.error('Please enter an embed code or URL');
      return;
    }

    // Extract src from iframe if full iframe code is pasted
    let extractedSrc = editingCode.trim();
    const srcMatch = editingCode.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      extractedSrc = srcMatch[1];
    }

    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: extractedSrc,
        content_type: 'text'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      console.error('Failed to save embed code:', error);
      toast.error('Failed to save embed code');
      return;
    }

    setEmbedSrc(extractedSrc);
    setIsEditing(false);
    toast.success('Embed code updated successfully');
    
    // Force reload to ensure the embed displays
    await loadEmbedSrc();
  };

  if (isEditMode && isEditing) {
    return (
      <div className={`p-6 bg-muted/50 rounded-lg ${className}`}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="embed-code" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Third-Party Embed Code
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Paste the complete iframe embed code or just the URL from your third-party form provider
            </p>
            <Textarea
              id="embed-code"
              value={editingCode}
              onChange={(e) => setEditingCode(e.target.value)}
              placeholder='<iframe src="https://..." ...></iframe> or just the URL'
              className="font-mono text-sm min-h-[200px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
            <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleEmbedClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();
    
    const elementId = `embed-${pageName}-${sectionName}-${contentKey}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName,
      componentType: 'embed',
      label: `Embed: ${contentKey}`,
      actions: [
        { id: 'edit', label: 'Edit Embed Code', tone: 'primary', onClick: () => {
          setEditingCode(embedSrc);
          setIsEditing(true);
        }},
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `embed-${pageName}-${sectionName}-${contentKey}`;

  if (isEditMode) {
    return (
      <div className={`relative ${className} ${isEditMode ? 'cursor-pointer' : ''}`} onClick={handleEmbedClick}>
        {embedSrc ? (
          <iframe
            src={embedSrc}
            width="100%"
            height={height}
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            className="w-full"
          />
        ) : (
          <div className="flex items-center justify-center bg-muted text-muted-foreground" style={{ minHeight: height }}>
            <div className="text-center">
              <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No embed code set</p>
              <p className="text-xs mt-1">Click to select, then use the settings panel to edit</p>
            </div>
          </div>
        )}
        {(isSelected) && (
          <div
            className="absolute inset-0 pointer-events-none z-[70] rounded-md"
            style={{
              border: `2px solid ${BC.blue}`,
              boxShadow: `0 0 0 2px ${BC.blue}33`,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {embedSrc ? (
        <iframe
          src={embedSrc}
          width="100%"
          height={height}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          className="w-full"
        />
      ) : (
        <div className="flex items-center justify-center bg-muted text-muted-foreground" style={{ minHeight: height }}>
          <div className="text-center">
            <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No embed available</p>
          </div>
        </div>
      )}
    </div>
  );
};
