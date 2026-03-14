import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminCustomCSS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customCSS, setCustomCSS] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCustomCSS();
  }, []);

  const loadCustomCSS = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("global_html_snippets")
        .select("custom_css")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.custom_css) {
        setCustomCSS(data.custom_css);
      }
    } catch (error) {
      console.error("Error loading custom CSS:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load custom CSS",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if a row exists
      const { data: existing, error: existingError } = await supabase
        .from("global_html_snippets")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (existingError) {
        console.error("Error checking existing CSS:", existingError);
      }

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from("global_html_snippets")
          .update({ custom_css: customCSS })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase
          .from("global_html_snippets")
          .insert({ custom_css: customCSS });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Custom CSS saved successfully. Refresh the page to see changes.",
      });
    } catch (error) {
      console.error("Error saving custom CSS:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save custom CSS",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Custom CSS</h1>
              <p className="text-muted-foreground">
                Add custom CSS styles that will be applied globally across the website
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>CSS Editor</CardTitle>
            <CardDescription>
              Write your custom CSS below. Changes will take effect after saving and refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder="/* Add your custom CSS here */&#10;.my-custom-class {&#10;  color: red;&#10;  font-size: 16px;&#10;}"
              className="font-mono text-sm min-h-[500px]"
              disabled={isLoading}
            />
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Tip: Use browser dev tools to inspect elements and test CSS before adding it here
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save CSS"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Example Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Override existing styles:</h4>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
{`/* Change all button colors */
.btn-primary {
  background-color: #ff6b6b;
}

/* Adjust heading spacing */
h1, h2, h3 {
  margin-bottom: 1.5rem;
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Add custom animations:</h4>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
{`@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomCSS;
