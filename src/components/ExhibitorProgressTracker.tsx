import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, ExternalLink, XCircle, AlertCircle, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExhibitorSubmissionUpload } from "@/components/ExhibitorSubmissionUpload";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getExhibitorCompletionChecks } from "@/lib/exhibitorCompletionUtils";

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  link?: string;
  description?: string;
  deadline?: string;
  requiresUpload?: boolean;
  uploadType?: "speaker" | "advert" | "headshot";
  managerEmail?: string;
  managerName?: string;
  approvalStatus?: 'pending' | 'rejected';
}

interface RejectedChange {
  type: string;
  fieldName: string;
  submittedValue?: string;
}

interface ExhibitorProgressTrackerProps {
  exhibitorId: string;
}

// Map completion item IDs to navigation URLs
const getNavigationUrl = (itemId: string): string | null => {
  const urlMap: Record<string, string> = {
    'logo': '/exhibitor-portal/company-profile?tab=company',
    'profile': '/exhibitor-portal/company-profile?tab=company',
    'website': '/exhibitor-portal/company-profile?tab=company',
    'address': '/exhibitor-portal/company-profile?tab=address',
    'social': '/exhibitor-portal/company-profile?tab=social',
    'contacts': '/exhibitor-portal/contacts',
    'products': '/exhibitor-portal/company-profile?tab=products',
    'showguide': '/exhibitor-portal/my-listing',
  };
  return urlMap[itemId] || null;
};

