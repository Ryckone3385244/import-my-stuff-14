import { Save, X, Loader2, Undo2, Redo2 } from 'lucide-react';
import { useEditMode } from '@/contexts/EditModeContext';
import { BC } from '@/components/builder/builderColors';

export const FloatingSaveButton = () => {
  const { isDirty, isSaving, saveAllChanges, discardChanges, pendingChangesCount, canUndo, canRedo, undo, redo } = useEditMode();

  if (!isDirty && !canUndo && !canRedo) return null;

  return (
    <div
      className="fixed bottom-[64px] right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg animate-in slide-in-from-right-4 duration-300"
      style={{ background: BC.panelBg, border: `1px solid ${BC.border}`, color: BC.text }}
    >
      <span style={{ color: BC.textMuted }} className="text-sm mr-2">
        {pendingChangesCount > 0
          ? `${pendingChangesCount} unsaved change${pendingChangesCount > 1 ? 's' : ''}`
          : 'Unsaved changes'}
      </span>

      <button
        onClick={undo}
        disabled={!canUndo || isSaving}
        title="Undo"
        style={{ background: 'transparent', color: canUndo ? BC.text : BC.textDim }}
        className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-40"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={redo}
        disabled={!canRedo || isSaving}
        title="Redo"
        style={{ background: 'transparent', color: canRedo ? BC.text : BC.textDim }}
        className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-40"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => discardChanges()}
        disabled={isSaving}
        style={{ background: BC.redBg, color: BC.red }}
        className="h-8 px-3 rounded-md flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-40"
      >
        <X className="w-4 h-4" />
        Discard
      </button>

      <button
        onClick={saveAllChanges}
        disabled={isSaving}
        style={{ background: BC.blue, color: BC.white }}
        className="h-8 px-3 rounded-md flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-40"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Page
          </>
        )}
      </button>
    </div>
  );
};