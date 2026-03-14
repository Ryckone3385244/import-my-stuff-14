import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useEditMode } from '@/contexts/EditModeContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const UnsavedChangesGuard = () => {
  const { isDirty, discardChanges, saveAllChanges, isSaving } = useEditMode();

  // Block browser navigation (refresh, close tab, external links)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const handleDiscard = () => {
    // Clear dirty state without reload, then proceed with navigation
    discardChanges(true); // skipReload = true since we're navigating away
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleSaveAndLeave = async () => {
    await saveAllChanges();
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleStay = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  return (
    <AlertDialog open={blocker.state === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes on this page. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleStay} disabled={isSaving}>
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscard}
            disabled={isSaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard Changes
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleSaveAndLeave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Leave'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
