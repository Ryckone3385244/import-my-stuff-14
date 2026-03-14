import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, LucideProps } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Icons from 'lucide-react';

interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIconSelect: (iconName: string) => void;
  currentIcon?: string;
}

export const IconPickerDialog = ({
  open,
  onOpenChange,
  onIconSelect,
  currentIcon
}: IconPickerDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get all icon names from lucide-react (excluding non-icon exports)
  const allIconNames = useMemo(() => {
    return Object.keys(Icons)
      .filter(key => {
        // Filter out non-icon exports
        const excluded = ['createLucideIcon', 'Icon', 'icons', 'dynamicIconImports'];
        return !excluded.includes(key) && /^[A-Z]/.test(key);
      })
      .sort();
  }, []);

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return allIconNames;
    
    const query = searchQuery.toLowerCase();
    return allIconNames.filter(name => 
      name.toLowerCase().includes(query)
    );
  }, [searchQuery, allIconNames]);

  const handleIconSelect = (iconName: string) => {
    onIconSelect(iconName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search icons (e.g., user, home, calendar)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
            {filteredIcons.map((iconName) => {
              const IconComponent = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[iconName];
              const isSelected = iconName === currentIcon;
              
              return (
                <button
                  key={iconName}
                  onClick={() => handleIconSelect(iconName)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:border-primary hover:bg-accent group ${
                    isSelected ? 'border-primary bg-accent' : 'border-border'
                  }`}
                  title={iconName}
                >
                  <IconComponent className="w-6 h-6 text-foreground group-hover:text-primary" />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
          
          {filteredIcons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No icons found for "{searchQuery}"</p>
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          {filteredIcons.length} icons available from Lucide
        </div>
      </DialogContent>
    </Dialog>
  );
};
