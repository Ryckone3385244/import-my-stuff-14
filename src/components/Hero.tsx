import { StyledButton } from "./ui/styled-button";
import { Calendar, MapPin } from "lucide-react";
import heroVideo from "@/assets/hero-video.mp4";
import heroImage from "@/assets/hero-expo.jpg";
import { EditableText } from "./editable/EditableText";
import { EditableVideo } from "./editable/EditableVideo";
import { EditableLink } from "./editable/EditableLink";
import { useEventSettings } from "@/hooks/useEventSettings";

const Hero = () => {
  const { data: eventSettings } = useEventSettings();

  return <section className="relative min-h-[700px] md:min-h-[70vh] flex items-center justify-center overflow-hidden bg-[hsl(var(--black-card))] pt-0 md:pt-20">
      {/* Editable background video */}
      <div className="absolute inset-0 w-full h-full">
        <EditableVideo 
          pageName="home" 
          sectionName="hero" 
          contentKey="background-video" 
          defaultSrc={heroVideo}
          className="w-full h-full object-cover opacity-50" 
          alt="Hero Background"
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-5xl mx-auto animate-fade-up">
          <h1 className="font-bold mb-6 leading-tight text-[hsl(var(--black-card-foreground))] tracking-tight text-[2.25rem] md:text-[length:var(--hero-title-size,3.5rem)]">
            <EditableText 
              pageName="home" 
              sectionName="hero" 
              contentKey="main-title" 
              defaultValue="Europe's Leading Business Event" 
              className="inline text-[hsl(var(--black-card-foreground))]"
              as="span"
            />
            <br />
            <EditableText 
              pageName="home" 
              sectionName="hero" 
              contentKey="subtitle" 
              defaultValue="Dedicated to the Growth of the Food-To-Go Industry" 
              className="inline text-primary"
              as="span"
            />
          </h1>
          
          {eventSettings?.event_date && eventSettings?.location && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 text-[hsl(var(--black-card-foreground))] text-base md:text-xl">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <span className="font-semibold">
                  {eventSettings.event_date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                <span className="font-semibold">
                  {eventSettings.location}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <EditableLink
              pageName="home"
              sectionName="hero"
              contentKey="button1-link"
              defaultHref="/registration"
              className="w-[50vw] sm:w-auto"
            >
              <StyledButton
                styleType="button2"
                className="shadow-glow-strong w-full sm:w-auto text-base px-[15px] py-6 uppercase font-bold rounded-xl transition-transform duration-300 hover:scale-105 whitespace-nowrap"
              >
                <EditableText 
                  pageName="home" 
                  sectionName="hero" 
                  contentKey="button1-text" 
                  defaultValue="Register Here" 
                  className="inline uppercase font-bold"
                  as="span"
                />
              </StyledButton>
            </EditableLink>
            <EditableLink
              pageName="home"
              sectionName="hero"
              contentKey="button2-link"
              defaultHref="/exhibit"
              className="w-[50vw] sm:w-auto"
            >
              <StyledButton
                styleType="button1"
                className="shadow-glow-strong w-full sm:w-auto text-base px-[15px] py-6 uppercase font-bold rounded-xl transition-transform duration-300 hover:scale-105 whitespace-nowrap"
              >
                <EditableText 
                  pageName="home" 
                  sectionName="hero" 
                  contentKey="button2-text" 
                  defaultValue="Book A Stand" 
                  className="inline uppercase font-bold"
                  as="span"
                />
              </StyledButton>
            </EditableLink>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;