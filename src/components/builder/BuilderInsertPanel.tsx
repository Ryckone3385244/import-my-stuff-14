import { X, Type, Image, Video, MousePointerClick, Sparkles, Images, ImagePlay, ChevronDown, Code, Heading2, ImagePlus, Layers, CalendarDays, Users, Mic, UserCheck, LayoutGrid, Timer, FormInput } from 'lucide-react';
import { useBuilder } from '@/contexts/BuilderContext';
import { useState } from 'react';
import { BC } from './builderColors';

type ContentType = 'image' | 'text' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage' | 'hover-overlay-card' | 'theater-agenda' | 'exhibitor-carousel' | 'exhibitor-grid' | 'speaker-carousel' | 'speaker-grid' | 'register-form' | 'hero' | 'event-countdown';

const componentLibrary: { type: ContentType; icon: typeof Type; label: string; category: string }[] = [
  { type: 'text', icon: Type, label: 'Body Text', category: 'Basic' },
  { type: 'sectionTitle', icon: Heading2, label: 'Section Title', category: 'Basic' },
  { type: 'image', icon: Image, label: 'Image', category: 'Basic' },
  { type: 'button', icon: MousePointerClick, label: 'Button', category: 'Basic' },
  { type: 'video', icon: Video, label: 'Video', category: 'Basic' },
  { type: 'icon-with-text', icon: Sparkles, label: 'Icon + Text', category: 'Interactive' },
  { type: 'accordion', icon: ChevronDown, label: 'Accordion', category: 'Interactive' },
  { type: 'hover-overlay-card', icon: Layers, label: 'Hover Card', category: 'Interactive' },
  { type: 'photo-gallery', icon: Images, label: 'Photo Gallery', category: 'Media' },
  { type: 'image-carousel', icon: ImagePlay, label: 'Image Carousel', category: 'Media' },
  { type: 'popupImage', icon: ImagePlus, label: 'Popup Image', category: 'Media' },
  { type: 'embed', icon: Code, label: 'Embed Code', category: 'Embed' },
  { type: 'theater-agenda' as ContentType, icon: CalendarDays, label: 'Theater Agenda', category: 'Embed' },
  { type: 'hero', icon: Sparkles, label: 'Hero Section', category: 'Sections' },
  { type: 'exhibitor-carousel', icon: Users, label: 'Exhibitor Carousel', category: 'Data' },
  { type: 'exhibitor-grid', icon: LayoutGrid, label: 'Exhibitor Grid', category: 'Data' },
  { type: 'speaker-carousel', icon: Mic, label: 'Speaker Carousel', category: 'Data' },
  { type: 'speaker-grid', icon: UserCheck, label: 'Speaker Grid', category: 'Data' },
  { type: 'register-form', icon: FormInput, label: 'Register Form', category: 'Sections' },
  { type: 'event-countdown', icon: Timer, label: 'Countdown', category: 'Sections' },
];

export const BuilderInsertPanel = () => {
  const { isInsertPanelOpen, setInsertPanelOpen, insertContent, insertSection } = useBuilder();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Basic');
  if (!isInsertPanelOpen) return null;
  const categories = [...new Set(componentLibrary.map(c => c.category))];

  return (
    <div className="w-64 flex flex-col shrink-0 h-full overflow-hidden" style={{ background: BC.panelBg, borderRight: `1px solid ${BC.border}` }}>
      <div className="h-10 flex items-center justify-between px-3" style={{ borderBottom: `1px solid ${BC.border}` }}>
        <span style={{ color: BC.textMuted }} className="text-xs font-medium uppercase tracking-wider">Insert</span>
        <button onClick={() => setInsertPanelOpen(false)} style={{ color: BC.textDim }} className="h-6 w-6 flex items-center justify-center rounded-md hover:opacity-80">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3" style={{ borderBottom: `1px solid ${BC.border}` }}>
          <span style={{ color: BC.textDim }} className="text-[10px] font-semibold uppercase tracking-widest">Sections</span>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[1, 2, 3, 4].map(cols => (
              <button key={cols} onClick={() => insertSection(cols)} title={`${cols} column${cols > 1 ? 's' : ''}`}
                style={{ border: `1px solid rgba(255,255,255,0.06)` }}
                className="aspect-square rounded-md flex items-center justify-center gap-0.5 p-1 transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.08)]">
                {Array.from({ length: cols }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.18)' }} className="flex-1 h-full rounded-sm min-w-0" />
                ))}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {[5, 6].map(cols => (
              <button key={cols} onClick={() => insertSection(cols)} title={`${cols} columns`}
                style={{ border: `1px solid rgba(255,255,255,0.06)` }}
                className="aspect-square rounded-md flex items-center justify-center gap-px p-1 transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.08)]">
                {Array.from({ length: cols }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.18)' }} className="flex-1 h-full rounded-sm min-w-0" />
                ))}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2">
          {categories.map(category => (
            <div key={category} className="mb-1">
              <button onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors"
                style={{ color: BC.textDim }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span className="text-[10px] font-semibold uppercase tracking-widest">{category}</span>
                <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: expandedCategory === category ? 'rotate(180deg)' : 'none' }} />
              </button>
              {expandedCategory === category && (
                <div className="grid grid-cols-2 gap-1 mt-1 px-1">
                  {componentLibrary.filter(c => c.category === category).map(({ type, icon: Icon, label }) => (
                    <button key={type} onClick={() => insertContent(type)}
                      style={{ border: `1px solid rgba(255,255,255,0.06)`, color: BC.textMuted }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.06)] hover:text-[#e8eaed]">
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] leading-tight text-center">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
