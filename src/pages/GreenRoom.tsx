import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { Button } from "@/components/ui/button";
import { StyledButton } from "@/components/ui/styled-button";
import { useMemo, useState } from 'react';
import { X } from "lucide-react";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";

const GreenRoom = () => {
  const { data: eventSettings } = useEventSettings();
  const [showForm, setShowForm] = useState(false);
  
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="relative pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText
              pageName="green-room"
              sectionName="hero"
              contentKey="title"
              defaultValue="Green Room"
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
              as="h1"
            />
            <EditableText
              pageName="green-room"
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Where Innovation Meets Guest Experience"
              className="text-xl text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'intro',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
               pageName="green-room"
               sectionId="intro"
               className="grid md:grid-cols-2 gap-12 items-center equal-height-grid"
               columns={[
                {
                  id: 'text-content',
                  component: (
                    <div className="h-full flex flex-col justify-center">
                      <EditableText
                        pageName="green-room"
                        sectionName="intro"
                        contentKey="section-title"
                        defaultValue="The Evo-xperience"
                        className="text-3xl font-bold mb-6"
                        as="h2"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="intro"
                        contentKey="description"
                        defaultValue="Join us at the Green Room, an exclusive space designed for forward-thinking leaders ready to reshape the guest journey with the power of innovation and technology. This is where hospitality meets the future."
                        className="text-lg"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'intro-image',
                  component: (
                    <div>
                      <EditableImage
                        pageName="green-room"
                        sectionName="intro"
                        contentKey="intro-image"
                        defaultSrc="/placeholder.svg"
                        alt="The Evo-xperience"
                        className="w-full h-96 object-cover rounded-xl"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'features',
      component: (
        <section className="pt-16 pb-8 bg-muted/50">
          <div className="container mx-auto px-4">
            <EditableText
              pageName="green-room"
              sectionName="features"
              contentKey="section-title"
              defaultValue="Redefining Hospitality Through Intelligent Innovation"
              className="text-3xl font-bold text-center mb-8"
              as="h2"
            />
            <SectionWithDraggableColumns
              pageName="green-room"
              sectionId="features"
              className="grid md:grid-cols-2 gap-8 pb-8"
              columns={[
                {
                  id: 'feature-1',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-1-title"
                        defaultValue="Expert Insights"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-1-desc"
                        defaultValue="Hear from industry leaders about the latest trends and innovations transforming the hospitality sector."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'feature-2',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-2-title"
                        defaultValue="Exclusive Networking"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-2-desc"
                        defaultValue="Connect with decision-makers and innovators in an intimate, comfortable setting."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'feature-3',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-3-title"
                        defaultValue="Live Demonstrations"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-3-desc"
                        defaultValue="Experience cutting-edge solutions first-hand with interactive technology demonstrations."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'feature-4',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-4-title"
                        defaultValue="Refreshments & Comfort"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="features"
                        contentKey="feature-4-desc"
                        defaultValue="Enjoy complimentary refreshments in a relaxed atmosphere away from the busy show floor."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'bottom-section',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
               pageName="green-room"
               sectionId="bottom-section"
               className="grid md:grid-cols-2 gap-12 items-center equal-height-grid"
               columns={[
                {
                  id: 'bottom-image',
                  component: (
                    <div>
                      <EditableImage
                        pageName="green-room"
                        sectionName="bottom-section"
                        contentKey="bottom-image"
                        defaultSrc="/placeholder.svg"
                        alt="Green Room Experience"
                        className="w-full h-96 object-cover rounded-xl"
                      />
                    </div>
                  )
                },
                {
                  id: 'text-content',
                  component: (
                    <div className="h-full flex flex-col justify-center">
                      <EditableText
                        pageName="green-room"
                        sectionName="bottom-section"
                        contentKey="section-title"
                        defaultValue="Experience the Future of Hospitality"
                        className="text-3xl font-bold mb-6"
                        as="h2"
                      />
                      <EditableText
                        pageName="green-room"
                        sectionName="bottom-section"
                        contentKey="description"
                        defaultValue="Step into the Green Room and discover how technology is revolutionizing the hospitality industry. From AI-powered guest services to sustainable operations, explore the innovations that will define tomorrow's hospitality landscape."
                        className="text-lg"
                        as="p"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'register-cta',
      component: (
        <section className="py-20 text-white relative overflow-hidden" style={{
          background: 'var(--gradient-title)'
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)'
          }}></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <EditableText pageName="green-room" sectionName="cta" contentKey="title" defaultValue="Register Today" className="text-4xl md:text-5xl font-bold mb-6 pt-5" as="h2" />
                {!showForm && (
                  <>
                    <EditableText pageName="green-room" sectionName="cta" contentKey="description" defaultValue="Space in the Green Room is limited. Register your interest today to secure your exclusive access." className="text-xl text-white/80 mb-8" as="p" />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText 
                        pageName="green-room" 
                        sectionName="cta" 
                        contentKey="button-text" 
                        defaultValue="Get Your Free Ticket" 
                        as="span"
                      />
                    </StyledButton>
                  </>
                )}
              </div>
              
              {showForm && (
                <div className="overflow-hidden animate-stretch-in">
                  <div className="opacity-0 animate-form-appear">
                    <div className="flex justify-end mb-4">
                      <button onClick={() => setShowForm(false)} className="text-white hover:text-white/80 transition-colors flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg">
                        <X className="h-5 w-5" />
                        <span>Close</span>
                      </button>
                    </div>
                  
                    <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center text-white">Register Your Interest</h2>
                        <p className="text-white/80 text-center mx-auto">
                          Complete the form below to secure your spot at {eventSettings?.event_name || DEFAULT_EVENT.NAME}. Early registration receives exclusive benefits!
                        </p>
                      </div>

                      <div className="w-full bg-black -mb-4">
                        <iframe src="https://disastersexpotexas.lpages.co/grab-go-register-interest/" className="w-full border-0" style={{
                          height: "680px",
                          display: "block"
                        }} title="Registration Form" loading="lazy" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )
    }
  ], [showForm]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Green Room" 
        description="Visit the Green Room at {eventName} - an exclusive space for innovation and networking."
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName="green-room"
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default GreenRoom;
