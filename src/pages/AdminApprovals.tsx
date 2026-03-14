import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Check, X, Clock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { getErrorMessage } from "@/lib/errorHandling";

interface ApprovalItem {
  id: string;
  type: string;
  table: string;
  approval_status: string;
  submitted_for_approval_at: string;
  exhibitor_id?: string;
  speaker_id?: string;
  exhibitor?: { name: string };
  speaker?: { name: string };
  name?: string;
  product_name?: string;
  file_name?: string;
  file_type?: string;
  file_url?: string;
  pdf_filename?: string;
  pdf_url?: string;
  created_at?: string;
  extracted_data?: unknown;
  pending_changes?: unknown;
  [key: string]: unknown;
}

export default function AdminApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewingItem, setViewingItem] = useState<ApprovalItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch all exhibitor changes (pending, approved, rejected)
  const { data: exhibitorChanges = [] } = useQuery({
    queryKey: ["exhibitor-changes"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select("*")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Company", table: "exhibitors" }));
    },
  });

  // Fetch all product changes
  const { data: productChanges = [] } = useQuery({
    queryKey: ["product-changes"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_products")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false});
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Products", table: "exhibitor_products" }));
    },
  });

  // Fetch all social media changes
  const { data: socialChanges = [] } = useQuery({
    queryKey: ["social-changes"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_social_media")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false});
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Social Media", table: "exhibitor_social_media" }));
    },
  });

  // Fetch all address changes
  const { data: addressChanges = [] } = useQuery({
    queryKey: ["address-changes"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_address")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Address", table: "exhibitor_address" }));
    },
  });

  // Fetch speaker submissions
  const { data: speakerSubmissions = [] } = useQuery({
    queryKey: ["speaker-submissions"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_speaker_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch exhibitor names separately
      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors } = await supabase
        .from("exhibitors")
        .select("id, name")
        .in("id", exhibitorIds);

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map((item) => ({
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id),
        exhibitor_id: item.exhibitor_id, // Ensure exhibitor_id is included
        type: "Speaker Form",
        table: "exhibitor_speaker_submissions",
        approval_status: item.approval_status || "pending_approval",
        submitted_for_approval_at: item.created_at,
      }));
    },
  });

  // Fetch headshot submissions
  const { data: headshotSubmissions = [] } = useQuery({
    queryKey: ["headshot-submissions"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_speaker_headshots")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch exhibitor names separately
      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors } = await supabase
        .from("exhibitors")
        .select("id, name")
        .in("id", exhibitorIds);

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map((item) => ({
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id),
        exhibitor_id: item.exhibitor_id, // Ensure exhibitor_id is included
        type: "Speaker Headshot",
        table: "exhibitor_speaker_headshots",
        approval_status: item.approval_status || "pending_approval",
        submitted_for_approval_at: item.created_at,
      }));
    },
  });

  // Fetch advert submissions
  const { data: advertSubmissions = [] } = useQuery({
    queryKey: ["advert-submissions"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_advert_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch exhibitor names separately
      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors } = await supabase
        .from("exhibitors")
        .select("id, name")
        .in("id", exhibitorIds);

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map((item) => ({
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id),
        exhibitor_id: item.exhibitor_id, // Ensure exhibitor_id is included
        type: "Advertisement",
        table: "exhibitor_advert_submissions",
        approval_status: item.approval_status || "pending_approval",
        submitted_for_approval_at: item.created_at,
      }));
    },
  });

  // Fetch speaker portal submissions (from speakers table, not exhibitors)
  const { data: speakerPortalSubmissions = [] } = useQuery({
    queryKey: ["speaker-portal-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speaker_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch speaker names separately
      const speakerIds = [...new Set(data?.map(item => item.speaker_id) || [])];
      const { data: speakers } = await supabase
        .from("speakers")
        .select("id, name")
        .in("id", speakerIds);

      const speakerMap = new Map(speakers?.map(s => [s.id, s]) || []);

      return (data || []).map((item) => ({
        ...item,
        speaker: speakerMap.get(item.speaker_id),
        type: "Speaker Portal Form",
        table: "speaker_submissions",
        approval_status: item.approval_status || "pending_approval",
        submitted_for_approval_at: item.created_at,
      }));
    },
  });

  // Combine all changes
  const allChanges = [
    ...exhibitorChanges, 
    ...productChanges, 
    ...socialChanges, 
    ...addressChanges, 
    ...speakerSubmissions, 
    ...headshotSubmissions, 
    ...advertSubmissions,
    ...speakerPortalSubmissions
  ].sort((a, b) => new Date(b.submitted_for_approval_at).getTime() - new Date(a.submitted_for_approval_at).getTime());

  const pendingChanges = allChanges.filter(item => item.approval_status === "pending_approval");
  const approvedChanges = allChanges.filter(item => item.approval_status === "approved");
  const rejectedChanges = allChanges.filter(item => item.approval_status === "rejected");

  const approveMutation = useMutation({
    mutationFn: async ({ table, id, exhibitor_id, speaker_id }: { table: string; id: string; exhibitor_id?: string; speaker_id?: string }) => {
      // Handle submission types differently
      if (table === "exhibitor_speaker_submissions") {
        // Special handling for speaker submissions - create speaker + draft session
        if (!exhibitor_id) {
          throw new Error("Exhibitor ID is required for approving speaker submissions");
        }

        // Get submission with extracted data
        const { data: submission, error: fetchError } = await supabase
          .from("exhibitor_speaker_submissions")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Check if we have extracted data, if not try to re-parse
        if (!submission.extracted_data) {
          // Try to re-parse the PDF
          const { error: parseError } = await supabase.functions.invoke('parse-speaker-submission', {
            body: {
              submissionId: submission.id,
              pdfUrl: submission.file_url,
              speakerId: null,
            },
          });

          if (parseError) {
            throw new Error("Cannot approve submission: PDF parsing failed and no extracted data available. Please try re-uploading the PDF.");
          }

          // Refetch submission after parsing
          const { data: reparsedSubmission, error: refetchError } = await supabase
            .from("exhibitor_speaker_submissions")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (refetchError || !reparsedSubmission?.extracted_data) {
            throw new Error("Cannot approve submission: Failed to extract speaker data from PDF.");
          }

          submission.extracted_data = reparsedSubmission.extracted_data;
        }

        // Create speaker profile from extracted data
        const extractedData = submission.extracted_data as Record<string, unknown>;
        
        // Helper function to safely extract string values
        const getString = (value: unknown): string | undefined => {
          return typeof value === 'string' ? value : undefined;
        };
        
        const speakerName = getString(extractedData.name) || getString(extractedData.speaker_name);
        if (!speakerName) {
          throw new Error("Cannot create speaker: No speaker name found in extracted data. The PDF may not have been parsed correctly.");
        }
        
        const { data: newSpeaker, error: speakerError } = await supabase
          .from("speakers")
          .insert({
            name: speakerName,
            bio: getString(extractedData.bio) || getString(extractedData.speaker_bio) || null,
            title: getString(extractedData.title) || getString(extractedData.job_title) || null,
            company: getString(extractedData.company) || getString(extractedData.company_name) || null,
            email: getString(extractedData.email) || null,
            phone: getString(extractedData.phone) || getString(extractedData.contact_number) || null,
            linkedin_url: getString(extractedData.linkedin_url) || null,
            is_active: true
          })
          .select()
          .maybeSingle();

        if (speakerError) {
          throw new Error(`Failed to create speaker: ${speakerError.message}`);
        }

        // Create draft session
        const seminarTitle = getString(extractedData.seminar_title) || getString(extractedData.session_title);
        if (seminarTitle) {
          const { error: sessionError } = await supabase
            .from("draft_sessions")
            .insert({
              speaker_id: newSpeaker.id,
              seminar_title: seminarTitle,
              seminar_description: getString(extractedData.seminar_description) || getString(extractedData.session_description) || null,
              status: "draft"
            });

          if (sessionError) {
            throw new Error(`Failed to create draft session: ${sessionError.message}`);
          }
        }

        // Update submission and exhibitor flags
        const { error: exhibitorError } = await supabase
          .from("exhibitors")
          .update({ speaker_submission_approved: true })
          .eq("id", exhibitor_id);

        if (exhibitorError) throw exhibitorError;

        const { error: submissionError } = await supabase
          .from("exhibitor_speaker_submissions")
          .update({ approval_status: "approved" })
          .eq("id", id);

        if (submissionError) throw submissionError;
      } else if (
        table === "exhibitor_speaker_headshots" ||
        table === "exhibitor_advert_submissions"
      ) {
        if (!exhibitor_id) {
          throw new Error("Exhibitor ID is required for approving submissions");
        }

        const approvalField =
          table === "exhibitor_speaker_headshots"
            ? "headshot_submission_approved"
            : "advert_submission_approved";

        const { error: exhibitorError } = await supabase
          .from("exhibitors")
          .update({ [approvalField]: true })
          .eq("id", exhibitor_id);

        if (exhibitorError) throw exhibitorError;

        const { error: submissionError } = await supabase
          .from(table as any)
          .update({ approval_status: "approved" })
          .eq("id", id);

        if (submissionError) throw submissionError;
      } else if (table === "speaker_submissions") {
        // Handle speaker portal form submissions
        // First get the submission with extracted data
        const { data: submission, error: fetchError } = await supabase
          .from("speaker_submissions")
          .select("*, extracted_data, speaker_id")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Update submission status
        const { error: submissionError } = await supabase
          .from("speaker_submissions")
          .update({ approval_status: "approved" })
          .eq("id", id);

        if (submissionError) throw submissionError;

        // Now update the speaker profile with extracted data
        if (submission.extracted_data && submission.speaker_id) {
          const extractedData = submission.extracted_data as Record<string, unknown>;
          
          // Helper function to safely extract string values
          const getString = (value: unknown): string | undefined => {
            return typeof value === 'string' ? value : undefined;
          };
          
          const updateFields: Record<string, string> = {};

          const title = getString(extractedData.title);
          const company = getString(extractedData.company);
          const email = getString(extractedData.email);
          const phone = getString(extractedData.phone);
          const bio = getString(extractedData.bio);
          const seminarTitle = getString(extractedData.seminar_title);
          const seminarDescription = getString(extractedData.seminar_description);

          if (title) updateFields.title = title;
          if (company) updateFields.company = company;
          if (email) updateFields.email = email;
          if (phone) updateFields.phone = phone;
          if (bio) updateFields.bio = bio;
          if (seminarTitle) updateFields.seminar_title = seminarTitle;
          if (seminarDescription) updateFields.seminar_description = seminarDescription;

          if (Object.keys(updateFields).length > 0) {
            const { error: speakerUpdateError } = await supabase
              .from("speakers")
              .update(updateFields)
              .eq("id", submission.speaker_id);

            if (speakerUpdateError) {
              // Speaker update failed but submission is still approved
            }
          }

          // Create/update draft session if we have seminar data
          if (seminarTitle && seminarDescription) {
            const { data: existingDraft } = await supabase
              .from("draft_sessions")
              .select("id")
              .eq("speaker_id", submission.speaker_id)
              .maybeSingle();

            if (existingDraft) {
              await supabase
                .from("draft_sessions")
                .update({
                  seminar_title: seminarTitle,
                  seminar_description: seminarDescription,
                })
                .eq("id", existingDraft.id);
            } else {
              await supabase
                .from("draft_sessions")
                .insert({
                  speaker_id: submission.speaker_id,
                  seminar_title: seminarTitle,
                  seminar_description: seminarDescription,
                  status: "draft",
                });
            }
          }
        }
      } else {
        // Handle regular changes with pending_changes
        const { data: record, error: fetchError } = await supabase
          .from(table as any)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!record) throw new Error("Record not found");

        const pendingChanges = (record as unknown as Record<string, unknown>).pending_changes;
        if (!pendingChanges || typeof pendingChanges !== 'object') throw new Error("No pending changes found");

        // Apply pending_changes to actual fields
        const updates: Record<string, unknown> = {
          ...(pendingChanges as Record<string, unknown>),
          approval_status: "approved",
          pending_changes: null,
        };

        const { error } = await supabase
          .from(table as "exhibitors" | "exhibitor_address" | "exhibitor_contacts" | "exhibitor_products" | "exhibitor_social_media")
          .update(updates)
          .eq("id", id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["exhibitor-changes"] });
      queryClient.invalidateQueries({ queryKey: ["product-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-changes"] });
      queryClient.invalidateQueries({ queryKey: ["address-changes"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["headshot-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["advert-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-portal-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });
      queryClient.invalidateQueries({ queryKey: ["draft-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-sessions"] });
      // Invalidate exhibitor queries to update completion percentages
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });

      toast({
        title: "Changes approved!",
        description: "The changes have been successfully approved and are now live.",
      });
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to approve changes. Please try again.");
      console.error("Approval mutation error:", errorMessage);
      toast({
        title: "Approval failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ table, id, exhibitor_id, speaker_id }: { table: string; id: string; exhibitor_id?: string; speaker_id?: string }) => {
      // Handle submission types - mark as rejected and reset exhibitor flag
      if (
        table === "exhibitor_speaker_submissions" ||
        table === "exhibitor_speaker_headshots" ||
        table === "exhibitor_advert_submissions"
      ) {
        if (!exhibitor_id) {
          throw new Error("Exhibitor ID is required for rejecting submissions");
        }

        const submissionType =
          table === "exhibitor_speaker_submissions"
            ? "speaker"
            : table === "exhibitor_speaker_headshots"
            ? "headshot"
            : "advert";

        const { error: submissionError } = await supabase
          .from(table as any)
          .update({ approval_status: "rejected" })
          .eq("id", id);

        if (submissionError) {
          console.error("Rejection error (submission):", submissionError);
          throw submissionError;
        }

        const { error: resetError } = await supabase.rpc("reset_submission_approval", {
          p_exhibitor_id: exhibitor_id,
          p_submission_type: submissionType,
        });

        if (resetError) {
          console.error("Rejection error (reset flag):", resetError);
          throw resetError;
        }
      } else if (table === "speaker_submissions") {
        // Handle speaker portal form submissions - ONLY update approval_status
        const { error: submissionError } = await supabase
          .from("speaker_submissions")
          .update({ approval_status: "rejected" })
          .eq("id", id);

        if (submissionError) {
          console.error("Rejection error (speaker submission):", submissionError);
          throw submissionError;
        }
      } else {
        // Handle regular changes - set to rejected (these tables have pending_changes)
        const { error } = await supabase
          .from(table as any)
          .update({
            approval_status: "rejected",
            pending_changes: null,
          })
          .eq("id", id);

        if (error) {
          console.error("Rejection error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["exhibitor-changes"] });
      queryClient.invalidateQueries({ queryKey: ["product-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-changes"] });
      queryClient.invalidateQueries({ queryKey: ["address-changes"] });
      queryClient.invalidateQueries({ queryKey: ["contact-changes"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["headshot-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["advert-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-portal-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });
      queryClient.invalidateQueries({ queryKey: ["draft-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-sessions"] });
      // Invalidate exhibitor queries to update completion percentages
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });

      toast({
        title: "Changes rejected",
        description: "The changes have been rejected and removed.",
      });
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to reject changes. Please try again.");
      console.error("Rejection mutation error:", errorMessage);
      toast({
        title: "Rejection failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const getValue = (item: ApprovalItem, field: string): string => {
    const pendingValue = (item.pending_changes as Record<string, unknown>)?.[field];
    const currentValue = item[field];
    
    // Helper to convert unknown to string
    const toString = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return String(val);
      return '';
    };
    
    // For rejected items, only show pending_changes (what was submitted and rejected)
    if (item.approval_status === "rejected") {
      return pendingValue !== undefined ? toString(pendingValue) : toString(currentValue);
    }
    
    // For pending items, show pending_changes
    if (item.approval_status === "pending_approval") {
      return pendingValue !== undefined ? toString(pendingValue) : toString(currentValue);
    }
    
    // For approved items, show current value (which is now the approved value)
    return toString(currentValue);
  };

  const totalPending = pendingChanges.length;

  const getDisplayName = (item: ApprovalItem) => {
    if (item.type === "Company") return item.name;
    if (item.type === "Products") return item.product_name || "Product";
    if (item.type === "Speaker Portal Form") return item.speaker?.name || "Unknown Speaker";
    if (item.type === "Speaker Form" || item.type === "Speaker Headshot") {
      return item.exhibitor?.name || "Unknown Exhibitor";
    }
    if (item.exhibitor?.name) return item.exhibitor.name;
    return "Unknown";
  };

  const renderChangesTable = (changes: ApprovalItem[]) => {
    if (changes.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No changes found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type of Change</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((item) => (
              <TableRow key={`${item.table}-${item.id}`}>
                <TableCell className="font-medium">{getDisplayName(item)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.type}</Badge>
                </TableCell>
                <TableCell>
                  {item.submitted_for_approval_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.submitted_for_approval_at), "PPp")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setViewingItem(item);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {item.approval_status === "pending_approval" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            approveMutation.mutate({ 
                              table: item.table, 
                              id: item.id,
                              exhibitor_id: item.exhibitor_id,
                              speaker_id: item.speaker_id
                            });
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate({ 
                            table: item.table, 
                            id: item.id,
                            exhibitor_id: item.exhibitor_id,
                            speaker_id: item.speaker_id
                          })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 pt-24">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
            <p className="text-muted-foreground">
              Review and approve exhibitor changes
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>

        {totalPending === 0 && approvedChanges.length === 0 && rejectedChanges.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">No changes found!</p>
              <p className="text-muted-foreground">There are no pending, approved, or rejected changes at this time.</p>
            </CardContent>
          </Card>
        ) : (
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending
                  {pendingChanges.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingChanges.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected
                </TabsTrigger>
              </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {renderChangesTable(pendingChanges)}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {renderChangesTable(approvedChanges)}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {renderChangesTable(rejectedChanges)}
            </TabsContent>
          </Tabs>
        )}

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Change Details</DialogTitle>
            </DialogHeader>
          {viewingItem && (
            <div className="space-y-4">
              {viewingItem.type === "Company" && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Exhibitor: {viewingItem.name}</h3>
                  {viewingItem.approval_status === "rejected" && !viewingItem.pending_changes && (
                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600">
                      Note: Detailed change information is not available for this rejection.
                    </div>
                  )}
                  <div className="grid gap-3 text-sm">
                    {getValue(viewingItem, 'name') && (
                      <div><strong>Name:</strong> {getValue(viewingItem, 'name')}</div>
                    )}
                    {getValue(viewingItem, 'short_description') && (
                      <div><strong>Short Description:</strong> {getValue(viewingItem, 'short_description')}</div>
                    )}
                    {getValue(viewingItem, 'description') && (
                      <div><strong>Company Profile:</strong> {getValue(viewingItem, 'description')}</div>
                    )}
                    {getValue(viewingItem, 'website') && (
                      <div><strong>Website:</strong> {getValue(viewingItem, 'website')}</div>
                    )}
                    {getValue(viewingItem, 'booth_number') && (
                      <div><strong>Booth:</strong> {getValue(viewingItem, 'booth_number')}</div>
                    )}
                    {getValue(viewingItem, 'logo_url') && (
                      <div>
                        <strong>Logo:</strong>
                        <img src={getValue(viewingItem, 'logo_url')} alt="Logo" className="mt-2 max-w-[200px] rounded" />
                      </div>
                    )}
                    {getValue(viewingItem, 'banner_url') && (
                      <div>
                        <strong>Banner:</strong>
                        <img src={getValue(viewingItem, 'banner_url')} alt="Banner" className="mt-2 max-w-md rounded" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingItem.type === "Products" && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Product: {viewingItem.product_name}</h3>
                  {viewingItem.approval_status === "rejected" && !viewingItem.pending_changes && (
                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600">
                      Note: Detailed change information is not available for this rejection.
                    </div>
                  )}
                  <div className="grid gap-3 text-sm">
                    {getValue(viewingItem, 'product_name') && (
                      <div><strong>Product Name:</strong> {getValue(viewingItem, 'product_name')}</div>
                    )}
                    {getValue(viewingItem, 'description') && (
                      <div><strong>Description:</strong> {getValue(viewingItem, 'description')}</div>
                    )}
                    {getValue(viewingItem, 'image_url') && (
                      <div>
                        <strong>Image:</strong>
                        <img src={getValue(viewingItem, 'image_url')} alt="Product" className="mt-2 max-w-xs rounded" />
                      </div>
                    )}
                  </div>
                </div>
              )}

                {viewingItem.type === "Social Media" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Social Media Links - {viewingItem.exhibitor?.name}</h3>
                    {viewingItem.approval_status === "rejected" && !viewingItem.pending_changes && (
                      <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600">
                        Note: Detailed change information is not available for this rejection.
                      </div>
                    )}
                    <div className="grid gap-3 text-sm">
                      {getValue(viewingItem, 'facebook') && <div><strong>Facebook:</strong> {getValue(viewingItem, 'facebook')}</div>}
                      {getValue(viewingItem, 'instagram') && <div><strong>Instagram:</strong> {getValue(viewingItem, 'instagram')}</div>}
                      {getValue(viewingItem, 'linkedin') && <div><strong>LinkedIn:</strong> {getValue(viewingItem, 'linkedin')}</div>}
                      {getValue(viewingItem, 'tiktok') && <div><strong>TikTok:</strong> {getValue(viewingItem, 'tiktok')}</div>}
                      {getValue(viewingItem, 'youtube') && <div><strong>YouTube:</strong> {getValue(viewingItem, 'youtube')}</div>}
                      {!getValue(viewingItem, 'facebook') && !getValue(viewingItem, 'instagram') && !getValue(viewingItem, 'linkedin') && !getValue(viewingItem, 'tiktok') && !getValue(viewingItem, 'youtube') && (
                        <div className="text-sm text-muted-foreground">No social media links available</div>
                      )}
                    </div>
                  </div>
                )}

                {viewingItem.type === "Address" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Address - {viewingItem.exhibitor?.name}</h3>
                    {viewingItem.approval_status === "rejected" && !viewingItem.pending_changes && (
                      <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600">
                        Note: Detailed change information is not available for this rejection.
                      </div>
                    )}
                    <div className="grid gap-3 text-sm">
                      {getValue(viewingItem, 'street_line_1') && <div><strong>Street:</strong> {getValue(viewingItem, 'street_line_1')}</div>}
                      {getValue(viewingItem, 'city') && <div><strong>City:</strong> {getValue(viewingItem, 'city')}</div>}
                      {getValue(viewingItem, 'postcode') && <div><strong>Postcode:</strong> {getValue(viewingItem, 'postcode')}</div>}
                      {getValue(viewingItem, 'country') && <div><strong>Country:</strong> {getValue(viewingItem, 'country')}</div>}
                      {!getValue(viewingItem, 'street_line_1') && !getValue(viewingItem, 'city') && !getValue(viewingItem, 'postcode') && !getValue(viewingItem, 'country') && (
                        <div className="text-sm text-muted-foreground">No address information available</div>
                      )}
                    </div>
                  </div>
                )}

                {viewingItem.type === "Speaker Form" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Speaker Form Submission - {viewingItem.exhibitor?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      <div><strong>File Name:</strong> {viewingItem.file_name}</div>
                      <div><strong>File Type:</strong> {viewingItem.file_type}</div>
                      <div><strong>Submitted:</strong> {format(new Date(viewingItem.created_at), "PPp")}</div>
                      <div className="mt-3">
                        <a 
                          href={viewingItem.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View Submission →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {viewingItem.type === "Speaker Headshot" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Speaker Headshot - {viewingItem.exhibitor?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      <div><strong>File Name:</strong> {viewingItem.file_name}</div>
                      <div><strong>Submitted:</strong> {format(new Date(viewingItem.created_at), "PPp")}</div>
                      <div className="mt-3">
                        <img 
                          src={viewingItem.file_url} 
                          alt="Speaker Headshot" 
                          className="max-w-xs rounded border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {viewingItem.type === "Advertisement" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Advertisement Submission - {viewingItem.exhibitor?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      <div><strong>File Name:</strong> {viewingItem.file_name}</div>
                      <div><strong>File Type:</strong> {viewingItem.file_type}</div>
                      <div><strong>Submitted:</strong> {format(new Date(viewingItem.created_at), "PPp")}</div>
                      <div className="mt-3">
                        {viewingItem.file_type?.startsWith('image/') ? (
                          <img 
                            src={viewingItem.file_url} 
                            alt="Advertisement" 
                            className="max-w-md rounded border"
                          />
                        ) : (
                          <a 
                            href={viewingItem.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Submission →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {viewingItem.type === "Speaker Portal Form" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Speaker Form - {viewingItem.speaker?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      <div><strong>File Name:</strong> {viewingItem.pdf_filename}</div>
                      <div><strong>Submitted:</strong> {format(new Date(viewingItem.created_at), "PPp")}</div>
                      {viewingItem.extracted_data && (
                        <div className="mt-2 p-3 bg-background rounded border">
                          <strong className="block mb-2">Extracted Data:</strong>
                          <pre className="text-xs overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(viewingItem.extracted_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="mt-3">
                        <a 
                          href={viewingItem.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View PDF →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {!viewingItem.pending_changes && viewingItem.type !== "Social Media" && viewingItem.type !== "Address" && viewingItem.type !== "Speaker Form" && viewingItem.type !== "Speaker Headshot" && viewingItem.type !== "Advertisement" && viewingItem.type !== "Speaker Portal Form" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">No pending changes to display.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </>
  );
}