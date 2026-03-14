import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const inquirySchema = z.object({
  visitor_name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  visitor_email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  visitor_company: z.string()
    .trim()
    .max(100, "Company name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  visitor_phone: z.string()
    .trim()
    .max(20, "Phone must be less than 20 characters")
    .regex(/^[0-9+\-\s()]*$/, "Invalid phone format")
    .optional()
    .or(z.literal("")),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

interface ExhibitorContactFormProps {
  exhibitorId: string;
  exhibitorName: string;
  onSuccess?: () => void;
}

export const ExhibitorContactForm = ({
  exhibitorId,
  exhibitorName,
  onSuccess,
}: ExhibitorContactFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    visitor_name: "",
    visitor_email: "",
    visitor_company: "",
    visitor_phone: "",
    message: "",
    website: "", // Honeypot field
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = inquirySchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          newErrors[error.path[0].toString()] = error.message;
        }
      });
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please check the form for errors",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Submit inquiry via edge function with spam protection
      const { data, error: submitError } = await supabase.functions.invoke(
        "submit-inquiry",
        {
          body: {
            exhibitorId,
            visitorName: formData.visitor_name,
            visitorEmail: formData.visitor_email,
            visitorCompany: formData.visitor_company || undefined,
            visitorPhone: formData.visitor_phone || undefined,
            message: formData.message,
            honeypot: formData.website, // Send honeypot value
          },
        }
      );

      if (submitError) throw submitError;
      
      if (!data?.success) {
        throw new Error(data?.error || "Failed to submit inquiry");
      }

      // Call onSuccess callback first to close modal
      onSuccess?.();

      // Reset form
      setFormData({
        visitor_name: "",
        visitor_email: "",
        visitor_company: "",
        visitor_phone: "",
        message: "",
        website: "",
      });

      // Show success toast after modal closes
      setTimeout(() => {
        toast({
          title: "Message Sent!",
          description: "Your inquiry was successfully sent.",
        });
      }, 100);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      
      // Determine specific error type and provide user-friendly message
      let errorTitle = "Unable to Send Message";
      let errorMessage = "";
      let errorAction = "";
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes("network") || errorText.includes("fetch") || errorText.includes("failed to fetch")) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the server.";
          errorAction = "Please check your internet connection and try again.";
        } else if (errorText.includes("timeout")) {
          errorTitle = "Request Timeout";
          errorMessage = "The server took too long to respond.";
          errorAction = "Please wait a moment and try again.";
        } else if (errorText.includes("rate limit") || errorText.includes("too many")) {
          errorTitle = "Too Many Requests";
          errorMessage = "You've made too many requests in a short time.";
          errorAction = "Please wait a few minutes before trying again.";
        } else if (errorText.includes("spam") || errorText.includes("blocked")) {
          errorTitle = "Submission Blocked";
          errorMessage = "Your submission was flagged by our security system.";
          errorAction = "Please try again or contact us through another method.";
        } else if (errorText.includes("server") || errorText.includes("500") || errorText.includes("internal")) {
          errorTitle = "Server Error";
          errorMessage = "Something went wrong on our end.";
          errorAction = "Please try again later. If the problem persists, contact support.";
        } else {
          errorMessage = error.message;
          errorAction = "Please try again. If the problem continues, contact us directly.";
        }
      } else {
        errorMessage = "An unexpected error occurred while sending your message.";
        errorAction = "Please try again. If the problem continues, contact us directly.";
      }
      
      toast({
        title: errorTitle,
        description: (
          <div className="space-y-1">
            <p>{errorMessage}</p>
            <p className="text-sm opacity-80">{errorAction}</p>
          </div>
        ),
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="visitor_name">
          Your Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="visitor_name"
          name="visitor_name"
          value={formData.visitor_name}
          onChange={handleChange}
          placeholder="John Smith"
          disabled={loading}
          className={errors.visitor_name ? "border-destructive" : ""}
        />
        {errors.visitor_name && (
          <p className="text-sm text-destructive">{errors.visitor_name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="visitor_email">
          Your Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="visitor_email"
          name="visitor_email"
          type="email"
          value={formData.visitor_email}
          onChange={handleChange}
          placeholder="john@example.com"
          disabled={loading}
          className={errors.visitor_email ? "border-destructive" : ""}
        />
        {errors.visitor_email && (
          <p className="text-sm text-destructive">{errors.visitor_email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="visitor_company">Company (optional)</Label>
          <Input
            id="visitor_company"
            name="visitor_company"
            value={formData.visitor_company}
            onChange={handleChange}
            placeholder="Acme Corp"
            disabled={loading}
            className={errors.visitor_company ? "border-destructive" : ""}
          />
          {errors.visitor_company && (
            <p className="text-sm text-destructive">{errors.visitor_company}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="visitor_phone">Phone (optional)</Label>
          <Input
            id="visitor_phone"
            name="visitor_phone"
            type="tel"
            value={formData.visitor_phone}
            onChange={handleChange}
            placeholder="+1 234 567 8900"
            disabled={loading}
            className={errors.visitor_phone ? "border-destructive" : ""}
          />
          {errors.visitor_phone && (
            <p className="text-sm text-destructive">{errors.visitor_phone}</p>
          )}
          </div>
        </div>

        {/* Honeypot field - hidden from users but visible to bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="text"
            value={formData.website}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
        <Label htmlFor="message">
          Your Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="I'm interested in learning more about your products..."
          rows={5}
          disabled={loading}
          className={errors.message ? "border-destructive" : ""}
        />
        <div className="flex justify-between items-center">
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {formData.message.length}/1000 characters
          </p>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>Sending...</>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Inquiry
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By submitting this form, you agree to be contacted by the exhibitor
        regarding your inquiry.
      </p>
    </form>
  );
};
