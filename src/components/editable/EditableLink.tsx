import { useState } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface EditableLinkProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultHref: string;
  className?: string;
  children: React.ReactNode;
}

export const EditableLink = ({
  pageName,
  sectionName,
  contentKey,
  defaultHref,
  className = '',
  children
}: EditableLinkProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedHref, setEditedHref] = useState(defaultHref);
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();

  const queryKey = ['editable-link', pageName, sectionName, contentKey];

  const { data: href = defaultHref } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', sectionName)
        .eq('content_key', contentKey)
        .maybeSingle();

      if (data) {
        setEditedHref(data.content_value);
        return data.content_value;
      }
      return defaultHref;
    },
  });

  const handleSave = async () => {
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: editedHref,
        content_type: 'link'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      toast.error('Failed to save link');
      console.error(error);
    } else {
      // Invalidate query to refresh all instances using this link
      queryClient.invalidateQueries({ queryKey });
      setIsDialogOpen(false);
      toast.success('Link updated');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      
      if (builder) {
        const elementId = `link-${pageName}-${sectionName}-${contentKey}`;
        builder.selectElement({
          id: elementId,
          type: 'component',
          pageName,
          componentType: 'link',
          label: `Link: ${contentKey}`,
          actions: [
            { id: 'edit', label: 'Edit Link URL', tone: 'primary', onClick: () => setIsDialogOpen(true) },
          ],
        });
      }
      
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <div 
        className={`relative inline-block ${className}`}
      >
        <Link to={href} onClick={handleClick} className="block">
          {children}
        </Link>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link">Link URL</Label>
              <Input
                id="link"
                value={editedHref}
                onChange={(e) => setEditedHref(e.target.value)}
                placeholder="/page or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Use /page for internal links or full URLs for external links
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
