import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Upload, X, Users, Mic, Building2, TrendingUp, FileUp, Pencil, BarChart3, FileText, Code, Palette, Menu, Download, LogIn, Settings, Eye, Check, Clock, Cloud } from "lucide-react";
import * as XLSX from 'xlsx';
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminMarketingTools } from "@/components/AdminMarketingTools";
import { AdminReporting } from "@/components/AdminReporting";
import { AdminEmailing } from "@/components/AdminEmailing";
import { AdminBlogPosts } from "@/components/AdminBlogPosts";
import { AdminModeration } from "@/components/AdminModeration";
import { AdminProjectExport } from "@/components/AdminProjectExport";
import { AdminCompleteExportImport } from "@/components/AdminCompleteExportImport";
import { AdminCredentialExport } from "@/components/AdminCredentialExport";
import { AdminCredentialsLog } from "@/components/AdminCredentialsLog";
import SpeakerDetailDialog from "@/components/SpeakerDetailDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { calculateSpeakerCompletion, calculateExhibitorCompletion, calculateExhibitorCompletionSync } from "@/lib/exhibitorCompletionUtils";
import { exhibitorSchema, speakerSchema, supplierSchema, userCreationSchema } from "@/lib/validation";
import { getErrorMessage, handleError } from "@/lib/errorHandling";
import { ChangeItem, SpeakerExtractedData, ApprovalTableName, SpeakerWithSubmissions, ExhibitorCompletionData, ExhibitorCSVRow, SpeakerCSVRow } from "@/lib/adminTypes";
import { normalizeStandType } from "@/lib/standTypeNormalization";

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingItem, setViewingItem] = useState<ChangeItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch pending approvals count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const [exhibitors, products, contacts, social, addresses, speakerPortalForms] = await Promise.all([
        supabase.from("exhibitors").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
        supabase.from("exhibitor_products").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
        supabase.from("exhibitor_contacts").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
        supabase.from("exhibitor_social_media").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
        supabase.from("exhibitor_address").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
        supabase.from("speaker_submissions").select("id", { count: "exact", head: true }).eq("approval_status", "pending_approval"),
      ]);

      return (
        (exhibitors.count || 0) +
        (products.count || 0) +
        (contacts.count || 0) +
        (social.count || 0) +
        (addresses.count || 0) +
        (speakerPortalForms.count || 0)
      );
    },
    refetchInterval: 5000, // Refetch every 5 seconds for faster notification updates
    staleTime: 0, // Always consider data stale
  });

  // Fetch pending inquiries count for moderation tab
  const { data: newInquiriesCount = 0 } = useQuery({
    queryKey: ["new-inquiries-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("exhibitor_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Fetch all exhibitor changes (pending, approved, rejected)
  const { data: exhibitorChanges = [] } = useQuery({
    queryKey: ["exhibitor-changes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select("*")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Company" as const, table: "exhibitors" as const }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all product changes
  const { data: productChanges = [] } = useQuery({
    queryKey: ["product-changes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_products")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false});
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Products" as const, table: "exhibitor_products" as const }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all social media changes
  const { data: socialChanges = [] } = useQuery({
    queryKey: ["social-changes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_social_media")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false});
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Social Media" as const, table: "exhibitor_social_media" as const }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all address changes
  const { data: addressChanges = [] } = useQuery({
    queryKey: ["address-changes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_address")
        .select("*, exhibitor:exhibitors(name)")
        .in("approval_status", ["pending_approval", "approved", "rejected"])
        .not("submitted_for_approval_at", "is", null)
        .order("submitted_for_approval_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({ ...item, type: "Address" as const, table: "exhibitor_address" as const }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch speaker submissions
  const { data: speakerSubmissions = [] } = useQuery({
    queryKey: ["speaker-submissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_speaker_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors, error: exhibitorsError } = await supabase
        .from("exhibitors")
        .select("id, name, booth_number")
        .in("id", exhibitorIds);

      if (exhibitorsError) throw exhibitorsError;

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map(item => ({ 
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id), 
        type: "Speaker Form" as const, 
        table: "exhibitor_speaker_submissions" as const,
        submitted_for_approval_at: item.created_at,
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch speaker portal submissions
  const { data: speakerPortalSubmissions = [] } = useQuery({
    queryKey: ["speaker-portal-submissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speaker_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const speakerIds = [...new Set(data?.map(item => item.speaker_id) || [])];
      const { data: speakers, error: speakersError } = await supabase
        .from("speakers")
        .select("id, name")
        .in("id", speakerIds);

      if (speakersError) throw speakersError;

      const speakerMap = new Map(speakers?.map(s => [s.id, s]) || []);

      return (data || []).map(item => ({ 
        ...item,
        speaker: speakerMap.get(item.speaker_id), 
        type: "Speaker Portal Form" as const, 
        table: "speaker_submissions" as const,
        submitted_for_approval_at: item.created_at,
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch headshot submissions
  const { data: headshotSubmissions = [] } = useQuery({
    queryKey: ["headshot-submissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_speaker_headshots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors, error: exhibitorsError } = await supabase
        .from("exhibitors")
        .select("id, name, booth_number")
        .in("id", exhibitorIds);

      if (exhibitorsError) throw exhibitorsError;

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map(item => ({ 
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id), 
        type: "Speaker Headshot" as const, 
        table: "exhibitor_speaker_headshots" as const,
        submitted_for_approval_at: item.created_at,
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch advert submissions
  const { data: advertSubmissions = [] } = useQuery({
    queryKey: ["advert-submissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_advert_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exhibitorIds = [...new Set(data?.map(item => item.exhibitor_id) || [])];
      const { data: exhibitors, error: exhibitorsError } = await supabase
        .from("exhibitors")
        .select("id, name, booth_number")
        .in("id", exhibitorIds);

      if (exhibitorsError) throw exhibitorsError;

      const exhibitorMap = new Map(exhibitors?.map(e => [e.id, e]) || []);

      return (data || []).map(item => ({ 
        ...item,
        exhibitor: exhibitorMap.get(item.exhibitor_id), 
        type: "Advertisement" as const, 
        table: "exhibitor_advert_submissions" as const,
        submitted_for_approval_at: item.created_at,
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Combine all changes
  const allChanges = [
    ...exhibitorChanges, 
    ...productChanges, 
    ...socialChanges, 
    ...addressChanges,
    ...speakerSubmissions,
    ...speakerPortalSubmissions,
    ...headshotSubmissions,
    ...advertSubmissions
  ].sort((a, b) => new Date(b.submitted_for_approval_at).getTime() - new Date(a.submitted_for_approval_at).getTime());

  const pendingChanges = allChanges.filter(item => item.approval_status === "pending_approval");
  const approvedChanges = allChanges.filter(item => item.approval_status === "approved");
  const rejectedChanges = allChanges.filter(item => item.approval_status === "rejected");

  // Helper function to safely get value from pending changes or current data
  const getValue = (item: ChangeItem, field: string): string | undefined => {
    if (item.approval_status === "pending_approval" && "pending_changes" in item && item.pending_changes) {
      const pendingChanges = item.pending_changes as Record<string, unknown>;
      const pendingValue = pendingChanges[field];
      if (pendingValue !== undefined && pendingValue !== null) {
        return String(pendingValue);
      }
    }
    
    // Return current value if no pending changes
    const currentValue = (item as Record<string, unknown>)[field];
    return currentValue !== undefined && currentValue !== null ? String(currentValue) : undefined;
  };

  // Helper function to get display name
  const getDisplayName = (item: ChangeItem): string => {
    if (item.type === "Company") return item.name;
    if (item.type === "Products") return item.product_name || "Product";
    if (item.type === "Speaker Portal Form") return item.speaker?.name || "Unknown Speaker";
    if (item.type === "Speaker Form" || item.type === "Speaker Headshot" || item.type === "Advertisement") {
      return item.exhibitor?.name || "Unknown Exhibitor";
    }
    if ("exhibitor" in item && item.exhibitor?.name) return item.exhibitor.name;
    return "Unknown";
  };

  // Helper function to render changes table
  const renderChangesTable = (changes: ChangeItem[]): JSX.Element => {
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
                          onClick={() => approveMutation.mutate({ table: item.table, id: item.id })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate({ 
                            table: item.table, 
                            id: item.id,
                            exhibitor_id: "exhibitor_id" in item ? item.exhibitor_id : undefined,
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

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      // Handle exhibitor speaker submissions specially - need to create speaker and draft session
      if (table === "exhibitor_speaker_submissions") {
        const { data: submission, error: fetchError } = await supabase
          .from("exhibitor_speaker_submissions")
          .select("*, extracted_data, exhibitor_id")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!submission) throw new Error("Submission not found");

        // Check if we need to parse the PDF first
        if (!submission.extracted_data) {
          
          const { error: parseError } = await supabase.functions.invoke(
            "parse-speaker-submission",
            {
              body: { 
                submissionId: id,
                pdfUrl: submission.file_url 
              },
            }
          );

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
        const extractedData = submission.extracted_data as SpeakerExtractedData;
        
        if (!extractedData.name && !extractedData.speaker_name) {
          throw new Error("Cannot create speaker: No speaker name found in extracted data. The PDF may not have been parsed correctly.");
        }
        
        const { data: newSpeaker, error: speakerError } = await supabase
          .from("speakers")
          .insert({
            name: extractedData.name || extractedData.speaker_name || "Unknown Speaker",
            bio: extractedData.bio || extractedData.speaker_bio,
            title: extractedData.title || extractedData.job_title,
            company: extractedData.company || extractedData.company_name,
            email: extractedData.email,
            phone: extractedData.phone || extractedData.contact_number,
            linkedin_url: extractedData.linkedin_url,
            is_active: true
          })
          .select()
          .maybeSingle();

        if (speakerError) {
          throw new Error(`Failed to create speaker: ${speakerError.message}`);
        }

        // Create draft session
        if (extractedData.seminar_title || extractedData.session_title) {
          const { error: sessionError } = await supabase
            .from("draft_sessions")
            .insert({
              speaker_id: newSpeaker.id,
              seminar_title: extractedData.seminar_title || extractedData.session_title || "Untitled Session",
              seminar_description: extractedData.seminar_description || extractedData.session_description,
              status: "draft"
            });

          if (sessionError) {
            throw new Error(`Failed to create draft session: ${sessionError.message}`);
          }
        } else {
        }

        // Update submission and exhibitor flags
        const { error: exhibitorError } = await supabase
          .from("exhibitors")
          .update({ speaker_submission_approved: true })
          .eq("id", submission.exhibitor_id);

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
        const { data: record, error: fetchError } = await supabase
          .from(table as ApprovalTableName)
          .select("exhibitor_id")
          .eq("id", id)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        if (!record) throw new Error("Record not found");

        const fieldMap = {
          exhibitor_speaker_headshots: "headshot_submission_approved",
          exhibitor_advert_submissions: "advert_submission_approved",
        } as const;

        // Update both the submission status and the exhibitor flag
        const { error: submissionError } = await supabase
          .from(table as ApprovalTableName)
          .update({ approval_status: "approved" })
          .eq("id", id);
        
        if (submissionError) throw submissionError;

        const { data: exhibitorError } = await supabase
          .from("exhibitors")
          .update({ [fieldMap[table as keyof typeof fieldMap]]: true })
          .eq("id", "exhibitor_id" in record && record.exhibitor_id ? record.exhibitor_id as string : "");
        
        if (exhibitorError) throw exhibitorError;
      } else if (table === "speaker_submissions") {
        // Handle speaker portal form submissions
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

        // Apply extracted data to speaker profile and draft session
        if (submission?.extracted_data && submission.speaker_id) {
          const extractedData = submission.extracted_data as SpeakerExtractedData;
          const updateFields: Partial<{
            title: string;
            company: string;
            email: string;
            phone: string;
            bio: string;
            seminar_title: string;
            seminar_description: string;
          }> = {};

          if (extractedData.title) updateFields.title = extractedData.title;
          if (extractedData.company) updateFields.company = extractedData.company;
          if (extractedData.email) updateFields.email = extractedData.email;
          if (extractedData.phone) updateFields.phone = extractedData.phone;
          if (extractedData.bio) updateFields.bio = extractedData.bio;
          if (extractedData.seminar_title) updateFields.seminar_title = extractedData.seminar_title;
          if (extractedData.seminar_description) updateFields.seminar_description = extractedData.seminar_description;

          if (Object.keys(updateFields).length > 0) {
            await supabase
              .from("speakers")
              .update(updateFields)
              .eq("id", submission.speaker_id);
          }

          if (extractedData.seminar_title || extractedData.seminar_description) {
            const { data: existingDraft } = await supabase
              .from("draft_sessions")
              .select("id")
              .eq("speaker_id", submission.speaker_id)
              .maybeSingle();

            if (existingDraft) {
              await supabase
                .from("draft_sessions")
                .update({
                  seminar_title: extractedData.seminar_title,
                  seminar_description: extractedData.seminar_description,
                })
                .eq("id", existingDraft.id);
            } else {
              await supabase
                .from("draft_sessions")
                .insert({
                  speaker_id: submission.speaker_id,
                  seminar_title: extractedData.seminar_title,
                  seminar_description: extractedData.seminar_description,
                  status: "draft",
                });
            }
          }
        }
      } else {
        // Handle regular pending changes (tables with pending_changes)
        const { data: record, error: fetchError } = await supabase
          .from(table as ApprovalTableName)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        if (!record) throw new Error("Record not found");

        // Only handle tables that have pending_changes
        if (!("pending_changes" in record) || !record.pending_changes) {
          throw new Error("No pending changes found");
        }

        const updates = {
          ...(typeof record.pending_changes === 'object' ? record.pending_changes as Record<string, unknown> : {}),
          approval_status: "approved",
          pending_changes: null,
        };

        const { error } = await supabase
          .from(table as ApprovalTableName)
          .update(updates)
          .eq("id", id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exhibitor-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["product-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["social-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["address-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-portal-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["headshot-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["advert-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      toast.success("Changes approved!", {
        description: "The changes have been successfully approved and are now live.",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ table, id, exhibitor_id }: { table: string; id: string; exhibitor_id?: string }) => {
      // Handle submission types separately (no pending_changes column)
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
          .from(table as ApprovalTableName)
          .update({ approval_status: "rejected" })
          .eq("id", id);

        if (submissionError) throw submissionError;

        const { error: resetError } = await supabase.rpc("reset_submission_approval", {
          p_exhibitor_id: exhibitor_id,
          p_submission_type: submissionType,
        });

        if (resetError) throw resetError;
      } else if (table === "speaker_submissions") {
        // Speaker portal submissions only need approval_status updated
        const { error: submissionError } = await supabase
          .from("speaker_submissions")
          .update({ approval_status: "rejected" })
          .eq("id", id);

        if (submissionError) throw submissionError;
      } else {
        // Regular change tables use pending_changes for archiving
        const { error } = await supabase
          .from(table as ApprovalTableName)
          .update({
            approval_status: "rejected",
            pending_changes: null,
          })
          .eq("id", id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exhibitor-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["product-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["social-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["address-changes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-portal-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["headshot-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["advert-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      toast.success("Changes rejected");
    },
  });

  // Reset speaker form submission mutation
  const resetSpeakerFormMutation = useMutation({
    mutationFn: async (speakerId: string) => {
      // Find and delete the speaker's submission
      const { data: submissions } = await supabase
        .from("speaker_submissions")
        .select("id")
        .eq("speaker_id", speakerId);

      if (submissions && submissions.length > 0) {
        for (const submission of submissions) {
          const { error } = await supabase
            .from("speaker_submissions")
            .delete()
            .eq("id", submission.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speaker-portal-submissions-admin"] });
      toast.success("Speaker form submission reset successfully");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to reset speaker form");
      toast.error(errorMessage);
    },
  });

  // Form states
  const [exhibitorForm, setExhibitorForm] = useState({
    name: "",
    account_number: "",
    booth_number: "",
    contact_full_name: "",
    contact_mobile: "",
    contact_email: "",
    address_street: "",
    address_city: "",
    address_postcode: "",
    address_country: "",
    description: "",
    logo_url: "",
    website: "",
    speaking_session: false,
    speaking_session_details: "",
    advertisement: false,
    advertisement_details: "",
    booth_length: "",
    booth_width: "",
    open_sides: "",
    stand_type: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogos, setIsUploadingLogos] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    uploaded: string[];
    skipped: string[];
    errors: { filename: string; error: string }[];
  } | null>(null);
  
  // Speaker headshots bulk upload states
  const [isUploadingHeadshots, setIsUploadingHeadshots] = useState(false);
  const [headshotsUploadResults, setHeadshotsUploadResults] = useState<{
    uploaded: string[];
    skipped: string[];
    errors: { filename: string; error: string }[];
  } | null>(null);

  // Speaker forms bulk upload states
  const [isUploadingSpeakerForms, setIsUploadingSpeakerForms] = useState(false);
  const [speakerFormsUploadResults, setSpeakerFormsUploadResults] = useState<{
    uploaded: string[];
    skipped: string[];
    errors: string[];
  } | null>(null);

  // Speaker form states
  const [speakerForm, setSpeakerForm] = useState({
    name: "",
    bio: "",
    photo_url: "",
    title: "",
    company: "",
    company_logo_url: "",
    email: "",
    phone: "",
    seminar_title: "",
    seminar_description: "",
    linkedin_url: "",
  });
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string>("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");

  // Show Suppliers state
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    button_text: "",
    button_url: "",
  });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [isEditSupplierDialogOpen, setIsEditSupplierDialogOpen] = useState(false);
  const [editSupplierForm, setEditSupplierForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    button_text: "",
    button_url: "",
  });
  const [supplierLogoFile, setSupplierLogoFile] = useState<File | null>(null);
  const [supplierFiles, setSupplierFiles] = useState<File[]>([]);

  // User management state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "exhibitor" | "user" | "customer_service" | "project_manager" | "speaker">("user");
  const [newUserMeetingUrl, setNewUserMeetingUrl] = useState("");
  const [selectedExhibitorId, setSelectedExhibitorId] = useState("");
  const [editingUser, setEditingUser] = useState<{id: string, email: string, role: string, username?: string, meetingUrl?: string} | null>(null);

  // CSV Import states
  const exhibitorCsvInputRef = useRef<HTMLInputElement>(null);
  const speakerCsvInputRef = useRef<HTMLInputElement>(null);
  const [isImportingExhibitors, setIsImportingExhibitors] = useState(false);
  const [isImportingSpeakers, setIsImportingSpeakers] = useState(false);

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "exhibitor" | "speaker" | "supplier" | null;
    id: string;
    name: string;
    speakerSessionCount?: number;
    speakerSessionTitles?: string[];
  }>({
    open: false,
    type: null,
    id: "",
    name: "",
  });

  // Exhibitor pagination and search
  const [exhibitorSearch, setExhibitorSearch] = useState("");
  const [exhibitorPage, setExhibitorPage] = useState(1);
  const exhibitorsPerPage = 15;
  
  // Speaker pagination and search
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [speakerPage, setSpeakerPage] = useState(1);
  const speakersPerPage = 15;
  
  const [addExhibitorModalOpen, setAddExhibitorModalOpen] = useState(false);
  const [addSpeakerModalOpen, setAddSpeakerModalOpen] = useState(false);
  
  // Speaker preview modal state
  const [previewSpeaker, setPreviewSpeaker] = useState<SpeakerWithSubmissions | null>(null);
  const [speakerPreviewOpen, setSpeakerPreviewOpen] = useState(false);
  
  // Exhibitor completion modal state
  const [exhibitorCompletionModal, setExhibitorCompletionModal] = useState<{
    open: boolean;
    exhibitor: ExhibitorCompletionData | null;
  }>({
    open: false,
    exhibitor: null,
  });
  
  // Exhibitor portal modal state
  const [exhibitorPortalModal, setExhibitorPortalModal] = useState<{
    open: boolean;
    sessionData: { access_token: string; refresh_token: string; exhibitor_name: string } | null;
    adminSession: { access_token: string; refresh_token: string } | null;
  }>({
    open: false,
    sessionData: null,
    adminSession: null,
  });
  
  // Speaker portal modal state
  const [speakerPortalModal, setSpeakerPortalModal] = useState<{
    open: boolean;
    sessionData: { access_token: string; refresh_token: string; speaker_name: string } | null;
    adminSession: { access_token: string; refresh_token: string } | null;
  }>({
    open: false,
    sessionData: null,
    adminSession: null,
  });
  
  // Track which exhibitor is being logged into
  const [loginAsExhibitorId, setLoginAsExhibitorId] = useState<string | null>(null);
  
  // Track which speaker is being logged into
  const [loginAsSpeakerId, setLoginAsSpeakerId] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login?redirect=/admin");
        return;
      }

      // Force a token refresh so backend function calls don't fail with "Invalid JWT"
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      const activeSession = refreshData.session ?? session;

      if (refreshError || !activeSession) {
        console.warn("[ADMIN] Session refresh failed:", refreshError);
        await supabase.auth.signOut();
        navigate("/login?redirect=/admin");
        return;
      }

      const { data: isAdminOrCSOrPM, error } = await supabase.rpc("is_admin_or_cs_or_pm", {
        _user_id: activeSession.user.id,
      });

      if (error || !isAdminOrCSOrPM) {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        navigate("/login?redirect=/admin");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("[ADMIN] Failed to validate admin session:", error);
      navigate("/login?redirect=/admin");
    } finally {
      setLoading(false);
    }
  };

  const { data: exhibitors } = useQuery({
    queryKey: ["admin-exhibitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select(`
          *,
          exhibitor_address(*),
          exhibitor_social_media(*),
          exhibitor_contacts(*),
          exhibitor_products(*),
          exhibitor_speaker_submissions(*),
          exhibitor_advert_submissions(*)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Real-time subscription for exhibitor updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-exhibitors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exhibitors'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
          queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exhibitor_contacts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exhibitor_products'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exhibitor_social_media'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exhibitor_address'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'speakers'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
          queryClient.invalidateQueries({ queryKey: ["speakers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Fetch user roles with emails
  const { data: userEmails } = useQuery({
    queryKey: ["admin-user-emails"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};

      // Ensure we have a fresh token before calling backend functions.
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error("Session expired. Please log in again.");
        await supabase.auth.signOut();
        navigate("/login?redirect=/admin");
        return {};
      }

      const accessToken = refreshData.session.access_token;
      const { data, error } = await supabase.functions.invoke("get-user-emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const message = (error as any)?.message ? String((error as any).message) : String(error);

        // Avoid infinite loops: force re-auth once if the token is invalid.
        if ((error as any)?.status === 401 || message.toLowerCase().includes("invalid jwt")) {
          toast.error("Session expired. Please log in again.");
          await supabase.auth.signOut();
          navigate("/login?redirect=/admin");
        }

        return {};
      }

      return data?.userEmails || {};
    },
    enabled: isAdmin,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all user roles
  const { data: allUserRoles } = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: userProfiles } = useQuery({
    queryKey: ["admin-user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, email");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: speakers } = useQuery({
    queryKey: ["admin-speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers")
        .select("*, speaker_submissions(*)")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("show_suppliers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: registrations } = useQuery({
    queryKey: ["admin-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const addExhibitorMutation = useMutation({
    mutationFn: async (newExhibitor: typeof exhibitorForm) => {
      let logoUrl = newExhibitor.logo_url;

      // Upload logo if file is selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('exhibitor-logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('exhibitor-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      // Insert exhibitor
      const { data: exhibitorData, error: exhibitorError } = await supabase
        .from("exhibitors")
        .insert([{ 
          name: newExhibitor.name, 
          booth_number: newExhibitor.booth_number,
          description: newExhibitor.description,
          website: newExhibitor.website,
          logo_url: logoUrl,
          speaking_session: newExhibitor.speaking_session,
          speaking_session_details: newExhibitor.speaking_session ? newExhibitor.speaking_session_details : null,
          advertisement: newExhibitor.advertisement,
          advertisement_details: newExhibitor.advertisement ? newExhibitor.advertisement_details : null,
          booth_length: newExhibitor.booth_length ? parseFloat(newExhibitor.booth_length) : null,
          booth_width: newExhibitor.booth_width ? parseFloat(newExhibitor.booth_width) : null,
          open_sides: newExhibitor.open_sides ? parseInt(newExhibitor.open_sides) : null,
          stand_type: normalizeStandType(newExhibitor.stand_type),
        }])
        .select()
        .maybeSingle();

      if (exhibitorError) throw exhibitorError;

      // Insert exhibitor address
      const { error: addressError } = await supabase
        .from("exhibitor_address")
        .insert([{
          exhibitor_id: exhibitorData.id,
          street_line_1: newExhibitor.address_street,
          city: newExhibitor.address_city,
          postcode: newExhibitor.address_postcode,
          country: newExhibitor.address_country,
        }]);

      if (addressError) throw addressError;

      // Insert exhibitor contact
      const { error: contactError } = await supabase
        .from("exhibitor_contacts")
        .insert([{
          exhibitor_id: exhibitorData.id,
          full_name: newExhibitor.contact_full_name,
          email: newExhibitor.contact_email,
          telephone: newExhibitor.contact_mobile,
          is_main_contact: true,
        }]);

      if (contactError) throw contactError;

      return exhibitorData;
    },
    onSuccess: async (exhibitorData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
      
      // Automatically generate credentials for the new exhibitor
      try {
        const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke(
          'create-exhibitor-credentials',
          {
            body: {
              exhibitorId: exhibitorData.id,
              companyName: exhibitorData.name,
              resetPassword: false
            }
          }
        );

        if (credentialsError) {
          toast.error("Exhibitor added but failed to generate login credentials. Please generate them manually.");
        } else if (credentialsData?.credentials) {
          toast.success(
            `Exhibitor added successfully! Login credentials:\nEmail: ${credentialsData.credentials.email || credentialsData.credentials.username}\nPassword: ${credentialsData.credentials.password}`,
            { duration: 10000 }
          );
        }
      } catch (error) {
        const errorMessage = handleError('Generate credentials', error, 'Exhibitor added but failed to generate login credentials. Please generate them manually.');
        toast.error(errorMessage);
      }

      setExhibitorForm({
        name: "",
        account_number: "",
        booth_number: "",
        contact_full_name: "",
        contact_mobile: "",
        contact_email: "",
        address_street: "",
        address_city: "",
        address_postcode: "",
        address_country: "",
        description: "",
        logo_url: "",
        website: "",
        speaking_session: false,
        speaking_session_details: "",
        advertisement: false,
        advertisement_details: "",
        booth_length: "",
        booth_width: "",
        open_sides: "",
        stand_type: "",
      });
      setLogoFile(null);
      setLogoPreview("");
      setAddExhibitorModalOpen(false);
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to add exhibitor");
      toast.error(errorMessage);
    },
  });

  const deleteExhibitorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exhibitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
      toast.success("Exhibitor deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete exhibitor");
    },
  });

  const loginAsExhibitorMutation = useMutation({
    mutationFn: async (exhibitorId: string) => {
      setLoginAsExhibitorId(exhibitorId);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      // First, check if exhibitor has credentials, if not create them
      const { data: exhibitor, error: exhibitorError } = await supabase
        .from("exhibitors")
        .select("user_id, name")
        .eq("id", exhibitorId)
        .maybeSingle();

      if (exhibitorError || !exhibitor) {
        throw new Error("Exhibitor not found");
      }

      // If no user_id, create credentials first
      if (!exhibitor.user_id) {
        const createResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-exhibitor-credentials`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ 
              exhibitorId: exhibitorId,
              companyName: exhibitor.name
            }),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || "Failed to create exhibitor credentials");
        }
      }

      // Now login as the exhibitor
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-login-as-exhibitor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ exhibitor_id: exhibitorId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to login as exhibitor");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Store the current admin session before opening the modal
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      toast.success(`Opening ${data.exhibitor_name}'s portal`);
      setExhibitorPortalModal({
        open: true,
        sessionData: data,
        adminSession: currentSession ? {
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        } : null,
      });
      setLoginAsExhibitorId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLoginAsExhibitorId(null);
    },
  });

  const loginAsSpeakerMutation = useMutation({
    mutationFn: async (speakerId: string) => {
      setLoginAsSpeakerId(speakerId);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      // First, check if speaker has credentials, if not create them
      const { data: speaker, error: speakerError } = await supabase
        .from("speakers")
        .select("user_id, name")
        .eq("id", speakerId)
        .maybeSingle();

      if (speakerError || !speaker) {
        throw new Error("Speaker not found");
      }

      // If no user_id, create credentials first
      if (!speaker.user_id) {
        const createResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-speaker-credentials`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ 
              speakerId: speakerId,
              speakerName: speaker.name
            }),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || "Failed to create speaker credentials");
        }
      }

      // Now login as the speaker
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-login-as-speaker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ speaker_id: speakerId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to login as speaker");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Store the current admin session before opening the modal
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      toast.success(`Opening ${data.speaker_name}'s portal`);
      setSpeakerPortalModal({
        open: true,
        sessionData: data,
        adminSession: currentSession ? {
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        } : null,
      });
      setLoginAsSpeakerId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLoginAsSpeakerId(null);
    },
  });

  const handleAddExhibitor = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = exhibitorSchema.safeParse({
      name: exhibitorForm.name,
      account_number: exhibitorForm.account_number,
      booth_number: exhibitorForm.booth_number,
      contact_full_name: exhibitorForm.contact_full_name,
      contact_mobile: exhibitorForm.contact_mobile,
      contact_email: exhibitorForm.contact_email,
      address_street: exhibitorForm.address_street,
      address_city: exhibitorForm.address_city,
      address_postcode: exhibitorForm.address_postcode,
      address_country: exhibitorForm.address_country,
      description: exhibitorForm.description,
      website: exhibitorForm.website,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    addExhibitorMutation.mutate(exhibitorForm);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const addSpeakerMutation = useMutation({
    mutationFn: async (newSpeaker: typeof speakerForm) => {
      let photoUrl = newSpeaker.photo_url;
      let companyLogoUrl = newSpeaker.company_logo_url;

      // Upload headshot if file is selected
      if (headshotFile) {
        const fileExt = headshotFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('speaker-headshots')
          .upload(filePath, headshotFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('speaker-headshots')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Upload company logo if file is selected
      if (companyLogoFile) {
        const fileExt = companyLogoFile.name.split('.').pop();
        const fileName = `company-logo-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('speaker-headshots')
          .upload(filePath, companyLogoFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('speaker-headshots')
          .getPublicUrl(filePath);

        companyLogoUrl = publicUrl;
      }

      const { data: speakerData, error } = await supabase.from("speakers").insert([{ 
        ...newSpeaker, 
        photo_url: photoUrl,
        company_logo_url: companyLogoUrl 
      }]).select().maybeSingle();
      if (error) throw error;
      return speakerData;
    },
    onSuccess: async (speakerData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });

      // Automatically generate credentials if speaker has email
      if (speakerData?.email && speakerData?.id) {
        try {
          const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke(
            'create-speaker-credentials',
            {
              body: {
                speakerId: speakerData.id,
                speakerName: speakerData.name,
                resetPassword: false
              }
            }
          );

          if (credentialsError) {
            toast.error("Speaker added but failed to generate login credentials. Please generate them manually.");
          } else if (credentialsData?.credentials && !credentialsData.credentials.alreadyExists) {
            toast.success(
              `Speaker added successfully! Login credentials:\nEmail: ${credentialsData.credentials.email}\nPassword: ${credentialsData.credentials.password}`,
              { duration: 10000 }
            );
          } else {
            toast.success("Speaker added successfully!");
          }
        } catch (error) {
          toast.error("Speaker added but failed to generate login credentials. Please generate them manually.");
        }
      } else {
        toast.success("Speaker added successfully! (No email provided - credentials not generated)");
      }
      setSpeakerForm({
        name: "",
        bio: "",
        photo_url: "",
        title: "",
        company: "",
        company_logo_url: "",
        email: "",
        phone: "",
        seminar_title: "",
        seminar_description: "",
        linkedin_url: "",
      });
      setHeadshotFile(null);
      setHeadshotPreview("");
      setCompanyLogoFile(null);
      setCompanyLogoPreview("");
      setAddSpeakerModalOpen(false);
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to add speaker");
      toast.error(errorMessage);
    },
  });

  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("speakers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });
      toast.success("Speaker deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete speaker");
    },
  });

  const handleAddSpeaker = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = speakerSchema.safeParse({
      name: speakerForm.name,
      bio: speakerForm.bio,
      title: speakerForm.title,
      company: speakerForm.company,
      company_logo_url: speakerForm.company_logo_url,
      email: speakerForm.email,
      phone: speakerForm.phone,
      seminar_title: speakerForm.seminar_title,
      seminar_description: speakerForm.seminar_description,
      linkedin_url: speakerForm.linkedin_url,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    addSpeakerMutation.mutate(speakerForm);
  };

  const handleHeadshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setHeadshotFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeadshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearHeadshot = () => {
    setHeadshotFile(null);
    setHeadshotPreview("");
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setCompanyLogoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCompanyLogo = () => {
    setCompanyLogoFile(null);
    setCompanyLogoPreview("");
  };

  const addSupplierMutation = useMutation({
    mutationFn: async (newSupplier: typeof supplierForm & { supplierId?: string }) => {
      // Insert supplier
      const { data: supplier, error } = await supabase
        .from("show_suppliers")
        .insert([{
          name: newSupplier.name,
          description: newSupplier.description,
          logo_url: newSupplier.logo_url,
          button_text: newSupplier.button_text,
          button_url: newSupplier.button_url,
        }])
        .select()
        .maybeSingle();
      
      if (error) throw error;

      // Upload files if any
      if (supplierFiles.length > 0 && supplier) {
        for (const file of supplierFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${supplier.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError, data: fileData } = await supabase.storage
            .from('supplier-files')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('supplier-files')
            .getPublicUrl(fileName);

          // Save file reference to database
          await supabase.from('supplier_files').insert({
            supplier_id: supplier.id,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      toast.success("Supplier added successfully!");
      setSupplierForm({
        name: "",
        description: "",
        logo_url: "",
        button_text: "",
        button_url: "",
      });
      setSupplierLogoFile(null);
      setSupplierFiles([]);
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to add supplier");
      toast.error(errorMessage);
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (updatedSupplier: typeof editSupplierForm & { id: string }) => {
      const { error } = await supabase
        .from("show_suppliers")
        .update({
          name: updatedSupplier.name,
          description: updatedSupplier.description,
          logo_url: updatedSupplier.logo_url,
          button_text: updatedSupplier.button_text,
          button_url: updatedSupplier.button_url,
        })
        .eq("id", updatedSupplier.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      toast.success("Supplier updated successfully!");
      setEditSupplierForm({
        name: "",
        description: "",
        logo_url: "",
        button_text: "",
        button_url: "",
      });
      setEditingSupplierId(null);
      setIsEditSupplierDialogOpen(false);
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to update supplier");
      toast.error(errorMessage);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("show_suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      toast.success("Supplier deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete supplier");
    },
  });

  const handleSupplierLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('supplier-files')
        .upload(`logos/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('supplier-files')
        .getPublicUrl(`logos/${fileName}`);

      setSupplierForm({ ...supplierForm, logo_url: publicUrl });
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      const errorMessage = handleError('Upload logo', error, 'Failed to upload logo');
      toast.error(errorMessage);
    }
  };

  const handleEditSupplierLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('supplier-files')
        .upload(`logos/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('supplier-files')
        .getPublicUrl(`logos/${fileName}`);

      setEditSupplierForm({ ...editSupplierForm, logo_url: publicUrl });
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      const errorMessage = handleError('Upload logo', error, 'Failed to upload logo');
      toast.error(errorMessage);
    }
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = supplierSchema.safeParse({
      name: supplierForm.name,
      description: supplierForm.description,
      logo_url: supplierForm.logo_url,
      button_text: supplierForm.button_text,
      button_url: supplierForm.button_url,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    addSupplierMutation.mutate(supplierForm);
  };

  const handleEditSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = supplierSchema.safeParse({
      name: editSupplierForm.name,
      description: editSupplierForm.description,
      logo_url: editSupplierForm.logo_url,
      button_text: editSupplierForm.button_text,
      button_url: editSupplierForm.button_url,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    if (editingSupplierId) {
      updateSupplierMutation.mutate({ ...editSupplierForm, id: editingSupplierId });
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, role, name, meetingUrl }: { email: string; password: string; role: "admin" | "exhibitor" | "user" | "customer_service" | "project_manager" | "speaker"; name?: string; meetingUrl?: string }) => {
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: { email, password, role, name, meetingUrl }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return { isExistingUser: data.isExistingUser, userId: data.userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-emails"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      if (data?.isExistingUser) {
        toast.success("Role assigned to existing user successfully!");
      } else {
        toast.success("User created successfully!");
      }
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      setNewUserMeetingUrl("");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to create user");
      toast.error(errorMessage);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = userCreationSchema.safeParse({
      email: newUserEmail,
      password: newUserPassword,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      name: newUserName,
      meetingUrl: newUserMeetingUrl,
    });
  };

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role, username, email, meetingUrl }: { userId: string; role: string; username?: string; email?: string; meetingUrl?: string }) => {
      // Update role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: role as "admin" | "customer_service" | "project_manager" | "exhibitor" | "speaker" })
        .eq("user_id", userId);

      if (error) throw error;

      // Update the actual auth email if provided
      if (email !== undefined) {
        const { error: emailError } = await supabase.functions.invoke('update-user-email', {
          body: { userId, email }
        });
        if (emailError) throw emailError;
      }

      // Update user profile with username, email, and meeting URL
      if (username !== undefined || email !== undefined || meetingUrl !== undefined) {
        const { data: existingProfile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        }

        if (existingProfile) {
          // Update existing profile
          const updateData: Partial<{
            display_name: string;
            email: string;
            meeting_url: string;
          }> = {};
          if (username !== undefined) updateData.display_name = username;
          if (email !== undefined) updateData.email = email;
          if (meetingUrl !== undefined) updateData.meeting_url = meetingUrl;

          const { error: profileError } = await supabase
            .from("user_profiles")
            .update(updateData)
            .eq("user_id", userId);

          if (profileError) throw profileError;
        } else {
          // Create profile if it doesn't exist
          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert([{
              user_id: userId,
              display_name: username || '',
              email: email || '',
              meeting_url: meetingUrl || ''
            }]);

          if (profileError) throw profileError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-emails"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-profiles"] });
      toast.success("User updated successfully!");
      setEditingUser(null);
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to update user");
      toast.error(errorMessage);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-emails"] });
      toast.success("User deleted successfully!");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to delete user");
      toast.error(errorMessage);
    },
  });

  const createExhibitorUserMutation = useMutation({
    mutationFn: async ({ email, password, exhibitorId }: { email: string; password: string; exhibitorId: string }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/exhibitor-portal`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "exhibitor" });

      if (roleError) throw roleError;

      const { error: updateError } = await supabase
        .from("exhibitors")
        .update({ user_id: authData.user.id })
        .eq("id", exhibitorId);

      if (updateError) throw updateError;

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      toast.success("Exhibitor account created successfully!");
      setNewUserEmail("");
      setNewUserPassword("");
      setSelectedExhibitorId("");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error, "Failed to create exhibitor account");
      toast.error(errorMessage);
    },
  });

  const handleCreateExhibitorUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhibitorId) {
      toast.error("Please select an exhibitor");
      return;
    }

    // Validate input
    const validationResult = userCreationSchema.safeParse({
      email: newUserEmail,
      password: newUserPassword,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    createExhibitorUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      exhibitorId: selectedExhibitorId,
    });
  };

  // Excel Import/Export functions
  const handleExhibitorExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsImportingExhibitors(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<ExhibitorCSVRow>(worksheet, { raw: false });
      
      if (jsonData.length === 0) {
        toast.error("No data found in Excel file");
        setIsImportingExhibitors(false);
        return;
      }

      // Map Excel columns to database fields
      const exhibitorsToImport = jsonData.map(row => {
        const eventStatus = row['Event Status'] || row['event_status'] || '';
        return {
          name: row['Company Name'] || row['name'] || '',
          account_number: row['Account Number'] || row['account_number'] || '',
          booth_number: row['Booth Number'] || row['booth_number'] || '',
          description: row['Description'] || row['description'] || '',
          website: row['Website'] || row['website'] || '',
          // Only include event_status if it has a valid value
          ...(eventStatus && { event_status: eventStatus }),
        };
      }).filter(item => item.name);

      if (exhibitorsToImport.length === 0) {
        toast.error("No valid exhibitor data found in Excel file");
        setIsImportingExhibitors(false);
        return;
      }

      // Bulk insert exhibitors
      const { data: insertedExhibitors, error } = await supabase
        .from('exhibitors')
        .insert(exhibitorsToImport)
        .select('id, name');

      if (error) throw error;

      // Now handle contacts and addresses from the same Excel rows
      if (insertedExhibitors && insertedExhibitors.length > 0) {
        const contactsToInsert = [];
        const addressesToInsert = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const exhibitor = insertedExhibitors[i];
          
          if (!exhibitor) continue;

          // Add contact if data exists
          const contactFullName = row['Contact Full Name'] || row['contact_full_name'] || '';
          const contactEmail = row['Contact Email'] || row['contact_email'] || '';
          const contactMobile = row['Contact Mobile'] || row['contact_mobile'] || '';
          
          if (contactFullName || contactEmail) {
            contactsToInsert.push({
              exhibitor_id: exhibitor.id,
              full_name: contactFullName,
              email: contactEmail,
              telephone: contactMobile,
              is_active: true,
            });
          }

          // Add address if data exists
          const streetAddress = row['Street Address'] || row['street_line_1'] || '';
          const city = row['City'] || row['city'] || '';
          const postcode = row['Postcode'] || row['postcode'] || '';
          const country = row['Country'] || row['country'] || '';
          
          if (streetAddress || city) {
            addressesToInsert.push({
              exhibitor_id: exhibitor.id,
              street_line_1: streetAddress,
              city: city,
              postcode: postcode,
              country: country,
            });
          }
        }

        // Insert contacts and addresses
        if (contactsToInsert.length > 0) {
          await supabase.from('exhibitor_contacts').insert(contactsToInsert);
        }
        if (addressesToInsert.length > 0) {
          await supabase.from('exhibitor_address').insert(addressesToInsert);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
      toast.success(`Successfully imported ${exhibitorsToImport.length} exhibitors from Excel`);
      
      if (exhibitorCsvInputRef.current) {
        exhibitorCsvInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = handleError('Import exhibitors', error, 'Failed to import exhibitors from Excel');
      toast.error(errorMessage);
    } finally {
      setIsImportingExhibitors(false);
    }
  };


  const handleBulkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error("Please upload a ZIP file");
      return;
    }

    setIsUploadingLogos(true);
    setUploadResults(null);

    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const { data, error } = await supabase.functions.invoke('upload-exhibitor-logos', {
        body: formData,
      });

      if (error) throw error;

      setUploadResults(data.results);
      
      const summary = data.summary;
      if (summary.uploaded > 0) {
        toast.success(`Successfully uploaded ${summary.uploaded} logos!`);
      }
      if (summary.errors > 0) {
        toast.error(`Failed to upload ${summary.errors} logos`);
      }
      if (summary.skipped > 0) {
        toast.warning(`Skipped ${summary.skipped} files`);
      }

      // Refresh exhibitors list
      queryClient.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
    } catch (error) {
      const errorMessage = handleError('Upload logos', error, 'Failed to upload logos');
      toast.error(errorMessage);
    } finally {
      setIsUploadingLogos(false);
      // Clear the file input
      e.target.value = '';
    }
  };


  const handleBulkHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error("Please upload a ZIP file");
      return;
    }

    setIsUploadingHeadshots(true);
    setHeadshotsUploadResults(null);

    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const { data, error } = await supabase.functions.invoke('upload-speaker-headshots', {
        body: formData,
      });

      if (error) throw error;

      setHeadshotsUploadResults(data.results);
      
      const summary = data.summary;
      if (summary.uploaded > 0) {
        toast.success(`Successfully uploaded ${summary.uploaded} headshots!`);
      }
      if (summary.errors > 0) {
        toast.error(`Failed to upload ${summary.errors} headshots`);
      }
      if (summary.skipped > 0) {
        toast.warning(`Skipped ${summary.skipped} files`);
      }

      // Refresh speakers list
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });

      // Clear the file input
      e.target.value = '';
    } catch (error) {
      const errorMessage = handleError('Upload headshots', error, 'Failed to upload headshots');
      toast.error(errorMessage);
    } finally {
      setIsUploadingHeadshots(false);
    }
  };

  const handleBulkSpeakerFormsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error("Please upload a ZIP file");
      return;
    }

    setIsUploadingSpeakerForms(true);
    setSpeakerFormsUploadResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-speaker-forms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setSpeakerFormsUploadResults(result);

      if (result.uploaded.length > 0) {
        toast.success(`Successfully processed ${result.uploaded.length} forms!`);
      }
      if (result.errors.length > 0) {
        toast.error(`Failed to process ${result.errors.length} forms`);
      }
      if (result.skipped.length > 0) {
        toast.warning(`Skipped ${result.skipped.length} files`);
      }

      // Clear the file input
      e.target.value = '';
    } catch (error) {
      const errorMessage = handleError('Upload speaker forms', error, 'Failed to upload speaker forms');
      toast.error(errorMessage);
    } finally {
      setIsUploadingSpeakerForms(false);
    }
  };

  const handleSpeakerExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsImportingSpeakers(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<SpeakerCSVRow>(worksheet, { raw: false });
      
      if (jsonData.length === 0) {
        toast.error("No data found in Excel file");
        setIsImportingSpeakers(false);
        return;
      }

      // Map Excel columns to database fields
      const speakersToImport = jsonData.map(row => ({
        name: row['Name'] || row['name'] || '',
        bio: row['Bio'] || row['bio'] || '',
        title: row['Title'] || row['title'] || '',
        company: row['Company'] || row['company'] || '',
        company_logo_url: row['Company Logo URL'] || row['company_logo_url'] || '',
        seminar_title: row['Seminar Title'] || row['seminar_title'] || '',
        seminar_description: row['Seminar Description'] || row['seminar_description'] || '',
        linkedin_url: row['LinkedIn URL'] || row['linkedin_url'] || '',
      })).filter(item => item.name);

      if (speakersToImport.length === 0) {
        toast.error("No valid speaker data found in Excel file");
        setIsImportingSpeakers(false);
        return;
      }

      // Bulk insert
      const { error } = await supabase
        .from('speakers')
        .insert(speakersToImport);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });
      toast.success(`Successfully imported ${speakersToImport.length} speakers from Excel`);
      
      if (speakerCsvInputRef.current) {
        speakerCsvInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = handleError('Import speakers', error, 'Failed to import speakers from Excel');
      toast.error(errorMessage);
    } finally {
      setIsImportingSpeakers(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const handleDeleteConfirm = () => {
    if (deleteDialog.type === "exhibitor") {
      deleteExhibitorMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === "speaker") {
      deleteSpeakerMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === "supplier") {
      deleteSupplierMutation.mutate(deleteDialog.id);
    }
    setDeleteDialog({ open: false, type: null, id: "", name: "" });
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Customer Connect Expo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-50 pt-page">
        <Navbar />

        <main className="flex-1">
          <section className="py-12 container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-900 pt-5">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage exhibitors, speakers, and suppliers for your expo</p>
          </div>

          {/* Management Cards */}
          <h2 className="text-3xl font-bold mb-4">Site Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/pages')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages & SEO</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Manage</div>
                <p className="text-xs text-muted-foreground">Page metadata</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/menu')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menu Management</CardTitle>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Manage</div>
                <p className="text-xs text-muted-foreground">Navigation menus</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/media-library')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Media Library</CardTitle>
                <FileUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Manage</div>
                <p className="text-xs text-muted-foreground">Images & videos</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/styles')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Website Styles</CardTitle>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Customize</div>
                <p className="text-xs text-muted-foreground">Colors & fonts</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/global-html')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Global HTML</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Manage</div>
                <p className="text-xs text-muted-foreground">Scripts & tags</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/custom-css')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custom CSS</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Edit</div>
                <p className="text-xs text-muted-foreground">Custom styles</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/event-settings')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Event Settings</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Configure</div>
                <p className="text-xs text-muted-foreground">Event details</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/google-drive')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Google Drive</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Configure</div>
                <p className="text-xs text-muted-foreground">Backup settings</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/sitemap-generator')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sitemap Generator</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Generate</div>
                <p className="text-xs text-muted-foreground">SEO sitemap</p>
              </CardContent>
            </Card>


            <Card 
              className="bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/other-configs')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Other Configs</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary">Manage</div>
                <p className="text-xs text-muted-foreground">API keys & services</p>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-10" />

          <h2 className="text-3xl font-bold mb-4">Manage content</h2>

          <Tabs defaultValue="exhibitors" className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-8 bg-black text-white">
              <TabsTrigger value="exhibitors">Exhibitors</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
              <TabsTrigger value="marketing">Marketing Tools</TabsTrigger>
              <TabsTrigger value="speakers">Speakers</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
              <TabsTrigger value="blog">Blog</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="export">Export/Import</TabsTrigger>
            </TabsList>

            <TabsContent value="exhibitors">
              {/* Action Buttons */}
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <Dialog open={addExhibitorModalOpen} onOpenChange={setAddExhibitorModalOpen}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent transition-colors bg-white/95 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          Add New Exhibitor
                        </CardTitle>
                        <CardDescription>
                          Fill in the details to add a new exhibitor
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Add New Exhibitor</DialogTitle>
                      <DialogDescription>
                        Fill in the details to add a new exhibitor to the show
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddExhibitor} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name">Company name *</Label>
                        <Input
                          id="name"
                          value={exhibitorForm.name}
                          onChange={(e) =>
                            setExhibitorForm({ ...exhibitorForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="account_number">Account number *</Label>
                        <Input
                          id="account_number"
                          value={exhibitorForm.account_number}
                          onChange={(e) =>
                            setExhibitorForm({ ...exhibitorForm, account_number: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="booth_number">Booth Number *</Label>
                        <Input
                          id="booth_number"
                          value={exhibitorForm.booth_number}
                          onChange={(e) =>
                            setExhibitorForm({
                              ...exhibitorForm,
                              booth_number: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-bold text-lg">Exhibitor Contact</h3>
                        <div>
                          <Label htmlFor="contact_full_name">Full name *</Label>
                          <Input
                            id="contact_full_name"
                            value={exhibitorForm.contact_full_name}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, contact_full_name: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_mobile">Mobile number *</Label>
                          <Input
                            id="contact_mobile"
                            type="tel"
                            value={exhibitorForm.contact_mobile}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, contact_mobile: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_email">Email address *</Label>
                          <Input
                            id="contact_email"
                            type="email"
                            value={exhibitorForm.contact_email}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, contact_email: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-bold text-lg">Company Address</h3>
                        <div>
                          <Label htmlFor="address_street">Street address *</Label>
                          <Input
                            id="address_street"
                            value={exhibitorForm.address_street}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, address_street: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="address_city">City *</Label>
                          <Input
                            id="address_city"
                            value={exhibitorForm.address_city}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, address_city: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="address_postcode">Postcode *</Label>
                          <Input
                            id="address_postcode"
                            value={exhibitorForm.address_postcode}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, address_postcode: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="address_country">Country *</Label>
                          <Input
                            id="address_country"
                            value={exhibitorForm.address_country}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, address_country: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-bold text-lg">Others</h3>
                        <div>
                          <Label htmlFor="description">Description (optional)</Label>
                          <Textarea
                            id="description"
                            value={exhibitorForm.description}
                            onChange={(e) =>
                              setExhibitorForm({
                                ...exhibitorForm,
                                description: e.target.value,
                              })
                            }
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="logo">Logo Image (optional)</Label>
                          <div className="space-y-3">
                            {logoPreview ? (
                              <div className="relative inline-block">
                                <img
                                  src={logoPreview}
                                  alt="Logo preview"
                                  className="h-32 w-32 object-contain border rounded-lg bg-white p-2"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={clearLogo}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <Input
                                  id="logo"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoChange}
                                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                                />
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="website">Website (optional)</Label>
                          <Input
                            id="website"
                            type="url"
                            value={exhibitorForm.website}
                            onChange={(e) =>
                              setExhibitorForm({ ...exhibitorForm, website: e.target.value })
                            }
                          />
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="speaking_session"
                                checked={exhibitorForm.speaking_session}
                                onChange={(e) =>
                                  setExhibitorForm({ ...exhibitorForm, speaking_session: e.target.checked })
                                }
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor="speaking_session" className="cursor-pointer">
                                Speaking Session
                              </Label>
                            </div>
                            {exhibitorForm.speaking_session && (
                              <div>
                                <Label htmlFor="speaking_session_details">Speaking Session Details</Label>
                                <Textarea
                                  id="speaking_session_details"
                                  value={exhibitorForm.speaking_session_details}
                                  onChange={(e) =>
                                    setExhibitorForm({ ...exhibitorForm, speaking_session_details: e.target.value })
                                  }
                                  rows={3}
                                  placeholder="Enter speaking session details..."
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="advertisement"
                                checked={exhibitorForm.advertisement}
                                onChange={(e) =>
                                  setExhibitorForm({ ...exhibitorForm, advertisement: e.target.checked })
                                }
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor="advertisement" className="cursor-pointer">
                                Advertisement
                              </Label>
                            </div>
                            {exhibitorForm.advertisement && (
                              <div>
                                <Label htmlFor="advertisement_details">Advertisement Details</Label>
                                <Textarea
                                  id="advertisement_details"
                                  value={exhibitorForm.advertisement_details}
                                  onChange={(e) =>
                                    setExhibitorForm({ ...exhibitorForm, advertisement_details: e.target.value })
                                  }
                                  rows={3}
                                  placeholder="Enter advertisement details..."
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-bold text-lg">Stand / Booth Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="booth_length">Booth Length (meters)</Label>
                            <Input
                              id="booth_length"
                              type="number"
                              step="0.1"
                              value={exhibitorForm.booth_length}
                              onChange={(e) =>
                                setExhibitorForm({ ...exhibitorForm, booth_length: e.target.value })
                              }
                              placeholder="e.g., 3.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="booth_width">Booth Width (meters)</Label>
                            <Input
                              id="booth_width"
                              type="number"
                              step="0.1"
                              value={exhibitorForm.booth_width}
                              onChange={(e) =>
                                setExhibitorForm({ ...exhibitorForm, booth_width: e.target.value })
                              }
                              placeholder="e.g., 2.5"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="open_sides">Open Sides</Label>
                            <Input
                              id="open_sides"
                              type="number"
                              min="0"
                              max="4"
                              value={exhibitorForm.open_sides}
                              onChange={(e) =>
                                setExhibitorForm({ ...exhibitorForm, open_sides: e.target.value })
                              }
                              placeholder="e.g., 2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="stand_type">Stand Type</Label>
                            <Input
                              id="stand_type"
                              value={exhibitorForm.stand_type}
                              onChange={(e) =>
                                setExhibitorForm({ ...exhibitorForm, stand_type: e.target.value })
                              }
                              placeholder="e.g., Shell Scheme, Custom Build"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={addExhibitorMutation.isPending}
                        className="w-full"
                      >
                        {addExhibitorMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Exhibitor"
                        )}
                      </Button>
                    </form>
                </DialogContent>
              </Dialog>
              
              </div>

              {/* Import/Upload Sections */}
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                {/* Excel Import Section */}
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Bulk Import Exhibitors from Excel
                    </CardTitle>
                  <CardDescription>
                    Upload an Excel file (.xlsx) with columns: Company Name, Account Number, Booth Number, Contact Full Name, Contact Mobile, Contact Email, Street Address, City, Postcode, Country, Description, Website
                  </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Input
                        ref={exhibitorCsvInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExhibitorExcelImport}
                        disabled={isImportingExhibitors}
                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                      />
                      {isImportingExhibitors && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Excel format automatically handles all exhibitor data including contacts and addresses
                  </p>
                  </CardContent>
                </Card>

                {/* Bulk Logo Upload Section */}
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileUp className="h-5 w-5" />
                      Bulk Upload Exhibitor Logos
                    </CardTitle>
                    <CardDescription>
                      Upload a ZIP file containing logos. Image filenames should match company names (e.g., "acme-corp.png" for "Acme Corp")
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept=".zip"
                          onChange={handleBulkLogoUpload}
                          disabled={isUploadingLogos}
                          className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                        />
                        {isUploadingLogos && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: PNG, JPG, JPEG, WEBP, GIF, SVG. The system will automatically match filenames to company names.
                      </p>

                      {uploadResults && (
                        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                          <h4 className="font-semibold text-sm">Upload Results:</h4>
                          
                          {uploadResults.uploaded.length > 0 && (
                            <div>
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                ✓ Successfully uploaded {uploadResults.uploaded.length} logos:
                              </p>
                              <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                                {uploadResults.uploaded.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {uploadResults.skipped.length > 0 && (
                            <div>
                              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                                ⚠ Skipped {uploadResults.skipped.length} files:
                              </p>
                              <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                                {uploadResults.skipped.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {uploadResults.errors.length > 0 && (
                            <div>
                              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                ✗ Failed to upload {uploadResults.errors.length} files:
                              </p>
                              <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                                {uploadResults.errors.map((item, i) => (
                                  <li key={i}>{item.filename}: {item.error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Exhibitor List - Full Width */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Current Exhibitors</CardTitle>
                    <CardDescription>Manage your exhibitor list ({exhibitors?.length || 0} total)</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      toast.loading("Starting SEO generation in background...", { id: "bulk-seo" });
                      try {
                        const { data, error } = await supabase.functions.invoke('generate-exhibitor-seo', {
                          body: { background: true }
                        });
                        if (error) throw error;
                        if (data.count === 0) {
                          toast.info("All exhibitors already have SEO metadata", { id: "bulk-seo" });
                        } else {
                          toast.success(`SEO generation started for ${data.count} exhibitors. Processing in background...`, { id: "bulk-seo", duration: 5000 });
                        }
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to start SEO generation", { id: "bulk-seo" });
                      }
                    }}
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Generate All SEO
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search exhibitors by name or booth number..."
                      value={exhibitorSearch}
                      onChange={(e) => {
                        setExhibitorSearch(e.target.value);
                        setExhibitorPage(1);
                      }}
                    />
                  </div>
                  {(() => {
                    const filteredExhibitors = exhibitors?.filter((exhibitor) => {
                      const searchLower = exhibitorSearch.toLowerCase();
                      return (
                        exhibitor.name.toLowerCase().includes(searchLower) ||
                        exhibitor.booth_number?.toLowerCase().includes(searchLower)
                      );
                    }) || [];

                    const totalPages = Math.ceil(filteredExhibitors.length / exhibitorsPerPage);
                    const startIndex = (exhibitorPage - 1) * exhibitorsPerPage;
                    const paginatedExhibitors = filteredExhibitors.slice(startIndex, startIndex + exhibitorsPerPage);

                    return (
                      <>
                        {filteredExhibitors.length > 0 ? (
                          <>
                            <div className="rounded-md border">
                                <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Booth</TableHead>
                                    <TableHead>Event Status</TableHead>
                                    <TableHead>Booth Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Completion</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedExhibitors.map((exhibitor) => (
                                    <TableRow key={exhibitor.id}>
                                      <TableCell className="font-medium">
                                        {exhibitor.name}
                                      </TableCell>
                                      <TableCell>{exhibitor.booth_number || "-"}</TableCell>
                                      <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                          exhibitor.event_status === 'confirmed' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : exhibitor.event_status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                        }`}>
                                          {exhibitor.event_status || 'pending'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="capitalize">{exhibitor.stand_type || "-"}</TableCell>
                                      <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          exhibitor.is_active 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                        }`}>
                                          {exhibitor.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div 
                                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setExhibitorCompletionModal({ open: true, exhibitor })}
                                          title="Click to view completion details"
                                        >
                                          <Progress value={calculateExhibitorCompletionSync(exhibitor).percentage} className="h-2 w-20" />
                                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            {calculateExhibitorCompletionSync(exhibitor).percentage}%
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => loginAsExhibitorMutation.mutate(exhibitor.id)}
                                            disabled={loginAsExhibitorId === exhibitor.id}
                                            title="Login as exhibitor"
                                          >
                                            {loginAsExhibitorId === exhibitor.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            ) : (
                                              <LogIn className="h-4 w-4 text-primary" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/admin/exhibitor/${exhibitor.id}`)}
                                            title="Edit exhibitor"
                                          >
                                            <Pencil className="h-4 w-4 text-primary" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              setDeleteDialog({
                                                open: true,
                                                type: "exhibitor",
                                                id: exhibitor.id,
                                                name: exhibitor.name,
                                              })
                                            }
                                            title="Delete exhibitor"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Showing {startIndex + 1} to {Math.min(startIndex + exhibitorsPerPage, filteredExhibitors.length)} of {filteredExhibitors.length} results
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExhibitorPage(exhibitorPage - 1)}
                                  disabled={exhibitorPage === 1}
                                >
                                  Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                      key={page}
                                      variant={page === exhibitorPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setExhibitorPage(page)}
                                    >
                                      {page}
                                    </Button>
                                  ))}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExhibitorPage(exhibitorPage + 1)}
                                  disabled={exhibitorPage === totalPages}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          {exhibitorSearch ? "No exhibitors found matching your search." : "No exhibitors yet. Add your first one!"}
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
            </TabsContent>

          <TabsContent value="speakers">
            {/* Action Buttons */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <Dialog open={addSpeakerModalOpen} onOpenChange={setAddSpeakerModalOpen}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:bg-accent transition-colors bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add New Speaker
                      </CardTitle>
                      <CardDescription>
                        Fill in the details to add a new speaker
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Add New Speaker</DialogTitle>
                    <DialogDescription>
                      Fill in the details to add a new speaker to the event
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSpeaker} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="speaker-name">Full Name *</Label>
                      <Input
                        id="speaker-name"
                        value={speakerForm.name}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="speaker-title">Title</Label>
                      <Input
                        id="speaker-title"
                        value={speakerForm.title}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="speaker-company">Company *</Label>
                      <Input
                        id="speaker-company"
                        value={speakerForm.company}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, company: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="speaker-email">Email</Label>
                      <Input
                        id="speaker-email"
                        type="email"
                        value={speakerForm.email}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="speaker-phone">Phone</Label>
                      <Input
                        id="speaker-phone"
                        type="tel"
                        value={speakerForm.phone}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="speaker-bio">Bio (max 150 words)</Label>
                      <Textarea
                        id="speaker-bio"
                        value={speakerForm.bio}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, bio: e.target.value })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {speakerForm.bio.trim() ? speakerForm.bio.trim().split(/\s+/).filter(w => w.length > 0).length : 0} words
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="headshot">Headshot Image</Label>
                      <div className="space-y-3">
                        {headshotPreview ? (
                          <div className="relative inline-block">
                            <img
                              src={headshotPreview}
                              alt="Headshot preview"
                              className="h-32 w-32 object-cover rounded-full border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={clearHeadshot}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <Input
                              id="headshot"
                              type="file"
                              accept="image/*"
                              onChange={handleHeadshotChange}
                              className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                            />
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Optional fields */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-4">Optional Information</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="company-logo">Company Logo</Label>
                          <div className="space-y-3">
                            {companyLogoPreview ? (
                              <div className="relative inline-block">
                                <img
                                  src={companyLogoPreview}
                                  alt="Company logo preview"
                                  className="h-24 w-24 object-contain border rounded p-2"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={clearCompanyLogo}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <Input
                                  id="company-logo"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleCompanyLogoChange}
                                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                                />
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="seminar-title">Seminar Title (max 10 words)</Label>
                          <Input
                            id="seminar-title"
                            value={speakerForm.seminar_title}
                            onChange={(e) =>
                              setSpeakerForm({ ...speakerForm, seminar_title: e.target.value })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {speakerForm.seminar_title?.trim() ? speakerForm.seminar_title.trim().split(/\s+/).filter(w => w.length > 0).length : 0} words
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="seminar-description">Seminar Description (max 70 words)</Label>
                          <Textarea
                            id="seminar-description"
                            value={speakerForm.seminar_description}
                            onChange={(e) =>
                              setSpeakerForm({ ...speakerForm, seminar_description: e.target.value })
                            }
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {speakerForm.seminar_description?.trim() ? speakerForm.seminar_description.trim().split(/\s+/).filter(w => w.length > 0).length : 0} words
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="speaker-linkedin">LinkedIn URL</Label>
                      <Input
                        id="speaker-linkedin"
                        type="url"
                        value={speakerForm.linkedin_url}
                        onChange={(e) =>
                          setSpeakerForm({ ...speakerForm, linkedin_url: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={addSpeakerMutation.isPending}
                      className="w-full"
                    >
                      {addSpeakerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Speaker"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              {/* Export Speaker Credentials */}
              <AdminCredentialExport entityType="speaker" />
            </div>

            {/* Import/Upload Sections */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              {/* Excel Import Section */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Import Speakers from Excel
                  </CardTitle>
                  <CardDescription>
                    Upload an Excel file (.xlsx) with columns: Name*, Title*, Company*, Bio* (max 150 words), Company Logo URL, Seminar Title (max 10 words), Seminar Description (max 70 words), LinkedIn URL. (* = required)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Input
                      ref={speakerCsvInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleSpeakerExcelImport}
                      disabled={isImportingSpeakers}
                      className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                    />
                    {isImportingSpeakers && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Excel format with proper column headers for easy data entry
                  </p>
                </CardContent>
              </Card>

              {/* Bulk Upload Forms Section */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Upload Speaker Forms
                  </CardTitle>
                  <CardDescription>
                    Upload a ZIP file containing speaker form PDFs. Forms will be automatically parsed and matched to existing speakers by filename.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".zip"
                        onChange={handleBulkSpeakerFormsUpload}
                        disabled={isUploadingSpeakerForms}
                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                      />
                      {isUploadingSpeakerForms && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Name PDFs to match speaker names for automatic matching (e.g., "john-smith-form.pdf")
                    </p>

                    {speakerFormsUploadResults && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm">Upload Results:</h4>
                        
                        {speakerFormsUploadResults.uploaded.length > 0 && (
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              ✓ Successfully processed {speakerFormsUploadResults.uploaded.length} forms:
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {speakerFormsUploadResults.uploaded.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {speakerFormsUploadResults.skipped.length > 0 && (
                          <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                              ⚠ Skipped {speakerFormsUploadResults.skipped.length} files:
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {speakerFormsUploadResults.skipped.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {speakerFormsUploadResults.errors.length > 0 && (
                          <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              ✗ Errors ({speakerFormsUploadResults.errors.length}):
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {speakerFormsUploadResults.errors.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Headshot Upload Section */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5" />
                    Bulk Upload Speaker Headshots
                  </CardTitle>
                  <CardDescription>
                    Upload a ZIP file containing headshots. Image filenames should match speaker names (e.g., "john-smith.png" for "John Smith")
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".zip"
                        onChange={handleBulkHeadshotUpload}
                        disabled={isUploadingHeadshots}
                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                      />
                      {isUploadingHeadshots && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: PNG, JPG, JPEG, WEBP, GIF. The system will automatically match filenames to speaker names.
                    </p>

                    {headshotsUploadResults && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm">Upload Results:</h4>
                        
                        {headshotsUploadResults.uploaded.length > 0 && (
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              ✓ Successfully uploaded {headshotsUploadResults.uploaded.length} headshots:
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {headshotsUploadResults.uploaded.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {headshotsUploadResults.skipped.length > 0 && (
                          <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                              ⚠ Skipped {headshotsUploadResults.skipped.length} files:
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {headshotsUploadResults.skipped.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {headshotsUploadResults.errors.length > 0 && (
                          <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              ✗ Failed to upload {headshotsUploadResults.errors.length} files:
                            </p>
                            <ul className="text-xs text-muted-foreground ml-4 mt-1 max-h-32 overflow-y-auto">
                              {headshotsUploadResults.errors.map((item, i) => (
                                <li key={i}>{item.filename}: {item.error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Speakers - Full Width */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Current Speakers</CardTitle>
                <CardDescription>Manage your speaker list ({speakers?.length || 0} total)</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search speakers by name or company..."
                      value={speakerSearch}
                      onChange={(e) => {
                        setSpeakerSearch(e.target.value);
                        setSpeakerPage(1);
                      }}
                    />
                  </div>
                  {(() => {
                    const filteredSpeakers = speakers?.filter((speaker) => {
                      const searchLower = speakerSearch.toLowerCase();
                      return (
                        speaker.name.toLowerCase().includes(searchLower) ||
                        speaker.company?.toLowerCase().includes(searchLower) ||
                        speaker.title?.toLowerCase().includes(searchLower)
                      );
                    }) || [];

                    const totalPages = Math.ceil(filteredSpeakers.length / speakersPerPage);
                    const startIndex = (speakerPage - 1) * speakersPerPage;
                    const paginatedSpeakers = filteredSpeakers.slice(startIndex, startIndex + speakersPerPage);

                    return (
                      <>
                        {filteredSpeakers.length > 0 ? (
                          <>
                            <div className="rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead className="text-center border-l border-border">Photo</TableHead>
                                    <TableHead className="text-center">Bio</TableHead>
                                    <TableHead className="text-center">Title</TableHead>
                                    <TableHead className="text-center">Company Logo</TableHead>
                                    <TableHead className="text-center">LinkedIn</TableHead>
                                    <TableHead className="text-center">Seminar Title</TableHead>
                                    <TableHead className="text-center">Seminar Desc</TableHead>
                                    <TableHead className="text-center">Form</TableHead>
                                    <TableHead className="border-r border-border">Completion</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedSpeakers.map((speaker) => (
                                    <TableRow key={speaker.id}>
                                      <TableCell className="font-medium">
                                        {speaker.name}
                                      </TableCell>
                                      <TableCell>{speaker.company || "-"}</TableCell>
                                      <TableCell className="border-l border-border">
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.photo_url ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.bio && speaker.bio.length > 50 ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.title ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.company_logo_url ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.linkedin_url ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.seminar_title ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center">
                                          <div className={`h-3 w-3 rounded-full ${speaker.seminar_description ? 'bg-green-500' : 'bg-destructive'}`} />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-center items-center gap-2">
                                          {speaker.speaker_submissions && speaker.speaker_submissions.length > 0 ? (
                                            <>
                                              {speaker.speaker_submissions.some((sub) => sub.approval_status === 'approved') ? (
                                                <div className="h-3 w-3 rounded-full bg-green-500" title="Form approved" />
                                              ) : (
                                                <div className="h-3 w-3 rounded-full bg-yellow-500" title="Form pending approval" />
                                              )}
                                            </>
                                          ) : (speaker.bio && speaker.seminar_title) ? (
                                            <div className="h-3 w-3 rounded-full bg-green-500" title="Form completed (bulk upload)" />
                                          ) : (
                                            <div className="h-3 w-3 rounded-full bg-destructive" title="No form submitted" />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="border-r border-border">
                                        <div className="flex items-center gap-2">
                                          <Progress value={calculateSpeakerCompletion(speaker).percentage} className="h-2 w-20" />
                                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            {calculateSpeakerCompletion(speaker).percentage}%
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => loginAsSpeakerMutation.mutate(speaker.id)}
                                            disabled={loginAsSpeakerId === speaker.id}
                                            title="Login as speaker"
                                          >
                                            {loginAsSpeakerId === speaker.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            ) : (
                                              <LogIn className="h-4 w-4 text-primary" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/admin/speaker/${speaker.id}`)}
                                            title="Edit speaker"
                                          >
                                            <Pencil className="h-4 w-4 text-primary" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              const { data: sessionSpeakers } = await supabase
                                                .from("session_speakers")
                                                .select("session_id, agenda_sessions(title)")
                                                .eq("speaker_id", speaker.id);
                                              
                                              const sessionCount = sessionSpeakers?.length || 0;
                                              const sessionTitles = sessionSpeakers
                                                ?.map((ss: any) => ss.agenda_sessions?.title || ss.agenda_sessions?.[0]?.title)
                                                .filter(Boolean) as string[] || [];
                                              
                                              setDeleteDialog({
                                                open: true,
                                                type: "speaker",
                                                id: speaker.id,
                                                name: speaker.name,
                                                speakerSessionCount: sessionCount,
                                                speakerSessionTitles: sessionTitles,
                                              });
                                            }}
                                            title="Delete speaker"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                  Showing {startIndex + 1} to {Math.min(startIndex + speakersPerPage, filteredSpeakers.length)} of {filteredSpeakers.length} results
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSpeakerPage(speakerPage - 1)}
                                    disabled={speakerPage === 1}
                                  >
                                    Previous
                                  </Button>
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                      key={page}
                                      variant={page === speakerPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSpeakerPage(page)}
                                    >
                                      {page}
                                    </Button>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSpeakerPage(speakerPage + 1)}
                                    disabled={speakerPage === totalPages}
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            {speakerSearch ? "No speakers found matching your search." : "No speakers yet. Add your first one!"}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="agenda">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Agenda Management</CardTitle>
                <CardDescription>
                  Manage conference sessions, schedule, and speaker assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/admin/agenda')}>
                  Go to Agenda Manager
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Add Supplier Form */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Supplier
                  </CardTitle>
                  <CardDescription>
                    Add approved suppliers for exhibitors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSupplier} className="space-y-4">
                    <div>
                      <Label htmlFor="supplier-name">Name *</Label>
                      <Input
                        id="supplier-name"
                        value={supplierForm.name}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-description">Description</Label>
                      <Textarea
                        id="supplier-description"
                        value={supplierForm.description}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, description: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-logo">Supplier Logo</Label>
                      <Input
                        id="supplier-logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSupplierLogoFile(file);
                            handleSupplierLogoUpload(file);
                          }
                        }}
                      />
                      {supplierForm.logo_url && (
                        <img src={supplierForm.logo_url} alt="Logo preview" className="mt-2 h-16 object-contain" />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="supplier-button-text">Button Text</Label>
                      <Input
                        id="supplier-button-text"
                        value={supplierForm.button_text}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, button_text: e.target.value })
                        }
                        placeholder="e.g., Get Quote, Contact Us"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-button-url">Button URL</Label>
                      <Input
                        id="supplier-button-url"
                        type="url"
                        value={supplierForm.button_url}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, button_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-files">Upload Files (PDFs)</Label>
                      <Input
                        id="supplier-files"
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setSupplierFiles(files);
                        }}
                      />
                      {supplierFiles.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {supplierFiles.length} file(s) selected
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={addSupplierMutation.isPending}
                    >
                      {addSupplierMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Supplier
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Supplier List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Current Suppliers</CardTitle>
                  <CardDescription>Manage show suppliers ({suppliers?.length || 0} total)</CardDescription>
                </CardHeader>
                <CardContent>
                  {suppliers && suppliers.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suppliers.map((supplier) => (
                            <TableRow key={supplier.id}>
                              <TableCell className="font-medium">
                                {supplier.name}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{supplier.description || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditSupplierForm({
                                          name: supplier.name,
                                          description: supplier.description || "",
                                          logo_url: supplier.logo_url || "",
                                          button_text: supplier.button_text || "",
                                          button_url: supplier.button_url || "",
                                        });
                                        setEditingSupplierId(supplier.id);
                                        setIsEditSupplierDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: "supplier",
                                        id: supplier.id,
                                        name: supplier.name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No suppliers yet. Add your first one!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            {/* Create User Form - Full Width */}
            <Card className="bg-white/95 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Add a new user with a specific role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="new-user-name">Username{(newUserRole === "customer_service" || newUserRole === "project_manager") && " *"}</Label>
                    <Input
                      id="new-user-name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g., John Doe, Sarah Smith"
                      required={newUserRole === "customer_service" || newUserRole === "project_manager"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-email">Email *</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-password">Password *</Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-role">Role *</Label>
                    <select
                      id="new-user-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as "admin" | "exhibitor" | "user" | "customer_service" | "project_manager" | "speaker")}
                      required
                    >
                      <option value="user">User</option>
                      <option value="exhibitor">Exhibitor</option>
                      <option value="speaker">Speaker</option>
                      <option value="admin">Admin</option>
                      <option value="customer_service">Client Relations Manager</option>
                      <option value="project_manager">Project Manager</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      • <strong>Admin:</strong> Full access to manage website<br />
                      • <strong>Exhibitor:</strong> Can manage own listing<br />
                      • <strong>Speaker:</strong> Can manage own profile and sessions<br />
                      • <strong>Client Relations Manager:</strong> Handle exhibitor inquiries<br />
                      • <strong>Project Manager:</strong> Handle speaker inquiries<br />
                      • <strong>User:</strong> Basic access
                    </p>
                  </div>
                  {(newUserRole === "customer_service" || newUserRole === "project_manager") && (
                    <div>
                      <Label htmlFor="new-user-meeting-url">Meeting Booking URL (Optional)</Label>
                      <Input
                        id="new-user-meeting-url"
                        type="url"
                        value={newUserMeetingUrl}
                        onChange={(e) => setNewUserMeetingUrl(e.target.value)}
                        placeholder="https://calendly.com/..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional: Provide a calendar booking URL (e.g., Calendly link) for Client Relations & Project Managers
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Admin/CS/PM Users Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mb-8">

              {/* Client Relations Manager Users List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Client Relations Manager</CardTitle>
                  <CardDescription>
                    Manage client relations accounts ({allUserRoles?.filter(u => (u.role as string) === 'customer_service').length || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserRoles && allUserRoles.filter(u => (u.role as string) === 'customer_service').length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserRoles.filter(u => (u.role as string) === 'customer_service').map((userRole) => {
                            const profile = userProfiles?.find(p => p.user_id === userRole.user_id);
                            const email = userEmails?.[userRole.user_id] || profile?.email;
                            const username = profile?.display_name;
                            
                            return (
                            <TableRow key={userRole.user_id}>
                              <TableCell className="font-mono text-sm">
                                {email ? (
                                <div>
                                    <div className="font-semibold">
                                      {username || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
                                       email.split('@')[0].split('.')[0].slice(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">ID: {userRole.user_id.substring(0, 8)}...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  CRM
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch user profile to get username and meeting URL
                                    const { data: profile, error: profileError } = await supabase
                                      .from("user_profiles")
                                      .select("display_name, meeting_url, email")
                                      .eq("user_id", userRole.user_id)
                                      .maybeSingle();
                                    
                                    if (profileError) {
                                      console.error("Error fetching profile:", profileError);
                                    }

                                    setEditingUser({
                                      id: userRole.user_id,
                                      email: userEmails?.[userRole.user_id] || '',
                                      role: userRole.role as string,
                                      username: profile?.display_name || '',
                                      meetingUrl: profile?.meeting_url || ''
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this user?')) {
                                      deleteUserMutation.mutate(userRole.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No client relations users yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Project Manager Users List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Project Manager</CardTitle>
                  <CardDescription>
                    Manage project manager accounts ({allUserRoles?.filter(u => (u.role as string) === 'project_manager').length || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserRoles && allUserRoles.filter(u => (u.role as string) === 'project_manager').length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserRoles.filter(u => (u.role as string) === 'project_manager').map((userRole) => {
                            const profile = userProfiles?.find(p => p.user_id === userRole.user_id);
                            const email = userEmails?.[userRole.user_id] || profile?.email;
                            const username = profile?.display_name;
                            
                            return (
                            <TableRow key={userRole.user_id}>
                              <TableCell className="font-mono text-sm">
                                {email ? (
                                <div>
                                    <div className="font-semibold">
                                      {username || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
                                       email.split('@')[0].split('.')[0].slice(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">ID: {userRole.user_id.substring(0, 8)}...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                  PM
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch user profile to get username and meeting URL
                                    const { data: profile, error: profileError } = await supabase
                                      .from("user_profiles")
                                      .select("display_name, meeting_url, email")
                                      .eq("user_id", userRole.user_id)
                                      .maybeSingle();
                                    
                                    if (profileError) {
                                      console.error("Error fetching profile:", profileError);
                                    }

                                    setEditingUser({
                                      id: userRole.user_id,
                                      email: userEmails?.[userRole.user_id] || '',
                                      role: userRole.role as string,
                                      username: profile?.display_name || '',
                                      meetingUrl: profile?.meeting_url || ''
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this user?')) {
                                      deleteUserMutation.mutate(userRole.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No project manager users yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Admin Users List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Admin Users</CardTitle>
                  <CardDescription>
                    Manage admin accounts ({allUserRoles?.filter(u => u.role === 'admin').length || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserRoles && allUserRoles.filter(u => u.role === 'admin').length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserRoles.filter(u => u.role === 'admin').map((userRole) => {
                            const profile = userProfiles?.find(p => p.user_id === userRole.user_id);
                            const email = userEmails?.[userRole.user_id] || profile?.email;
                            const username = profile?.display_name;
                            
                            return (
                            <TableRow key={userRole.user_id}>
                              <TableCell className="font-mono text-sm">
                                {email ? (
                                <div>
                                    <div className="font-semibold">
                                      {username || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
                                       email.split('@')[0].split('.')[0].slice(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">ID: {userRole.user_id.substring(0, 8)}...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                  A
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch user profile to get username and meeting URL
                                    const { data: profile, error: profileError } = await supabase
                                      .from("user_profiles")
                                      .select("display_name, meeting_url, email")
                                      .eq("user_id", userRole.user_id)
                                      .maybeSingle();

                                    if (profileError) {
                                      console.error("Error fetching profile:", profileError);
                                    }

                                    setEditingUser({
                                      id: userRole.user_id,
                                      email: userEmails?.[userRole.user_id] || '',
                                      role: userRole.role as string,
                                      username: profile?.display_name || '',
                                      meetingUrl: profile?.meeting_url || ''
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this user?')) {
                                      deleteUserMutation.mutate(userRole.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No admin users yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Exhibitor and Speaker Users Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Exhibitor Users List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Exhibitor Users</CardTitle>
                  <CardDescription>
                    Manage exhibitor accounts ({allUserRoles?.filter(u => u.role === 'exhibitor').length || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserRoles && allUserRoles.filter(u => u.role === 'exhibitor').length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserRoles.filter(u => u.role === 'exhibitor').map((userRole) => {
                            const profile = userProfiles?.find(p => p.user_id === userRole.user_id);
                            const email = userEmails?.[userRole.user_id] || profile?.email;
                            const username = profile?.display_name;
                            
                            return (
                            <TableRow key={userRole.user_id}>
                              <TableCell className="font-mono text-sm">
                                {email ? (
                                <div>
                                    <div className="font-semibold">
                                      {username || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
                                       email.split('@')[0].split('.')[0].slice(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">ID: {userRole.user_id.substring(0, 8)}...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  E
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch user profile to get username and meeting URL
                                    const { data: profile, error: profileError } = await supabase
                                      .from("user_profiles")
                                      .select("display_name, meeting_url, email")
                                      .eq("user_id", userRole.user_id)
                                      .maybeSingle();

                                    if (profileError) {
                                      console.error("Error fetching profile:", profileError);
                                    }

                                    setEditingUser({
                                      id: userRole.user_id,
                                      email: userEmails?.[userRole.user_id] || '',
                                      role: userRole.role as string,
                                      username: profile?.display_name || '',
                                      meetingUrl: profile?.meeting_url || ''
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this user?')) {
                                      deleteUserMutation.mutate(userRole.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No exhibitor users yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Speaker Users List */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Speaker Users</CardTitle>
                  <CardDescription>
                    Manage speaker accounts ({allUserRoles?.filter(u => u.role === 'speaker').length || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserRoles && allUserRoles.filter(u => u.role === 'speaker').length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserRoles.filter(u => u.role === 'speaker').map((userRole) => {
                            const profile = userProfiles?.find(p => p.user_id === userRole.user_id);
                            const email = userEmails?.[userRole.user_id] || profile?.email;
                            const username = profile?.display_name;
                            
                            return (
                            <TableRow key={userRole.user_id}>
                              <TableCell className="font-mono text-sm">
                                {email ? (
                                <div>
                                    <div className="font-semibold">
                                      {username || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
                                       email.split('@')[0].split('.')[0].slice(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">ID: {userRole.user_id.substring(0, 8)}...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                  S
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch user profile to get username and meeting URL
                                    const { data: profile, error: profileError } = await supabase
                                      .from("user_profiles")
                                      .select("display_name, meeting_url, email")
                                      .eq("user_id", userRole.user_id)
                                      .maybeSingle();

                                    if (profileError) {
                                      console.error("Error fetching profile:", profileError);
                                    }

                                    setEditingUser({
                                      id: userRole.user_id,
                                      email: userEmails?.[userRole.user_id] || '',
                                      role: userRole.role as string,
                                      username: profile?.display_name || '',
                                      meetingUrl: profile?.meeting_url || ''
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this user?')) {
                                      deleteUserMutation.mutate(userRole.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No speaker users yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Edit User Dialog */}
            {editingUser && (
                <AlertDialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Edit User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Update user details and role
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                          id="edit-username"
                          type="text"
                          placeholder="e.g., John Doe"
                          value={editingUser.username || ''}
                          onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          placeholder="user@example.com"
                          value={editingUser.email || ''}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-role">Role</Label>
                        <select
                          id="edit-role"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        >
                          <option value="user">User</option>
                          <option value="exhibitor">Exhibitor</option>
                          <option value="speaker">Speaker</option>
                          <option value="admin">Admin</option>
                          <option value="customer_service">Client Relations Manager</option>
                          <option value="project_manager">Project Manager</option>
                        </select>
                      </div>
                      
                      {(editingUser.role === 'customer_service' || editingUser.role === 'project_manager') && (
                        <div>
                          <Label htmlFor="edit-meeting-url">Meeting Booking URL</Label>
                          <Input
                            id="edit-meeting-url"
                            type="url"
                            placeholder="https://calendly.com/..."
                            value={editingUser.meetingUrl || ''}
                            onChange={(e) => setEditingUser({...editingUser, meetingUrl: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          updateUserMutation.mutate({
                            userId: editingUser.id,
                            role: editingUser.role,
                            username: editingUser.username,
                            email: editingUser.email,
                            meetingUrl: (editingUser.role === 'customer_service' || editingUser.role === 'project_manager') ? editingUser.meetingUrl : undefined
                          });
                        }}
                      >
                        Save Changes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </TabsContent>

          <TabsContent value="marketing">
            <AdminMarketingTools />
          </TabsContent>

          <TabsContent value="blog">
            <AdminBlogPosts />
          </TabsContent>

          <TabsContent value="export">
            <div className="space-y-8">
              <AdminCompleteExportImport />
              
              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Advanced: Data-Only Export/Import</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use these tools if you only need to export/import database records without media files,
                  or if you need to manually manage media uploads separately.
                </p>
                <AdminProjectExport />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-10" />

        <h2 className="text-3xl font-bold mb-4">Manage Communications & Analytics</h2>

        {/* Management Tabs */}
        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-black text-white">
            <TabsTrigger value="approvals" className="relative">
              Approvals
              {pendingCount > 0 && (
                <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
            <TabsTrigger value="email">Email Management</TabsTrigger>
            <TabsTrigger value="moderation" className="relative">
              Moderation
              {newInquiriesCount > 0 && (
                <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground">
                  {newInquiriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            {pendingChanges.length === 0 && approvedChanges.length === 0 && rejectedChanges.length === 0 ? (
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
          </TabsContent>

          <TabsContent value="reporting">
            <AdminReporting />
          </TabsContent>

          <TabsContent value="email">
            <AdminEmailing />
          </TabsContent>

          <TabsContent value="moderation">
            <AdminModeration />
          </TabsContent>

          <TabsContent value="credentials">
            <AdminCredentialsLog />
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Exhibitors</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{exhibitors?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Active companies</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Speakers</CardTitle>
                  <Mic className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{speakers?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Industry experts</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{registrations?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total registrations</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">In supplier directory</p>
                </CardContent>
              </Card>
            </div>

            <AdminAnalytics />
          </TabsContent>
        </Tabs>
        </section>
        </main>
      </div>

      <Footer />

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
                    <div className="grid gap-3 text-sm">
                      {getValue(viewingItem, 'facebook') && (
                        <div><strong>Facebook:</strong> {getValue(viewingItem, 'facebook')}</div>
                      )}
                      {getValue(viewingItem, 'instagram') && (
                        <div><strong>Instagram:</strong> {getValue(viewingItem, 'instagram')}</div>
                      )}
                      {getValue(viewingItem, 'linkedin') && (
                        <div><strong>LinkedIn:</strong> {getValue(viewingItem, 'linkedin')}</div>
                      )}
                      {getValue(viewingItem, 'tiktok') && (
                        <div><strong>TikTok:</strong> {getValue(viewingItem, 'tiktok')}</div>
                      )}
                      {getValue(viewingItem, 'youtube') && (
                        <div><strong>YouTube:</strong> {getValue(viewingItem, 'youtube')}</div>
                      )}
                      {!getValue(viewingItem, 'facebook') && 
                       !getValue(viewingItem, 'instagram') && 
                       !getValue(viewingItem, 'linkedin') && 
                       !getValue(viewingItem, 'tiktok') && 
                       !getValue(viewingItem, 'youtube') && (
                        <div className="text-sm text-muted-foreground">No social media links available</div>
                      )}
                    </div>
                  </div>
                )}

                {viewingItem.type === "Address" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Address - {viewingItem.exhibitor?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      {getValue(viewingItem, 'street_line_1') && (
                        <div><strong>Street:</strong> {getValue(viewingItem, 'street_line_1')}</div>
                      )}
                      {getValue(viewingItem, 'city') && (
                        <div><strong>City:</strong> {getValue(viewingItem, 'city')}</div>
                      )}
                      {getValue(viewingItem, 'postcode') && (
                        <div><strong>Postcode:</strong> {getValue(viewingItem, 'postcode')}</div>
                      )}
                      {getValue(viewingItem, 'country') && (
                        <div><strong>Country:</strong> {getValue(viewingItem, 'country')}</div>
                      )}
                      {!getValue(viewingItem, 'street_line_1') && 
                       !getValue(viewingItem, 'city') && 
                       !getValue(viewingItem, 'postcode') && 
                       !getValue(viewingItem, 'country') && (
                        <div className="text-sm text-muted-foreground">No address information available</div>
                      )}
                    </div>
                  </div>
                )}

                {(viewingItem.type === "Speaker Form" || viewingItem.type === "Speaker Headshot" || viewingItem.type === "Advertisement") && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">{viewingItem.type} - {viewingItem.exhibitor?.name}</h3>
                    <div className="grid gap-3 text-sm">
                      <div><strong>File Name:</strong> {viewingItem.file_name}</div>
                      <div><strong>File Type:</strong> {viewingItem.file_type}</div>
                      <div><strong>Submitted:</strong> {format(new Date(viewingItem.created_at), "PPp")}</div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(viewingItem.file_url, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View File
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const { downloadFile } = await import("@/lib/downloadUtils");
                            downloadFile(viewingItem.file_url, viewingItem.file_name);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!("pending_changes" in viewingItem && viewingItem.pending_changes) && 
                 (viewingItem.type === "Company" || viewingItem.type === "Products") && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">No pending changes to display.</p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: "", name: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will permanently delete <strong>{deleteDialog.name}</strong>. This action cannot be undone.
              </span>
              {deleteDialog.type === "speaker" && deleteDialog.speakerSessionCount && deleteDialog.speakerSessionCount > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <path d="M12 9v4"/>
                      <path d="M12 17h.01"/>
                    </svg>
                    <div>
                      <p className="font-medium text-amber-800">
                        Warning: This speaker is assigned to {deleteDialog.speakerSessionCount} agenda session{deleteDialog.speakerSessionCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Deleting this speaker will remove them from the following session{deleteDialog.speakerSessionCount > 1 ? 's' : ''}:
                      </p>
                      <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                        {deleteDialog.speakerSessionTitles?.slice(0, 5).map((title, index) => (
                          <li key={index}>{title}</li>
                        ))}
                        {deleteDialog.speakerSessionTitles && deleteDialog.speakerSessionTitles.length > 5 && (
                          <li>...and {deleteDialog.speakerSessionTitles.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exhibitor Portal Modal */}
      <Dialog 
        open={exhibitorPortalModal.open} 
        onOpenChange={async (open) => {
          if (!open) {
            // Restore the admin session when closing the modal
            if (exhibitorPortalModal.adminSession) {
              await supabase.auth.setSession({
                access_token: exhibitorPortalModal.adminSession.access_token,
                refresh_token: exhibitorPortalModal.adminSession.refresh_token,
              });
            }
            setExhibitorPortalModal({ open: false, sessionData: null, adminSession: null });
          }
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base">
              Viewing as: {exhibitorPortalModal.sessionData?.exhibitor_name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              You're viewing the exhibitor portal. Close this to return to admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`/exhibitor-portal?token=${encodeURIComponent(
                exhibitorPortalModal.sessionData?.access_token || ''
              )}&refresh=${encodeURIComponent(
                exhibitorPortalModal.sessionData?.refresh_token || ''
              )}`}
              className="w-full h-full border-0"
              title="Exhibitor Portal"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaker Portal Modal */}
      <Dialog 
        open={speakerPortalModal.open} 
        onOpenChange={async (open) => {
          if (!open) {
            // Restore the admin session when closing the modal
            if (speakerPortalModal.adminSession) {
              await supabase.auth.setSession({
                access_token: speakerPortalModal.adminSession.access_token,
                refresh_token: speakerPortalModal.adminSession.refresh_token,
              });
            }
            setSpeakerPortalModal({ open: false, sessionData: null, adminSession: null });
          }
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base">
              Viewing as: {speakerPortalModal.sessionData?.speaker_name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              You're viewing the speaker portal. Close this to return to admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`/speaker-portal?token=${encodeURIComponent(
                speakerPortalModal.sessionData?.access_token || ''
              )}&refresh=${encodeURIComponent(
                speakerPortalModal.sessionData?.refresh_token || ''
              )}`}
              className="w-full h-full border-0"
              title="Speaker Portal"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaker Preview Modal */}
      <SpeakerDetailDialog
        speaker={previewSpeaker}
        open={speakerPreviewOpen}
        onOpenChange={setSpeakerPreviewOpen}
      />

      {/* Exhibitor Completion Details Modal */}
      <Dialog 
        open={exhibitorCompletionModal.open} 
        onOpenChange={(open) => setExhibitorCompletionModal({ open, exhibitor: null })}
      >
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">
              {exhibitorCompletionModal.exhibitor?.name}
            </DialogTitle>
            {exhibitorCompletionModal.exhibitor?.booth_number && (
              <p className="text-lg text-muted-foreground mt-1">
                Booth: {exhibitorCompletionModal.exhibitor.booth_number}
              </p>
            )}
            <DialogDescription className="text-base mt-2 flex items-center gap-3">
              <span>Profile Completion:</span>
              <Progress value={calculateExhibitorCompletionSync(exhibitorCompletionModal.exhibitor).percentage} className="h-2 w-24" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {calculateExhibitorCompletionSync(exhibitorCompletionModal.exhibitor).percentage}%
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Logo</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.logo_url ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Description (20+ chars)</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.description && exhibitorCompletionModal.exhibitor.description.length > 20 ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Company Profile (50+ chars)</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.description && exhibitorCompletionModal.exhibitor.description.length > 50 ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Website</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.website ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Complete Address</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.exhibitor_address?.[0]?.street_line_1 && exhibitorCompletionModal.exhibitor?.exhibitor_address?.[0]?.city && exhibitorCompletionModal.exhibitor?.exhibitor_address?.[0]?.postcode && exhibitorCompletionModal.exhibitor?.exhibitor_address?.[0]?.country ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Social Media (at least one)</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.exhibitor_social_media?.[0]?.facebook || exhibitorCompletionModal.exhibitor?.exhibitor_social_media?.[0]?.instagram || exhibitorCompletionModal.exhibitor?.exhibitor_social_media?.[0]?.linkedin || exhibitorCompletionModal.exhibitor?.exhibitor_social_media?.[0]?.tiktok || exhibitorCompletionModal.exhibitor?.exhibitor_social_media?.[0]?.youtube ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Contacts</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.exhibitor_contacts && exhibitorCompletionModal.exhibitor.exhibitor_contacts.length > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Products</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.exhibitor_products && exhibitorCompletionModal.exhibitor.exhibitor_products.length > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Showguide Entry (20+ chars)</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.showguide_entry && exhibitorCompletionModal.exhibitor.showguide_entry.length > 20 ? 'bg-green-500' : 'bg-destructive'}`} />
                    </div>
                  </TableCell>
                </TableRow>
                {exhibitorCompletionModal.exhibitor?.speaking_session && (
                  <TableRow>
                    <TableCell>Speaking Session Details (20+ chars)</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.speaking_session_details && exhibitorCompletionModal.exhibitor.speaking_session_details.length > 20 ? 'bg-green-500' : 'bg-destructive'}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {exhibitorCompletionModal.exhibitor?.advertisement && (
                  <TableRow>
                    <TableCell>Advertisement Details (20+ chars)</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <div className={`h-3 w-3 rounded-full ${exhibitorCompletionModal.exhibitor?.advertisement_details && exhibitorCompletionModal.exhibitor.advertisement_details.length > 20 ? 'bg-green-500' : 'bg-destructive'}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditSupplierDialogOpen} onOpenChange={setIsEditSupplierDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSupplierSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-supplier-name">Supplier Name *</Label>
              <Input
                id="edit-supplier-name"
                value={editSupplierForm.name}
                onChange={(e) =>
                  setEditSupplierForm({ ...editSupplierForm, name: e.target.value })
                }
                placeholder="Enter supplier name"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-supplier-description">Description</Label>
              <Textarea
                id="edit-supplier-description"
                value={editSupplierForm.description}
                onChange={(e) =>
                  setEditSupplierForm({ ...editSupplierForm, description: e.target.value })
                }
                placeholder="Enter supplier description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-supplier-logo">Logo URL</Label>
              <div className="space-y-2">
                <Input
                  id="edit-supplier-logo"
                  type="url"
                  value={editSupplierForm.logo_url}
                  onChange={(e) =>
                    setEditSupplierForm({ ...editSupplierForm, logo_url: e.target.value })
                  }
                  placeholder="https://..."
                />
                <div className="text-sm text-muted-foreground">Or upload a file:</div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleEditSupplierLogoUpload(file);
                    }
                  }}
                />
              </div>
              {editSupplierForm.logo_url && (
                <img src={editSupplierForm.logo_url} alt="Logo preview" className="mt-2 h-16 object-contain" />
              )}
            </div>
            <div>
              <Label htmlFor="edit-supplier-button-text">Button Text</Label>
              <Input
                id="edit-supplier-button-text"
                value={editSupplierForm.button_text}
                onChange={(e) =>
                  setEditSupplierForm({ ...editSupplierForm, button_text: e.target.value })
                }
                placeholder="e.g., Get Quote, Contact Us"
              />
            </div>
            <div>
              <Label htmlFor="edit-supplier-button-url">Button URL</Label>
              <Input
                id="edit-supplier-button-url"
                type="url"
                value={editSupplierForm.button_url}
                onChange={(e) =>
                  setEditSupplierForm({ ...editSupplierForm, button_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditSupplierDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSupplierMutation.isPending}>
                {updateSupplierMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Supplier"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Admin;
