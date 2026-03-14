import { ReactNode } from 'react';
import { EditableText } from './EditableText';

interface ListItem {
  id: string;
  defaultText: string;
}

interface EditableListCardProps {
  pageName: string;
  sectionName: string;
  cardId: string;
  defaultTitle: string;
  items: ListItem[];
  className?: string;
  titleClassName?: string;
  itemClassName?: string;
  checkmarkClassName?: string;
  checkmarkSymbol?: string;
  children?: ReactNode;
}

/**
 * EditableListCard - A card with an editable title and list of editable items.
 * Perfect for benefit lists, feature lists, etc.
 * 
 * @example
 * ```tsx
 * <EditableListCard
 *   pageName="registration"
 *   sectionName="benefits"
 *   cardId="early-bird"
 *   defaultTitle="Early Bird Benefits"
 *   items={[
 *     { id: "item-1", defaultText: "Discounted rates" },
 *     { id: "item-2", defaultText: "Priority access" }
 *   ]}
 * />
 * ```
 */
export const EditableListCard = ({
  pageName,
  sectionName,
  cardId,
  defaultTitle,
  items,
  className = 'h-full flex flex-col justify-center p-8 rounded-xl bg-black border border-primary/30 shadow-card hover:shadow-card-hover transition-all duration-300',
  titleClassName = 'text-2xl font-semibold mb-4 text-primary-glow',
  itemClassName = 'text-white',
  checkmarkClassName = 'text-primary-glow font-bold text-xl',
  checkmarkSymbol = '✓',
  children
}: EditableListCardProps) => {
  return (
    <div className={className}>
      <EditableText
        pageName={pageName}
        sectionName={sectionName}
        contentKey={`${cardId}-title`}
        defaultValue={defaultTitle}
        className={titleClassName}
        as="h3"
      />
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className={checkmarkClassName}>{checkmarkSymbol}</span>
            <EditableText
              pageName={pageName}
              sectionName={sectionName}
              contentKey={`${cardId}-${item.id}`}
              defaultValue={item.defaultText}
              className={itemClassName}
              as="span"
            />
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
};
