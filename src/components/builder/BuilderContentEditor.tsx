import { useState, useEffect } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImagePickerDialog } from '@/components/editable/ImagePickerDialog';
import { BC } from './builderColors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Renders content editing controls in the BuilderSettingsPanel
 * based on the selected component type.
 */
export const BuilderContentEditor = () => {
  const { selectedElement } = useBuilder();

  if (!selectedElement) {
    return (
      <p style={{ color: BC.textMuted }} className="text-xs text-center py-8 px-3">
        Select a section, column, or component to edit settings here.
      </p>
    );
  }

  const { type, componentType, contentData, onContentUpdate, onContentSave, actions } = selectedElement;

  // Handle section background
  if (type === 'section') {
    return <SectionBackgroundEditor data={contentData} onSave={onContentSave} actions={actions} />;
  }

  // Handle column background
  if (type === 'column') {
    return <ColumnBackgroundEditor data={contentData} onSave={onContentSave} actions={actions} />;
  }

  // Handle component types
  if (type === 'component' && componentType) {
    switch (componentType) {
      case 'button':
        return <ButtonEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'text':
        return <TextEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'embed':
        return <EmbedEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'sectionTitle':
        return <SectionTitleEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'accordion':
        return <AccordionEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'image':
        return <ImageEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'video':
        return <VideoEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'title':
        return <TitleEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'countdown':
        return <CountdownEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'theater-agenda':
        return <TheaterAgendaEditor data={contentData} onUpdate={onContentUpdate} onSave={onContentSave} actions={actions} />;
      case 'exhibitor-carousel':
        return <DataBlockConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Exhibitor Carousel" showSearch={false} />;
      case 'exhibitor-grid':
        return <DataBlockConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Exhibitor Grid" showSearch />;
      case 'speaker-carousel':
        return <DataBlockConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Speaker Carousel" showSearch={false} />;
      case 'speaker-grid':
        return <DataBlockConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Speaker Grid" showSearch />;
      case 'register-form':
        return <RegisterFormEditor data={contentData} onSave={onContentSave} actions={actions} />;
      case 'photo-gallery':
        return <GalleryConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Photo Gallery" />;
      case 'image-carousel':
        return <GalleryConfigEditor data={contentData} onSave={onContentSave} actions={actions} label="Image Carousel" showCarouselOptions />;
      default:
        return <ActionsOnlyEditor actions={actions} componentType={componentType} />;
    }
  }

  // Fallback for non-component selections with actions
  if (actions?.length) {
    return (
      <div className="p-3 space-y-3">
        {actions.map((action) => {
          const tones = {
            default: { bg: BC.controlBg, text: BC.text, border: BC.border },
            primary: { bg: BC.blue, text: BC.white, border: BC.blue },
            danger: { bg: BC.red, text: BC.shellBg, border: BC.red },
            warn: { bg: BC.amber, text: BC.shellBg, border: BC.amber },
          }[action.tone || 'default'];

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              style={{ background: tones.bg, color: tones.text, border: `1px solid ${tones.border}` }}
              className="w-full h-9 px-3 rounded-md text-xs font-medium text-left transition-opacity hover:opacity-90"
            >
              {action.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <p style={{ color: BC.textMuted }} className="text-xs text-center py-8 px-3">
      Select a section, column, or component to edit settings here.
    </p>
  );
};

interface EditorProps {
  data?: Record<string, any>;
  onUpdate?: (data: any) => void;
  onSave?: (data: any) => void;
  actions?: { id: string; label: string; tone?: string; onClick: () => void }[];
}

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BC.textDim }}>
    {children}
  </span>
);

const PanelInput = ({ value, onChange, placeholder, ...props }: any) => (
  <Input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
    {...props}
  />
);

const SaveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{ background: BC.blue, color: BC.white }}
    className="w-full h-8 rounded-md text-xs font-medium transition-opacity hover:opacity-90 mt-2"
  >
    Save Changes
  </button>
);

