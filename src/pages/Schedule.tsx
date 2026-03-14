import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText, EditableEmbed } from "@/components/editable";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { useMemo } from 'react';
import { useEventSettings } from "@/hooks/useEventSettings";
import { EventInfoCard } from "@/components/EventInfoDisplay";
import { DEFAULT_EVENT } from "@/lib/constants";
import { usePageName } from "@/hooks/usePageName";

const Schedule = () => {
  const pageName = usePageName();
  const { data: eventSettings } = useEventSettings();
  const sections = useMemo(() => [
    {
      id: 'info-cards',
      component: (
        <section className="py-4">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <EventInfoCard type="date" />
            <EventInfoCard type="location" />
            <EventInfoCard type="duration" />
          </div>
        </section>
      )
    },
    {
      id: 'registration-form',
      component: (
        <section className="py-4">
          <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
          <div className="p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4 text-center text-white">Register Your Interest</h2>
            <p className="text-white/80 text-center mx-auto">
              Complete the form below to secure your spot at Grab & Go Expo 2026. Early registration receives exclusive benefits!
            </p>
          </div>

          {/* Embedded LeadPages registration form */}
          <div className="w-full bg-black -mb-4">
            <EditableEmbed
              pageName={pageName}
              sectionName="registration-form"
              contentKey="form-embed"
              defaultSrc="https://disastersexpotexas.lpages.co/grab-go-register-interest/"
              height="680px"
              className="w-full"
            />
          </div>
        </div>
        </section>
      )
    },
    {
      id: 'benefits',
      component: (
        <section className="py-4">
          <SectionWithDraggableColumns
          pageName={pageName}
          sectionId="benefits"
          className="mt-12 grid md:grid-cols-2 gap-6"
          columns={[
            {
              id: 'early-bird',
              component: (
                <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-black border border-primary/30 shadow-card hover:shadow-card-hover transition-all duration-300">
                  <EditableText
                    pageName={pageName}
                    sectionName="benefits"
                    contentKey="early-bird-title"
                    defaultValue="Early Bird Benefits"
                    className="text-2xl font-semibold mb-4 text-primary-glow"
                    as="h3"
                  />
                  <ul className="space-y-3 text-white">
                    <li className="flex items-start gap-3">
                      <span className="text-primary-glow font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="early-bird-item-1"
                        defaultValue="Discounted registration rates"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary-glow font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="early-bird-item-2"
                        defaultValue="Priority access to sessions"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary-glow font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="early-bird-item-3"
                        defaultValue="Exclusive networking events"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary-glow font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="early-bird-item-4"
                        defaultValue="VIP exhibitor meet & greets"
                        className="text-white"
                        as="span"
                      />
                    </li>
                  </ul>
                </div>
              )
            },
            {
              id: 'whats-included',
              component: (
                <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-black border border-accent/30 shadow-card hover:shadow-card-hover transition-all duration-300">
                  <EditableText
                    pageName={pageName}
                    sectionName="benefits"
                    contentKey="included-title"
                    defaultValue="What's Included"
                    className="text-2xl font-semibold mb-4 text-accent"
                    as="h3"
                  />
                  <ul className="space-y-3 text-white">
                    <li className="flex items-start gap-3">
                      <span className="text-accent font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="included-item-1"
                        defaultValue="Access to all expo halls"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="included-item-2"
                        defaultValue="200+ educational seminars"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="included-item-3"
                        defaultValue="Networking opportunities"
                        className="text-white"
                        as="span"
                      />
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent font-bold text-xl">✓</span>
                      <EditableText
                        pageName={pageName}
                        sectionName="benefits"
                        contentKey="included-item-4"
                        defaultValue="Event materials & swag bag"
                        className="text-white"
                        as="span"
                      />
                    </li>
                  </ul>
                </div>
              )
            }
          ]}
        />
        </section>
      )
    }
  ], [pageName]);

  return <>
      <DynamicHelmet titlePrefix="Schedule" description="View the event schedule for {eventName} and plan your day." />
      
      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12">
          <div className="text-center mb-12 animate-fade-up">
            <EditableText 
              pageName={pageName} 
              sectionName="hero" 
              contentKey="title" 
              defaultValue="Event Schedule" 
              className="text-4xl md:text-5xl font-bold mb-6 text-gradient-title pt-5"
              as="h1"
            />
            
            <EditableText 
              pageName={pageName} 
              sectionName="hero" 
              contentKey="subtitle" 
              defaultValue="Coming soon - Register your interest to receive the full schedule when it's released" 
              className="text-xl text-muted-foreground mb-8 mx-auto"
              as="p"
            />

            <PageWithDraggableSections
              pageName={pageName}
              sections={sections}
            />
          </div>
        </main>
        <Footer />
      </div>
    </>;
};

export default Schedule;