export const ExhibitorProgressTracker = ({ exhibitorId }: ExhibitorProgressTrackerProps) => {
  const navigate = useNavigate();
  const [selectedItemLink, setSelectedItemLink] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedUploadItem, setSelectedUploadItem] = useState<CompletionItem | null>(null);
  const [rejectedDialogOpen, setRejectedDialogOpen] = useState(false);

  const handleCardClick = (item: CompletionItem) => {
    // Don't allow actions if item is pending approval
    if (item.approvalStatus === 'pending') {
      return;
    }

    // If item requires upload, show upload modal
    if (!item.completed && item.requiresUpload) {
      setSelectedUploadItem(item);
      setUploadModalOpen(true);
      return;
    }

    // If item is not completed, navigate to edit page
    if (!item.completed) {
      const url = getNavigationUrl(item.id);
      if (url) {
        navigate(url);
      }
    }
  };

  const { data: exhibitorData, isLoading } = useQuery({
    queryKey: ["exhibitor-progress", exhibitorId],
    queryFn: async () => {
      const [
        exhibitorRes,
        addressRes,
        socialRes,
        contactsRes,
        productsRes,
        eventSettingsRes,
        speakerSubmissionsRes,
        advertSubmissionsRes,
        headshotSubmissionsRes,
        csManagersRes,
      ] = await Promise.all([
        supabase
          .from("exhibitors")
          .select("*")
          .eq("id", exhibitorId)
          .maybeSingle(),
        supabase
          .from("exhibitor_address")
          .select("*")
          .eq("exhibitor_id", exhibitorId)
          .maybeSingle(),
        supabase
          .from("exhibitor_social_media")
          .select("*")
          .eq("exhibitor_id", exhibitorId)
          .maybeSingle(),
        supabase
          .from("exhibitor_contacts")
          .select("*")
          .eq("exhibitor_id", exhibitorId),
        supabase
          .from("exhibitor_products")
          .select("*")
          .eq("exhibitor_id", exhibitorId),
        supabase
          .from("event_settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("exhibitor_speaker_submissions")
          .select("approval_status, created_at")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_advert_submissions")
          .select("approval_status, created_at")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_speaker_headshots")
          .select("approval_status, created_at")
          .eq("exhibitor_id", exhibitorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_managers")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);

      if (exhibitorRes.error) throw exhibitorRes.error;
      
      // Manually construct the exhibitor object with related data
      const exhibitor = {
        ...exhibitorRes.data,
        exhibitor_address: addressRes.data ? [addressRes.data] : [],
        exhibitor_social_media: socialRes.data ? [socialRes.data] : [],
        exhibitor_contacts: contactsRes.data || [],
        exhibitor_products: productsRes.data || [],
      };

      const eventSettings = eventSettingsRes.data;
      const speakerSubmissions = speakerSubmissionsRes.data || [];
      const advertSubmissions = advertSubmissionsRes.data || [];
      const headshotSubmissions = headshotSubmissionsRes.data || [];

      const hasSpeakerSubmission = speakerSubmissions.length > 0;
      const hasAdvertSubmission = advertSubmissions.length > 0;
      const hasHeadshotSubmission = headshotSubmissions.length > 0;

      const speakerHasPending = speakerSubmissions.some((s) => s.approval_status === "pending_approval");
      const speakerHasRejected = speakerSubmissions.some((s) => s.approval_status === "rejected");
      const advertHasPending = advertSubmissions.some((s) => s.approval_status === "pending_approval");
      const advertHasRejected = advertSubmissions.some((s) => s.approval_status === "rejected");
      const headshotHasPending = headshotSubmissions.some((s) => s.approval_status === "pending_approval");
      const headshotHasRejected = headshotSubmissions.some((s) => s.approval_status === "rejected");

      const csManager = csManagersRes.data;

      const exhibitorStatus = exhibitor.approval_status;
      const addressData = exhibitor.exhibitor_address?.[0];
      const addressStatus = addressData?.approval_status;
      const socialStatus = exhibitor.exhibitor_social_media?.[0]?.approval_status;
      const productsStatus = exhibitor.exhibitor_products?.some((p) => p.approval_status === 'pending_approval') ? 'pending_approval' :
                             exhibitor.exhibitor_products?.some((p) => p.approval_status === 'rejected') ? 'rejected' : null;
      const contactsStatus = exhibitor.exhibitor_contacts?.some((c) => c.approval_status === 'pending_approval') ? 'pending_approval' :
                             exhibitor.exhibitor_contacts?.some((c) => c.approval_status === 'rejected') ? 'rejected' : null;

      // Use shared completion function to ensure consistency with admin
      const baseChecks = getExhibitorCompletionChecks(exhibitor);
      
      // Map check IDs to their corresponding field names in pending_changes
      const checkIdToFieldMap: Record<string, string> = {
        'logo': 'logo_url',
        'profile': 'description',
        'website': 'website',
        'showguide': 'short_description',
      };
      
      // Helper to check if a specific field is in pending_changes
      const isFieldInPendingChanges = (fieldName: string) => {
        const pendingChanges = exhibitor.pending_changes as Record<string, unknown> | null;
        return pendingChanges && typeof pendingChanges === 'object' && fieldName in pendingChanges;
      };
      
      // Build items array from base checks, adding portal-specific fields
      const items: CompletionItem[] = baseChecks.map((check) => {
        let approvalStatus: 'pending' | 'rejected' | undefined = undefined;
        let actuallyCompleted = check.completed;
        let deadline: string | undefined = undefined;
        
        // Determine approval status based on check type
        if (check.id === 'logo' || check.id === 'profile' || check.id === 'website' || check.id === 'showguide') {
          // Only mark as pending if this specific field is in pending_changes
          const fieldName = checkIdToFieldMap[check.id];
          if (exhibitorStatus === 'pending_approval' && isFieldInPendingChanges(fieldName)) {
            approvalStatus = 'pending';
            actuallyCompleted = false;
          } else if (exhibitorStatus === 'rejected' && isFieldInPendingChanges(fieldName)) {
            approvalStatus = 'rejected';
            actuallyCompleted = false;
          }
          // Add showguide deadline if task is incomplete
          if (check.id === 'showguide' && !actuallyCompleted && eventSettings?.showguide_listing_deadline) {
            deadline = new Date(eventSettings.showguide_listing_deadline).toLocaleDateString();
          }
        } else if (check.id === 'address') {
          approvalStatus = addressStatus === 'pending_approval' ? 'pending' : addressStatus === 'rejected' ? 'rejected' : undefined;
          if (addressStatus === 'pending_approval' || addressStatus === 'rejected') {
            actuallyCompleted = false;
          }
        } else if (check.id === 'social') {
          approvalStatus = socialStatus === 'pending_approval' ? 'pending' : socialStatus === 'rejected' ? 'rejected' : undefined;
          if (socialStatus === 'pending_approval' || socialStatus === 'rejected') {
            actuallyCompleted = false;
          }
        } else if (check.id === 'products') {
          approvalStatus = productsStatus === 'pending_approval' ? 'pending' : productsStatus === 'rejected' ? 'rejected' : undefined;
          if (productsStatus === 'pending_approval' || productsStatus === 'rejected') {
            actuallyCompleted = false;
          }
        } else if (check.id === 'contacts') {
          approvalStatus = contactsStatus === 'pending_approval' ? 'pending' : contactsStatus === 'rejected' ? 'rejected' : undefined;
          if (contactsStatus === 'pending_approval' || contactsStatus === 'rejected') {
            actuallyCompleted = false;
          }
        }
        
        return {
          ...check,
          completed: actuallyCompleted,
          approvalStatus,
          deadline,
          link: check.id === 'showguide' ? '/exhibitor-portal/my-listing' : undefined,
        };
      });

      // Add space-only deadline if applicable
      if (eventSettings?.space_only_deadline && exhibitor.stand_type === 'space_only') {
        items.push({
          id: "space_only",
          label: "Space Only Stand Setup",
          completed: false,
          deadline: new Date(eventSettings.space_only_deadline).toLocaleDateString(),
          description: "Complete your space only stand setup",
        });
      }

      if (eventSettings?.speaker_form_deadline && exhibitor.speaking_session) {
        let speakerApprovalStatus: 'pending' | 'rejected' | undefined;
        if (exhibitor.speaker_submission_approved) {
          speakerApprovalStatus = undefined;
        } else if (speakerHasRejected) {
          speakerApprovalStatus = 'rejected';
        } else if (speakerHasPending) {
          speakerApprovalStatus = 'pending';
        }
        
        items.push({
          id: "speaker",
          label: "Speaker Form Submission",
          completed: exhibitor.speaker_submission_approved === true && hasSpeakerSubmission,
          deadline: new Date(eventSettings.speaker_form_deadline).toLocaleDateString(),
          requiresUpload: true,
          uploadType: "speaker",
          managerEmail: csManager?.email,
          managerName: csManager?.name,
          approvalStatus: speakerApprovalStatus,
        });
        
        let headshotApprovalStatus: 'pending' | 'rejected' | undefined;
        if (exhibitor.headshot_submission_approved) {
          headshotApprovalStatus = undefined;
        } else if (headshotHasRejected) {
          headshotApprovalStatus = 'rejected';
        } else if (headshotHasPending) {
          headshotApprovalStatus = 'pending';
        }
        
        items.push({
          id: "headshot",
          label: "Speaker Headshot",
          completed: exhibitor.headshot_submission_approved === true && hasHeadshotSubmission,
          deadline: new Date(eventSettings.speaker_form_deadline).toLocaleDateString(),
          requiresUpload: true,
          uploadType: "headshot",
          managerEmail: csManager?.email,
          managerName: csManager?.name,
          approvalStatus: headshotApprovalStatus,
        });
      }

      if (eventSettings?.advert_submission_deadline && exhibitor.advertisement) {
        let advertApprovalStatus: 'pending' | 'rejected' | undefined;
        if (exhibitor.advert_submission_approved) {
          advertApprovalStatus = undefined;
        } else if (advertHasRejected) {
          advertApprovalStatus = 'rejected';
        } else if (advertHasPending) {
          advertApprovalStatus = 'pending';
        }
        
        items.push({
          id: "advert",
          label: "Advertisement Submission",
          completed: exhibitor.advert_submission_approved === true && hasAdvertSubmission,
          deadline: new Date(eventSettings.advert_submission_deadline).toLocaleDateString(),
          requiresUpload: true,
          uploadType: "advert",
          managerEmail: csManager?.email,
          managerName: csManager?.name,
          approvalStatus: advertApprovalStatus,
        });
      }

      const completedCount = items.filter(item => item.completed).length;
      const percentage = Math.round((completedCount / items.length) * 100);

      return { items, percentage, exhibitor, csManager };
    },
    refetchInterval: 30000,
  });

  const { data: changeStatus } = useQuery({
    queryKey: ["exhibitor-change-status", exhibitorId],
    queryFn: async () => {
      const [exhibitorChanges, productChanges, socialChanges, addressChanges, contactChanges] = await Promise.all([
        supabase.from("exhibitors").select("approval_status, pending_changes").eq("id", exhibitorId).maybeSingle(),
        supabase.from("exhibitor_products").select("approval_status, pending_changes, product_name").eq("exhibitor_id", exhibitorId),
        supabase.from("exhibitor_social_media").select("approval_status, pending_changes").eq("exhibitor_id", exhibitorId).maybeSingle(),
        supabase.from("exhibitor_address").select("approval_status, pending_changes").eq("exhibitor_id", exhibitorId).maybeSingle(),
        supabase.from("exhibitor_contacts").select("approval_status, pending_changes, full_name").eq("exhibitor_id", exhibitorId),
      ]);

      const hasPending = [
        exhibitorChanges.data?.approval_status,
        ...(productChanges.data || []).map(p => p.approval_status),
        socialChanges.data?.approval_status,
        addressChanges.data?.approval_status,
        ...(contactChanges.data || []).map(c => c.approval_status),
      ].some(status => status === "pending_approval");

      const hasRejected = [
        exhibitorChanges.data?.approval_status,
        ...(productChanges.data || []).map(p => p.approval_status),
        socialChanges.data?.approval_status,
        addressChanges.data?.approval_status,
        ...(contactChanges.data || []).map(c => c.approval_status),
      ].some(status => status === "rejected");

      const rejectedChanges: RejectedChange[] = [];

      if (exhibitorChanges.data?.approval_status === "rejected") {
        const changes = exhibitorChanges.data.pending_changes as Record<string, unknown> | null;
        if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
          Object.keys(changes).forEach(key => {
            rejectedChanges.push({
              type: "Company Information",
              fieldName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              submittedValue: String(changes[key] ?? ''),
            });
          });
        } else {
          rejectedChanges.push({
            type: "Company Information",
            fieldName: "Changes to your company information were rejected",
            submittedValue: "",
          });
        }
      }

      if (socialChanges.data?.approval_status === "rejected") {
        const changes = socialChanges.data.pending_changes as Record<string, unknown> | null;
        if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
          Object.keys(changes).forEach(key => rejectedChanges.push({ type: "Social Media", fieldName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), submittedValue: String(changes[key] ?? '') }));
        } else {
          rejectedChanges.push({ type: "Social Media", fieldName: "Changes to your social media links were rejected", submittedValue: "" });
        }
      }

      if (addressChanges.data?.approval_status === "rejected") {
        const changes = addressChanges.data.pending_changes as Record<string, unknown> | null;
        if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
          Object.keys(changes).forEach(key => rejectedChanges.push({ type: "Address", fieldName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), submittedValue: String(changes[key] ?? '') }));
        } else {
          rejectedChanges.push({ type: "Address", fieldName: "Changes to your company address were rejected", submittedValue: "" });
        }
      }

      (productChanges.data || []).forEach(product => {
        if (product.approval_status === "rejected") {
          const changes = product.pending_changes as Record<string, unknown> | null;
          if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
            Object.keys(changes).forEach(key => rejectedChanges.push({ type: "Product/Service", fieldName: `${product.product_name} - ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, submittedValue: String(changes[key] ?? '') }));
          } else {
            rejectedChanges.push({ type: "Product/Service", fieldName: `Changes to ${product.product_name} were rejected`, submittedValue: "" });
          }
        }
      });

      (contactChanges.data || []).forEach(contact => {
        if (contact.approval_status === "rejected") {
          const changes = contact.pending_changes as Record<string, unknown> | null;
          if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
            Object.keys(changes).forEach(key => rejectedChanges.push({ type: "Contact", fieldName: `${contact.full_name} - ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, submittedValue: String(changes[key] ?? '') }));
          } else {
            rejectedChanges.push({ type: "Contact", fieldName: `Changes to ${contact.full_name} contact information were rejected`, submittedValue: "" });
          }
        }
      });

      return { hasPending, hasRejected, rejectedChanges };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-2 w-full" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!exhibitorData) return null;

  const { items, percentage, exhibitor, csManager } = exhibitorData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-sm text-muted-foreground">{percentage === 100 ? "Great! Your profile is complete." : "Complete all sections to maximize your visibility."}</p>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${!item.completed ? 'cursor-pointer' : ''}`}
              onClick={() => handleCardClick(item)}
            >
              <div className="mt-0.5">{item.completed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-sm">{item.label}</h4>
                  <div className="flex items-center gap-2">
                    {item.approvalStatus === 'pending' && (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {item.approvalStatus === 'rejected' && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/exhibitor-portal/contact');
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Contact us
                        </button>
                      </div>
                    )}
                    {!item.approvalStatus && (
                      item.completed ? (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800">Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 dark:bg-gray-950/20 text-gray-600 border-gray-200 dark:border-gray-800">Missing</Badge>
                      )
                    )}
                  </div>
                </div>
                {item.deadline && <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Due: {item.deadline}</p>}
              </div>
              {!item.completed && item.requiresUpload && item.approvalStatus !== 'pending' && item.approvalStatus !== 'rejected' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUploadItem(item);
                    setUploadModalOpen(true);
                  }}
                >
                  Upload<ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}

            </div>
          ))}
        </div>
      </CardContent>

      {selectedUploadItem && (
        <ExhibitorSubmissionUpload exhibitorId={exhibitorId} exhibitorName={exhibitor.name} submissionType={selectedUploadItem.uploadType!} managerEmail={selectedUploadItem.managerEmail!} managerName={selectedUploadItem.managerName!} open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUploadComplete={() => {}} />
      )}

      <Dialog open={rejectedDialogOpen} onOpenChange={setRejectedDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rejected Changes</DialogTitle>
            <DialogDescription>The following changes were rejected and need your attention:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {changeStatus?.rejectedChanges.map((change, index) => (
              <div key={index} className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-red-900 dark:text-red-100">{change.type}</div>
                    <div className="text-sm text-red-800 dark:text-red-200">{change.fieldName}</div>
                    {change.submittedValue && (
                      <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                        <span className="font-medium">Your submission: </span>
                        <span className="italic">{change.submittedValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            {csManager && csManager.show_email !== false && (
              <Button variant="outline" onClick={() => window.location.href = `mailto:${csManager.email}`}>
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            )}
            <Button onClick={() => setRejectedDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
