import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Mail, CheckCircle2, Eye, Clock, Ban, ShieldBan } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Inquiry {
  id: string;
  exhibitor_id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_company: string | null;
  visitor_phone: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  exhibitors?: {
    id: string;
    name: string;
    booth_number: string | null;
  };
}

const PAGE_SIZE = 10;

export const AdminModeration = () => {
  const queryClient = useQueryClient();
  const [previewInquiry, setPreviewInquiry] = useState<Inquiry | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [rejectInquiry, setRejectInquiry] = useState<Inquiry | null>(null);
  const [blockSender, setBlockSender] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitor_inquiries")
        .select(`*, exhibitors (id, name, booth_number)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inquiry[];
    },
  });

  const { data: blockedEmails } = useQuery({
    queryKey: ["blocked-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_inquiry_emails")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const blockedEmailSet = new Set(
    (blockedEmails || []).map((b: { email: string }) => b.email.toLowerCase())
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("exhibitor_inquiries")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const approveMutation = useMutation({
    mutationFn: async (inquiry: Inquiry) => {
      // Update status to 'new' (approved)
      const { error } = await supabase
        .from("exhibitor_inquiries")
        .update({ status: "new", updated_at: new Date().toISOString() })
        .eq("id", inquiry.id);
      if (error) throw error;

      // Send notification email to exhibitor
      const { error: emailError } = await supabase.functions.invoke(
        "send-inquiry-notification",
        {
          body: {
            inquiryId: inquiry.id,
            exhibitorId: inquiry.exhibitor_id,
            visitorName: inquiry.visitor_name,
            visitorEmail: inquiry.visitor_email,
            visitorCompany: inquiry.visitor_company,
            visitorPhone: inquiry.visitor_phone,
            message: inquiry.message,
          },
        }
      );
      if (emailError) {
        console.error("Email notification error:", emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
      toast.success("Inquiry approved and exhibitor notified");
    },
    onError: () => toast.error("Failed to approve inquiry"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, email, block }: { id: string; email: string; block: boolean }) => {
      if (block) {
        const { error: blockError } = await supabase
          .from("blocked_inquiry_emails")
          .insert({ email: email.toLowerCase().trim() });
        if (blockError) throw blockError;
        // Trigger auto-rejects other pending inquiries from this email
      }
      const { error } = await supabase
        .from("exhibitor_inquiries")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-emails"] });
      queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
      toast.success("Inquiry rejected");
      setRejectInquiry(null);
      setBlockSender(false);
    },
    onError: () => toast.error("Failed to reject inquiry"),
  });

  const unblockMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from("blocked_inquiry_emails")
        .delete()
        .eq("email", email.toLowerCase().trim());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-emails"] });
      toast.success("Email unblocked");
    },
    onError: () => toast.error("Failed to unblock email"),
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("exhibitor_inquiries")
        .update({ admin_notes: notes, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      toast.success("Notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const deleteInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("exhibitor_inquiries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
      toast.success("Inquiry deleted");
    },
    onError: () => toast.error("Failed to delete inquiry"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "new":
        return <Badge variant="default">Approved</Badge>;
      case "read":
        return <Badge variant="outline" className="border-primary text-primary">Read</Badge>;
      case "responded":
        return <Badge variant="secondary" className="bg-accent text-accent-foreground">Responded</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalInquiries = inquiries?.length || 0;
  const pendingInquiries = inquiries?.filter(i => i.status === "pending").length || 0;
  const approvedInquiries = inquiries?.filter(i => i.status === "new").length || 0;
  const rejectedInquiries = inquiries?.filter(i => i.status === "rejected").length || 0;

  const filteredInquiries = (inquiries || []).filter(i => {
    if (activeFilter === "pending") return i.status === "pending";
    if (activeFilter === "approved") return i.status === "new";
    if (activeFilter === "rejected") return i.status === "rejected";
    return true;
  });

  const totalPages = Math.ceil(filteredInquiries.length / PAGE_SIZE);
  const paginatedInquiries = filteredInquiries.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleStatusChange = (inquiry: Inquiry, newStatus: string) => {
    if (newStatus === "new" && inquiry.status === "pending") {
      approveMutation.mutate(inquiry);
    } else if (newStatus === "rejected") {
      setRejectInquiry(inquiry);
      setBlockSender(false);
    } else {
      updateStatusMutation.mutate({ id: inquiry.id, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInquiries}</div>
          </CardContent>
        </Card>

        <Card className={pendingInquiries > 0 ? "border-accent" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-foreground" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{pendingInquiries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{approvedInquiries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedInquiries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setCurrentPage(0); }}>
        <TabsList>
          <TabsTrigger value="all">All ({totalInquiries})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInquiries})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedInquiries})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedInquiries})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiry Moderation</CardTitle>
          <CardDescription>Review, approve, or reject visitor inquiries before they reach exhibitors</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inquiries...</div>
          ) : paginatedInquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No inquiries found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Date</TableHead>
                    <TableHead className="w-[80px]">Visitor</TableHead>
                    <TableHead className="w-[140px]">Email</TableHead>
                    <TableHead className="w-[80px]">Company</TableHead>
                    <TableHead className="w-[110px]">Exhibitor</TableHead>
                    <TableHead className="w-[120px]">Message</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInquiries.map((inquiry) => (
                    <TableRow key={inquiry.id} className={inquiry.status === "pending" ? "bg-accent/50" : ""}>
                      <TableCell className="text-xs truncate">
                        {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium text-sm truncate">{inquiry.visitor_name}</TableCell>
                      <TableCell className="truncate">
                        <div className="flex items-center gap-1">
                          <a href={`mailto:${inquiry.visitor_email}`} className="text-primary hover:underline flex items-center gap-1 truncate text-sm">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{inquiry.visitor_email}</span>
                          </a>
                          {blockedEmailSet.has(inquiry.visitor_email.toLowerCase()) && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 shrink-0">Blocked</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm truncate">{inquiry.visitor_company || "-"}</TableCell>
                      <TableCell className="truncate">
                        <div>
                          <div className="font-medium text-sm truncate">{inquiry.exhibitors?.name}</div>
                          {inquiry.exhibitors?.booth_number && (
                            <div className="text-xs text-muted-foreground truncate">Booth {inquiry.exhibitors.booth_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="truncate text-sm" title={inquiry.message}>{inquiry.message}</TableCell>
                      <TableCell>
                        <Select value={inquiry.status} onValueChange={(value) => handleStatusChange(inquiry, value)}>
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="new">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewInquiry(inquiry)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Inquiry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this inquiry from {inquiry.visitor_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteInquiryMutation.mutate(inquiry.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredInquiries.length)} of {filteredInquiries.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectInquiry} onOpenChange={(open) => { if (!open) { setRejectInquiry(null); setBlockSender(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Inquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Reject the inquiry from <strong>{rejectInquiry?.visitor_name}</strong> ({rejectInquiry?.visitor_email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox id="block-sender" checked={blockSender} onCheckedChange={(c) => setBlockSender(!!c)} />
            <label htmlFor="block-sender" className="text-sm font-medium leading-none">
              Block this sender from submitting future inquiries
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectInquiry) {
                  rejectMutation.mutate({ id: rejectInquiry.id, email: rejectInquiry.visitor_email, block: blockSender });
                }
              }}
            >Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!previewInquiry} onOpenChange={(open) => { if (!open) setPreviewInquiry(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>Review and moderate this inquiry</DialogDescription>
          </DialogHeader>
          {previewInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Visitor</p>
                  <p className="text-sm">{previewInquiry.visitor_name}</p>
                  <p className="text-sm text-muted-foreground">{previewInquiry.visitor_email}</p>
                  {previewInquiry.visitor_company && <p className="text-xs text-muted-foreground">{previewInquiry.visitor_company}</p>}
                  {previewInquiry.visitor_phone && <p className="text-xs text-muted-foreground">{previewInquiry.visitor_phone}</p>}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exhibitor</p>
                  <p className="text-sm">{previewInquiry.exhibitors?.name}</p>
                  {previewInquiry.exhibitors?.booth_number && (
                    <p className="text-xs text-muted-foreground">Booth {previewInquiry.exhibitors.booth_number}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(previewInquiry.status)}</div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{previewInquiry.message}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Admin Notes</p>
                <Textarea
                  rows={3}
                  value={editingNotes[previewInquiry.id] ?? previewInquiry.admin_notes ?? ""}
                  onChange={(e) => setEditingNotes(prev => ({ ...prev, [previewInquiry.id]: e.target.value }))}
                  placeholder="Internal notes..."
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => saveNotesMutation.mutate({
                    id: previewInquiry.id,
                    notes: editingNotes[previewInquiry.id] ?? previewInquiry.admin_notes ?? "",
                  })}
                >Save Notes</Button>
              </div>

              {/* Action buttons for pending inquiries */}
              {previewInquiry.status === "pending" && (
                <div className="border-t pt-4 flex gap-2">
                  <Button onClick={() => { approveMutation.mutate(previewInquiry); setPreviewInquiry(null); }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    updateStatusMutation.mutate({ id: previewInquiry.id, status: "rejected" });
                    setPreviewInquiry(null);
                  }}>
                    <Ban className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    rejectMutation.mutate({ id: previewInquiry.id, email: previewInquiry.visitor_email, block: true });
                    setPreviewInquiry(null);
                  }}>
                    <ShieldBan className="h-4 w-4 mr-1" /> Block & Reject
                  </Button>
                </div>
              )}

              {/* Unblock button if email is blocked */}
              {blockedEmailSet.has(previewInquiry.visitor_email.toLowerCase()) && (
                <div className="border-t pt-4">
                  <Button variant="outline" onClick={() => unblockMutation.mutate(previewInquiry.visitor_email)}>
                    Unblock Email
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
