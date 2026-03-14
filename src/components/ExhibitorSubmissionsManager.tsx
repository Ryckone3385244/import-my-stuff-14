import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
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

interface ExhibitorSubmissionsManagerProps {
  exhibitorId: string;
}

interface Submission {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
  approval_status?: string;
}

export const ExhibitorSubmissionsManager = ({ exhibitorId }: ExhibitorSubmissionsManagerProps) => {
  const { toast } = useToast();
  const [speakerSubmissions, setSpeakerSubmissions] = useState<Submission[]>([]);
  const [headshotSubmissions, setHeadshotSubmissions] = useState<Submission[]>([]);
  const [advertSubmissions, setAdvertSubmissions] = useState<Submission[]>([]);
  const [exhibitorFlags, setExhibitorFlags] = useState<{
    speaker_submission_approved: boolean | null;
    headshot_submission_approved: boolean | null;
    advert_submission_approved: boolean | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<{ id: string; type: string } | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      const [speakerRes, headshotRes, advertRes, exhibitorRes] = await Promise.all([
        supabase
          .from("exhibitor_speaker_submissions")
          .select("*")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_speaker_headshots")
          .select("*")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_advert_submissions")
          .select("*")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitors")
          .select("speaker_submission_approved, headshot_submission_approved, advert_submission_approved")
          .eq("id", exhibitorId)
          .maybeSingle()
      ]);

      setSpeakerSubmissions(speakerRes.data || []);
      setHeadshotSubmissions(headshotRes.data || []);
      setAdvertSubmissions(advertRes.data || []);
      setExhibitorFlags(exhibitorRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading submissions:", error);
      setLoading(false);
    }
  }, [exhibitorId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleResetApprovalFlag = async (type: "speaker" | "headshot" | "advert") => {
    try {
      const { error } = await supabase.rpc('reset_submission_approval', {
        p_exhibitor_id: exhibitorId,
        p_submission_type: type
      });

      if (error) throw error;

      toast({
        title: "Approval flag reset",
        description: "The submission approval status has been reset.",
      });

      loadSubmissions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reset failed";
      toast({
        title: "Reset failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    const { downloadFile } = await import("@/lib/downloadUtils");
    downloadFile(fileUrl, fileName);
  };

  const handleDeleteClick = (id: string, type: "speaker" | "headshot" | "advert") => {
    setSelectedSubmission({ id, type });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubmission) return;

    try {
      const tableName = selectedSubmission.type === "speaker"
        ? "exhibitor_speaker_submissions"
        : selectedSubmission.type === "headshot"
        ? "exhibitor_speaker_headshots"
        : "exhibitor_advert_submissions";

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      toast({
        title: "Submission deleted",
        description: "The submission has been removed successfully.",
      });

      loadSubmissions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSubmission(null);
    }
  };

  const renderSubmissionList = (submissions: Submission[], type: "speaker" | "headshot" | "advert", _approvedFlag: boolean) => {
    if (submissions.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          No submissions yet
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {submissions.map((submission) => {
          const isRejected = submission.approval_status === 'rejected';
          const isPending = submission.approval_status === 'pending_approval';
          
          return (
            <div key={submission.id} className="flex flex-col p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{submission.file_name}</p>
                    {isPending && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Pending</span>
                    )}
                    {isRejected && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">Rejected</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {format(new Date(submission.created_at), "dd MMM yyyy 'at' HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(submission.file_url, "_blank")}
                    title="View file"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(submission.file_url, submission.file_name)}
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {!isRejected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(submission.id, type)}
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              {isRejected && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  Your submission was rejected. Please contact your Customer Service Manager.
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading submissions...</p>;
  }

  const hasAnything = speakerSubmissions.length > 0 || 
    headshotSubmissions.length > 0 || 
    advertSubmissions.length > 0 ||
    exhibitorFlags?.speaker_submission_approved ||
    exhibitorFlags?.headshot_submission_approved ||
    exhibitorFlags?.advert_submission_approved;

  if (!hasAnything) {
    return null;
  }

  return (
    <>
      {(speakerSubmissions.length > 0 || exhibitorFlags?.speaker_submission_approved) && (
        <Card>
          <CardHeader>
            <CardTitle>Speaker Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSubmissionList(speakerSubmissions, "speaker", exhibitorFlags?.speaker_submission_approved || false)}
          </CardContent>
        </Card>
      )}

      {(headshotSubmissions.length > 0 || exhibitorFlags?.headshot_submission_approved) && (
        <Card>
          <CardHeader>
            <CardTitle>Speaker Headshot Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSubmissionList(headshotSubmissions, "headshot", exhibitorFlags?.headshot_submission_approved || false)}
          </CardContent>
        </Card>
      )}

      {(advertSubmissions.length > 0 || exhibitorFlags?.advert_submission_approved) && (
        <Card>
          <CardHeader>
            <CardTitle>Advert Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSubmissionList(advertSubmissions, "advert", exhibitorFlags?.advert_submission_approved || false)}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
