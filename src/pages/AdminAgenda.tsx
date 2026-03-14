import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Users, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import SpeakerDetailDialog from "@/components/SpeakerDetailDialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  room: string | null;
  session_type: string | null;
  capacity: number | null;
  status: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

interface SessionSpeaker {
  session_id: string;
  speaker_id: string;
  speaker_order: number;
}

const AdminAgenda = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    seminar_title: string;
    seminar_description: string | null;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    room: string | null;
    session_type: string | null;
    status: string;
  } | null>(null);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDraftDialogOpen, setDeleteDraftDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [sourceDraftId, setSourceDraftId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    session_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    room: "",
    session_type: "",
    capacity: "",
    status: "draft",
  });

  // Fetch sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["agenda-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_sessions")
        .select("*")
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Session[];
    },
  });

  // Fetch draft sessions
  const { data: draftSessions, isLoading: draftSessionsLoading } = useQuery({
    queryKey: ["draft-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draft_sessions")
        .select(`
          *,
          speaker:speakers(name, title, company)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch speakers
  const { data: speakers } = useQuery({
    queryKey: ["speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Speaker[];
    },
  });

  // Fetch session speakers
  const { data: sessionSpeakers } = useQuery({
    queryKey: ["session-speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_speakers")
        .select("*");

      if (error) throw error;
      return data as SessionSpeaker[];
    },
  });

  // Set up realtime subscription for draft sessions
  React.useEffect(() => {
    const channel = supabase
      .channel('admin-draft-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draft_sessions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["draft-sessions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create/Update session mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // If editing a draft, update the draft_sessions table
      if (editingDraft) {
        const draftData = {
          seminar_title: formData.title,
          seminar_description: formData.description || null,
          session_date: formData.session_date || null,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          venue: formData.venue || null,
          room: formData.room || null,
          session_type: formData.session_type || null,
          status: formData.status,
        };

        const { error } = await supabase
          .from("draft_sessions")
          .update(draftData)
          .eq("id", editingDraft.id);

        if (error) throw error;
        return;
      }

      const sessionData = {
        title: formData.title,
        description: formData.description || null,
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue,
        room: formData.room || null,
        session_type: formData.session_type || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        status: formData.status,
      };

      let sessionId: string;

      if (editingSession) {
        const { error } = await supabase
          .from("agenda_sessions")
          .update(sessionData)
          .eq("id", editingSession.id);

        if (error) throw error;
        sessionId = editingSession.id;
      } else {
        const { data, error } = await supabase
          .from("agenda_sessions")
          .insert(sessionData)
          .select()
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Failed to create session");
        sessionId = data.id;

        // If this session was created from a draft, delete the draft
        if (sourceDraftId) {
          const { error: deleteError } = await supabase
            .from("draft_sessions")
            .delete()
            .eq("id", sourceDraftId);

          if (deleteError) throw deleteError;
        }
      }

      // Update session speakers
      // First, delete existing speakers for this session
      await supabase
        .from("session_speakers")
        .delete()
        .eq("session_id", sessionId);

      // Then, insert new speakers
      if (selectedSpeakers.length > 0) {
        const speakerData = selectedSpeakers.map((speakerId, index) => ({
          session_id: sessionId,
          speaker_id: speakerId,
          speaker_order: index,
        }));

        const { error } = await supabase
          .from("session_speakers")
          .insert(speakerData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["draft-sessions"] });
      toast({
        title: "Success",
        description: editingDraft 
          ? "Draft updated successfully" 
          : editingSession 
          ? "Session updated successfully" 
          : "Session created successfully",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agenda_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-speakers"] });
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete draft session mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("draft_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft-sessions"] });
      toast({
        title: "Success",
        description: "Draft session deleted successfully",
      });
      setDeleteDraftDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || "",
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      venue: session.venue,
      room: session.room || "",
      session_type: session.session_type || "",
      capacity: session.capacity?.toString() || "",
      status: session.status,
    });

    // Load speakers for this session
    const speakers = sessionSpeakers
      ?.filter((ss) => ss.session_id === session.id)
      .map((ss) => ss.speaker_id) || [];
    setSelectedSpeakers(speakers);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSession(null);
    setEditingDraft(null);
    setSourceDraftId(null);
    setFormData({
      title: "",
      description: "",
      session_date: "",
      start_time: "",
      end_time: "",
      venue: "",
      room: "",
      session_type: "",
      capacity: "",
      status: "draft",
    });
    setSelectedSpeakers([]);
    setSpeakerSearch("");
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setSelectedSpeakers((prev) =>
      prev.includes(speakerId)
        ? prev.filter((id) => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const getSpeakersForSession = (sessionId: string) => {
    const speakerIds = sessionSpeakers
      ?.filter((ss) => ss.session_id === sessionId)
      .sort((a, b) => a.speaker_order - b.speaker_order)
      .map((ss) => ss.speaker_id) || [];

    return speakers?.filter((s) => speakerIds.includes(s.id)) || [];
  };

  // Filter speakers based on search
  const filteredSpeakers = speakers?.filter((speaker) => {
    if (!speakerSearch) return true;
    const search = speakerSearch.toLowerCase();
    return (
      speaker.name.toLowerCase().includes(search) ||
      speaker.title?.toLowerCase().includes(search) ||
      speaker.company?.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-32">
          <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Agenda</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>
        
        {/* Draft Sessions Section */}
        {draftSessions && draftSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Draft Sessions From Speaker Forms</h2>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Speaker</TableHead>
                    <TableHead>Seminar Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftSessions.map((draft) => (
                    <TableRow key={draft.id}>
                      <TableCell>
                        <div className="font-medium">{draft.speaker?.name || 'Unknown'}</div>
                        {draft.speaker?.title && draft.speaker?.company && (
                          <div className="text-sm text-muted-foreground">
                            {draft.speaker.title}, {draft.speaker.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{draft.seminar_title || 'No title'}</div>
                        {draft.seminar_description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {draft.seminar_description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                          {draft.status || 'Draft'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {draft.created_at && format(new Date(draft.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDraft(draft);
                              setFormData({
                                title: draft.seminar_title || '',
                                description: draft.seminar_description || '',
                                session_date: draft.session_date || '',
                                start_time: draft.start_time || '',
                                end_time: draft.end_time || '',
                                venue: draft.venue || '',
                                room: draft.room || '',
                                session_type: draft.session_type || '',
                                capacity: '',
                                status: 'draft',
                              });
                              if (draft.speaker_id) {
                                setSelectedSpeakers([draft.speaker_id]);
                              }
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Draft
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSourceDraftId(draft.id);
                              setFormData({
                                title: draft.seminar_title || '',
                                description: draft.seminar_description || '',
                                session_date: draft.session_date || '',
                                start_time: draft.start_time || '',
                                end_time: draft.end_time || '',
                                venue: draft.venue || '',
                                room: draft.room || '',
                                session_type: draft.session_type || '',
                                capacity: '',
                                status: 'draft',
                              });
                              if (draft.speaker_id) {
                                setSelectedSpeakers([draft.speaker_id]);
                              }
                              setIsDialogOpen(true);
                            }}
                          >
                            Create Session
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemToDelete(draft.id);
                              setDeleteDraftDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Published & Draft Sessions</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDraft 
                  ? "Edit Draft Session" 
                  : editingSession 
                  ? "Edit Session" 
                  : "Add New Session"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Session Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter session title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Enter session description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_date">Date *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, session_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="session_type">Session Type</Label>
                  <Input
                    id="session_type"
                    value={formData.session_type}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, session_type: e.target.value }))
                    }
                    placeholder="e.g., Keynote, Workshop"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, start_time: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, end_time: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, venue: e.target.value }))
                    }
                    placeholder="e.g., Main Hall"
                  />
                </div>
                <div>
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    value={formData.room}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, room: e.target.value }))
                    }
                    placeholder="e.g., Room 101"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, capacity: e.target.value }))
                  }
                  placeholder="Enter capacity"
                />
              </div>

              <div>
                <Label className="mb-2 block">
                  <Users className="inline mr-2 h-4 w-4" />
                  Assign Speakers
                </Label>
                <Input
                  type="text"
                  placeholder="Search speakers..."
                  value={speakerSearch}
                  onChange={(e) => setSpeakerSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                  {filteredSpeakers?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No speakers found</p>
                  ) : (
                    filteredSpeakers?.map((speaker) => (
                      <div key={speaker.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={speaker.id}
                          checked={selectedSpeakers.includes(speaker.id)}
                          onCheckedChange={() => handleSpeakerToggle(speaker.id)}
                        />
                        <label
                          htmlFor={speaker.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {speaker.name}
                          {speaker.title && speaker.company && (
                            <span className="text-muted-foreground ml-2">
                              ({speaker.title}, {speaker.company})
                            </span>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                {editingDraft ? (
                  <Button
                    onClick={() => {
                      setFormData({ ...formData, status: "draft" });
                      setTimeout(() => saveMutation.mutate(), 0);
                    }}
                    disabled={
                      !formData.title ||
                      saveMutation.isPending
                    }
                  >
                    {saveMutation.isPending ? "Updating..." : "Update Draft"}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({ ...formData, status: "draft" });
                        setTimeout(() => saveMutation.mutate(), 0);
                      }}
                      disabled={
                        !formData.title ||
                        !formData.session_date ||
                        !formData.start_time ||
                        !formData.end_time ||
                        !formData.venue ||
                        saveMutation.isPending
                      }
                    >
                      {saveMutation.isPending && formData.status === "draft" ? "Saving..." : "Save as Draft"}
                    </Button>
                    <Button
                      onClick={() => {
                        setFormData({ ...formData, status: "published" });
                        setTimeout(() => saveMutation.mutate(), 0);
                      }}
                      disabled={
                        !formData.title ||
                        !formData.session_date ||
                        !formData.start_time ||
                        !formData.end_time ||
                        !formData.venue ||
                        saveMutation.isPending
                      }
                    >
                      {saveMutation.isPending && formData.status === "published" ? "Publishing..." : "Save & Publish"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {sessionsLoading || draftSessionsLoading ? (
        <div className="text-center py-8">Loading sessions...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Speakers</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sessions yet. Click "Add Session" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                sessions?.map((session) => {
                  const sessionSpeakersList = getSpeakersForSession(session.id);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(session.session_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{session.title}</div>
                        {session.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {session.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{session.venue}</div>
                        {session.room && (
                          <div className="text-sm text-muted-foreground">{session.room}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {sessionSpeakersList.length > 0 ? (
                          <div className="text-sm space-y-1">
                            {sessionSpeakersList.map((speaker) => (
                              <button
                                key={speaker.id}
                                onClick={() => {
                                  setSelectedSpeaker(speaker);
                                  setSpeakerDialogOpen(true);
                                }}
                                className="block text-left hover:text-primary hover:underline transition-colors"
                              >
                                {speaker.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No speakers</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.session_type && (
                          <span className="text-sm">{session.session_type}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm px-2 py-1 rounded ${
                          session.status === "published" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {session.status === "published" ? "Published" : "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(session)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(session.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <SpeakerDetailDialog
        speaker={selectedSpeaker}
        open={speakerDialogOpen}
        onOpenChange={setSpeakerDialogOpen}
      />

      {/* Delete Session Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Draft Session Confirmation */}
      <AlertDialog open={deleteDraftDialogOpen} onOpenChange={setDeleteDraftDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteDraftMutation.mutate(itemToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminAgenda;
