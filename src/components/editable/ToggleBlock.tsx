import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sanitizeHtml } from '@/lib/utils';
import { useEventSettingsContext } from '@/contexts/EventSettingsContext';

interface ToggleBlockProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
}

export const ToggleBlock = ({ title, content, defaultOpen = false }: ToggleBlockProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { replacePlaceholders } = useEventSettingsContext();

  // Replace placeholders in content before sanitizing and rendering
  const processedContent = sanitizeHtml(replacePlaceholders(content));
  const processedTitle = replacePlaceholders(title);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between py-4 px-5 bg-background hover:bg-muted/50 text-foreground transition-colors duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-2xl font-semibold text-left m-0">{processedTitle}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>
      {isOpen && (
        <div className="bg-card p-5">
          <div 
            className="prose max-w-none [&_p]:!mb-8 [&_*[style*='text-align:_left']]:!text-left [&_*[style*='text-align:_center']]:!text-center [&_*[style*='text-align:_right']]:!text-right [&_*[style*='text-align:_justify']]:!text-justify"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      )}
    </div>
  );
};