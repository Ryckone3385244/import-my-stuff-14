import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type ViewportType = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface ViewportDimensions {
  width: number;
  height: number;
}

const VIEWPORT_PRESETS: Record<Exclude<ViewportType, 'custom'>, ViewportDimensions> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

export type SettingsPanelTab = 'content' | 'style' | 'responsive' | 'motion';

export interface BuilderAction {
  id: string;
  label: string;
  tone?: 'default' | 'primary' | 'danger' | 'warn';
  onClick: () => void;
}

export interface SelectedElement {
  id: string;
  type: 'section' | 'column' | 'component';
  pageName: string;
  sectionId?: string;
  columnId?: string;
  componentType?: string;
  label?: string;
  actions?: BuilderAction[];
  /** Component content data for inline editing in the settings panel */
  contentData?: Record<string, any>;
  /** Callback to update content from the settings panel */
  onContentUpdate?: (data: any) => void;
  /** Callback to save/commit the content */
  onContentSave?: (data: any) => void;
}

export interface ClipboardItem {
  type: 'section' | 'column' | 'component';
  sourcePageName: string;
  sourceSectionId: string;
  sourceColumnId?: string;
  sourceContentKey?: string;
  componentType?: string;
  data?: Record<string, any>;
}

interface BuilderContextType {
  // Viewport
  viewport: ViewportType;
  setViewport: (v: ViewportType) => void;
  viewportDimensions: ViewportDimensions;
  customDimensions: ViewportDimensions;
  setCustomDimensions: (d: ViewportDimensions) => void;

  // Settings panel
  isSettingsPanelOpen: boolean;
  setSettingsPanelOpen: (open: boolean) => void;
  settingsPanelTab: SettingsPanelTab;
  setSettingsPanelTab: (tab: SettingsPanelTab) => void;

  // Element selection
  selectedElement: SelectedElement | null;
  selectElement: (el: SelectedElement | null) => void;

  // Insert panel
  isInsertPanelOpen: boolean;
  setInsertPanelOpen: (open: boolean) => void;

  // Clipboard
  clipboard: ClipboardItem | null;
  copyToClipboard: (item: ClipboardItem) => void;
  clearClipboard: () => void;

  // Builder active state
  isBuilderActive: boolean;
  setBuilderActive: (active: boolean) => void;
  toggleBuilderActive: () => void;

  // Insert event handlers (registered by PageWithDraggableSections)
  registerInsertHandlers: (handlers: InsertHandlers) => void;
  unregisterInsertHandlers: () => void;
  insertContent: (type: string) => void;
  insertSection: (columns: number) => void;

  // History panel
  isHistoryPanelOpen: boolean;
  setHistoryPanelOpen: (open: boolean) => void;
}

export interface InsertHandlers {
  onInsertContent: (type: string) => void;
  onInsertSection: (columns: number) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [viewport, setViewportState] = useState<ViewportType>('desktop');
  const [customDimensions, setCustomDimensions] = useState<ViewportDimensions>({ width: 1200, height: 800 });
  const [isSettingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [settingsPanelTab, setSettingsPanelTab] = useState<SettingsPanelTab>('content');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isInsertPanelOpen, setInsertPanelOpen] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [isBuilderActive, setIsBuilderActive] = useState(false);
  const [isHistoryPanelOpen, setHistoryPanelOpen] = useState(false);
  const insertHandlersRef = useRef<InsertHandlers | null>(null);

  const registerInsertHandlers = useCallback((handlers: InsertHandlers) => {
    insertHandlersRef.current = handlers;
  }, []);

  const unregisterInsertHandlers = useCallback(() => {
    insertHandlersRef.current = null;
  }, []);

  const insertContent = useCallback((type: string) => {
    insertHandlersRef.current?.onInsertContent(type);
  }, []);

  const insertSection = useCallback((columns: number) => {
    insertHandlersRef.current?.onInsertSection(columns);
  }, []);

  const viewportDimensions = viewport === 'custom' ? customDimensions : VIEWPORT_PRESETS[viewport];

  const setViewport = useCallback((v: ViewportType) => {
    setViewportState(v);
  }, []);

  const selectElement = useCallback((el: SelectedElement | null) => {
    setSelectedElement(el);
    if (el) {
      setSettingsPanelOpen(true);
    }
  }, []);

  const copyToClipboard = useCallback((item: ClipboardItem) => {
    setClipboard(item);
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  const setBuilderActive = useCallback((active: boolean) => {
    setIsBuilderActive(active);

    if (active) {
      setInsertPanelOpen(true);
      setSettingsPanelOpen(true);
      return;
    }

    setInsertPanelOpen(false);
    setSettingsPanelOpen(false);
    setSelectedElement(null);
    setSettingsPanelTab('content');
  }, []);

  const toggleBuilderActive = useCallback(() => {
    setIsBuilderActive((prev) => {
      const next = !prev;

      if (next) {
        setInsertPanelOpen(true);
        setSettingsPanelOpen(true);
      } else {
        setInsertPanelOpen(false);
        setSettingsPanelOpen(false);
        setSelectedElement(null);
        setSettingsPanelTab('content');
      }

      return next;
    });
  }, []);

  return (
    <BuilderContext.Provider
      value={{
        viewport,
        setViewport,
        viewportDimensions,
        customDimensions,
        setCustomDimensions,
        isSettingsPanelOpen,
        setSettingsPanelOpen,
        settingsPanelTab,
        setSettingsPanelTab,
        selectedElement,
        selectElement,
        isInsertPanelOpen,
        setInsertPanelOpen,
        clipboard,
        copyToClipboard,
        clearClipboard,
        isBuilderActive,
        setBuilderActive,
        toggleBuilderActive,
        registerInsertHandlers,
        unregisterInsertHandlers,
        insertContent,
        insertSection,
        isHistoryPanelOpen,
        setHistoryPanelOpen,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
};

export const useBuilderOptional = () => {
  return useContext(BuilderContext);
};
