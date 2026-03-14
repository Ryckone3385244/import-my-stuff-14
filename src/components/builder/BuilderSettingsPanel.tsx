import { X, Type, Paintbrush, Zap } from 'lucide-react';
import { useBuilder, SettingsPanelTab } from '@/contexts/BuilderContext';
import { StyleSettings } from './settings/StyleSettings';
import { MotionSettings } from './settings/MotionSettings';
import { BuilderContentEditor } from './BuilderContentEditor';
import { BC } from './builderColors';

const tabs: { value: SettingsPanelTab; icon: typeof Type; label: string }[] = [
  { value: 'content', icon: Type, label: 'Content' },
  { value: 'style', icon: Paintbrush, label: 'Style' },
  { value: 'motion', icon: Zap, label: 'Motion' },
];

export const BuilderSettingsPanel = () => {
  const {
    isSettingsPanelOpen, setSettingsPanelOpen,
    settingsPanelTab, setSettingsPanelTab,
    selectedElement, selectElement,
  } = useBuilder();

  if (!isSettingsPanelOpen) return null;

  return (
    <div
      className="w-80 flex flex-col shrink-0 h-full overflow-hidden"
      style={{ background: BC.panelBg, borderLeft: `1px solid ${BC.border}` }}
    >
      <div
        className="h-10 flex items-center justify-between px-3"
        style={{ borderBottom: `1px solid ${BC.border}` }}
      >
        <span style={{ color: BC.textMuted }} className="text-xs font-medium uppercase tracking-wider">
          {selectedElement ? selectedElement.label || selectedElement.type : 'Settings'}
        </span>
        <button
          onClick={() => { setSettingsPanelOpen(false); selectElement(null); }}
          style={{ color: BC.textDim }}
          className="h-6 w-6 flex items-center justify-center rounded-md hover:opacity-80 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="flex items-center px-1 h-9"
        style={{ borderBottom: `1px solid ${BC.border}` }}
      >
        {tabs.map(({ value, icon: Icon, label }) => {
          const isActive = settingsPanelTab === value;
          return (
            <button
              key={value}
              onClick={() => setSettingsPanelTab(value)}
              className="h-full flex items-center gap-1 px-2 text-xs transition-colors"
              style={{
                color: isActive ? BC.blue : BC.textDim,
                borderBottom: isActive ? `2px solid ${BC.blue}` : '2px solid transparent',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {settingsPanelTab === 'content' && (
          <BuilderContentEditor />
        )}

        {settingsPanelTab === 'style' && (
          <div className="p-0">
            <StyleSettings />
          </div>
        )}

        {settingsPanelTab === 'motion' && (
          <div className="p-0">
            <MotionSettings />
          </div>
        )}
      </div>
    </div>
  );
};
