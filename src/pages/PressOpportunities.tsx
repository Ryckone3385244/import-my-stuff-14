import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useMemo, useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PressOpportunities = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("registrations")
        .insert({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          role: "Interested - Press",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Thank you for registering your interest. We'll be in touch soon.",
      });
      setFormData({ name: "", email: "", company: "" });
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
            <EditableText pageName="press-opportunities" sectionName="hero" contentKey="title" defaultValue="Press Opportunities" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title" as="h1" />
            <EditableText pageName="press-opportunities" sectionName="hero" contentKey="intro" defaultValue="With trending technology and services being showcased, Customer Connect Expo offers plenty of fresh and interesting content." className="text-xl text-muted-foreground max-w-3xl mx-auto" as="p" />
          </div>
        </section>
      )
    },
    {
      id: 'opportunities-list',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <Card>
              <CardContent className="p-8">
                <SectionWithDraggableColumns
                  pageName="press-opportunities"
                  sectionId="opportunities-list"
                  className="grid md:grid-cols-2 gap-8 items-center"
                  columns={[
                    {
                      id: 'list-content',
                      component: (
                        <div>
                          <EditableText pageName="press-opportunities" sectionName="opportunities-list" contentKey="list-title" defaultValue="Press opportunities include:" className="text-2xl font-bold mb-6" as="h2" />
                          <ul className="space-y-3">
                            {['Access to our VIP lounge and press area', 'Interviews with speakers and exhibitors', 'Pre-show virtual interviews', 'Contribution to newsletters', 'Event photography access'].map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <Check className="text-primary mt-1 flex-shrink-0" size={20} />
                                <EditableText pageName="press-opportunities" sectionName="opportunities-list" contentKey={`item-${i + 1}`} defaultValue={item} as="span" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    },
                    {
                      id: 'image-content',
                      component: (
                        <div>
                          <AspectRatio ratio={16/9}>
                            <EditableImage 
                              pageName="press-opportunities" 
                              sectionName="opportunities-list" 
                              contentKey="right-image" 
                              defaultSrc="/placeholder.svg" 
                              alt="Press opportunities" 
                              className="w-full h-full rounded-lg object-cover"
                            />
                          </AspectRatio>
                        </div>
                      )
                    }
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )
    }
  ], []);

  return (
    <>
      <DynamicHelmet titlePrefix="Press Opportunities" description="Press opportunities and media resources for {eventName}." />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections pageName="press-opportunities" sections={sections} />
          
          <section className="py-16 bg-muted/50">
            <div className="container mx-auto px-4 max-w-md">
              <div className="text-center mb-8">
                <EditableText pageName="press-opportunities" sectionName="register-interest" contentKey="title" defaultValue="Register Your Interest" className="text-3xl md:text-4xl font-bold mb-4" as="h2" />
                <EditableText pageName="press-opportunities" sectionName="register-interest" contentKey="description" defaultValue="Join our press list to receive exclusive updates, early access to show information, and media resources for the Customer Connect Expo." className="text-lg text-muted-foreground" as="p" />
              </div>
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      registerMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="press-name">Name *</Label>
                      <Input
                        id="press-name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Your name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="press-email">Email *</Label>
                      <Input
                        id="press-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="press-company">Company *</Label>
                      <Input
                        id="press-company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder="Your company"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Submitting..." : "Register Interest"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PressOpportunities;
