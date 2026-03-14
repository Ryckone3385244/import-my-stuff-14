import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createVersionSnapshot } from '@/lib/pageVersioning';

interface ContentChange {
  pageName: string;
  sectionName: string;
  contentKey: string;
  contentValue: string;
  contentType: string;
}

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  toggleEditMode: () => void;
  // Deferred save system
  registerChange: (change: ContentChange) => void;
  registerDraftChange: (pageName: string) => void;
  saveAllChanges: () => Promise<void>;
  discardChanges: (skipReload?: boolean) => void;
  isDirty: boolean;
  isSaving: boolean;
  pendingChangesCount: number;
  // Structural change tracking
  markStructuralChange: (pageName: string) => void;
  // Structural rollback for discard
  registerStructuralRollback: (id: string, rollback: () => Promise<void>) => void;
  // Flush callbacks for active edits
  registerFlushCallback: (id: string, callback: () => void) => void;
  unregisterFlushCallback: (id: string) => void;
  // Undo/redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const [isEditMode, setIsEditModeState] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, ContentChange>>(new Map());
  const [draftPages, setDraftPages] = useState<Set<string>>(new Set());
  const [structuralChangesPages, setStructuralChangesPages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const flushCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const structuralRollbacksRef = useRef<Map<string, () => Promise<void>>>(new Map());
  
  // Undo/redo history stacks
  const undoStackRef = useRef<Map<string, ContentChange>[]>([]);
  const redoStackRef = useRef<Map<string, ContentChange>[]>([]);

  const isDirty = pendingChanges.size > 0 || draftPages.size > 0 || structuralChangesPages.size > 0;
  const pendingChangesCount = pendingChanges.size;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const registerFlushCallback = useCallback((id: string, callback: () => void) => {
    flushCallbacksRef.current.set(id, callback);
  }, []);

  const unregisterFlushCallback = useCallback((id: string) => {
    flushCallbacksRef.current.delete(id);
  }, []);

  const flushAllEdits = useCallback(() => {
    flushCallbacksRef.current.forEach((callback) => {
      try { 
        callback(); 
      } catch (e) { 
        console.error('[EditMode] Flush error:', e); 
      }
    });
  }, []);

  const setIsEditMode = useCallback((value: boolean) => {
    if (!value && isEditMode) {
      // Flush all active edits before exiting edit mode
      flushAllEdits();
    }
    setIsEditModeState(value);
  }, [isEditMode, flushAllEdits]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(!isEditMode);
  }, [isEditMode, setIsEditMode]);

  const registerChange = useCallback((change: ContentChange) => {
    const key = `${change.pageName}:${change.sectionName}:${change.contentKey}`;
    setPendingChanges(prev => {
      // Push current state to undo stack before applying change
      undoStackRef.current.push(new Map(prev));
      // Clear redo stack on new change
      redoStackRef.current = [];
      updateUndoRedoState();
      return new Map(prev).set(key, change);
    });
    // Remove from draft pages since we now have the actual content
    setDraftPages(prev => {
      const next = new Set(prev);
      next.delete(change.pageName);
      return next;
    });
  }, [updateUndoRedoState]);

  const undo = useCallback(() => {
    const prevState = undoStackRef.current.pop();
    if (prevState !== undefined) {
      setPendingChanges(current => {
        redoStackRef.current.push(new Map(current));
        updateUndoRedoState();
        return prevState;
      });
    }
    // Use setTimeout to update state after setPendingChanges processes
    setTimeout(() => updateUndoRedoState(), 0);
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    const nextState = redoStackRef.current.pop();
    if (nextState !== undefined) {
      setPendingChanges(current => {
        undoStackRef.current.push(new Map(current));
        updateUndoRedoState();
        return nextState;
      });
    }
    setTimeout(() => updateUndoRedoState(), 0);
  }, [updateUndoRedoState]);

  const registerDraftChange = useCallback((pageName: string) => {
    setDraftPages(prev => new Set(prev).add(pageName));
  }, []);

  const markStructuralChange = useCallback((pageName: string) => {
    setStructuralChangesPages(prev => new Set(prev).add(pageName));
  }, []);

  const registerStructuralRollback = useCallback((id: string, rollback: () => Promise<void>) => {
    structuralRollbacksRef.current.set(id, rollback);
  }, []);

  const saveAllChanges = useCallback(async () => {
    // Flush any in-progress edits first
    flushAllEdits();
    
    // Check after flushing
    if (pendingChanges.size === 0 && structuralChangesPages.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Collect all affected pages
      const affectedPages = new Set<string>();
      pendingChanges.forEach(change => affectedPages.add(change.pageName));
      structuralChangesPages.forEach(page => affectedPages.add(page));

      // Upsert all pending content changes
      if (pendingChanges.size > 0) {
        const changes = Array.from(pendingChanges.values());
        
        for (const change of changes) {
          const { error } = await supabase
            .from('page_content')
            .upsert({
              page_name: change.pageName,
              section_name: change.sectionName,
              content_key: change.contentKey,
              content_value: change.contentValue,
              content_type: change.contentType
            }, {
              onConflict: 'page_name,section_name,content_key'
            });
          
          if (error) {
            console.error('[EditMode] Failed to save change:', error);
            throw error;
          }
        }
      }

      // Create version snapshots for all affected pages
      for (const pageName of affectedPages) {
        await createVersionSnapshot(pageName);
      }

      // Clear all dirty states, structural rollbacks, and undo/redo stacks
      setPendingChanges(new Map());
      setDraftPages(new Set());
      setStructuralChangesPages(new Set());
      structuralRollbacksRef.current.clear();
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateUndoRedoState();
      
      toast.success(`Saved ${affectedPages.size} page(s) successfully`);
    } catch (error) {
      console.error('[EditMode] Save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, structuralChangesPages, flushAllEdits]);

  const discardChanges = useCallback(async (skipReload = false) => {
    // Clear all pending state first
    setPendingChanges(new Map());
    setDraftPages(new Set());
    setStructuralChangesPages(new Set());
    
    // Clear undo/redo stacks
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateUndoRedoState();
    
    // Execute structural rollbacks (e.g., delete duplicated columns from DB)
    const rollbacks = Array.from(structuralRollbacksRef.current.values());
    structuralRollbacksRef.current.clear();
    
    if (rollbacks.length > 0) {
      await Promise.all(rollbacks.map(fn => fn().catch(e => console.error('[EditMode] Rollback error:', e))));
    }
    
    // Exit edit mode
    setIsEditModeState(false);
    
    if (skipReload) {
      // Called from navigation guard - no reload needed
      toast.info('Changes discarded');
      return;
    }
    
    toast.info('Changes discarded - reloading page...');
    
    // Force hard reload to reset all component state from database
    // Small delay to allow toast to show
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 500);
  }, [updateUndoRedoState]);

  return (
    <EditModeContext.Provider value={{
      isEditMode,
      setIsEditMode,
      toggleEditMode,
      registerChange,
      registerDraftChange,
      saveAllChanges,
      discardChanges,
      isDirty,
      isSaving,
      pendingChangesCount,
      markStructuralChange,
      registerStructuralRollback,
      registerFlushCallback,
      unregisterFlushCallback,
      canUndo,
      canRedo,
      undo,
      redo
    }}>
      {children}
    </EditModeContext.Provider>
  );
};

/** Overrides isEditMode for all children without affecting the rest of the tree */
export const EditModeOverride = ({ isEditMode, children }: { isEditMode: boolean; children: ReactNode }) => {
  const parent = useContext(EditModeContext);
  if (!parent) throw new Error('EditModeOverride must be used within an EditModeProvider');
  return (
    <EditModeContext.Provider value={{ ...parent, isEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
};
