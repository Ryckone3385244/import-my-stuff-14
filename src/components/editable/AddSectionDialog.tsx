import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";
import { BC } from "@/components/builder/builderColors";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (columnCount: number) => void;
}

export const AddSectionDialog = ({ open, onOpenChange, onSelect }: AddSectionDialogProps) => {
  const [customCols, setCustomCols] = useState(1);
  const presets = [1, 2, 3, 4];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0" style={{ background: BC.panelBg, color: BC.text }}>
        <DialogHeader>
          <DialogTitle style={{ color: BC.text }}>Choose Column Layout</DialogTitle>
          <DialogDescription style={{ color: BC.textMuted }}>
            Select a preset or choose a custom number of columns
          </DialogDescription>
        </DialogHeader>

        {/* Preset layouts */}
        <div className="grid grid-cols-4 gap-3 py-4">
          {presets.map(cols => (
            <button
              key={cols}
              onClick={() => { onSelect(cols); onOpenChange(false); }}
              style={{ border: `1px solid ${BC.border}`, color: BC.textMuted }}
              className="h-20 flex flex-col gap-2 items-center justify-center rounded-lg transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.08)]"
            >
              <div className="flex gap-0.5 w-full px-2">
                {Array.from({ length: cols }).map((_, i) => (
                  <div key={i} className="flex-1 h-8 rounded-sm" style={{ background: BC.controlOverlay, border: `1px solid ${BC.border}` }} />
                ))}
              </div>
              <span className="text-xs">{cols} col{cols > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>

        {/* Custom column count */}
        <div className="flex items-center gap-3 py-2" style={{ borderTop: `1px solid ${BC.border}` }}>
          <span style={{ color: BC.textMuted }} className="text-sm">Custom:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomCols(Math.max(1, customCols - 1))}
              disabled={customCols <= 1}
              style={{ border: `1px solid ${BC.border}`, color: BC.text, background: 'transparent' }}
              className="h-8 w-8 p-0 rounded-md flex items-center justify-center disabled:opacity-40"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={customCols}
              onChange={e => setCustomCols(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
              style={{ background: 'rgba(255,255,255,0.06)', color: BC.text, border: `1px solid ${BC.border}` }}
              className="w-14 h-8 text-center text-sm rounded-md outline-none"
              min={1}
              max={12}
            />
            <button
              onClick={() => setCustomCols(Math.min(12, customCols + 1))}
              disabled={customCols >= 12}
              style={{ border: `1px solid ${BC.border}`, color: BC.text, background: 'transparent' }}
              className="h-8 w-8 p-0 rounded-md flex items-center justify-center disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => { onSelect(customCols); onOpenChange(false); }}
            style={{ background: BC.blue, color: BC.white }}
            className="ml-auto h-8 px-3 rounded-md text-sm font-medium hover:opacity-90"
          >
            Add {customCols} Column{customCols > 1 ? 's' : ''}
          </button>
        </div>

        {customCols > 4 && (
          <div className="flex gap-0.5 px-4 pb-2">
            {Array.from({ length: customCols }).map((_, i) => (
              <div key={i} className="flex-1 h-6 rounded-sm" style={{ background: BC.controlOverlay, border: `1px solid ${BC.border}` }} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
