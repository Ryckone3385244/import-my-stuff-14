import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageName } from "@/hooks/usePageName";

const Floorplan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: eventSettings } = useEventSettings();
  const pageName = usePageName(); // Dynamic page name based on URL
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    job_title: "",
    phone: "",
  });

  // Register interest mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("registrations")
        .insert({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          role: "other",
          interest_type: "floorplan",
          has_accessed_floorplan: true,
        });

      if (error) throw error;

      // Fire-and-forget notification
      supabase.functions.invoke("notify-registration", {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          interestType: "floorplan",
        },
      }).catch(err => console.error("Notification error:", err));
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Registration successful! Redirecting to floorplan...",
      });
      setFormData({ name: "", email: "", company: "", job_title: "", phone: "" });
      // Redirect after a brief delay to show the toast
      setTimeout(() => {
        navigate("/view-floorplan");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sections = useMemo(() => {
    const allSections = [
      {
        id: "hero",
        component: (
          <section className="pt-page pb-5 bg-background">
            <div className="container mx-auto px-4 text-center">
              <EditableText
                pageName={pageName}
                sectionName="hero"
                contentKey="title"
                defaultValue="Event Floorplan"
                className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
                as="h1"
              />
              <EditableText
                pageName={pageName}
                sectionName="hero"
                contentKey="subtitle"
                defaultValue="Register your interest to access the event floorplan"
                className="text-xl text-muted-foreground w-full mx-auto"
                as="p"
              />
            </div>
          </section>
        ),
      },
      {
        id: "registration-form",
        component: (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">Access Floorplan</CardTitle>
                    <CardDescription className="text-center">
                      Complete the form below to view the event floorplan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        registerMutation.mutate();
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="floorplan-name">Name *</Label>
                        <Input
                          id="floorplan-name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Your name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="floorplan-email">Email *</Label>
                        <Input
                          id="floorplan-email"
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
                        <Label htmlFor="floorplan-company">Company *</Label>
                        <Input
                          id="floorplan-company"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({ ...formData, company: e.target.value })
                          }
                          placeholder="Your company"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="floorplan-job-title">Job Title *</Label>
                        <Input
                          id="floorplan-job-title"
                          value={formData.job_title}
                          onChange={(e) =>
                            setFormData({ ...formData, job_title: e.target.value })
                          }
                          placeholder="Your job title"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="floorplan-phone">Phone Number *</Label>
                        <Input
                          id="floorplan-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          placeholder="Your phone number"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Submitting..." : "View Floorplan"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        ),
      },
    ];

    return allSections;
  }, [formData, registerMutation]);

  return (
    <>
      <Helmet>
        <title>Event Floorplan | {eventSettings?.event_name || DEFAULT_EVENT.NAME}</title>
        <meta
          name="description"
          content={`View the interactive floorplan for ${eventSettings?.event_name || DEFAULT_EVENT.NAME} at ${eventSettings?.location || DEFAULT_EVENT.LOCATION}. Locate exhibitor booths, plan your route, and make the most of your visit on ${eventSettings?.event_date || DEFAULT_EVENT.DATE}.`}
        />
        <meta name="keywords" content={`${eventSettings?.event_name || DEFAULT_EVENT.NAME}, floorplan, exhibitor map, booth locations, ${eventSettings?.location || DEFAULT_EVENT.LOCATION}, event map, venue layout`} />
        <link rel="canonical" href="https://grabandgoexpo.com/floorplan" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          {sections.map((section) => (
            <div key={section.id}>{section.component}</div>
          ))}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Floorplan;
