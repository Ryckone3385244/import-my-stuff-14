import { EditableText } from '../EditableText';
import { EditableVideo } from '../EditableVideo';
import { EditableImage } from '../EditableImage';
import { EditableLink } from '../EditableLink';
import { StyledButton } from '@/components/ui/styled-button';
import { Calendar, MapPin } from 'lucide-react';
import { useEventSettings } from '@/hooks/useEventSettings';

interface Config {
  style?: 'video' | 'image' | 'gradient';
  showDate?: boolean;
  showLocation?: boolean;
  showCTA?: boolean;
}

export const HeroBlock = ({ pageName, cardId, config }: { pageName: string; cardId: string; config: Config }) => {
  const { data: eventSettings } = useEventSettings();
  const style = config.style || 'gradient';

  return (
    <section className="relative min-h-[500px] md:min-h-[70vh] flex items-center justify-center overflow-hidden bg-[hsl(var(--black-card))]">
      {/* Background */}
      {style === 'video' && (
        <div className="absolute inset-0 w-full h-full">
          <EditableVideo
            pageName={pageName}
            sectionName={cardId}
            contentKey="hero-bg-video"
            defaultSrc=""
            className="w-full h-full object-cover opacity-50"
            alt="Hero Background"
          />
        </div>
      )}
      {style === 'image' && (
        <div className="absolute inset-0 w-full h-full">
          <EditableImage
            pageName={pageName}
            sectionName={cardId}
            contentKey="hero-bg-image"
            defaultSrc="/placeholder.svg"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
      )}
      {style === 'gradient' && (
        <div className="absolute inset-0" style={{ background: 'var(--gradient-title)' }} />
      )}

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-bold mb-6 leading-tight text-[hsl(var(--black-card-foreground))] text-[2.25rem] md:text-[length:var(--hero-title-size,3.5rem)]">
            <EditableText
              pageName={pageName}
              sectionName={cardId}
              contentKey="hero-title"
              defaultValue="Welcome to Our Event"
              className="inline text-[hsl(var(--black-card-foreground))]"
              as="span"
            />
            <br />
            <EditableText
              pageName={pageName}
              sectionName={cardId}
              contentKey="hero-subtitle"
              defaultValue="The Future Starts Here"
              className="inline text-primary"
              as="span"
            />
          </h1>

          {config.showDate !== false && eventSettings?.event_date && eventSettings?.location && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 text-[hsl(var(--black-card-foreground))] text-base md:text-xl">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{eventSettings.event_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{eventSettings.location}</span>
              </div>
            </div>
          )}

          {config.showCTA !== false && (
            <div className="flex flex-wrap gap-4 justify-center">
              <EditableLink
                pageName={pageName}
                sectionName={cardId}
                contentKey="hero-cta-1"
                defaultHref="/registration"
              >
                <StyledButton styleType="button1" className="font-bold px-8 py-4 text-lg">
                  <EditableText
                    pageName={pageName}
                    sectionName={cardId}
                    contentKey="hero-cta-1-text"
                    defaultValue="Register Now"
                    as="span"
                  />
                </StyledButton>
              </EditableLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
