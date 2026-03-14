import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Store, ShoppingBag, UtensilsCrossed, Coffee, Pizza, Warehouse } from "lucide-react";
import { EditableText } from "@/components/editable/EditableText";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { useMemo } from 'react';
import { useEventSettings } from "@/hooks/useEventSettings";
import { usePageName } from "@/hooks/usePageName";

const WhoAttends = () => {
  const pageName = usePageName();
  const { data: eventSettings } = useEventSettings();
  const sections = useMemo(() => [
    {
      id: 'audience-row-1',
      component: (
        <section className="py-4">
          <SectionWithDraggableColumns
            pageName={pageName}
            sectionId="audience-row-1"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            columns={[
              {
                id: 'retailers-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="audience"
                          contentKey="retailers-icon"
                          defaultIcon="Store"
                          className="w-6 h-6 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="audience"
                        contentKey="retailers-title"
                        defaultValue="Retailers"
                        className="text-xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText
                      pageName={pageName}
                      sectionName="audience"
                      contentKey="retailers-description"
                      defaultValue="Retail store owners and managers seeking innovative grab-and-go solutions, ready-to-eat products, and efficient merchandising strategies."
                      className="text-muted-foreground"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'convenience-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="audience"
                          contentKey="convenience-icon"
                          defaultIcon="ShoppingBag"
                          className="w-6 h-6 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="audience"
                        contentKey="convenience-title"
                        defaultValue="Convenience Stores"
                        className="text-xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText
                      pageName={pageName}
                      sectionName="audience"
                      contentKey="convenience-description"
                      defaultValue="C-store operators looking to expand their grab-and-go offerings, improve customer experience, and boost sales with convenient food solutions."
                      className="text-muted-foreground"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'qsrs-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="audience"
                          contentKey="qsrs-icon"
                          defaultIcon="UtensilsCrossed"
                          className="w-6 h-6 text-primary"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="audience"
                        contentKey="qsrs-title"
                        defaultValue="QSRs"
                        className="text-xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText
                      pageName={pageName}
                      sectionName="audience"
                      contentKey="qsrs-description"
                      defaultValue="Quick service restaurant owners and operators discovering the latest trends in fast-casual dining, packaging innovations, and speed-of-service solutions."
                      className="text-muted-foreground"
                      as="p"
                    />
                  </div>
                )
              }
            ]}
          />
        </section>
      )
    },
    {
      id: 'audience-row-2',
      component: (
        <section className="py-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <EditableIcon
                  pageName={pageName}
                  sectionName="audience"
                  contentKey="cafes-icon"
                  defaultIcon="Coffee"
                  className="w-6 h-6 text-primary"
                />
              </div>
              <EditableText
                pageName={pageName}
                sectionName="audience"
                contentKey="cafes-title"
                defaultValue="Cafes"
                className="text-xl font-semibold"
                as="h2"
              />
            </div>
            <EditableText
              pageName={pageName}
              sectionName="audience"
              contentKey="cafes-description"
              defaultValue="Cafe owners seeking premium grab-and-go options, specialty beverages, fresh food displays, and sustainable packaging solutions."
              className="text-muted-foreground"
              as="p"
            />
          </div>

          <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <EditableIcon
                  pageName={pageName}
                  sectionName="audience"
                  contentKey="restaurants-icon"
                  defaultIcon="Pizza"
                  className="w-6 h-6 text-primary"
                />
              </div>
              <EditableText
                pageName={pageName}
                sectionName="audience"
                contentKey="restaurants-title"
                defaultValue="Restaurants"
                className="text-xl font-semibold"
                as="h2"
              />
            </div>
            <EditableText
              pageName={pageName}
              sectionName="audience"
              contentKey="restaurants-description"
              defaultValue="Restaurant owners exploring delivery-friendly packaging, hot food solutions, and efficient grab-and-go meal options for on-the-go customers."
              className="text-muted-foreground"
              as="p"
            />
          </div>

          <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <EditableIcon
                  pageName={pageName}
                  sectionName="audience"
                  contentKey="wholesalers-icon"
                  defaultIcon="Warehouse"
                  className="w-6 h-6 text-primary"
                />
              </div>
              <EditableText
                pageName={pageName}
                sectionName="audience"
                contentKey="wholesalers-title"
                defaultValue="Wholesalers"
                className="text-xl font-semibold"
                as="h2"
              />
            </div>
            <EditableText
              pageName={pageName}
              sectionName="audience"
              contentKey="wholesalers-description"
              defaultValue="Wholesale distributors and suppliers looking to connect with buyers, discover new product lines, and expand their grab-and-go portfolio."
              className="text-muted-foreground"
              as="p"
            />
          </div>
        </div>
        </section>
      )
    },
    {
      id: 'stats',
      component: (
        <section className="py-4">
          <div className="bg-black p-10 rounded-2xl border border-white/10 shadow-glow">
          <EditableText 
            pageName={pageName} 
            sectionName="stats" 
            contentKey="title" 
            defaultValue="Attendee Statistics" 
            className="text-3xl font-bold mb-8 text-center text-white pt-5"
            as="h2"
          />
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="group cursor-default">
              <EditableText 
                pageName={pageName} 
                sectionName="stats" 
                contentKey="attendees-number" 
                defaultValue="15,000+" 
                className="text-5xl font-bold text-gradient mb-3 transition-transform group-hover:scale-110 duration-300"
                as="div"
              />
              <div className="text-white/80 font-medium">Expected Attendees</div>
            </div>
            <div className="group cursor-default">
              <EditableText 
                pageName={pageName} 
                sectionName="stats" 
                contentKey="seminars-number" 
                defaultValue="200+" 
                className="text-5xl font-bold text-gradient mb-3 transition-transform group-hover:scale-110 duration-300"
                as="div"
              />
              <div className="text-white/80 font-medium">Seminars & Workshops</div>
            </div>
            <div className="group cursor-default">
              <EditableText 
                pageName={pageName} 
                sectionName="stats" 
                contentKey="exhibitors-number" 
                defaultValue="500+" 
                className="text-5xl font-bold text-gradient mb-3 transition-transform group-hover:scale-110 duration-300"
                as="div"
              />
              <div className="text-white/80 font-medium">Exhibitors</div>
            </div>
          </div>
        </div>
        </section>
      )
    }
  ], [pageName]);

  return <>
      <DynamicHelmet 
        titlePrefix="Who Attends" 
        description="Meet industry professionals, decision-makers, and innovators attending our expo from various sectors."
      />
      
      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12">
          <EditableText 
            pageName={pageName} 
            sectionName="hero" 
            contentKey="title" 
            defaultValue="Who Attends Customer Connect Expo" 
            className="text-4xl md:text-5xl font-bold mb-6 text-center text-gradient-title"
            as="h1"
          />
          
          <EditableText 
            pageName={pageName} 
            sectionName="hero" 
            contentKey="subtitle" 
            defaultValue="Join thousands of professionals from diverse sectors united by their commitment to innovation, preparedness, and excellence." 
            className="text-xl text-muted-foreground text-center mb-12 w-full mx-auto"
            as="p"
          />

          <PageWithDraggableSections
            pageName={pageName}
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>;
};
export default WhoAttends;