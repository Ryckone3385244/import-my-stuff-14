import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface AdminCredentialExportProps {
  /** Which entity type to export. If omitted, renders both cards side by side (legacy). */
  entityType?: "exhibitor" | "speaker";
}

export const AdminCredentialExport = ({ entityType }: AdminCredentialExportProps) => {
  const [isExportingExhibitor, setIsExportingExhibitor] = useState(false);
  const [isExportingSpeaker, setIsExportingSpeaker] = useState(false);

  const handleExportCredentials = async (type: "exhibitor" | "speaker") => {
    const setLoading = type === "exhibitor" ? setIsExportingExhibitor : setIsExportingSpeaker;
    setLoading(true);
    
    try {
      const { data: credLogs, error } = await supabase
        .from("credentials_log")
        .select("entity_name, email, password_plain, generated_at")
        .eq("entity_type", type)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      if (!credLogs?.length) {
        toast.error("No credential records found. Credentials are logged when first created or reset.");
        return;
      }

      // Deduplicate: keep only the latest entry per entity_name+email
      const seen = new Map<string, typeof credLogs[0]>();
      for (const log of credLogs) {
        const key = `${log.entity_name}::${log.email}`;
        if (!seen.has(key)) seen.set(key, log);
      }

      const uniqueLogs = Array.from(seen.values());
      const nameLabel = type === "exhibitor" ? "Company Name" : "Full Name";

      const ws = XLSX.utils.json_to_sheet(
        uniqueLogs.map((c) => ({
          [nameLabel]: c.entity_name,
          Email: c.email,
          Password: c.password_plain,
          "Generated At": format(new Date(c.generated_at), "yyyy-MM-dd HH:mm"),
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${type === "exhibitor" ? "Exhibitor" : "Speaker"} Credentials`);
      XLSX.writeFile(wb, `${type}-credentials-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast.success(`Exported credentials for ${uniqueLogs.length} ${type}s`);
    } catch (err) {
      console.error("Failed to export credentials:", err);
      toast.error("Failed to export credentials");
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (type: "exhibitor" | "speaker") => {
    const isLoading = type === "exhibitor" ? isExportingExhibitor : isExportingSpeaker;
    const label = type === "exhibitor" ? "Exhibitor" : "Speaker";
    const descDetail = type === "exhibitor" ? "company name" : "name";

    return (
      <Card
        className="cursor-pointer hover:bg-accent transition-colors bg-white/95 backdrop-blur-sm"
        onClick={() => !isLoading && handleExportCredentials(type)}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            Export {label} Credentials
          </CardTitle>
          <CardDescription>
            Download an Excel file with all {type} credentials ({descDetail}, email, password)
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  // Single entity type mode
  if (entityType) {
    return renderCard(entityType);
  }

  // Legacy mode: render both cards side by side
  return (
    <div className="flex flex-wrap gap-4">
      {renderCard("exhibitor")}
      {renderCard("speaker")}
    </div>
  );
};
