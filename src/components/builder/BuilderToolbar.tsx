import { Monitor, Tablet, Smartphone, Settings, Save, X, Loader2, Plus, PanelRightClose, History } from 'lucide-react';
import { useBuilder, ViewportType } from '@/contexts/BuilderContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { BC } from './builderColors';

const viewportOptions: { type: ViewportType; icon: typeof Monitor; label: string }[] = [
  { type: 'desktop', icon: Monitor, label: 'Desktop (1440px)' },
  { type: 'tablet',  icon: Tablet,  label: 'Tablet (768px)' },
  { type: 'mobile',  icon: Smartphone, label: 'Mobile (375px)' },
];

export const BuilderToolbar = () => {
  const {
    viewport, setViewport, viewportDimensions, customDimensions, setCustomDimensions,
    isInsertPanelOpen, setInsertPanelOpen, isSettingsPanelOpen, setSettingsPanelOpen,
    isHistoryPanelOpen, setHistoryPanelOpen,
  } = useBuilder();
  const { isDirty, isSaving, saveAllChanges, discardChanges, pendingChangesCount, setIsEditMode } = useEditMode();

  const toggleHistory = () => {
    const opening = !isHistoryPanelOpen;
    setHistoryPanelOpen(opening);
    // Close settings panel when opening history, and vice versa
    if (opening) setSettingsPanelOpen(false);
  };

  const toggleSettings = () => {
    const opening = !isSettingsPanelOpen;
    setSettingsPanelOpen(opening);
    if (opening) setHistoryPanelOpen(false);
  };

  return (
    <div style={{ background: BC.panelBg, borderBottom: `1px solid ${BC.border}`, color: BC.text }}
      className="z-50 flex h-12 shrink-0 items-center justify-between gap-2 px-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setInsertPanelOpen(!isInsertPanelOpen)}
          style={{ background: isInsertPanelOpen ? BC.blueBg : 'transparent', color: isInsertPanelOpen ? BC.blue : BC.textMuted, border: `1px solid ${isInsertPanelOpen ? BC.blue : 'transparent'}` }}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-90">
          <Plus className="h-4 w-4" /> Insert
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BC.border}` }}>
        {viewportOptions.map(({ type, icon: Icon, label }) => (
          <button key={type} onClick={() => setViewport(type)} title={label} aria-label={label}
            style={{ background: viewport === type ? BC.blue : 'transparent', color: viewport === type ? BC.white : BC.textMuted }}
            className="rounded-md p-1.5 transition-all duration-200 hover:opacity-90">
            <Icon className="h-4 w-4" />
          </button>
        ))}
        {viewport === 'custom' && (
          <div className="ml-2 flex items-center gap-1">
            <input type="number" value={customDimensions.width} onChange={(e) => setCustomDimensions({ ...customDimensions, width: parseInt(e.target.value, 10) || 320 })}
              style={{ background: 'rgba(255,255,255,0.08)', color: BC.text, border: `1px solid ${BC.border}` }} className="h-7 w-16 text-xs rounded-md px-2 outline-none" />
            <span style={{ color: BC.textMuted }} className="text-xs">×</span>
            <input type="number" value={customDimensions.height} onChange={(e) => setCustomDimensions({ ...customDimensions, height: parseInt(e.target.value, 10) || 600 })}
              style={{ background: 'rgba(255,255,255,0.08)', color: BC.text, border: `1px solid ${BC.border}` }} className="h-7 w-16 text-xs rounded-md px-2 outline-none" />
          </div>
        )}
        <button onClick={() => setViewport(viewport === 'custom' ? 'desktop' : 'custom')} title="Custom Size"
          style={{ background: viewport === 'custom' ? BC.blue : 'transparent', color: viewport === 'custom' ? BC.white : BC.textMuted }}
          className="rounded-md p-1.5 text-xs font-mono transition-all hover:opacity-90">
          {viewportDimensions.width}
        </button>
      </div>
      <div className="flex items-center gap-2">
        {isDirty && (
          <>
            <span style={{ color: BC.textMuted }} className="text-xs">
              {pendingChangesCount > 0 ? `${pendingChangesCount} change${pendingChangesCount > 1 ? 's' : ''}` : 'Unsaved'}
            </span>
            <button onClick={() => discardChanges()} disabled={isSaving} style={{ color: BC.red, background: BC.redBg }}
              className="h-8 px-3 rounded-md flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-40">
              <X className="h-3.5 w-3.5" /> Discard
            </button>
          </>
        )}
        <button onClick={toggleHistory}
          style={{ background: isHistoryPanelOpen ? BC.blueBg : 'transparent', color: isHistoryPanelOpen ? BC.blue : BC.textMuted }}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-90"
          title="Version History">
          <History className="h-3.5 w-3.5" /> History
        </button>
        <button onClick={saveAllChanges} disabled={isSaving || !isDirty}
          style={{ background: isDirty ? BC.blue : 'rgba(255,255,255,0.08)', color: isDirty ? BC.white : BC.textMuted }}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-40">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <div style={{ background: BC.border }} className="h-6 w-px" />
        <button onClick={toggleSettings} aria-label="Toggle settings panel"
          style={{ background: isSettingsPanelOpen ? BC.blueBg : 'transparent', color: isSettingsPanelOpen ? BC.blue : BC.textMuted }}
          className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:opacity-90">
          <Settings className="h-4 w-4" />
        </button>
        <button onClick={() => setIsEditMode(false)} style={{ color: BC.textMuted, border: `1px solid ${BC.border}` }}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-90">
          <PanelRightClose className="h-3.5 w-3.5" /> Exit
        </button>
      </div>
    </div>
  );
};
