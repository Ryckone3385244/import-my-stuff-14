import { ReactNode, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderSettingsPanel } from './BuilderSettingsPanel';
import { BuilderInsertPanel } from './BuilderInsertPanel';
import { BuilderHistoryPanel } from './BuilderHistoryPanel';
import { useBuilder } from '@/contexts/BuilderContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { supabase } from '@/integrations/supabase/client';
import { BC } from './builderColors';

interface BuilderShellProps {
  children: ReactNode;
}

const AdminBar = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  return (
    <div className="flex items-center justify-between h-9 px-3 shrink-0" style={{ background: BC.shellBg, borderBottom: `1px solid ${BC.border}` }}>
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-90"
          style={{ color: BC.textMuted, background: 'rgba(255,255,255,0.06)' }}>
          Admin
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="text-[11px]" style={{ color: BC.textDim }}>{userEmail}</span>
        )}
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors hover:opacity-90"
          style={{ color: BC.textMuted }}>
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>
    </div>
  );
};

export const BuilderShell = ({ children }: BuilderShellProps) => {
  const { setInsertPanelOpen, setSettingsPanelOpen, isHistoryPanelOpen } = useBuilder();
  const { isEditMode } = useEditMode();

  useEffect(() => {
    if (isEditMode) {
      setInsertPanelOpen(true);
      setSettingsPanelOpen(true);
    }
  }, [isEditMode, setInsertPanelOpen, setSettingsPanelOpen]);

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-[10000] isolate flex flex-col"
      style={{ background: '#1a1d23', color: '#e8eaed' }}
    >
      <AdminBar />
      <BuilderToolbar />
      <div className="flex min-h-0 flex-1">
        <BuilderInsertPanel />
        <BuilderCanvas>{children}</BuilderCanvas>
        {isHistoryPanelOpen ? <BuilderHistoryPanel /> : <BuilderSettingsPanel />}
      </div>
    </div>
  );
};
