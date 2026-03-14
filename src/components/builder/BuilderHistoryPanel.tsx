import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Eye, X, Loader2, ChevronRight } from 'lucide-react';
import { getVersionHistory, restoreVersion } from '@/lib/pageVersioning';
import { usePageName } from '@/hooks/usePageName';
import { useBuilder } from '@/contexts/BuilderContext';
import { BC } from './builderColors';
import { toast } from 'sonner';

interface VersionEntry {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
}

export const BuilderHistoryPanel = () => {
  const { isHistoryPanelOpen, setHistoryPanelOpen } = useBuilder();
  const pageName = usePageName();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const data = await getVersionHistory(pageName, 50);
    setVersions(data);
    setIsLoading(false);
  }, [pageName]);

  useEffect(() => {
    if (isHistoryPanelOpen) {
      loadHistory();
    }
  }, [isHistoryPanelOpen, loadHistory]);

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!window.confirm(`Restore to version ${versionNumber}? A backup of the current state will be created first.`)) return;
    setRestoringId(versionId);
    const success = await restoreVersion(pageName, versionId);
    setRestoringId(null);
    if (success) {
      toast.success(`Restored to version ${versionNumber}. Reloading...`);
      setTimeout(() => { window.location.href = window.location.href; }, 600);
    } else {
      toast.error('Failed to restore version');
    }
  };

  const handlePreview = (versionId: string) => {
    // Toggle preview
    setPreviewingId(prev => prev === versionId ? null : versionId);
    // Dispatch event for the canvas to pick up
    window.dispatchEvent(new CustomEvent('builder:preview-version', {
      detail: { versionId: previewingId === versionId ? null : versionId, pageName },
    }));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!isHistoryPanelOpen) return null;

  return (
    <div
      className="w-80 flex flex-col shrink-0 h-full overflow-hidden"
      style={{ background: BC.panelBg, borderLeft: `1px solid ${BC.border}` }}
    >
      <div
        className="h-10 flex items-center justify-between px-3"
        style={{ borderBottom: `1px solid ${BC.border}` }}
      >
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" style={{ color: BC.blue }} />
          <span style={{ color: BC.textMuted }} className="text-xs font-medium uppercase tracking-wider">
            Version History
          </span>
        </div>
        <button
          onClick={() => setHistoryPanelOpen(false)}
          style={{ color: BC.textDim }}
          className="h-6 w-6 flex items-center justify-center rounded-md hover:opacity-80 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: BC.textMuted }} />
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center">
            <p style={{ color: BC.textDim }} className="text-xs">
              No versions yet. Versions are created automatically when you save.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {versions.map((version, index) => {
              const isCurrent = index === 0;
              const isPreviewing = previewingId === version.id;
              const isRestoring = restoringId === version.id;

              return (
                <div
                  key={version.id}
                  className="group relative"
                  style={{
                    borderBottom: `1px solid ${BC.border}`,
                    background: isPreviewing ? BC.blueBg : 'transparent',
                  }}
                >
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: isCurrent ? BC.blue : BC.text }}
                        >
                          v{version.version_number}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: BC.blueBg, color: BC.blue }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]" style={{ color: BC.textDim }}>
                        {formatDate(version.created_at)}
                      </span>
                    </div>

                    {!isCurrent && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button
                          onClick={() => handleRestore(version.id, version.version_number)}
                          disabled={isRestoring}
                          className="h-6 px-2 rounded flex items-center gap-1 text-[10px] font-medium transition-colors hover:opacity-90 disabled:opacity-40"
                          style={{ background: BC.blue, color: BC.white }}
                        >
                          {isRestoring ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Restore
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 text-[10px]"
        style={{ color: BC.textDim, borderTop: `1px solid ${BC.border}` }}
      >
        Versions are created on each save. Restoring creates a backup first.
      </div>
    </div>
  );
};