const ActionButtons = ({ actions }: { actions?: EditorProps['actions'] }) => {
  if (!actions?.length) return null;
  // Only show non-content actions (move, delete)
  const nonContentActions = actions.filter(a => !a.id.startsWith('edit-'));
  if (!nonContentActions.length) return null;
  return (
    <div className="space-y-1.5 pt-2" style={{ borderTop: `1px solid ${BC.border}` }}>
      {nonContentActions.map((action) => {
        const tones = {
          default: { bg: BC.controlBg, text: BC.text, border: BC.border },
          primary: { bg: BC.blue, text: BC.white, border: BC.blue },
          danger: { bg: BC.red, text: BC.shellBg, border: BC.red },
          warn: { bg: BC.amber, text: BC.shellBg, border: BC.amber },
        }[action.tone || 'default'];
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            style={{ background: tones.bg, color: tones.text, border: `1px solid ${tones.border}` }}
            className="w-full h-8 px-3 rounded-md text-xs font-medium text-left transition-opacity hover:opacity-90"
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Button Editor ──────────────────────────────────────────────────
const ButtonEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [local, setLocal] = useState(data || {});
  useEffect(() => { if (data) setLocal(data); }, [data]);

  const update = (key: string, value: any) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onUpdate?.(next);
  };

  const handleStyleChange = (value: string) => {
    const computed = getComputedStyle(document.documentElement);
    const prefix = value === 'button1' ? '--button' : '--button-2';
    const getVar = (suffix: string) => {
      const rawValue = computed.getPropertyValue(`${prefix}${suffix}`).trim();
      if (!rawValue || rawValue === 'undefined' || rawValue === 'null') return null;
      if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) return `hsl(${rawValue})`;
      return rawValue;
    };
    const next = {
      ...local,
      styleType: value,
      buttonColor: getVar('-color') || 'hsl(var(--primary))',
      buttonForeground: getVar('-foreground') || 'hsl(var(--primary-foreground))',
      padding: getVar('-padding') || undefined,
      borderRadius: getVar('-border-radius') || undefined,
      border: getVar('-border') || undefined,
      fontSize: getVar('-font-size') || undefined,
      fontWeight: getVar('-font-weight') || undefined,
      fontStyle: getVar('-font-style') || undefined,
      textTransform: getVar('-text-transform') || undefined,
    };
    setLocal(next);
    onUpdate?.(next);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Button Settings</PanelLabel>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Text</Label>
          <PanelInput value={local.text || ''} onChange={(e: any) => update('text', e.target.value)} placeholder="Button text" maxLength={50} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">URL</Label>
          <PanelInput value={local.url || ''} onChange={(e: any) => update('url', e.target.value)} placeholder="https://example.com" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Upload File</Label>
          <input
            type="file"
            className="w-full text-[10px] text-white/60"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { error } = await supabase.storage.from('media-library').upload(fileName, file);
                if (error) throw error;
                const { data: d } = supabase.storage.from('media-library').getPublicUrl(fileName);
                update('url', d.publicUrl);
                update('fileUrl', d.publicUrl);
                toast.success('File uploaded');
              } catch {
                toast.error('Upload failed');
              }
            }}
          />
          {local.fileUrl && <p className="text-[10px] text-white/30 truncate">{local.fileUrl.split('/').pop()}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Open In</Label>
          <Select value={local.target || '_self'} onValueChange={v => update('target', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_self">Same Window</SelectItem>
              <SelectItem value="_blank">New Window</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Style</Label>
          <Select value={local.styleType || 'button1'} onValueChange={handleStyleChange}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="button1">Button 1</SelectItem>
              <SelectItem value="button2">Button 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Alignment</Label>
          <Select value={local.alignment || 'left'} onValueChange={v => update('alignment', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SaveButton onClick={() => onSave?.(local)} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Text Editor ────────────────────────────────────────────────────
const TextEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [content, setContent] = useState(data?.content || '');
  useEffect(() => { if (data?.content !== undefined) setContent(data.content); }, [data?.content]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Rich Text Editor</PanelLabel>
        <div className="rounded-md overflow-hidden border border-white/10">
          <RichTextEditor
            content={content}
            onChange={(val) => {
              setContent(val);
              onUpdate?.({ content: val });
            }}
          />
        </div>
        <SaveButton onClick={() => onSave?.({ content })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Embed Editor ───────────────────────────────────────────────────
const EmbedEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [code, setCode] = useState(data?.code || '');
  useEffect(() => { if (data?.code !== undefined) setCode(data.code); }, [data?.code]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Embed Code</PanelLabel>
        <p className="text-[10px]" style={{ color: BC.textDim }}>
          Paste iframe embed code or URL from YouTube, Vimeo, Issuu, forms, etc.
        </p>
        <Textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            onUpdate?.({ code: e.target.value });
          }}
          placeholder='<iframe src="https://..." ...></iframe>'
          className="font-mono text-xs min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/20"
        />
        <SaveButton onClick={() => onSave?.({ code })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Section Title Editor ───────────────────────────────────────────
const SectionTitleEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [local, setLocal] = useState(data || {});
  useEffect(() => { if (data) setLocal(data); }, [data]);

  const update = (key: string, value: any) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onUpdate?.(next);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Section Title</PanelLabel>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Title Text</Label>
          <PanelInput value={local.text || ''} onChange={(e: any) => update('text', e.target.value)} placeholder="Section Title" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Text Color</Label>
          <Select value={local.color || 'auto'} onValueChange={v => update('color', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="white">White</SelectItem>
              <SelectItem value="black">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Alignment</Label>
          <Select value={local.alignment || 'center'} onValueChange={v => update('alignment', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SaveButton onClick={() => onSave?.(local)} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Accordion Editor ───────────────────────────────────────────────
const AccordionEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [items, setItems] = useState<any[]>(data?.items || []);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  useEffect(() => { if (data?.items) setItems(data.items); }, [data?.items]);

  const handleAddItem = () => {
    const newItems = [
      ...items,
      { id: `accordion-item-${Date.now()}`, title: 'New Item', content: '<p>Content here</p>', defaultOpen: false }
    ];
    setItems(newItems);
    onSave?.({ items: newItems });
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onSave?.({ items: newItems });
  };

  const handleSaveItem = () => {
    onSave?.({ items });
    setEditIndex(null);
  };

  if (editIndex !== null && items[editIndex]) {
    const item = items[editIndex];
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <PanelLabel>Edit Item #{editIndex + 1}</PanelLabel>
            <button
              onClick={() => setEditIndex(null)}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ color: BC.textMuted, border: `1px solid ${BC.border}` }}
            >
              Back
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/50">Title</Label>
            <PanelInput
              value={item.title}
              onChange={(e: any) => {
                const newItems = [...items];
                newItems[editIndex] = { ...item, title: e.target.value };
                setItems(newItems);
              }}
              placeholder="Item title"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/50">Content</Label>
            <div className="rounded-md overflow-hidden border border-white/10">
              <RichTextEditor
                content={item.content}
                onChange={(content) => {
                  const newItems = [...items];
                  newItems[editIndex] = { ...item, content };
                  setItems(newItems);
                }}
              />
            </div>
          </div>

          <SaveButton onClick={handleSaveItem} />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Accordion Items</PanelLabel>
        
        {items.map((item: any, index: number) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-md"
            style={{ background: BC.controlBg, border: `1px solid ${BC.border}` }}
          >
            <span className="text-xs flex-1 truncate" style={{ color: BC.text }}>
              {item.title || `Item ${index + 1}`}
            </span>
            <button
              onClick={() => setEditIndex(index)}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: BC.blue }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteItem(index)}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: BC.red }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={handleAddItem}
          style={{ background: BC.blue, color: BC.white }}
          className="w-full h-8 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
        >
          + Add Accordion Item
        </button>

        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Image Editor ───────────────────────────────────────────────────
const ImageEditor = ({ data, onUpdate, onSave, actions }: EditorProps) => {
  const [imageUrl, setImageUrl] = useState(data?.src || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState<'_self' | '_blank'>('_blank');
  const [widthValue, setWidthValue] = useState('100');
  const [widthUnit, setWidthUnit] = useState('%');
  const [objectFit, setObjectFit] = useState<string>('cover');
  const [alignment, setAlignment] = useState<string>('left');
  const [aspectRatio, setAspectRatio] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const pageName = data?.pageName;
  const sectionName = data?.sectionName;
  const contentKey = data?.contentKey;

  // Load existing settings from DB
  useEffect(() => {
    if (!pageName || !sectionName || !contentKey) return;
    const load = async () => {
      const { data: linkData } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', sectionName)
        .eq('content_key', `${contentKey}-link`)
        .maybeSingle();
      if (linkData) {
        try {
          const parsed = JSON.parse(linkData.content_value);
          setLinkUrl(parsed.url || linkData.content_value);
          setLinkTarget(parsed.target || '_blank');
        } catch {
          setLinkUrl(linkData.content_value);
        }
      }
      const { data: settingsData } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', sectionName)
        .eq('content_key', `${contentKey}-settings`)
        .maybeSingle();
      if (settingsData) {
        try {
          const parsed = JSON.parse(settingsData.content_value);
          setWidthValue(parsed.width?.value || '100');
          setWidthUnit(parsed.width?.unit || '%');
          setAspectRatio(parsed.aspectRatio || 'none');
          setObjectFit(parsed.objectFit || 'cover');
          setAlignment(parsed.alignment || 'left');
        } catch {}
      }
      setIsLoading(false);
    };
    load();
  }, [pageName, sectionName, contentKey]);

  useEffect(() => { if (data?.src) setImageUrl(data.src); }, [data?.src]);

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    onSave?.({ src: url });
    setShowPicker(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('media-library').upload(fileName, file);
      if (error) throw error;
      const { data: d } = supabase.storage.from('media-library').getPublicUrl(fileName);
      setImageUrl(d.publicUrl);
      onSave?.({ src: d.publicUrl });
      setShowPicker(false);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleSaveLink = async () => {
    if (!pageName || !sectionName || !contentKey) return;
    const linkValue = JSON.stringify({ url: linkUrl, target: linkTarget });
    await supabase.from('page_content').upsert({
      page_name: pageName,
      section_name: sectionName,
      content_key: `${contentKey}-link`,
      content_type: 'link',
      content_value: linkValue,
    }, { onConflict: 'page_name,section_name,content_key' });
    window.dispatchEvent(
      new CustomEvent('editable-image:updated', {
        detail: { pageName, sectionName, contentKey, kind: 'link' },
      })
    );
    toast.success('Link saved');
  };

  const handleSaveSettings = async () => {
    if (!pageName || !sectionName || !contentKey) return;
    const settingsValue = JSON.stringify({
      width: { value: widthValue, unit: widthUnit },
      aspectRatio,
      objectFit,
      alignment,
    });
    await supabase.from('page_content').upsert({
      page_name: pageName,
      section_name: sectionName,
      content_key: `${contentKey}-settings`,
      content_type: 'settings',
      content_value: settingsValue,
    }, { onConflict: 'page_name,section_name,content_key' });
    window.dispatchEvent(
      new CustomEvent('editable-image:updated', {
        detail: { pageName, sectionName, contentKey, kind: 'settings' },
      })
    );
    toast.success('Settings saved');
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Preview */}
        {imageUrl && (
          <div className="rounded-md overflow-hidden border border-white/10">
            <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-40 object-contain" />
          </div>
        )}

        {/* Replace Image - opens full picker modal */}
        <div className="space-y-1.5">
          <PanelLabel>Replace Image</PanelLabel>
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-md text-xs font-medium cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: BC.controlBg, color: BC.text, border: `1px solid ${BC.border}` }}
          >
            Choose Image
          </button>
        </div>

        <ImagePickerDialog
          open={showPicker}
          onOpenChange={setShowPicker}
          onImageSelect={handleImageSelect}
          onFileUpload={handleFileUpload}
        />

        {/* Image URL */}
        <div className="space-y-1.5">
          <PanelLabel>Image URL</PanelLabel>
          <div className="flex gap-1.5">
            <PanelInput value={imageUrl} onChange={(e: any) => setImageUrl(e.target.value)} placeholder="https://..." />
            <button
              onClick={() => onSave?.({ src: imageUrl })}
              style={{ background: BC.blue, color: BC.white }}
              className="h-7 px-2 rounded-md text-[10px] font-medium shrink-0"
            >
              Set
            </button>
          </div>
        </div>

        {/* Link */}
        <div className="space-y-1.5" style={{ borderTop: `1px solid ${BC.border}`, paddingTop: '12px' }}>
          <PanelLabel>Link</PanelLabel>
          <PanelInput value={linkUrl} onChange={(e: any) => setLinkUrl(e.target.value)} placeholder="https://..." />
          <Select value={linkTarget} onValueChange={(v: any) => setLinkTarget(v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_self">Same Window</SelectItem>
              <SelectItem value="_blank">New Window</SelectItem>
            </SelectContent>
          </Select>
          <SaveButton onClick={handleSaveLink} />
        </div>

        {/* Display Settings */}
        <div className="space-y-1.5" style={{ borderTop: `1px solid ${BC.border}`, paddingTop: '12px' }}>
          <PanelLabel>Display Settings</PanelLabel>

          <div className="flex gap-1.5">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-white/50">Width</Label>
              <PanelInput value={widthValue} onChange={(e: any) => setWidthValue(e.target.value)} type="number" />
            </div>
            <div className="w-16 space-y-1">
              <Label className="text-[10px] text-white/50">Unit</Label>
              <Select value={widthUnit} onValueChange={setWidthUnit}>
                <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-white/50">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="square">Square (1:1)</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-white/50">Object Fit</Label>
            <Select value={objectFit} onValueChange={setObjectFit}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="scale-down">Scale Down</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-white/50">Alignment</Label>
            <Select value={alignment} onValueChange={setAlignment}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SaveButton onClick={handleSaveSettings} />
        </div>

        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Video Editor ───────────────────────────────────────────────────
const VideoEditor = ({ data, onSave, actions }: EditorProps) => {
  const [videoUrl, setVideoUrl] = useState(data?.src || '');
  useEffect(() => { if (data?.src) setVideoUrl(data.src); }, [data?.src]);

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('media-library').upload(fileName, file);
      if (error) throw error;
      const { data: d } = supabase.storage.from('media-library').getPublicUrl(fileName);
      setVideoUrl(d.publicUrl);
      onSave?.({ src: d.publicUrl });
      toast.success('Video uploaded');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Video Settings</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Video URL</Label>
          <PanelInput value={videoUrl} onChange={(e: any) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Upload Video</Label>
          <input type="file" accept="video/*" className="w-full text-[10px] text-white/60" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
        </div>
        <SaveButton onClick={() => onSave?.({ src: videoUrl })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Title Editor ───────────────────────────────────────────────────
const TitleEditor = ({ data, onSave, actions }: EditorProps) => {
  const [text, setText] = useState(data?.text || '');
  useEffect(() => { if (data?.text !== undefined) setText(data.text); }, [data?.text]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Title</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Title Text</Label>
          <PanelInput value={text} onChange={(e: any) => setText(e.target.value)} placeholder="Enter title" />
        </div>
        <SaveButton onClick={() => onSave?.({ text })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Countdown Editor ───────────────────────────────────────────────
const CountdownEditor = ({ data, onSave, actions }: EditorProps) => {
  const [value, setValue] = useState(data?.value || '10,000+');
  const [label, setLabel] = useState(data?.label || 'Visitors');
  useEffect(() => { if (data?.value !== undefined) setValue(data.value); if (data?.label !== undefined) setLabel(data.label); }, [data?.value, data?.label]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Counter Settings</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Value</Label>
          <PanelInput value={value} onChange={(e: any) => setValue(e.target.value)} placeholder="10,000+" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Label</Label>
          <Textarea value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="text-xs min-h-[60px] bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        </div>
        <SaveButton onClick={() => onSave?.({ value, label })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Theater Agenda Editor ──────────────────────────────────────────
const TheaterAgendaEditor = ({ data, onSave, actions }: EditorProps) => {
  const [theaterName, setTheaterName] = useState(data?.theaterName || 'Main Stage');
  const [showLink, setShowLink] = useState(data?.showFullAgendaLink !== false);
  useEffect(() => { if (data?.theaterName !== undefined) setTheaterName(data.theaterName); if (data?.showFullAgendaLink !== undefined) setShowLink(data.showFullAgendaLink); }, [data?.theaterName, data?.showFullAgendaLink]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Theater Agenda</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Theater / Venue Name</Label>
          <PanelInput value={theaterName} onChange={(e: any) => setTheaterName(e.target.value)} placeholder="Main Stage" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={showLink} onChange={(e) => setShowLink(e.target.checked)} className="rounded" />
          <Label className="text-[10px] text-white/50">Show "View Full Agenda" link</Label>
        </div>
        <SaveButton onClick={() => onSave?.({ theaterName, showFullAgendaLink: showLink })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Data Block Config Editor (exhibitor/speaker carousel/grid) ─────
const DataBlockConfigEditor = ({ data, onSave, actions, label, showSearch }: EditorProps & { label: string; showSearch: boolean }) => {
  const [title, setTitle] = useState(data?.title || '');
  const [showTitle, setShowTitle] = useState(data?.showTitle !== false);
  const [limit, setLimit] = useState(data?.limit || '');
  const [columns, setColumns] = useState(data?.columns || 4);
  const [showSearchState, setShowSearchState] = useState(data?.showSearch !== false);
  useEffect(() => {
    if (data) {
      setTitle(data.title || '');
      setShowTitle(data.showTitle !== false);
      setLimit(data.limit || '');
      setColumns(data.columns || 4);
      setShowSearchState(data.showSearch !== false);
    }
  }, [data]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>{label} Settings</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Title</Label>
          <PanelInput value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder={label} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} className="rounded" />
          <Label className="text-[10px] text-white/50">Show Title</Label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Limit (0 = all)</Label>
          <PanelInput type="number" value={limit} onChange={(e: any) => setLimit(e.target.value ? Number(e.target.value) : '')} placeholder="0" />
        </div>
        {showSearch && (
          <>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showSearchState} onChange={(e) => setShowSearchState(e.target.checked)} className="rounded" />
              <Label className="text-[10px] text-white/50">Show Search</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-white/50">Columns</Label>
              <PanelInput type="number" value={columns} onChange={(e: any) => setColumns(Number(e.target.value) || 4)} min={1} max={6} />
            </div>
          </>
        )}
        <SaveButton onClick={() => onSave?.({ title, showTitle, limit: limit || undefined, columns, showSearch: showSearchState })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Register Form Editor ───────────────────────────────────────────
const RegisterFormEditor = ({ data, onSave, actions }: EditorProps) => {
  const [title, setTitle] = useState(data?.title || 'Register Your Interest');
  const [description, setDescription] = useState(data?.description || '');
  const [interestType, setInterestType] = useState(data?.interestType || 'general');
  useEffect(() => {
    if (data) { setTitle(data.title || 'Register Your Interest'); setDescription(data.description || ''); setInterestType(data.interestType || 'general'); }
  }, [data]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>Register Form Settings</PanelLabel>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Title</Label>
          <PanelInput value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="Register Your Interest" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="text-xs min-h-[60px] bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Interest Type</Label>
          <PanelInput value={interestType} onChange={(e: any) => setInterestType(e.target.value)} placeholder="general" />
        </div>
        <SaveButton onClick={() => onSave?.({ title, description, interestType })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Gallery Config Editor (photo-gallery, image-carousel) ──────────
const GalleryConfigEditor = ({ data, onSave, actions, label, showCarouselOptions }: EditorProps & { label: string; showCarouselOptions?: boolean }) => {
  const [config, setConfig] = useState(data?.config || {});
  useEffect(() => { if (data?.config) setConfig(data.config); }, [data?.config]);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>{label} Settings</PanelLabel>
        <p className="text-[10px]" style={{ color: BC.textDim }}>
          Images are managed inline on the canvas. Use these settings to configure the layout.
        </p>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Desktop Columns</Label>
          <PanelInput type="number" value={config.desktop || 3} onChange={(e: any) => updateConfig('desktop', Number(e.target.value))} min={1} max={6} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Tablet Columns</Label>
          <PanelInput type="number" value={config.tablet || 2} onChange={(e: any) => updateConfig('tablet', Number(e.target.value))} min={1} max={4} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Mobile Columns</Label>
          <PanelInput type="number" value={config.mobile || 1} onChange={(e: any) => updateConfig('mobile', Number(e.target.value))} min={1} max={3} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Aspect Ratio</Label>
          <Select value={config.aspectRatio || 'square'} onValueChange={v => updateConfig('aspectRatio', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Square (1:1)</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="3:2">3:2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Object Fit</Label>
          <Select value={config.objectFit || 'cover'} onValueChange={v => updateConfig('objectFit', v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showCarouselOptions && (
          <>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.showArrows !== false} onChange={(e) => updateConfig('showArrows', e.target.checked)} className="rounded" />
              <Label className="text-[10px] text-white/50">Show Arrows</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.showPagination !== false} onChange={(e) => updateConfig('showPagination', e.target.checked)} className="rounded" />
              <Label className="text-[10px] text-white/50">Show Pagination</Label>
            </div>
          </>
        )}
        <SaveButton onClick={() => onSave?.({ ...data, config })} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Actions-Only Editor (inline-edit types) ────────────────────────
const ActionsOnlyEditor = ({ actions, componentType }: EditorProps & { componentType?: string }) => {
  const friendlyNames: Record<string, string> = {
    'icon-with-text': 'Icon with Text',
    'hover-overlay-card': 'Hover Overlay Card',
    'event-countdown': 'Event Countdown',
    'hero': 'Hero Block',
    'popupImage': 'Popup Image',
    'toggle': 'Toggle',
  };
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <PanelLabel>{friendlyNames[componentType || ''] || componentType || 'Component'}</PanelLabel>
        <p className="text-[10px]" style={{ color: BC.textDim }}>
          This component is edited directly on the canvas.
        </p>
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Section Background Editor ──────────────────────────────────────
const SectionBackgroundEditor = ({ data, onSave, actions }: EditorProps) => {
  const [bgType, setBgType] = useState<'none' | 'color' | 'gradient' | 'image'>(data?.backgroundType || 'none');
  const [bgValue, setBgValue] = useState(data?.backgroundValue || '');
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  // Color presets linked to design system
  const colorPresets = [
    { id: 'preset:card', label: 'White Card' },
    { id: 'preset:card1', label: 'Primary Brand' },
    { id: 'preset:card2', label: 'Black Card' },
    { id: 'preset:card3', label: 'Muted / Gray' },
  ];

  useEffect(() => {
    if (data) {
      setBgType(data.backgroundType || 'none');
      // Parse image value for overlay
      if (data.backgroundType === 'image' && data.backgroundValue) {
        const [url, opacity] = data.backgroundValue.split('|');
        setBgValue(url || '');
        setOverlayOpacity(opacity ? parseFloat(opacity) : 0);
      } else {
        setBgValue(data.backgroundValue || '');
      }
    }
  }, [data]);

  const handleSave = () => {
    let finalValue = bgValue;
    if (bgType === 'image' && overlayOpacity > 0) {
      finalValue = `${bgValue}|${overlayOpacity}`;
    }
    onSave?.({ backgroundType: bgType, backgroundValue: bgType === 'none' ? null : finalValue });
    toast.success('Section background saved');
  };

  const handleImageSelect = (url: string) => {
    setBgValue(url);
    setShowPicker(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `section-bg-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('media-library').upload(`backgrounds/${fileName}`, file);
      if (error) throw error;
      const { data: d } = supabase.storage.from('media-library').getPublicUrl(`backgrounds/${fileName}`);
      setBgValue(d.publicUrl);
      setShowPicker(false);
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <PanelLabel>Section Background</PanelLabel>

        {/* Type selector */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Background Type</Label>
          <Select value={bgType} onValueChange={(v: any) => setBgType(v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="color">Color Preset</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color preset selector */}
        {bgType === 'color' && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/50">Color Preset</Label>
            <Select value={bgValue || 'preset:card'} onValueChange={setBgValue}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {colorPresets.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[9px] text-white/30">Colors linked to Design System</p>
          </div>
        )}

        {/* Gradient info */}
        {bgType === 'gradient' && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/50">Uses gradient from Website Style Settings</p>
          </div>
        )}

        {/* Image picker */}
        {bgType === 'image' && (
          <div className="space-y-3">
            {bgValue && (
              <div className="relative rounded-md overflow-hidden border border-white/10">
                <img src={bgValue.split('|')[0]} alt="Preview" className="w-full h-24 object-cover" />
                {overlayOpacity > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
              </div>
            )}
            <button
              onClick={() => setShowPicker(true)}
              className="w-full h-8 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: BC.controlBg, color: BC.text, border: `1px solid ${BC.border}` }}
            >
              Choose Image
            </button>
            <ImagePickerDialog open={showPicker} onOpenChange={setShowPicker} onImageSelect={handleImageSelect} onFileUpload={handleFileUpload} />

            {bgValue && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] text-white/50">Dark Overlay</Label>
                  <span className="text-[10px] text-white/40">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <Slider value={[overlayOpacity]} onValueChange={([v]) => setOverlayOpacity(v)} min={0} max={0.9} step={0.05} />
              </div>
            )}
          </div>
        )}

        <SaveButton onClick={handleSave} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};

// ─── Column Background Editor ───────────────────────────────────────
const ColumnBackgroundEditor = ({ data, onSave, actions }: EditorProps) => {
  const [bgColor, setBgColor] = useState(data?.backgroundColor || '');
  const [showBorder, setShowBorder] = useState(data?.showBorder || false);
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'center'>(data?.verticalAlign || 'top');
  const [columnWidth, setColumnWidth] = useState(data?.columnWidth || '');
  const [bgType, setBgType] = useState<'none' | 'color' | 'image'>('none');
  const [imageUrl, setImageUrl] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const colorPresets = [
    { id: 'none', label: 'No Background' },
    { id: 'card', label: 'White Card' },
    { id: 'card1', label: 'Primary Brand' },
    { id: 'card2', label: 'Black Card' },
    { id: 'card3', label: 'Muted / Gray' },
    { id: 'image', label: 'Background Image' },
  ];

  useEffect(() => {
    if (data) {
      setShowBorder(data.showBorder || false);
      setVerticalAlign(data.verticalAlign || 'top');
      setColumnWidth(data.columnWidth || '');
      // Parse background - could be color preset or image URL
      const bg = data.backgroundColor || '';
      if (bg.startsWith('http') || bg.includes('|')) {
        setBgType('image');
        const [url, opacity] = bg.split('|');
        setImageUrl(url || '');
        setOverlayOpacity(opacity ? parseFloat(opacity) : 0);
        setBgColor('image');
      } else if (bg && bg !== 'none') {
        setBgType('color');
        setBgColor(bg);
      } else {
        setBgType('none');
        setBgColor('none');
      }
    }
  }, [data]);

  const handleSave = () => {
    let finalBg = bgColor;
    if (bgType === 'image' && imageUrl) {
      finalBg = overlayOpacity > 0 ? `${imageUrl}|${overlayOpacity}` : imageUrl;
    } else if (bgType === 'none' || bgColor === 'none') {
      finalBg = 'none';
    }
    onSave?.({ backgroundColor: finalBg, showBorder, verticalAlign, columnWidth });
    toast.success('Column style saved');
  };

  const handleColorChange = (value: string) => {
    setBgColor(value);
    if (value === 'image') {
      setBgType('image');
    } else if (value === 'none') {
      setBgType('none');
    } else {
      setBgType('color');
    }
  };

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    setShowPicker(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `col-bg-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('media-library').upload(`backgrounds/${fileName}`, file);
      if (error) throw error;
      const { data: d } = supabase.storage.from('media-library').getPublicUrl(`backgrounds/${fileName}`);
      setImageUrl(d.publicUrl);
      setShowPicker(false);
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <PanelLabel>Column Style</PanelLabel>

        {/* Column Width */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Column Width</Label>
          <PanelInput value={columnWidth} onChange={(e: any) => setColumnWidth(e.target.value)} placeholder="auto (e.g. 50%, 300px)" />
        </div>

        {/* Background */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Background</Label>
          <Select value={bgColor || 'none'} onValueChange={handleColorChange}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {colorPresets.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Image picker for background image */}
        {bgType === 'image' && (
          <div className="space-y-3">
            {imageUrl && (
              <div className="relative rounded-md overflow-hidden border border-white/10">
                <img src={imageUrl.split('|')[0]} alt="Preview" className="w-full h-20 object-cover" />
                {overlayOpacity > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
              </div>
            )}
            <button
              onClick={() => setShowPicker(true)}
              className="w-full h-8 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: BC.controlBg, color: BC.text, border: `1px solid ${BC.border}` }}
            >
              Choose Image
            </button>
            <ImagePickerDialog open={showPicker} onOpenChange={setShowPicker} onImageSelect={handleImageSelect} onFileUpload={handleFileUpload} />

            {imageUrl && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] text-white/50">Dark Overlay</Label>
                  <span className="text-[10px] text-white/40">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <Slider value={[overlayOpacity]} onValueChange={([v]) => setOverlayOpacity(v)} min={0} max={0.9} step={0.05} />
              </div>
            )}
          </div>
        )}

        {/* Vertical Align */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/50">Vertical Align</Label>
          <Select value={verticalAlign} onValueChange={(v: any) => setVerticalAlign(v)}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Border */}
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} className="rounded" />
          <Label className="text-[10px] text-white/50">Show Border</Label>
        </div>

        <SaveButton onClick={handleSave} />
        <ActionButtons actions={actions} />
      </div>
    </ScrollArea>
  );
};
