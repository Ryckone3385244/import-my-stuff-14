import { useState, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { MapPin } from 'lucide-react';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { BC } from '@/components/builder/builderColors';

interface EditableGoogleMapProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultSrc: string;
  className?: string;
}

export const EditableGoogleMap = ({
  pageName,
  sectionName,
  contentKey,
  defaultSrc,
  className = '',
}: EditableGoogleMapProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const [mapSrc, setMapSrc] = useState(defaultSrc);
  const [editingUrl, setEditingUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setMapSrc(defaultSrc);

    if (cache?.isLoaded) {
      const cached = cache.getContent(sectionName, contentKey);
      if (cached !== null) {
        setMapSrc(cached);
      }
    } else {
      loadMapSrc();
    }
  }, [pageName, sectionName, contentKey, cache?.isLoaded]);

  const loadMapSrc = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', contentKey)
      .maybeSingle();

    if (data?.content_value) {
      setMapSrc(data.content_value);
    }
  };

  const handleSave = async () => {
    if (!editingUrl.trim()) {
      toast.error('Please enter a Google Maps embed URL');
      return;
    }

    // Extract src from iframe if full iframe code is pasted
    let extractedSrc = editingUrl;
    const srcMatch = editingUrl.match(/src="([^"]+)"/);
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
      toast.error('Failed to save map location');
      console.error(error);
    } else {
      setMapSrc(extractedSrc);
      setIsEditing(false);
      toast.success('Map location updated successfully');
    }
  };

  if (isEditMode && isEditing) {
    return (
      <div className={`p-6 bg-muted/50 rounded-lg ${className}`}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="map-url" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Google Maps Embed URL
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Go to Google Maps, click Share → Embed a map, and paste the entire iframe code or just the URL
            </p>
            <Input
              id="map-url"
              value={editingUrl}
              onChange={(e) => setEditingUrl(e.target.value)}
              placeholder='Paste iframe code or URL from Google Maps "Embed a map"'
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">Save</Button>
            <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleMapClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();

    const elementId = `map-${pageName}-${sectionName}-${contentKey}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName,
      componentType: 'googleMap',
      label: `Google Map: ${contentKey}`,
      actions: [
        {
          id: 'edit',
          label: 'Edit Map Location',
          tone: 'primary',
          onClick: () => {
            setEditingUrl(mapSrc);
            setIsEditing(true);
          },
        },
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `map-${pageName}-${sectionName}-${contentKey}`;

  return (
    <div
      className={`relative group ${className} ${isEditMode ? 'cursor-pointer' : ''}`}
      onClick={handleMapClick}
    >
      {mapSrc ? (
        <iframe
          src={mapSrc}
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full min-h-[450px]"
        />
      ) : (
        <div className="flex items-center justify-center min-h-[450px] bg-muted text-muted-foreground">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No map location set</p>
            {isEditMode && <p className="text-xs mt-1">Click to select, then use the settings panel to edit</p>}
          </div>
        </div>
      )}
      {isEditMode && isSelected && (
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
};
