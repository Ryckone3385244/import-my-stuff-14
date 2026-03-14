import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText, EditableEmbed } from "@/components/editable";
import { PageWithDraggableSections } from '@/components/editable';
import { useMemo } from 'react';

const Showguide = () => {
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText pageName="showguide" sectionName="hero" contentKey="title" defaultValue="Showguide" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title" as="h1" />
          </div>
        </section>
      )
    },
    {
      id: 'issuu-embed',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EditableEmbed
              pageName="showguide"
              sectionName="issuu-embed"
              contentKey="issuu-code"
              defaultSrc=""
              height="600px"
              className="w-full"
            />
          </div>
        </section>
      )
    }
  ], []);

  return (
    <>
      <DynamicHelmet titlePrefix="Showguide" description="Official showguide for {eventName}." />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections pageName="showguide" sections={sections} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Showguide;
