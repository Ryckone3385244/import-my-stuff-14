import { useState, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import * as Icons from 'lucide-react';
import { IconPickerDialog } from './IconPickerDialog';
import { LucideProps } from 'lucide-react';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { BC } from '@/components/builder/builderColors';

interface EditableIconProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultIcon: string;
  className?: string;
  iconProps?: Omit<LucideProps, 'ref'>;
}

export const EditableIcon = ({
  pageName,
  sectionName,
  contentKey,
  defaultIcon,
  className = 'w-6 h-6',
  iconProps = {}
}: EditableIconProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const [iconName, setIconName] = useState(defaultIcon);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setIconName(defaultIcon);

    if (cache?.isLoaded) {
      const cached = cache.getContent(sectionName, contentKey);
      if (cached !== null) {
        setIconName(cached);
      }
    } else {
      loadIcon();
    }
  }, [pageName, sectionName, contentKey, cache?.isLoaded]);

  const loadIcon = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', contentKey)
      .maybeSingle();

    if (data?.content_value) {
      setIconName(data.content_value);
    }
  };

  const handleIconSelect = async (selectedIconName: string) => {
    setIconName(selectedIconName);
    
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: selectedIconName,
        content_type: 'icon'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      toast.error('Failed to save icon');
      console.error(error);
      setIconName(defaultIcon);
    } else {
      toast.success('Icon updated');
    }
  };

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[iconName] || 
    (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[defaultIcon];

  if (!IconComponent) {
    return null;
  }

  const handleIconClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    
    if (builder) {
      const elementId = `icon-${pageName}-${sectionName}-${contentKey}`;
      builder.selectElement({
        id: elementId,
        type: 'component',
        pageName,
        componentType: 'icon',
        label: `Icon: ${iconName}`,
        actions: [
          { id: 'change', label: 'Change Icon', tone: 'primary', onClick: () => setShowPicker(true) },
        ],
      });
    } else {
      setShowPicker(true);
    }
  };

  const isSelected = builder?.selectedElement?.id === `icon-${pageName}-${sectionName}-${contentKey}`;

  return (
    <>
      <div
        className={`relative inline-block group ${isEditMode ? 'cursor-pointer' : ''}`}
        onClick={handleIconClick}
        style={isEditMode && isSelected ? { outline: `2px solid ${BC.blue}`, outlineOffset: '2px', borderRadius: '4px' } : undefined}
      >
        <IconComponent className={className} {...iconProps} />
      </div>

      <IconPickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        onIconSelect={handleIconSelect}
        currentIcon={iconName}
      />
    </>
  );
};
