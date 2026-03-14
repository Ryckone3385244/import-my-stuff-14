import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Send, TestTube, Upload, Save, Key } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RecipientSelector } from "@/components/RecipientSelector";
import { calculateExhibitorCompletionSync, calculateSpeakerCompletion } from "@/lib/exhibitorCompletionUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/errorHandling";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExhibitorContact {
  is_main_contact: boolean;
  is_active: boolean;
  email: string;
  full_name?: string;
  password?: string;
}

export const AdminEmailing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const [recipientType, setRecipientType] = useState<"exhibitor" | "speaker">("exhibitor");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  
  const { data: template } = useQuery({
    queryKey: ["email-template", recipientType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_type", recipientType)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: managers } = useQuery({
    queryKey: ["customer-managers"],
    queryFn: async () => {
      const { data: csUsers, error: csError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'customer_service');
      
      if (csError) throw csError;
      if (!csUsers || csUsers.length === 0) return [];
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("display_name, email, phone, role_title, meeting_url, user_id")
        .in('user_id', csUsers.map(u => u.user_id));
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: projectManagers } = useQuery({
    queryKey: ["project-managers"],
    queryFn: async () => {
      const { data: pmUsers, error: pmError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'project_manager');
      
      if (pmError) throw pmError;
      if (!pmUsers || pmUsers.length === 0) return [];
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("display_name, email, phone, role_title, meeting_url, user_id")
        .in('user_id', pmUsers.map(u => u.user_id));
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eventSettings } = useQuery({
    queryKey: ["event-settings-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_settings")
        .select("logo_url, event_date, location, event_name, event_domain, resend_from_domain")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: websiteStyles } = useQuery({
    queryKey: ["website-styles-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_styles")
        .select("primary_color, button_color")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Convert HSL string to hex for email compatibility
  const hslToHex = (hslString: string): string => {
    if (!hslString) return '#26cc5f';

    const parts = hslString.trim().split(/\s+/);
    if (parts.length < 3) return '#26cc5f';

    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1].replace('%', '')) / 100;
    const l = parseFloat(parts[2].replace('%', '')) / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert HSL to a "midtone" email-safe hex (Gmail dark mode resistant)
  // Clamps saturation to 60-75% and lightness to 40-55% to avoid harsh inversions
  const hslToMidtoneHex = (hslString: string): string => {
    if (!hslString) return '#3d9970'; // Midtone teal fallback

    const parts = hslString.trim().split(/\s+/);
    if (parts.length < 3) return '#3d9970';

    const h = parseFloat(parts[0]) / 360;
    // Clamp saturation: min 0.6, max 0.75 to avoid neon-bright colors
    const rawS = parseFloat(parts[1].replace('%', '')) / 100;
    const s = Math.min(0.75, Math.max(0.6, rawS));
    // Clamp lightness: 40-55% range (midtone) to avoid dark-mode inversion
    const rawL = parseFloat(parts[2].replace('%', '')) / 100;
    const l = Math.min(0.55, Math.max(0.40, rawL));

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Use midtone version for email to resist Gmail dark mode inversion
  const accentColor = hslToMidtoneHex(websiteStyles?.button_color || websiteStyles?.primary_color || '142 70% 45%');

  const { data: eventDeadlines } = useQuery({
    queryKey: ["event-settings-deadlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_settings")
        .select("showguide_listing_deadline, space_only_deadline, speaker_form_deadline, advert_submission_deadline")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const [bannerImage, setBannerImage] = useState<string>("");
  const [welcomeText, setWelcomeText] = useState("<p>We're excited to have you as part of our upcoming event!</p><p>This email contains important information about your participation.</p>");
  const [subject, setSubject] = useState("");
  const [showCredentials, setShowCredentials] = useState(true);
  const [showCompletion, setShowCompletion] = useState(true);
  const [includePasswordSetup, setIncludePasswordSetup] = useState(true);
  const [selectedManagerIndex, setSelectedManagerIndex] = useState(0);
  const [portalUrl, setPortalUrl] = useState("");
  const [localDeadlines, setLocalDeadlines] = useState<Array<{
    id: string;
    label: string;
    date: string;
    description: string;
    order: number;
  }>>([]);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");

  useEffect(() => {
    if (template) {
      setBannerImage(template.banner_image_url || "");
      setWelcomeText(template.welcome_text || "<p>We're excited to have you as part of our upcoming event!</p><p>This email contains important information about your participation.</p>");
      setPortalUrl(template.portal_url || "");
      setSubject(template.subject ?? "");
    }
  }, [template]);

  useEffect(() => {
    if (eventDeadlines) {
      const deadlines: Array<{
        id: string;
        label: string;
        date: string;
        description: string;
        order: number;
      }> = [];
      
      if (eventDeadlines.showguide_listing_deadline) {
        deadlines.push({
          id: 'showguide',
          label: 'Showguide Listing',
          date: eventDeadlines.showguide_listing_deadline,
          description: 'Submit your company details for the event showguide',
          order: 1
        });
      }
      
      if (eventDeadlines.space_only_deadline) {
        deadlines.push({
          id: 'space_only',
          label: 'Space Only Deadline',
          date: eventDeadlines.space_only_deadline,
          description: 'Deadline for space only bookings',
          order: 2
        });
      }
      
      if (eventDeadlines.speaker_form_deadline) {
        deadlines.push({
          id: 'speaker_form',
          label: 'Speaker Form',
          date: eventDeadlines.speaker_form_deadline,
          description: 'Submit your speaker session details',
          order: 3
        });
      }
      
      if (eventDeadlines.advert_submission_deadline) {
        deadlines.push({
          id: 'advert',
          label: 'Advertisement Submission',
          date: eventDeadlines.advert_submission_deadline,
          description: 'Submit your advertisement materials',
          order: 4
        });
      }
      
      setLocalDeadlines(deadlines);
    }
  }, [eventDeadlines]);

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!template?.id) {
        const { error } = await supabase
          .from("email_templates")
          .insert({
            template_type: recipientType,
            banner_image_url: bannerImage,
            welcome_text: welcomeText,
            portal_url: portalUrl,
            subject: subject,
            banner_background_color: "0 0% 0%",
            page_background_color: "0 0% 100%",
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .update({
            banner_image_url: bannerImage,
            welcome_text: welcomeText,
            portal_url: portalUrl,
            subject: subject,
            banner_background_color: "0 0% 0%",
            page_background_color: "0 0% 100%",
          })
          .eq("id", template.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template"] });
      toast({
        title: "Template Saved",
        description: "Email template updated successfully",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to save template";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `email-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      setBannerImage(data.publicUrl);
      toast({
        title: "Image uploaded",
        description: "Banner image uploaded successfully",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEmailHtml = (
    firstName: string, 
    email: string, 
    completionPercentage: number, 
    companyName: string, 
    customDeadlines?: Array<{ id: string; label: string; date: string; description: string; order: number; }>, 
    customManagers?: Array<{ display_name: string | null; role_title: string | null; email: string | null; phone: string | null; meeting_url: string | null; }>,
    passwordSetupLink?: string,
    storedPassword?: string
  ): string => {
    // HTML-escape helper for passwords with special characters
    const escHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const deadlinesToUse = customDeadlines || localDeadlines;
    const managersToUse = customManagers || managers;
    const managerTitle = recipientType === "speaker" ? "Your Project Managers" : "Your Client Relations Managers";
    const managerDefaultRole = recipientType === "speaker" ? "Project Manager" : "Client Relations Manager";
    
    // Build dynamic portal links based on event domain from settings
    const baseUrl = eventSettings?.event_domain 
      ? `https://${eventSettings.event_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : (typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
    
    const portalLink = recipientType === "speaker" 
      ? `${baseUrl}/speaker-portal/login` 
      : `${baseUrl}/exhibitor-portal/login`;
    const resetPasswordLink = portalLink;
    const footerText = recipientType === "speaker" ? "If you have any questions, please don't hesitate to reach out to your project manager." : "If you have any questions, please don't hesitate to reach out to your client relations manager.";
    
    // Password setup button section - only shown if passwordSetupLink is provided
    // Uses table layout with explicit !important colors for dark mode protection
    const passwordSetupSection = passwordSetupLink ? `
      <tr><td style="height: 10px;"></td></tr>
      <tr><td style="padding: 12px; background-color: ${accentColor} !important; border-radius: 4px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 14px; font-weight: 500;">🔑 First Time Logging In?</p>
        <a href="${passwordSetupLink}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff !important; color: ${accentColor} !important; -webkit-text-fill-color: ${accentColor} !important; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: 600; border: 1px solid ${accentColor} !important;">Set Your Password →</a>
        <p style="margin: 10px 0 0 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 12px; opacity: 0.85;">This link expires in 7 days</p>
      </td></tr>
    ` : '';
    
    // Dark mode hardened email template
    // Key fixes: off-white backgrounds (#F7F7F7), explicit !important on all colors,
    // table-based layout for dark sections, no gradients, button borders
    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${eventSettings?.event_name || 'Event'} - Important Information</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F7F7F7 !important; color: #111111 !important;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F7F7F7 !important; padding: 20px 0;">
    <tr>
      <td align="center" style="background-color: #F7F7F7 !important;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #FAFAFA !important; border-radius: 8px; overflow: hidden;">
          <!-- Banner/Header Section -->
          ${bannerImage ? `<tr><td style="padding: 0;"><img src="${bannerImage}" alt="Event Banner" style="width: 100%; height: auto; display: block;" /></td></tr>` : ''}
          ${!bannerImage && eventSettings?.logo_url ? `
          <tr>
            <td style="background-color: #1a202e !important; padding: 40px 30px; text-align: center;">
              ${eventSettings?.logo_url ? `<img src="${eventSettings.logo_url}" alt="${eventSettings.event_name || 'Event'}" style="max-width: 200px; height: auto; margin-bottom: 20px; display: inline-block;" />` : ''}
              <h2 style="margin: 0; color: #ffffff !important; font-size: 24px; font-weight: bold;">${eventSettings?.event_name || 'Event'}</h2>
              <p style="margin: 10px 0 0 0; color: #e2e8f0 !important; font-size: 16px;">${eventSettings?.event_date || ''}</p>
              <p style="margin: 5px 0 0 0; color: #e2e8f0 !important; font-size: 16px;">${eventSettings?.location || ''}</p>
            </td>
          </tr>` : ''}
          
          <!-- Welcome Section -->
          <tr>
            <td style="padding: 40px 30px; background-color: #FAFAFA !important;">
              <h2 style="margin: 0 0 20px 0; color: #111111 !important; font-size: 24px;">Hello ${firstName}!</h2>
              <div style="color: #333333 !important; font-size: 16px; line-height: 1.6;">${welcomeText}</div>
            </td>
          </tr>
          
          <!-- Manager Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #FAFAFA !important;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; background-color: #F0F0F0 !important;">
                <tr>
                  <td style="padding: 20px; background-color: #F0F0F0 !important;">
                    <h3 style="margin: 0 0 15px 0; color: #111111 !important; font-size: 18px;">${managerTitle}</h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${managersToUse && managersToUse.length > 0 ? managersToUse.map((mgr) => `
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 14px;"><strong style="color: #111111 !important;">${mgr.display_name || managerDefaultRole}</strong><br/>${mgr.role_title || managerDefaultRole}</p>
                          <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 14px;">📧 <a href="mailto:${mgr.email || ''}" style="color: ${accentColor} !important; text-decoration: underline !important; -webkit-text-fill-color: ${accentColor} !important;">${mgr.email || ''}</a></p>
                          ${mgr.phone ? `<p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 14px;">📞 <a href="tel:${mgr.phone}" style="color: ${accentColor} !important; text-decoration: underline !important; -webkit-text-fill-color: ${accentColor} !important;">${mgr.phone}</a></p>` : ''}
                          ${mgr.meeting_url ? `<a href="${mgr.meeting_url}" style="display: inline-block; padding: 10px 20px; background-color: ${accentColor} !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: 500; border: 1px solid ${accentColor} !important;">Schedule a Meeting</a>` : ''}
                        </td>
                      </tr>`).join('') : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Portal Access Section (Dark Card) -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #FAFAFA !important;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #2d3748; border-radius: 8px; background-color: #1a202e !important;">
                <tr>
                  <td style="padding: 20px; background-color: #1a202e !important;">
                    <h3 style="margin: 0 0 15px 0; color: #ffffff !important; font-size: 18px;">🔐 Your Portal Access</h3>
                    <p style="margin: 0 0 15px 0; color: #e2e8f0 !important; font-size: 14px;">Access your portal using your registered email:</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 15px;">
                      <tr>
                        <td style="padding: 10px; background-color: #2d3748 !important; border-radius: 4px;">
                          <p style="margin: 0; color: #cbd5e0 !important; font-size: 12px;">Email</p>
                          <p style="margin: 5px 0 0 0; color: #ffffff !important; font-size: 15px; font-weight: 500;"><a href="mailto:${email}" style="color: ${accentColor} !important; text-decoration: underline !important; -webkit-text-fill-color: ${accentColor} !important;">${email}</a></p>
                        </td>
                      </tr>
                      <tr><td style="height: 10px;"></td></tr>
                      <tr>
                        <td style="padding: 10px; background-color: #2d3748 !important; border-radius: 4px;">
                          <p style="margin: 0; color: #cbd5e0 !important; font-size: 12px;">Password</p>
                          ${storedPassword 
                            ? `<p style="margin: 5px 0 0 0; color: #ffffff !important; font-size: 15px; font-weight: 500; font-family: monospace;">${escHtml(storedPassword)}</p>`
                            : `<p style="margin: 5px 0 0 0; color: #ffffff !important; font-size: 14px;">Use your existing password or <a href="${resetPasswordLink}" style="color: ${accentColor} !important; text-decoration: underline !important; -webkit-text-fill-color: ${accentColor} !important;">reset it here</a></p>`
                          }
                        </td>
                      </tr>
                      ${passwordSetupSection}
                    </table>
                    <a href="${portalLink}" style="display: inline-block; padding: 12px 24px; background-color: ${accentColor} !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-decoration: none; border-radius: 5px; font-size: 15px; font-weight: 600; border: 1px solid ${accentColor} !important;">Access Portal →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Deadlines Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #FAFAFA !important;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; background-color: #FAFAFA !important;">
                <tr>
                  <td style="padding: 20px; background-color: #FAFAFA !important;">
                    <h3 style="margin: 0 0 15px 0; color: #111111 !important; font-size: 18px;">📅 Important Deadlines</h3>
                    <p style="margin: 0 0 20px 0; color: #333333 !important; font-size: 14px;">Please note these important dates for your participation:</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${deadlinesToUse.map((deadline, index) => { 
                        const deadlineDate = new Date(deadline.date); 
                        const formattedDate = deadlineDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); 
                        return `${index > 0 ? '<tr><td style="height: 15px;"></td></tr>' : ''}
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid #dc2626; border-radius: 4px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="background-color: #F0F0F0 !important;"><strong style="color: #111111 !important; font-size: 15px;">${deadline.label}</strong></td>
                                <td align="right" style="background-color: #F0F0F0 !important;"><span style="color: #dc2626 !important; font-size: 13px; font-weight: 600;">${formattedDate}</span></td>
                              </tr>
                            </table>
                            <p style="margin: 8px 0 0 0; color: #333333 !important; font-size: 13px; line-height: 1.5;">${deadline.description}</p>
                          </td>
                        </tr>`; 
                      }).join('')}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Profile Status Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #FAFAFA !important;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f0fdf4 !important;">
                <tr>
                  <td style="padding: 20px; background-color: #f0fdf4 !important;">
                    <h3 style="margin: 0 0 15px 0; color: #111111 !important; font-size: 18px;">✨ ${companyName} Profile Status</h3>
                    <p style="margin: 0 0 15px 0; color: #333333 !important; font-size: 14px;">Your profile is <strong style="color: #111111 !important;">${completionPercentage}% complete</strong></p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e5e7eb !important; border-radius: 8px; height: 12px; margin-bottom: 15px;">
                      <tr>
                        <td style="width: ${completionPercentage}%; background-color: ${accentColor} !important; border-radius: 8px; height: 12px;"></td>
                        <td style="background-color: #e5e7eb !important; height: 12px;"></td>
                      </tr>
                    </table>
                    <p style="margin: 0; color: #333333 !important; font-size: 13px;">Complete your profile to maximize your visibility at the event.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F0F0F0 !important; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 13px;">${footerText}</p>
              <p style="margin: 0; color: #666666 !important; font-size: 12px;">© ${new Date().getFullYear()} ${eventSettings?.event_name || 'Event'}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleSend = async () => {
    if (selectedRecipientIds.length === 0) {
      toast({ title: "No Recipients", description: "Please select at least one recipient", variant: "destructive" });
      return;
    }

    if (!subject || subject.trim().length === 0) {
      toast({ title: "Subject Required", description: "Please enter an email subject", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const currentManager = recipientType === "speaker" ? (projectManagers && projectManagers.length > 0 ? projectManagers[selectedManagerIndex] || projectManagers[0] : null) : (managers && managers.length > 0 ? managers[selectedManagerIndex] || managers[0] : null);
      
      if (!currentManager?.email) {
        toast({ title: "Error", description: "Manager email not configured", variant: "destructive" });
        return;
      }

      // No need to fetch API key - edge function uses env var

      if (recipientType === "exhibitor") {
        const { data: exhibitors, error: fetchError } = await supabase.from("exhibitors").select(`*, exhibitor_contacts!inner(email, full_name, is_main_contact, is_active), exhibitor_address(*), exhibitor_social_media(*), exhibitor_products(*), exhibitor_speaker_submissions(*), exhibitor_advert_submissions(*)`).in("id", selectedRecipientIds);
        
        if (fetchError) throw fetchError;
        if (!exhibitors || exhibitors.length === 0) {
          toast({ title: "No Recipients Found", description: "No exhibitors found", variant: "destructive" });
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const exhibitor of exhibitors) {
          try {
            // Try to find main contact first, then fall back to any active contact with email
            let contact = exhibitor.exhibitor_contacts?.find((c: ExhibitorContact) => c.is_main_contact && c.is_active && c.email);
            if (!contact) {
              contact = exhibitor.exhibitor_contacts?.find((c: ExhibitorContact) => c.is_active && c.email);
            }
            if (!contact?.email) { failCount++; continue; }

            const firstName = contact.full_name?.split(' ')[0] || 'Exhibitor';
            const completion = calculateExhibitorCompletionSync(exhibitor);
            
            // Auto-create credentials if needed, then generate password setup token
            let passwordSetupLink: string | undefined;
            let storedPassword: string | undefined;
            let effectiveUserId = exhibitor.user_id;
            
            if (includePasswordSetup) {
              // Auto-create credentials if exhibitor has no user account
              if (!effectiveUserId && contact?.email) {
                try {
                  const { data: credData, error: credError } = await supabase.functions.invoke('create-exhibitor-credentials', {
                    body: { exhibitorId: exhibitor.id, companyName: exhibitor.name }
                  });
                  if (!credError && credData?.credentials?.userId) {
                    effectiveUserId = credData.credentials.userId;
                    console.log(`Auto-created credentials for exhibitor ${exhibitor.name}`);
                  } else {
                    console.warn(`Failed to auto-create credentials for ${exhibitor.name}:`, credError || credData?.error);
                  }
                } catch (err) {
                  console.warn('Failed to auto-create exhibitor credentials:', err);
                }
              }
              
              // Fetch stored password from credentials_log
              try {
                const { data: credLog } = await supabase
                  .from('credentials_log')
                  .select('password_plain')
                  .eq('entity_id', exhibitor.id)
                  .eq('entity_type', 'exhibitor')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (credLog?.password_plain) {
                  storedPassword = credLog.password_plain;
                }
              } catch (err) {
                console.warn('Failed to fetch stored password:', err);
              }
              
              // Generate password setup token if we now have a user_id
              if (effectiveUserId) {
                try {
                  const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-password-setup-token', {
                    body: { userId: effectiveUserId, userType: 'exhibitor', entityId: exhibitor.id }
                  });
                  if (!tokenError && tokenData?.token) {
                    const baseUrl = eventSettings?.event_domain 
                      ? `https://${eventSettings.event_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                      : window.location.origin;
                    passwordSetupLink = `${baseUrl}/set-password?token=${tokenData.token}`;
                  }
                } catch (err) {
                  console.warn('Failed to generate password setup token:', err);
                }
              }
            }
            
            const personalizedHtml = generateEmailHtml(firstName, contact.email, completion.percentage, exhibitor.name, undefined, undefined, passwordSetupLink, storedPassword);

            const { error: sendError } = await supabase.functions.invoke('send-exhibitor-email', {
              body: { to: [contact.email], subject: subject, html: personalizedHtml, ccEmail: currentManager.email, replyToEmail: currentManager.email, fromName: eventSettings?.event_name || 'Event Team', fromEmail: `info@${eventSettings?.resend_from_domain || 'fortemevents.com'}` }
            });

            if (sendError) { console.error(`Failed to send to ${contact.email}:`, sendError); failCount++; } else { successCount++; }
          } catch (err) { console.error('Error:', err); failCount++; }
        }

        if (successCount > 0) {
          toast({ title: "Emails sent", description: `Successfully sent ${successCount} email(s)${failCount > 0 ? `. Failed: ${failCount}` : ''}` });
          setSelectedRecipientIds([]);
        } else { throw new Error("Failed to send any emails"); }
      } else if (recipientType === "speaker") {
        const { data: speakers, error: fetchError } = await supabase
          .from("speakers")
          .select("*, speaker_submissions(*)")
          .in("id", selectedRecipientIds);
        
        if (fetchError) throw fetchError;
        if (!speakers || speakers.length === 0) {
          toast({ title: "No Recipients Found", description: "No speakers found", variant: "destructive" });
          return;
        }

        // Filter deadlines to only show speaker form deadline
        const speakerDeadlines = localDeadlines.filter(d => 
          d.id === 'speaker_form' || 
          d.label.toLowerCase().includes("speaker")
        );

        let successCount = 0;
        let failCount = 0;

        for (const speaker of speakers) {
          try {
            if (!speaker.email) { failCount++; continue; }

            const firstName = speaker.name?.split(' ')[0] || 'Speaker';
            const completion = calculateSpeakerCompletion(speaker);
            
            // Auto-create credentials if needed, then generate password setup token
            let passwordSetupLink: string | undefined;
            let storedPassword: string | undefined;
            let effectiveUserId = speaker.user_id;
            
            if (includePasswordSetup) {
              // Auto-create credentials if speaker has no user account
              if (!effectiveUserId && speaker.email) {
                try {
                  const { data: credData, error: credError } = await supabase.functions.invoke('create-speaker-credentials', {
                    body: { speakerId: speaker.id, speakerName: speaker.name }
                  });
                  if (!credError && credData?.credentials?.userId) {
                    effectiveUserId = credData.credentials.userId;
                    console.log(`Auto-created credentials for speaker ${speaker.name}`);
                  } else {
                    console.warn(`Failed to auto-create credentials for ${speaker.name}:`, credError || credData?.error);
                  }
                } catch (err) {
                  console.warn('Failed to auto-create speaker credentials:', err);
                }
              }
              
              // Fetch stored password from credentials_log
              try {
                const { data: credLog } = await supabase
                  .from('credentials_log')
                  .select('password_plain')
                  .eq('entity_id', speaker.id)
                  .eq('entity_type', 'speaker')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (credLog?.password_plain) {
                  storedPassword = credLog.password_plain;
                }
              } catch (err) {
                console.warn('Failed to fetch stored password:', err);
              }
              
              // Generate password setup token if we now have a user_id
              if (effectiveUserId) {
                try {
                  const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-password-setup-token', {
                    body: { userId: effectiveUserId, userType: 'speaker', entityId: speaker.id }
                  });
                  if (!tokenError && tokenData?.token) {
                    const baseUrl = eventSettings?.event_domain 
                      ? `https://${eventSettings.event_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                      : window.location.origin;
                    passwordSetupLink = `${baseUrl}/set-password?token=${tokenData.token}`;
                  }
                } catch (err) {
                  console.warn('Failed to generate password setup token:', err);
                }
              }
            }
            
            // Use speaker name instead of company for profile status display
            const personalizedHtml = generateEmailHtml(firstName, speaker.email, completion.percentage, speaker.name || 'Speaker', speakerDeadlines, projectManagers, passwordSetupLink, storedPassword);

            const { error: sendError } = await supabase.functions.invoke('send-exhibitor-email', {
              body: { 
                to: [speaker.email], 
                subject: subject, 
                html: personalizedHtml, 
                ccEmail: currentManager.email, 
                replyToEmail: currentManager.email, 
                fromName: eventSettings?.event_name || 'Event Team', 
                fromEmail: `info@${eventSettings?.resend_from_domain || 'fortemevents.com'}`
              }
            });

            if (sendError) { console.error(`Failed to send to ${speaker.email}:`, sendError); failCount++; } else { successCount++; }
          } catch (err) { console.error('Error:', err); failCount++; }
        }

        if (successCount > 0) {
          toast({ title: "Emails sent", description: `Successfully sent ${successCount} email(s)${failCount > 0 ? `. Failed: ${failCount}` : ''}` });
          setSelectedRecipientIds([]);
        } else { throw new Error("Failed to send any emails"); }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to send emails");
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Email Management</CardTitle>
          <CardDescription>Send emails to exhibitors and speakers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Recipient Type</Label>
            <Select value={recipientType} onValueChange={(value: "exhibitor" | "speaker") => setRecipientType(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exhibitor">Exhibitors</SelectItem>
                <SelectItem value="speaker">Speakers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{recipientType === "speaker" ? "Project Manager" : "Client Relations Manager"}</Label>
            <Select value={selectedManagerIndex.toString()} onValueChange={(value) => setSelectedManagerIndex(parseInt(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {recipientType === "speaker" ? projectManagers?.map((mgr, idx) => (<SelectItem key={mgr.user_id} value={idx.toString()}>{mgr.display_name || 'Project Manager'} ({mgr.email})</SelectItem>)) : managers?.map((mgr, idx) => (<SelectItem key={mgr.user_id} value={idx.toString()}>{mgr.display_name || 'Client Relations Manager'} ({mgr.email})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Email Template</h3>
            
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" />
            </div>
            
            <div className="space-y-2">
              <Label>Banner Image (Optional)</Label>
              <div className="flex gap-2">
                <Input value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} placeholder="Enter image URL or upload" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload</Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </div>
              {bannerImage && <img src={bannerImage} alt="Banner preview" className="max-w-full h-32 object-cover rounded" />}
            </div>
            
            <div className="space-y-2">
              <Label>Text</Label>
              <RichTextEditor content={welcomeText} onChange={setWelcomeText} />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="show-credentials" checked={showCredentials} onCheckedChange={(checked) => setShowCredentials(checked as boolean)} />
                <Label htmlFor="show-credentials" className="text-sm font-normal cursor-pointer">Show login credentials</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-completion" checked={showCompletion} onCheckedChange={(checked) => setShowCompletion(checked as boolean)} />
                <Label htmlFor="show-completion" className="text-sm font-normal cursor-pointer">Show completion status</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-password-setup" checked={includePasswordSetup} onCheckedChange={(checked) => setIncludePasswordSetup(checked as boolean)} />
                      <Label htmlFor="include-password-setup" className="text-sm font-normal cursor-pointer flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        Include "Set Your Password" link
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Adds a secure password setup link for first-time users. Only works for recipients with portal accounts.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Button onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending}><Save className="h-4 w-4 mr-2" />Save Template</Button>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Test Email</h3>
            <div className="space-y-2">
              <Label>Test Recipient Email</Label>
              <Input 
                type="email" 
                value={testRecipientEmail} 
                onChange={(e) => setTestRecipientEmail(e.target.value)} 
                placeholder="Enter email to send test" 
              />
            </div>
            <Button 
              onClick={async () => {
                if (!testRecipientEmail) {
                  toast({ title: "Error", description: "Please enter a test email", variant: "destructive" });
                  return;
                }
                setLoading(true);
                try {
                  // No need to fetch API key - edge function uses env var
                  
                  const currentManager = recipientType === "speaker" ? projectManagers?.[selectedManagerIndex] : managers?.[selectedManagerIndex];
                  if (!currentManager?.email) throw new Error("Manager email not configured");
                  
                  // Generate test password setup link if checkbox is checked
                  let testPasswordSetupLink: string | undefined;
                  if (includePasswordSetup) {
                    const baseUrl = eventSettings?.event_domain 
                      ? `https://${eventSettings.event_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                      : window.location.origin;
                    testPasswordSetupLink = `${baseUrl}/set-password?token=TEST_TOKEN_PREVIEW`;
                  }
                  
                  const testHtml = generateEmailHtml("Test User", testRecipientEmail, 75, "Test Company", undefined, undefined, testPasswordSetupLink, includePasswordSetup ? "TestP@ssw0rd123" : undefined);
                  
                  // Test emails should NOT CC the customer service manager - only send to test recipient
                  const { error } = await supabase.functions.invoke('send-exhibitor-email', {
                    body: { 
                      to: [testRecipientEmail], 
                      subject: subject || 'Test Email', 
                      html: testHtml, 
                      ccEmail: '', // No CC for test emails
                      replyToEmail: currentManager.email, 
                      fromName: eventSettings?.event_name || 'Event Team', 
                      fromEmail: `info@${eventSettings?.resend_from_domain || 'fortemevents.com'}`
                    }
                  });
                  
                  if (error) throw error;
                  toast({ title: "Test email sent", description: `Sent to ${testRecipientEmail}` });
                } catch (error) {
                  const errorMessage = getErrorMessage(error, "Failed to send test email");
                  toast({ title: "Error", description: errorMessage, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !testRecipientEmail}
            >
              <TestTube className="h-4 w-4 mr-2" />Send Test Email
            </Button>
          </div>

          <RecipientSelector recipientType={recipientType} onSelectionChange={setSelectedRecipientIds} />

          <Button onClick={handleSend} className="w-full" size="lg" disabled={loading || selectedRecipientIds.length === 0}><Send className="h-4 w-4 mr-2" />{loading ? "Sending..." : `Send Email to ${selectedRecipientIds.length} Recipient(s)`}</Button>
        </CardContent>
      </Card>
    </div>
  );
};
