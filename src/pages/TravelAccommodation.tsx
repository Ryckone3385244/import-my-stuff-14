import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableGoogleMap } from "@/components/editable/EditableGoogleMap";
import { EditableImageCard, EditableCard, PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { useMemo } from 'react';
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";
import { EventInfoText } from "@/components/EventInfoDisplay";

const TravelAccommodation = () => {
  const { data: eventSettings } = useEventSettings();
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText pageName="travel-accommodation" sectionName="hero" contentKey="title" defaultValue="Travel & Accommodation" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title" as="h1" />
            <p className="text-xl text-muted-foreground w-full">
              Plan your visit to <EventInfoText field="location" className="inline" />
            </p>
          </div>
        </section>
      )
    },
    {
      id: 'venue-info',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="travel-accommodation"
              sectionId="venue-info"
              className="grid md:grid-cols-2 gap-8"
              columns={[
                {
                  id: 'when-where-card',
                  component: (
                    <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-card border border-border shadow-card">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-3 text-primary">When?</h2>
                        <p className="text-lg mb-2">
                          <EventInfoText field="event_date" className="inline" />
                        </p>
                        <EditableText pageName="travel-accommodation" sectionName="venue-info" contentKey="hours" defaultValue="Doors open: 10AM - 4PM" className="text-muted-foreground" as="p" />
                      </div>
                      <div className="border-t border-border pt-6">
                        <h2 className="text-2xl font-bold mb-3 text-primary">Where?</h2>
                        <p className="text-lg mb-2">
                          <EventInfoText field="location" className="inline" />
                        </p>
                        <p className="text-muted-foreground">
                          <EventInfoText field="address_line_1" className="inline" />{", "}
                          <EventInfoText field="address_line_2" className="inline" />{", "}
                          <EventInfoText field="address_line_3" className="inline" />
                        </p>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'map-card',
                  component: (
                    <div className="rounded-xl overflow-hidden bg-card border border-border shadow-card">
                      <EditableGoogleMap
                        pageName="travel-accommodation"
                        sectionName="venue-info"
                        contentKey="map-location"
                        defaultSrc="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.726753992775!2d0.029219!3d51.508056!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487602c3d12c4b5d%3A0xc4f0e5d1c7e3e0e1!2sExCeL%20London!5e0!3m2!1sen!2suk!4v1234567890"
                        className="w-full h-full"
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
      id: 'three-cards',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="travel-accommodation"
              sectionId="three-cards"
              className="grid md:grid-cols-3 gap-8"
              columns={[
                {
                  id: 'card-1',
                  component: (
                    <EditableImageCard
                      pageName="travel-accommodation"
                      sectionName="three-cards"
                      cardId="card-1"
                      defaultImageSrc="/placeholder.svg"
                      defaultImageAlt="Card 1"
                      defaultTitle="Card 1 Title"
                      defaultDescription="Description for card 1. Edit this text to add your content."
                    />
                  )
                },
                {
                  id: 'card-2',
                  component: (
                    <EditableImageCard
                      pageName="travel-accommodation"
                      sectionName="three-cards"
                      cardId="card-2"
                      defaultImageSrc="/placeholder.svg"
                      defaultImageAlt="Card 2"
                      defaultTitle="Card 2 Title"
                      defaultDescription="Description for card 2. Edit this text to add your content."
                    />
                  )
                },
                {
                  id: 'card-3',
                  component: (
                    <EditableImageCard
                      pageName="travel-accommodation"
                      sectionName="three-cards"
                      cardId="card-3"
                      defaultImageSrc="/placeholder.svg"
                      defaultImageAlt="Card 3"
                      defaultTitle="Card 3 Title"
                      defaultDescription="Description for card 3. Edit this text to add your content."
                    />
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'two-text-cards',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="travel-accommodation"
              sectionId="two-text-cards"
              className="grid md:grid-cols-2 gap-8"
              columns={[
                {
                  id: 'card-1',
                  component: (
                    <EditableCard
                      pageName="travel-accommodation"
                      sectionName="two-text-cards"
                      cardId="card-1"
                      defaultTitle="Text Card 1 Title"
                      defaultDescription="Description for text card 1. This card contains only text content without any images. Edit this to add your message."
                      className="h-full flex flex-col justify-center p-8 rounded-xl bg-card !border-2 !border-border shadow-card"
                      titleClassName="text-2xl font-bold mb-4"
                      showIcon={false}
                    />
                  )
                },
                {
                  id: 'card-2',
                  component: (
                    <EditableCard
                      pageName="travel-accommodation"
                      sectionName="two-text-cards"
                      cardId="card-2"
                      defaultTitle="Text Card 2 Title"
                      defaultDescription="Description for text card 2. This card contains only text content without any images. Edit this to add your message."
                      className="h-full flex flex-col justify-center p-8 rounded-xl bg-card !border-2 !border-border shadow-card"
                      titleClassName="text-2xl font-bold mb-4"
                      showIcon={false}
                    />
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    }
  ], [eventSettings]);

  return (
    <>
      <Helmet>
        <title>Travel & Accommodation | {eventSettings?.event_name || DEFAULT_EVENT.NAME}</title>
        <meta
          name="description"
          content={`Plan your visit to ${eventSettings?.event_name || DEFAULT_EVENT.NAME} at ${eventSettings?.location || DEFAULT_EVENT.LOCATION}. Find travel directions, nearby accommodation options, parking information, and venue details for ${eventSettings?.event_date || DEFAULT_EVENT.DATE}.`}
        />
        <meta name="keywords" content={`${eventSettings?.event_name || DEFAULT_EVENT.NAME}, travel, accommodation, directions, ${eventSettings?.location || DEFAULT_EVENT.LOCATION}, parking, venue, how to get there`} />
        <link rel="canonical" href="https://grabandgoexpo.com/travel-accommodation" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections pageName="travel-accommodation" sections={sections} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default TravelAccommodation;
