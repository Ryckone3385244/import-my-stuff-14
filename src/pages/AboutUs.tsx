import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useMemo } from 'react';
import { usePageName } from "@/hooks/usePageName";

const AboutUs = () => {
  const pageName = usePageName();
  
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText
              pageName={pageName}
              sectionName="hero"
              contentKey="title"
              defaultValue="About Us"
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
              as="h1"
            />
            <EditableText
              pageName={pageName}
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Creating world-class events that connect industries and drive innovation"
              className="text-xl text-muted-foreground w-full mx-auto -mb-5"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'company-intro',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName={pageName}
              sectionId="company-intro"
              className="grid md:grid-cols-2 gap-12 items-center equal-height-grid"
              columns={[
                {
                  id: 'description',
                  component: (
                    <div className="h-full flex flex-col justify-center">
                      <EditableText
                        pageName={pageName}
                        sectionName="company-intro"
                        contentKey="description"
                        defaultValue="Fortem International is a leading trade exhibition organization with over 20 years of experience running market-leading exhibitions across multiple sectors including Technology, Healthcare, Retail, Hospitality, and Manufacturing. We bring together industry professionals to discover innovations, forge partnerships, and drive business growth."
                        className="text-lg"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'main-image',
                  component: (
                    <EditableImage
                      pageName={pageName}
                      sectionName="company-intro"
                      contentKey="main-image"
                      defaultSrc="/placeholder.svg"
                      alt="Company overview"
                      className="w-full h-96 object-cover rounded-lg"
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
      id: 'values',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <EditableText
              pageName={pageName}
              sectionName="values"
              contentKey="section-title"
              defaultValue="Our Values"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
            <SectionWithDraggableColumns
              pageName={pageName}
              sectionId="values"
              className="grid md:grid-cols-3 gap-8 items-stretch"
              columns={[
                {
                  id: 'value-1',
                  component: (
                    <div className="h-full p-6 rounded-xl bg-card border border-border text-center">
                      <div className="flex justify-center mb-4">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="values"
                          contentKey="value-1-icon"
                          defaultIcon="Award"
                          className="h-12 w-12 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-1-title"
                        defaultValue="Excellence"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-1-desc"
                        defaultValue="We strive for excellence in every event we organize, delivering exceptional experiences for exhibitors and visitors alike."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'value-2',
                  component: (
                    <div className="h-full p-6 rounded-xl bg-card border border-border text-center">
                      <div className="flex justify-center mb-4">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="values"
                          contentKey="value-2-icon"
                          defaultIcon="Lightbulb"
                          className="h-12 w-12 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-2-title"
                        defaultValue="Innovation"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-2-desc"
                        defaultValue="We embrace innovation and continually evolve our events to meet the changing needs of industries."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'value-3',
                  component: (
                    <div className="h-full p-6 rounded-xl bg-card border border-border text-center">
                      <div className="flex justify-center mb-4">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="values"
                          contentKey="value-3-icon"
                          defaultIcon="Handshake"
                          className="h-12 w-12 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-3-title"
                        defaultValue="Partnership"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="values"
                        contentKey="value-3-desc"
                        defaultValue="We build lasting partnerships with our clients, suppliers, and stakeholders to create mutually beneficial outcomes."
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
      id: 'global-reach',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName={pageName}
              sectionId="global-reach"
              className="grid md:grid-cols-2 gap-12 items-center equal-height-grid"
              columns={[
                {
                  id: 'main-image',
                  component: (
                    <EditableImage
                      pageName={pageName}
                      sectionName="global-reach"
                      contentKey="main-image"
                      defaultSrc="/placeholder.svg"
                      alt="Global reach"
                      className="w-full h-96 object-cover rounded-lg"
                    />
                  )
                },
                {
                  id: 'text-content',
                  component: (
                    <div className="h-full flex flex-col justify-center">
                      <EditableText
                        pageName={pageName}
                        sectionName="global-reach"
                        contentKey="section-title"
                        defaultValue="Global Reach"
                        className="text-3xl font-bold mb-6"
                        as="h2"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="global-reach"
                        contentKey="description"
                        defaultValue="Our events attract participants from around the world, creating truly global networking opportunities and business connections that span continents."
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
      id: 'partners',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EditableText
              pageName={pageName}
              sectionName="partners"
              contentKey="section-title"
              defaultValue="Companies We Worked With"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
            <Carousel
               opts={{
                 align: "start",
                 loop: true,
                 dragFree: true,
                 containScroll: "trimSnaps",
               }}
               className="w-full"
             >
               <CarouselContent>
                 {Array.from({ length: 52 }).map((_, index) => (
                   <CarouselItem
                     key={index}
                     className="w-[50vw] md:w-1/4 lg:w-1/6 min-w-0 shrink-0 grow-0 pl-4"
                   >
                        <div className="px-1 md:px-5">
                          <div className="bg-card rounded-lg shadow-sm p-6 flex items-center justify-center overflow-hidden">
                            <EditableImage
                              pageName={pageName}
                              sectionName="partners"
                              contentKey={`logo-${index + 1}`}
                              defaultSrc="/placeholder.svg"
                              alt={`Partner logo ${index + 1}`}
                              className="w-full h-24 object-contain border border-border/50 rounded-md"
                            />
                          </div>
                        </div>
                   </CarouselItem>
                 ))}
               </CarouselContent>
               <CarouselPrevious />
               <CarouselNext />
             </Carousel>
          </div>
        </section>
      )
    }
  ], [pageName]);

  return (
    <>
      <Helmet>
        <title>About Us | Customer Connect Expo</title>
        <meta name="description" content="Learn about Fortem International and our commitment to creating world-class exhibitions." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName={pageName}
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AboutUs;
