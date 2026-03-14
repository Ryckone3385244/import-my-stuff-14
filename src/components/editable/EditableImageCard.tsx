import { EditableText } from './EditableText';
import { EditableImage } from './EditableImage';

interface EditableImageCardProps {
  pageName: string;
  sectionName: string;
  cardId: string;
  defaultImageSrc?: string;
  defaultImageAlt?: string;
  defaultTitle: string;
  defaultDescription: string;
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  showImage?: boolean;
}

/**
 * EditableImageCard - A fully editable card component with image, title, and description.
 * 
 * @example
 * ```tsx
 * <EditableImageCard
 *   pageName="travel"
 *   sectionName="accommodation"
 *   cardId="hotel-1"
 *   defaultImageSrc="/hotel.jpg"
 *   defaultImageAlt="Hotel"
 *   defaultTitle="Luxury Hotel"
 *   defaultDescription="5-star accommodation near venue"
 * />
 * ```
 */
export const EditableImageCard = ({
  pageName,
  sectionName,
  cardId,
  defaultImageSrc = '/placeholder.svg',
  defaultImageAlt = 'Card image',
  defaultTitle,
  defaultDescription,
  className = 'h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden',
  imageClassName = 'w-full h-48 object-cover',
  titleClassName = 'text-xl font-bold mb-2',
  descriptionClassName = 'text-muted-foreground',
  showImage = true
}: EditableImageCardProps) => {
  return (
    <div className={className}>
      {showImage && (
        <div className="-m-6 mb-4">
          <EditableImage
            pageName={pageName}
            sectionName={sectionName}
            contentKey={`${cardId}-image`}
            defaultSrc={defaultImageSrc}
            alt={defaultImageAlt}
            className={imageClassName}
          />
        </div>
      )}
      <EditableText
        pageName={pageName}
        sectionName={sectionName}
        contentKey={`${cardId}-title`}
        defaultValue={defaultTitle}
        className={titleClassName}
        as="h3"
      />
      <EditableText
        pageName={pageName}
        sectionName={sectionName}
        contentKey={`${cardId}-description`}
        defaultValue={defaultDescription}
        className={descriptionClassName}
        as="p"
      />
    </div>
  );
};
