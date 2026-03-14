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
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageName } from "@/hooks/usePageName";

const BecomeASponsor = () => {
  const pageName = usePageName();
  const { data: eventSettings } = useEventSettings();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [interestFormData, setInterestFormData] = useState({
    name: "",
    email: "",
    company: "",
  });

  // Register interest mutation
  const registerInterestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("registrations")
        .insert({
          name: interestFormData.name,
          email: interestFormData.email,
          company: interestFormData.company,
          role: "Interested - Sponsor",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Thank you for registering your interest. Our team will be in touch shortly.",
      });
      setInterestFormData({ name: "", email: "", company: "" });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText
              pageName="become-a-sponsor"
              sectionName="hero"
              contentKey="title"
              defaultValue="Become a Sponsor"
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
              as="h1"
            />
            <EditableText
              pageName="become-a-sponsor"
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Maximize your brand visibility and connect with key industry decision-makers"
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
            <EditableText
              pageName="become-a-sponsor"
              sectionName="intro"
              contentKey="description"
              defaultValue="Sponsorship opportunities at Grab & Go Expo provide unparalleled exposure to thousands of foodservice professionals. From keynote presentations to branded networking areas, we offer a range of packages designed to meet your marketing objectives and budget."
              className="text-lg text-center max-w-4xl mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'packages',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <EditableText
              pageName="become-a-sponsor"
              sectionName="packages"
              contentKey="section-title"
              defaultValue="Sponsorship Packages"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
            <SectionWithDraggableColumns
              pageName="become-a-sponsor"
              sectionId="packages"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              columns={[
                {
                  id: 'package-1',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-1-image"
                          defaultSrc="/placeholder.svg"
                          alt="Platinum Sponsorship"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-1-title"
                        defaultValue="Platinum Sponsorship"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-1-desc"
                        defaultValue="Maximum visibility with prime positioning, keynote speaking opportunities, and premium branding throughout the event."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'package-2',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-2-image"
                          defaultSrc="/placeholder.svg"
                          alt="Gold Sponsorship"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-2-title"
                        defaultValue="Gold Sponsorship"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-2-desc"
                        defaultValue="Significant brand exposure with prominent logo placement and access to exclusive networking opportunities."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'package-3',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-3-image"
                          defaultSrc="/placeholder.svg"
                          alt="Silver Sponsorship"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-3-title"
                        defaultValue="Silver Sponsorship"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-3-desc"
                        defaultValue="Targeted visibility with logo inclusion on event materials and website recognition."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'package-4',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-4-image"
                          defaultSrc="/placeholder.svg"
                          alt="Zone Sponsorship"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-4-title"
                        defaultValue="Zone Sponsorship"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-4-desc"
                        defaultValue="Sponsor specific areas like the networking lounge, coffee bar, or innovation theater for focused engagement."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'package-5',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-5-image"
                          defaultSrc="/placeholder.svg"
                          alt="Digital Sponsorship"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-5-title"
                        defaultValue="Digital Sponsorship"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-5-desc"
                        defaultValue="Enhance your online presence with website banners, email campaigns, and social media promotion."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'package-6',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName="become-a-sponsor"
                          sectionName="packages"
                          contentKey="package-6-image"
                          defaultSrc="/placeholder.svg"
                          alt="Custom Packages"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-6-title"
                        defaultValue="Custom Packages"
                        className="text-2xl font-bold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="become-a-sponsor"
                        sectionName="packages"
                        contentKey="package-6-desc"
                        defaultValue="Work with our team to create a bespoke sponsorship package tailored to your specific marketing goals."
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
      id: 'benefits',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EditableText
              pageName="become-a-sponsor"
              sectionName="benefits"
              contentKey="section-title"
              defaultValue="Sponsorship Benefits"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
            <div className="max-w-4xl mx-auto">
              <div className="p-8 rounded-xl bg-card border-2 border-muted grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-1"
                    defaultValue="Prominent brand visibility to thousands of attendees"
                    className="text-lg"
                    as="p"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-2"
                    defaultValue="Access to exclusive networking events"
                    className="text-lg"
                    as="p"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-3"
                    defaultValue="Lead generation and direct customer engagement"
                    className="text-lg"
                    as="p"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-4"
                    defaultValue="Pre and post-event marketing exposure"
                    className="text-lg"
                    as="p"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-5"
                    defaultValue="Speaking and presentation opportunities"
                    className="text-lg"
                    as="p"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary text-2xl">✓</span>
                  <EditableText
                    pageName="become-a-sponsor"
                    sectionName="benefits"
                    contentKey="benefit-6"
                    defaultValue="Complimentary exhibitor passes and booth space"
                    className="text-lg"
                    as="p"
                  />
                </div>
              </div>
            </div>
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
                <EditableText pageName="become-a-sponsor" sectionName="cta" contentKey="title" defaultValue="Register Today" className="text-4xl md:text-5xl font-bold mb-6 pt-5" as="h2" />
                {!showForm && (
                  <>
                    <EditableText pageName="become-a-sponsor" sectionName="cta" contentKey="description" defaultValue="Contact our partnerships team to discuss sponsorship opportunities and create a package that works for you." className="text-xl text-white/80 mb-8" as="p" />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText 
                        pageName="become-a-sponsor" 
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
                  
                    <div className="bg-card rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center">Register Your Interest</h2>
                        <p className="text-muted-foreground text-center mx-auto mb-8">
                          Complete the form below and our partnerships team will be in touch.
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            registerInterestMutation.mutate();
                          }}
                          className="space-y-4 max-w-md mx-auto"
                        >
                          <div>
                            <Label htmlFor="interest-name" className="text-foreground">Name *</Label>
                            <Input
                              id="interest-name"
                              value={interestFormData.name}
                              onChange={(e) =>
                                setInterestFormData({ ...interestFormData, name: e.target.value })
                              }
                              placeholder="Your name"
                              required
                              className="bg-background"
                            />
                          </div>

                          <div>
                            <Label htmlFor="interest-email" className="text-foreground">Email *</Label>
                            <Input
                              id="interest-email"
                              type="email"
                              value={interestFormData.email}
                              onChange={(e) =>
                                setInterestFormData({ ...interestFormData, email: e.target.value })
                              }
                              placeholder="your.email@example.com"
                              required
                              className="bg-background"
                            />
                          </div>

                          <div>
                            <Label htmlFor="interest-company" className="text-foreground">Company *</Label>
                            <Input
                              id="interest-company"
                              value={interestFormData.company}
                              onChange={(e) =>
                                setInterestFormData({ ...interestFormData, company: e.target.value })
                              }
                              placeholder="Your company"
                              required
                              className="bg-background"
                            />
                          </div>

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={registerInterestMutation.isPending}
                          >
                            {registerInterestMutation.isPending ? "Submitting..." : "Register Interest"}
                          </Button>
                        </form>
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
  ], [pageName, showForm, interestFormData, registerInterestMutation]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Become a Sponsor" 
        description="Explore sponsorship opportunities at {eventName} and maximize your brand visibility."
      />
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

export default BecomeASponsor;
