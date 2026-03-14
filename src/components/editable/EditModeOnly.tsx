import { ReactNode } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditModeOnlyProps {
  children: ReactNode;
}

/**
 * EditModeOnly - Wrapper that only renders children when in edit mode
 * 
 * @example
 * ```tsx
 * <EditModeOnly>
 *   <p>This text only shows in edit mode</p>
 * </EditModeOnly>
 * ```
 */
export const EditModeOnly = ({ children }: EditModeOnlyProps) => {
  const { isEditMode } = useEditMode();
  
  if (!isEditMode) {
    return null;
  }
  
  return <>{children}</>;
};
