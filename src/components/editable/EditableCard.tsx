import { ReactNode } from 'react';
import { EditableText } from './EditableText';
import { EditableIcon } from './EditableIcon';
import { LucideProps } from 'lucide-react';

interface EditableCardProps {
  pageName: string;
  sectionName: string;
  cardId: string;
  defaultIcon?: string;
  defaultTitle: string;
  defaultDescription: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
  showIcon?: boolean;
}

/**
 * EditableCard - A fully editable card component with icon, title, and description.
 * 
 * @example
 * ```tsx
 * <EditableCard
 *   pageName="home"
 *   sectionName="features"
 *   cardId="feature-1"
 *   defaultIcon="Lightbulb"
 *   defaultTitle="Innovation"
 *   defaultDescription="Discover cutting-edge solutions"
 * />
 * ```
 */
export const EditableCard = ({
  pageName,
  sectionName,
  cardId,
  defaultIcon,
  defaultTitle,
  defaultDescription,
  className = 'h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group',
  iconClassName = 'w-6 h-6 text-primary',
  titleClassName = 'text-xl font-semibold',
  descriptionClassName = 'text-muted-foreground',
  children,
  showIcon = true
}: EditableCardProps) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        {showIcon && defaultIcon && (
          <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <EditableIcon
              pageName={pageName}
              sectionName={sectionName}
              contentKey={`${cardId}-icon`}
              defaultIcon={defaultIcon}
              className={iconClassName}
            />
          </div>
        )}
        <EditableText
          pageName={pageName}
          sectionName={sectionName}
          contentKey={`${cardId}-title`}
          defaultValue={defaultTitle}
          className={titleClassName}
          as="h2"
        />
      </div>
      <EditableText
        pageName={pageName}
        sectionName={sectionName}
        contentKey={`${cardId}-description`}
        defaultValue={defaultDescription}
        className={descriptionClassName}
        as="p"
      />
      {children}
    </div>
  );
};
