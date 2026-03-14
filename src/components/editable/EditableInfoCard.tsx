import { EditableText } from './EditableText';
import { EditableIcon } from './EditableIcon';

interface EditableInfoCardProps {
  pageName: string;
  sectionName: string;
  cardId: string;
  defaultIcon: string;
  defaultTitle: string;
  defaultValue: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
}

/**
 * EditableInfoCard - A simple info card with icon, title, and value.
 * Perfect for event details like Date, Location, Duration, etc.
 * 
 * @example
 * ```tsx
 * <EditableInfoCard
 *   pageName="registration"
 *   sectionName="info"
 *   cardId="date"
 *   defaultIcon="Calendar"
 *   defaultTitle="Date"
 *   defaultValue="September 29-30, 2026"
 * />
 * ```
 */
export const EditableInfoCard = ({
  pageName,
  sectionName,
  cardId,
  defaultIcon,
  defaultTitle,
  defaultValue,
  className = 'h-full flex flex-col justify-center p-6 rounded-xl bg-gradient-card border border-border shadow-card hover:shadow-card-hover transition-all duration-300 group',
  iconClassName = 'w-5 h-5 text-primary group-hover:text-primary-glow transition-colors',
  titleClassName = 'font-semibold',
  valueClassName = 'text-muted-foreground text-center'
}: EditableInfoCardProps) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <EditableIcon
          pageName={pageName}
          sectionName={sectionName}
          contentKey={`${cardId}-icon`}
          defaultIcon={defaultIcon}
          className={iconClassName}
        />
        <EditableText
          pageName={pageName}
          sectionName={sectionName}
          contentKey={`${cardId}-title`}
          defaultValue={defaultTitle}
          className={titleClassName}
          as="h3"
        />
      </div>
      <EditableText
        pageName={pageName}
        sectionName={sectionName}
        contentKey={`${cardId}-value`}
        defaultValue={defaultValue}
        className={valueClassName}
        as="p"
      />
    </div>
  );
};
