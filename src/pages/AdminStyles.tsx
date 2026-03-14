import { useState, useEffect } from "react";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Type, Ruler, ArrowLeft } from "lucide-react";
import { ColorPicker } from "@/components/ColorPicker";

const AdminStyles = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [styleId, setStyleId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // General Colors
    background_color: "0 0% 100%",
    foreground_color: "240 10% 3.9%",
    muted_color: "240 4.8% 95.9%",
    // Card Colors
    card_background_color: "0 0% 100%",
    card_text_color: "0 0% 5%",
    card_title_color: "0 0% 5%",
    // Card 1 Colors (internally: green_card)
    green_card_background_color: "142 70% 45%",
    green_card_text_color: "0 0% 100%",
    green_card_title_color: "0 0% 100%",
    // Card 2 Colors (internally: black_card)
    black_card_background_color: "0 0% 5%",
    black_card_text_color: "0 0% 100%",
    black_card_title_color: "0 0% 100%",
    // Card 3 Colors (internally: gray_card)
    gray_card_background_color: "240 4.8% 95.9%",
    gray_card_text_color: "0 0% 5%",
    gray_card_title_color: "0 0% 5%",
    // Card 4 Colors (transparent card - title/text only)
    transparent_card_text_color: "0 0% 5%",
    transparent_card_title_color: "0 0% 5%",
    // Brand Colors
    primary_color: "142 86% 28%",
    secondary_color: "142 77% 73%",
    accent_color: "142 86% 28%",
    // Gradient colors
    gradient_start_color: "140 80% 50%",
    gradient_end_color: "143 75% 41%",
    gradient_angle: "135deg",
    // Typography
    font_family_heading: "Inter",
    font_family_body: "Inter",
    google_fonts_url: "",
    adobe_fonts_url: "",
    // Header sizes
    h1_size: "2.25rem",
    h2_size: "1.875rem",
    h3_size: "1.5rem",
    h4_size: "1.25rem",
    h5_size: "1.125rem",
    h6_size: "1rem",
    // Card styling
    border_radius: "0.5rem",
    card_padding: "1.5rem",
    image_border_radius: "0.5rem",
    image_padding: "0rem",
    // Button 1 styling
    button_color: "142 86% 28%",
    button_text_color: "0 0% 100%",
    button_border: "none",
    button_border_radius: "0.375rem",
    button_padding: "0.5rem 1rem",
    button_font_size: "0.875rem",
    button_font_weight: "500",
    button_font_style: "normal",
    button_text_transform: "uppercase",
    // Button 2 styling
    button_2_color: "0 0% 5%",
    button_2_text_color: "0 0% 100%",
    button_2_border: "none",
    button_2_border_radius: "0.375rem",
    button_2_padding: "0.5rem 1rem",
    button_2_font_size: "0.875rem",
    button_2_font_weight: "500",
    button_2_font_style: "normal",
    button_2_text_transform: "uppercase",
    // Typography settings
    heading_text_transform: "uppercase",
    hero_title_size: "3.5rem",
    hero_title_size_mobile: "2rem",
    navbar_menu_size: "0.875rem",
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (roleError) {
      console.error("Error fetching user roles:", roleError);
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast({
        title: "Access denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadStyles();
  };

  const loadStyles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('website_styles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading styles:', error);
      toast({
        title: "Error",
        description: "Failed to load website styles",
        variant: "destructive",
      });
    } else if (data) {
      setStyleId(data.id);
      setFormData({
        background_color: data.background_color || "0 0% 100%",
        foreground_color: data.foreground_color || "240 10% 3.9%",
        muted_color: data.muted_color || "240 4.8% 95.9%",
        card_background_color: data.card_background_color || "0 0% 100%",
        card_text_color: data.card_text_color || "0 0% 5%",
        card_title_color: data.card_title_color || "0 0% 5%",
        green_card_background_color: data.green_card_background_color || "142 70% 45%",
        green_card_text_color: data.green_card_text_color || "0 0% 100%",
        green_card_title_color: data.green_card_title_color || "0 0% 100%",
        black_card_background_color: data.black_card_background_color || "0 0% 5%",
        black_card_text_color: data.black_card_text_color || "0 0% 100%",
        black_card_title_color: data.black_card_title_color || "0 0% 100%",
        gray_card_background_color: (data as Record<string, unknown>).gray_card_background_color as string || "240 4.8% 95.9%",
        gray_card_text_color: (data as Record<string, unknown>).gray_card_text_color as string || "0 0% 5%",
        gray_card_title_color: (data as Record<string, unknown>).gray_card_title_color as string || "0 0% 5%",
        transparent_card_text_color: (data as Record<string, unknown>).transparent_card_text_color as string || "0 0% 5%",
        transparent_card_title_color: (data as Record<string, unknown>).transparent_card_title_color as string || "0 0% 5%",
        primary_color: data.primary_color || "142 86% 28%",
        secondary_color: data.secondary_color || "142 77% 73%",
        accent_color: data.accent_color || "142 86% 28%",
        gradient_start_color: data.gradient_start_color || "140 80% 50%",
        gradient_end_color: data.gradient_end_color || "143 75% 41%",
        gradient_angle: (data as Record<string, unknown>).gradient_angle as string || "135deg",
        font_family_heading: data.font_family_heading || "Inter",
        font_family_body: data.font_family_body || "Inter",
        google_fonts_url: data.google_fonts_url || "",
        adobe_fonts_url: (data as Record<string, unknown>).adobe_fonts_url as string || "",
        h1_size: data.h1_size || "2.25rem",
        h2_size: data.h2_size || "1.875rem",
        h3_size: data.h3_size || "1.5rem",
        h4_size: data.h4_size || "1.25rem",
        h5_size: data.h5_size || "1.125rem",
        h6_size: data.h6_size || "1rem",
        border_radius: data.border_radius || "0.5rem",
        card_padding: (data as Record<string, unknown>).card_padding as string || "1.5rem",
        image_border_radius: (data as Record<string, unknown>).image_border_radius as string || "0.5rem",
        image_padding: (data as Record<string, unknown>).image_padding as string || "0rem",
        button_color: (data as Record<string, unknown>).button_color as string || "142 86% 28%",
        button_text_color: (data as Record<string, unknown>).button_text_color as string || "0 0% 100%",
        button_border: (data as Record<string, unknown>).button_border as string || "none",
        button_border_radius: (data as Record<string, unknown>).button_border_radius as string || "0.375rem",
        button_padding: (data as Record<string, unknown>).button_padding as string || "0.5rem 1rem",
        button_font_size: data.button_font_size || "0.875rem",
        button_font_weight: data.button_font_weight || "500",
        button_font_style: data.button_font_style || "normal",
        button_text_transform: (data as Record<string, unknown>).button_text_transform as string || "uppercase",
        button_2_color: (data as Record<string, unknown>).button_2_color as string || "0 0% 5%",
        button_2_text_color: (data as Record<string, unknown>).button_2_text_color as string || "0 0% 100%",
        button_2_border: (data as Record<string, unknown>).button_2_border as string || "none",
        button_2_border_radius: (data as Record<string, unknown>).button_2_border_radius as string || "0.375rem",
        button_2_padding: (data as Record<string, unknown>).button_2_padding as string || "0.5rem 1rem",
        button_2_font_size: (data as Record<string, unknown>).button_2_font_size as string || "0.875rem",
        button_2_font_weight: (data as Record<string, unknown>).button_2_font_weight as string || "500",
        button_2_font_style: (data as Record<string, unknown>).button_2_font_style as string || "normal",
        button_2_text_transform: (data as Record<string, unknown>).button_2_text_transform as string || "uppercase",
        heading_text_transform: (data as Record<string, unknown>).heading_text_transform as string || "uppercase",
        hero_title_size: (data as Record<string, unknown>).hero_title_size as string || "3.5rem",
        hero_title_size_mobile: (data as Record<string, unknown>).hero_title_size_mobile as string || "2rem",
        navbar_menu_size: (data as Record<string, unknown>).navbar_menu_size as string || "0.875rem",
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!styleId) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('website_styles')
      .update(formData)
      .eq('id', styleId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Website styles updated successfully. Refresh the page to see changes.",
      });
    }
    setIsSaving(false);
  };

  return (
    <>
      <DynamicHelmet titlePrefix="Website Styles - Admin" noIndex />

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 pt-[168px] md:pt-[152px]">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-900">Website Styles</h1>
                <p className="text-muted-foreground">
                  Customize colors, typography, and header sizes
                </p>
              </div>
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex-shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading styles...</p>
              </div>
            ) : (
              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="colors">
                    <Palette className="mr-2 h-4 w-4" />
                    Colors
                  </TabsTrigger>
                  <TabsTrigger value="typography">
                    <Type className="mr-2 h-4 w-4" />
                    Typography
                  </TabsTrigger>
                  <TabsTrigger value="styling">
                    <Ruler className="mr-2 h-4 w-4" />
                    Styling
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="colors">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Color System</CardTitle>
                      <CardDescription>
                        Organize your website colors by purpose and usage
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* General Page Colors */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-black">General Page Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Base colors for page backgrounds and text
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Background"
                            value={formData.background_color}
                            onChange={(value) => setFormData({ ...formData, background_color: value })}
                            id="background_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.foreground_color}
                            onChange={(value) => setFormData({ ...formData, foreground_color: value })}
                            id="foreground_color"
                          />
                          <ColorPicker
                            label="Muted/Gray"
                            value={formData.muted_color}
                            onChange={(value) => setFormData({ ...formData, muted_color: value })}
                            id="muted_color"
                          />
                        </div>
                      </div>

                      {/* Card Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Card Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Colors for cards, boxes, and content containers
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Background"
                            value={formData.card_background_color}
                            onChange={(value) => setFormData({ ...formData, card_background_color: value })}
                            id="card_background_color"
                          />
                          <ColorPicker
                            label="Title Color"
                            value={formData.card_title_color}
                            onChange={(value) => setFormData({ ...formData, card_title_color: value })}
                            id="card_title_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.card_text_color}
                            onChange={(value) => setFormData({ ...formData, card_text_color: value })}
                            id="card_text_color"
                          />
                        </div>
                        
                        {/* Card Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Card Preview</Label>
                          <div 
                            className="p-6 rounded-lg border-2"
                            style={{ backgroundColor: `hsl(${formData.card_background_color})` }}
                          >
                            <h3 
                              className="text-xl font-bold mb-2"
                              style={{ color: `hsl(${formData.card_title_color})` }}
                            >
                              Example Card Title
                            </h3>
                            <p 
                              className="text-sm"
                              style={{ color: `hsl(${formData.card_text_color})` }}
                            >
                              This is how your card content will look with the selected colors. 
                              The card background, title, and text colors work together to create readable content.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 1 Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Card 1 Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Custom colors for Card 1 style on your website
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Background"
                            value={formData.green_card_background_color}
                            onChange={(value) => setFormData({ ...formData, green_card_background_color: value })}
                            id="green_card_background_color"
                          />
                          <ColorPicker
                            label="Title Color"
                            value={formData.green_card_title_color}
                            onChange={(value) => setFormData({ ...formData, green_card_title_color: value })}
                            id="green_card_title_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.green_card_text_color}
                            onChange={(value) => setFormData({ ...formData, green_card_text_color: value })}
                            id="green_card_text_color"
                          />
                        </div>
                        
                        {/* Card 1 Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Card 1 Preview</Label>
                          <div 
                            className="p-6 rounded-lg border-2"
                            style={{ backgroundColor: `hsl(${formData.green_card_background_color})` }}
                          >
                            <h3 
                              className="text-xl font-bold mb-2"
                              style={{ color: `hsl(${formData.green_card_title_color})` }}
                            >
                              Example Card 1 Title
                            </h3>
                            <p 
                              className="text-sm"
                              style={{ color: `hsl(${formData.green_card_text_color})` }}
                            >
                              This is how Card 1 will look with the selected colors.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 2 Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Card 2 Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Custom colors for Card 2 style on your website
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Background"
                            value={formData.black_card_background_color}
                            onChange={(value) => setFormData({ ...formData, black_card_background_color: value })}
                            id="black_card_background_color"
                          />
                          <ColorPicker
                            label="Title Color"
                            value={formData.black_card_title_color}
                            onChange={(value) => setFormData({ ...formData, black_card_title_color: value })}
                            id="black_card_title_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.black_card_text_color}
                            onChange={(value) => setFormData({ ...formData, black_card_text_color: value })}
                            id="black_card_text_color"
                          />
                        </div>
                        
                        {/* Card 2 Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Card 2 Preview</Label>
                          <div 
                            className="p-6 rounded-lg border-2"
                            style={{ backgroundColor: `hsl(${formData.black_card_background_color})` }}
                          >
                            <h3 
                              className="text-xl font-bold mb-2"
                              style={{ color: `hsl(${formData.black_card_title_color})` }}
                            >
                              Example Card 2 Title
                            </h3>
                            <p 
                              className="text-sm"
                              style={{ color: `hsl(${formData.black_card_text_color})` }}
                            >
                              This is how Card 2 will look with the selected colors.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 3 Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Card 3 Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Custom colors for Card 3 style on your website
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Background"
                            value={formData.gray_card_background_color}
                            onChange={(value) => setFormData({ ...formData, gray_card_background_color: value })}
                            id="gray_card_background_color"
                          />
                          <ColorPicker
                            label="Title Color"
                            value={formData.gray_card_title_color}
                            onChange={(value) => setFormData({ ...formData, gray_card_title_color: value })}
                            id="gray_card_title_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.gray_card_text_color}
                            onChange={(value) => setFormData({ ...formData, gray_card_text_color: value })}
                            id="gray_card_text_color"
                          />
                        </div>
                        
                        {/* Card 3 Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Card 3 Preview</Label>
                          <div 
                            className="p-6 rounded-lg border-2"
                            style={{ backgroundColor: `hsl(${formData.gray_card_background_color})` }}
                          >
                            <h3 
                              className="text-xl font-bold mb-2"
                              style={{ color: `hsl(${formData.gray_card_title_color})` }}
                            >
                              Example Card 3 Title
                            </h3>
                            <p 
                              className="text-sm"
                              style={{ color: `hsl(${formData.gray_card_text_color})` }}
                            >
                              This is how Card 3 will look with the selected colors.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 4 Colors (Transparent) */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Card 4 Colors (Transparent)</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Text and title colors for transparent cards (no background)
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <ColorPicker
                            label="Title Color"
                            value={formData.transparent_card_title_color}
                            onChange={(value) => setFormData({ ...formData, transparent_card_title_color: value })}
                            id="transparent_card_title_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.transparent_card_text_color}
                            onChange={(value) => setFormData({ ...formData, transparent_card_text_color: value })}
                            id="transparent_card_text_color"
                          />
                        </div>
                        
                        {/* Card 4 Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Card 4 Preview</Label>
                          <div 
                            className="p-6 rounded-lg border-2 bg-gray-200"
                          >
                            <h3 
                              className="text-xl font-bold mb-2"
                              style={{ color: `hsl(${formData.transparent_card_title_color})` }}
                            >
                              Example Card 4 Title
                            </h3>
                            <p 
                              className="text-sm"
                              style={{ color: `hsl(${formData.transparent_card_text_color})` }}
                            >
                              This shows text colors on a transparent background. The gray is for preview only.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Brand Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Brand Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Primary colors used for buttons, links, and highlights
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ColorPicker
                            label="Primary Color"
                            value={formData.primary_color}
                            onChange={(value) => setFormData({ ...formData, primary_color: value })}
                            id="primary_color"
                          />
                          <ColorPicker
                            label="Secondary Color"
                            value={formData.secondary_color}
                            onChange={(value) => setFormData({ ...formData, secondary_color: value })}
                            id="secondary_color"
                          />
                          <ColorPicker
                            label="Accent Color"
                            value={formData.accent_color}
                            onChange={(value) => setFormData({ ...formData, accent_color: value })}
                            id="accent_color"
                          />
                        </div>
                      </div>

                      {/* Gradient Colors */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Gradient Colors</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define gradient colors and angle used throughout the website
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          <ColorPicker
                            label="Gradient Start Color"
                            value={formData.gradient_start_color}
                            onChange={(value) => setFormData({ ...formData, gradient_start_color: value })}
                            id="gradient_start_color"
                          />
                          <ColorPicker
                            label="Gradient End Color"
                            value={formData.gradient_end_color}
                            onChange={(value) => setFormData({ ...formData, gradient_end_color: value })}
                            id="gradient_end_color"
                          />
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <Label htmlFor="gradient_angle" className="text-black">Gradient Angle</Label>
                          <Input
                            id="gradient_angle"
                            value={formData.gradient_angle}
                            onChange={(e) => setFormData({ ...formData, gradient_angle: e.target.value })}
                            placeholder="135deg"
                            className="bg-white text-gray-700"
                          />
                          <p className="text-xs text-muted-foreground">
                            Direction of the gradient (e.g., 135deg, 90deg, 180deg, to right, to bottom)
                          </p>
                        </div>

                        <div className="mt-4">
                          <Label className="text-black mb-2 block">Gradient Preview</Label>
                          <div 
                            className="h-24 rounded-lg border-2"
                            style={{ 
                              background: `linear-gradient(${formData.gradient_angle}, hsl(${formData.gradient_start_color}) 0%, hsl(${formData.gradient_end_color}) 100%)` 
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="typography">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Typography Settings</CardTitle>
                      <CardDescription>
                        Choose fonts and heading sizes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="google_fonts_url" className="text-black">Google Fonts URL (Optional)</Label>
                        <Input
                          id="google_fonts_url"
                          value={formData.google_fonts_url}
                          onChange={(e) => setFormData({ ...formData, google_fonts_url: e.target.value })}
                          placeholder="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap"
                          className="bg-white text-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                          Add Google Fonts link to use custom fonts
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adobe_fonts_url" className="text-black">Adobe Fonts URL (Optional)</Label>
                        <Input
                          id="adobe_fonts_url"
                          value={formData.adobe_fonts_url}
                          onChange={(e) => setFormData({ ...formData, adobe_fonts_url: e.target.value })}
                          placeholder="https://use.typekit.net/ouzgcjm.css"
                          className="bg-white text-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                          Add Adobe Fonts (Typekit) link to use custom fonts
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="font_family_heading" className="text-black">Heading Font Family</Label>
                          <Input
                            id="font_family_heading"
                            value={formData.font_family_heading}
                            onChange={(e) => setFormData({ ...formData, font_family_heading: e.target.value })}
                            placeholder="Inter"
                            className="bg-white text-gray-700"
                          />
                          <p className="text-xs text-muted-foreground">
                            Used for H1, H2, H3, H4, H5, H6
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="font_family_body" className="text-black">Body Font Family</Label>
                          <Input
                            id="font_family_body"
                            value={formData.font_family_body}
                            onChange={(e) => setFormData({ ...formData, font_family_body: e.target.value })}
                            placeholder="Inter"
                            className="bg-white text-gray-700"
                          />
                          <p className="text-xs text-muted-foreground">
                            Used for paragraphs and body text
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <h3 className="font-semibold text-black">Font Preview</h3>
                        <div style={{ fontFamily: formData.font_family_heading }}>
                          <h1 className="text-2xl font-bold">Heading Preview</h1>
                        </div>
                        <div style={{ fontFamily: formData.font_family_body }}>
                          <p className="text-gray-700">Body text preview with the selected font family.</p>
                        </div>
                      </div>

                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Heading Style</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Control how headings are displayed across the website
                        </p>
                        <div className="space-y-2 max-w-md">
                          <Label htmlFor="heading_text_transform" className="text-black">Title Case</Label>
                          <select
                            id="heading_text_transform"
                            value={formData.heading_text_transform}
                            onChange={(e) => setFormData({ ...formData, heading_text_transform: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="uppercase">ALL CAPS</option>
                            <option value="capitalize">Title Case</option>
                            <option value="lowercase">lower case</option>
                            <option value="none">None (as typed)</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            Choose how headings should be capitalized
                          </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg space-y-2 mt-6">
                          <h3 className="font-semibold text-black mb-2">Style Preview</h3>
                          <h2 
                            className="text-2xl font-bold"
                            style={{ textTransform: formData.heading_text_transform as any }}
                          >
                            Example Heading Preview
                          </h2>
                        </div>
                      </div>

                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Header Sizes</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define sizes for all heading levels (use rem units)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="h1_size" className="text-black">H1 Size</Label>
                            <Input
                              id="h1_size"
                              value={formData.h1_size}
                              onChange={(e) => setFormData({ ...formData, h1_size: e.target.value })}
                              placeholder="2.25rem"
                              className="bg-white text-gray-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="h2_size" className="text-black">H2 Size</Label>
                            <Input
                              id="h2_size"
                              value={formData.h2_size}
                              onChange={(e) => setFormData({ ...formData, h2_size: e.target.value })}
                              placeholder="1.875rem"
                              className="bg-white text-gray-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="h3_size" className="text-black">H3 Size</Label>
                            <Input
                              id="h3_size"
                              value={formData.h3_size}
                              onChange={(e) => setFormData({ ...formData, h3_size: e.target.value })}
                              placeholder="1.5rem"
                              className="bg-white text-gray-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="h4_size" className="text-black">H4 Size</Label>
                            <Input
                              id="h4_size"
                              value={formData.h4_size}
                              onChange={(e) => setFormData({ ...formData, h4_size: e.target.value })}
                              placeholder="1.25rem"
                              className="bg-white text-gray-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="h5_size" className="text-black">H5 Size</Label>
                            <Input
                              id="h5_size"
                              value={formData.h5_size}
                              onChange={(e) => setFormData({ ...formData, h5_size: e.target.value })}
                              placeholder="1.125rem"
                              className="bg-white text-gray-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="h6_size" className="text-black">H6 Size</Label>
                            <Input
                              id="h6_size"
                              value={formData.h6_size}
                              onChange={(e) => setFormData({ ...formData, h6_size: e.target.value })}
                              placeholder="1rem"
                              className="bg-white text-gray-700"
                            />
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t">
                          <h4 className="text-md font-semibold mb-3 text-black">Special Sizes</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Define sizes for specific UI elements
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="hero_title_size" className="text-black">Hero Title Size</Label>
                              <Input
                                id="hero_title_size"
                                value={formData.hero_title_size}
                                onChange={(e) => setFormData({ ...formData, hero_title_size: e.target.value })}
                                placeholder="3.5rem"
                                className="bg-white text-gray-700"
                              />
                              <p className="text-xs text-muted-foreground">
                                Size for main hero section titles
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="hero_title_size_mobile" className="text-black">Hero Title Size (Mobile)</Label>
                              <Input
                                id="hero_title_size_mobile"
                                value={formData.hero_title_size_mobile}
                                onChange={(e) => setFormData({ ...formData, hero_title_size_mobile: e.target.value })}
                                placeholder="2rem"
                                className="bg-white text-gray-700"
                              />
                              <p className="text-xs text-muted-foreground">
                                Size for hero titles on mobile devices
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="navbar_menu_size" className="text-black">Navbar Menu Item Size</Label>
                              <Input
                                id="navbar_menu_size"
                                value={formData.navbar_menu_size}
                                onChange={(e) => setFormData({ ...formData, navbar_menu_size: e.target.value })}
                                placeholder="0.875rem"
                                className="bg-white text-gray-700"
                              />
                              <p className="text-xs text-muted-foreground">
                                Font size for navigation menu items
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg space-y-2 mt-6">
                          <h3 className="font-semibold text-black mb-4">Size Preview</h3>
                          <h1 style={{ fontSize: formData.h1_size }} className="font-bold">H1 Heading</h1>
                          <h2 style={{ fontSize: formData.h2_size }} className="font-bold">H2 Heading</h2>
                          <h3 style={{ fontSize: formData.h3_size }} className="font-bold">H3 Heading</h3>
                          <h4 style={{ fontSize: formData.h4_size }} className="font-bold">H4 Heading</h4>
                          <h5 style={{ fontSize: formData.h5_size }} className="font-bold">H5 Heading</h5>
                          <h6 style={{ fontSize: formData.h6_size }} className="font-bold">H6 Heading</h6>
                          <div className="pt-4 mt-4 border-t">
                            <p style={{ fontSize: formData.hero_title_size }} className="font-bold">Hero Title</p>
                            <p style={{ fontSize: formData.navbar_menu_size }} className="font-medium mt-2">Navbar Menu Item</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="styling">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Styling Options</CardTitle>
                      <CardDescription>
                        Control card and button styling options
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Card Border Radius and Padding */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-black">Card Border Radius</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Control the roundness and padding of cards on the frontend
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div className="space-y-2">
                            <Label htmlFor="border_radius" className="text-black">Border Radius</Label>
                            <Input
                              id="border_radius"
                              value={formData.border_radius}
                              onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                              placeholder="0.5rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 0rem (square), 0.5rem, 1rem
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="card_padding" className="text-black">Card Padding</Label>
                            <Input
                              id="card_padding"
                              value={formData.card_padding}
                              onChange={(e) => setFormData({ ...formData, card_padding: e.target.value })}
                              placeholder="1.5rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 1rem, 1.5rem, 2rem
                            </p>
                          </div>
                        </div>

                        {/* Card Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Preview</Label>
                          <div className="max-w-xs">
                            <div 
                              className="bg-gray-100"
                              style={{ 
                                borderRadius: formData.border_radius,
                                padding: formData.card_padding
                              }}
                            >
                              <h4 className="font-semibold mb-2">Card Example</h4>
                              <p className="text-sm text-muted-foreground">This card uses your border radius and padding settings</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Image Border Radius */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Image Border Radius & Padding</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Control the roundness and spacing of images across the website
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div className="space-y-2">
                            <Label htmlFor="image_border_radius" className="text-black">Border Radius</Label>
                            <Input
                              id="image_border_radius"
                              value={formData.image_border_radius}
                              onChange={(e) => setFormData({ ...formData, image_border_radius: e.target.value })}
                              placeholder="0.5rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 0rem (square), 0.5rem, 1rem, 9999px (rounded)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="image_padding" className="text-black">Padding</Label>
                            <Input
                              id="image_padding"
                              value={formData.image_padding}
                              onChange={(e) => setFormData({ ...formData, image_padding: e.target.value })}
                              placeholder="0rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 0rem (none), 0.5rem, 1rem, 1.5rem
                            </p>
                          </div>
                        </div>

                        {/* Image Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Image Preview</Label>
                          <div className="inline-block">
                            <img 
                              src="https://nvjmeplcyzzfgkvjethj.supabase.co/storage/v1/object/public/media-library/0.543024536049531.webp"
                              alt="Preview"
                              className="w-full max-w-xs aspect-video object-cover"
                              style={{ 
                                borderRadius: formData.image_border_radius,
                                padding: formData.image_padding
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Button 1 */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Button 1</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Customize the primary buttons across your website
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <ColorPicker
                            label="Button Color"
                            value={formData.button_color}
                            onChange={(value) => setFormData({ ...formData, button_color: value })}
                            id="button_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.button_text_color}
                            onChange={(value) => setFormData({ ...formData, button_text_color: value })}
                            id="button_text_color"
                          />
                          <div className="space-y-2">
                            <Label htmlFor="button_border" className="text-black">Border</Label>
                            <Input
                              id="button_border"
                              value={formData.button_border}
                              onChange={(e) => setFormData({ ...formData, button_border: e.target.value })}
                              placeholder="none"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Examples: none, 1px solid, 2px solid
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_border_radius" className="text-black">Border Radius</Label>
                            <Input
                              id="button_border_radius"
                              value={formData.button_border_radius}
                              onChange={(e) => setFormData({ ...formData, button_border_radius: e.target.value })}
                              placeholder="0.375rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 0rem, 0.375rem, 0.5rem, 9999px (pill)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_padding" className="text-black">Padding</Label>
                            <Input
                              id="button_padding"
                              value={formData.button_padding}
                              onChange={(e) => setFormData({ ...formData, button_padding: e.target.value })}
                              placeholder="0.5rem 1rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Format: vertical horizontal (e.g., 0.5rem 1rem)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_font_size" className="text-black">Font Size</Label>
                            <Input
                              id="button_font_size"
                              value={formData.button_font_size}
                              onChange={(e) => setFormData({ ...formData, button_font_size: e.target.value })}
                              placeholder="0.875rem"
                              className="bg-white text-gray-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_font_weight" className="text-black">Font Weight</Label>
                            <Input
                              id="button_font_weight"
                              value={formData.button_font_weight}
                              onChange={(e) => setFormData({ ...formData, button_font_weight: e.target.value })}
                              placeholder="500"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_font_style" className="text-black">Font Style</Label>
                            <Input
                              id="button_font_style"
                              value={formData.button_font_style}
                              onChange={(e) => setFormData({ ...formData, button_font_style: e.target.value })}
                              placeholder="normal"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Options: normal, italic
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_text_transform" className="text-black">Text Transform</Label>
                            <Input
                              id="button_text_transform"
                              value={formData.button_text_transform}
                              onChange={(e) => setFormData({ ...formData, button_text_transform: e.target.value })}
                              placeholder="uppercase"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Options: none, uppercase, lowercase, capitalize
                            </p>
                          </div>
                        </div>

                        {/* Button Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Button Preview</Label>
                          <button
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: `hsl(${formData.button_color})`,
                              color: `hsl(${formData.button_text_color})`,
                              border: formData.button_border,
                              borderRadius: formData.button_border_radius,
                              padding: formData.button_padding,
                              fontSize: formData.button_font_size,
                              fontWeight: formData.button_font_weight,
                              fontStyle: formData.button_font_style,
                              textTransform: formData.button_text_transform as any
                            }}
                          >
                            Example Button 1
                          </button>
                        </div>
                      </div>

                      {/* Button 2 */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-black">Button 2</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Customize the secondary buttons across your website
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <ColorPicker
                            label="Button Color"
                            value={formData.button_2_color}
                            onChange={(value) => setFormData({ ...formData, button_2_color: value })}
                            id="button_2_color"
                          />
                          <ColorPicker
                            label="Text Color"
                            value={formData.button_2_text_color}
                            onChange={(value) => setFormData({ ...formData, button_2_text_color: value })}
                            id="button_2_text_color"
                          />
                          <div className="space-y-2">
                            <Label htmlFor="button_2_border" className="text-black">Border</Label>
                            <Input
                              id="button_2_border"
                              value={formData.button_2_border}
                              onChange={(e) => setFormData({ ...formData, button_2_border: e.target.value })}
                              placeholder="none"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Examples: none, 1px solid, 2px solid
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_border_radius" className="text-black">Border Radius</Label>
                            <Input
                              id="button_2_border_radius"
                              value={formData.button_2_border_radius}
                              onChange={(e) => setFormData({ ...formData, button_2_border_radius: e.target.value })}
                              placeholder="0.375rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 0rem, 0.375rem, 0.5rem, 9999px (pill)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_padding" className="text-black">Padding</Label>
                            <Input
                              id="button_2_padding"
                              value={formData.button_2_padding}
                              onChange={(e) => setFormData({ ...formData, button_2_padding: e.target.value })}
                              placeholder="0.5rem 1rem"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Format: vertical horizontal (e.g., 0.5rem 1rem)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_font_size" className="text-black">Font Size</Label>
                            <Input
                              id="button_2_font_size"
                              value={formData.button_2_font_size}
                              onChange={(e) => setFormData({ ...formData, button_2_font_size: e.target.value })}
                              placeholder="0.875rem"
                              className="bg-white text-gray-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_font_weight" className="text-black">Font Weight</Label>
                            <Input
                              id="button_2_font_weight"
                              value={formData.button_2_font_weight}
                              onChange={(e) => setFormData({ ...formData, button_2_font_weight: e.target.value })}
                              placeholder="500"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common values: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_font_style" className="text-black">Font Style</Label>
                            <Input
                              id="button_2_font_style"
                              value={formData.button_2_font_style}
                              onChange={(e) => setFormData({ ...formData, button_2_font_style: e.target.value })}
                              placeholder="normal"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Options: normal, italic
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_2_text_transform" className="text-black">Text Transform</Label>
                            <Input
                              id="button_2_text_transform"
                              value={formData.button_2_text_transform}
                              onChange={(e) => setFormData({ ...formData, button_2_text_transform: e.target.value })}
                              placeholder="uppercase"
                              className="bg-white text-gray-700"
                            />
                            <p className="text-xs text-muted-foreground">
                              Options: none, uppercase, lowercase, capitalize
                            </p>
                          </div>
                        </div>

                        {/* Button Preview */}
                        <div className="mt-6">
                          <Label className="text-black mb-2 block">Button Preview</Label>
                          <button
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: `hsl(${formData.button_2_color})`,
                              color: `hsl(${formData.button_2_text_color})`,
                              border: formData.button_2_border,
                              borderRadius: formData.button_2_border_radius,
                              padding: formData.button_2_padding,
                              fontSize: formData.button_2_font_size,
                              fontWeight: formData.button_2_font_weight,
                              fontStyle: formData.button_2_font_style,
                              textTransform: formData.button_2_text_transform as any
                            }}
                          >
                            Example Button 2
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-gray-800 hover:bg-gray-700"
                  >
                    {isSaving ? "Saving..." : "Save All Changes"}
                  </Button>
                </div>
              </Tabs>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminStyles;
