import { useState, useEffect, useRef } from "react";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, Image as ImageIcon, Video, ExternalLink, Upload, Loader2, ArrowLeft, Edit, FileText, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminMediaExport } from "@/components/AdminMediaExport";

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  created_at: string;
  uploaded_by: string | null;
}

interface ExhibitorMediaItem {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
}

interface SpeakerMediaItem {
  id: string;
  name: string;
  photo_url: string | null;
  company_logo_url: string | null;
}

const AdminMediaLibrary = () => {
  const [activeTab, setActiveTab] = useState<string>("website");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [exhibitorMedia, setExhibitorMedia] = useState<ExhibitorMediaItem[]>([]);
  const [speakerMedia, setSpeakerMedia] = useState<SpeakerMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({
    file_name: '',
    title: '',
    description: '',
    alt_text: ''
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the media library",
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
      toast({
        title: "Error",
        description: "Failed to verify admin status",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast({
        title: "Access denied",
        description: "You must be an admin to access the media library",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadAllLibraries();
  };

  const loadAllLibraries = async () => {
    setIsLoading(true);
    await Promise.all([
      loadMediaLibrary(),
      loadExhibitorMedia(),
      loadSpeakerMedia()
    ]);
    setIsLoading(false);
  };

  const loadMediaLibrary = async () => {
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive",
      });
    } else {
      setMediaItems(data || []);
    }
  };

  const loadExhibitorMedia = async () => {
    const { data, error } = await supabase
      .from('exhibitors')
      .select('id, name, logo_url, banner_url')
      .order('name', { ascending: true });

    if (!error) {
      setExhibitorMedia(data || []);
    }
  };

  const loadSpeakerMedia = async () => {
    const { data, error } = await supabase
      .from('speakers')
      .select('id, name, photo_url, company_logo_url')
      .order('name', { ascending: true });

    if (!error) {
      setSpeakerMedia(data || []);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      // Extract the file path from the URL
      const urlParts = deleteItem.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('media-library')
        .remove([fileName]);

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_library')
        .delete()
        .eq('id', deleteItem.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Media item deleted successfully",
      });

      loadMediaLibrary();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete media item",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteItem(null);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditForm({
      file_name: item.file_name,
      title: item.title || '',
      description: item.description || '',
      alt_text: item.alt_text || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setIsUploading(true);

      const { error } = await supabase
        .from('media_library')
        .update({
          file_name: editForm.file_name,
          title: editForm.title || null,
          description: editForm.description || null,
          alt_text: editForm.alt_text || null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media updated successfully",
      });
      setEditingItem(null);
      loadMediaLibrary();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update media",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];

    try {
      // Validate file type - allow images, PDFs, and videos
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isPDF && !isVideo) {
        toast({
          title: "Error",
          description: "Only image, PDF, and video files are allowed",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB for videos, 10MB for others)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `File size must be less than ${isVideo ? '50MB' : '10MB'}`,
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(fileName);

      // Add to database
      const { error: dbError } = await supabase
        .from('media_library')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          file_type: isVideo ? 'video' : isPDF ? 'document' : 'image',
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      toast({
        title: "Success",
        description: `${isVideo ? 'Video' : isPDF ? 'PDF' : 'Image'} uploaded successfully`,
      });

      await loadMediaLibrary();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleCopyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.file_url);
      setCopiedId(item.id);
      toast({
        title: "Success",
        description: "URL copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DynamicHelmet titlePrefix="Media Library - Admin" noIndex />

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 pt-[168px] md:pt-[152px]">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Media Library</h1>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-4">
                <p className="text-muted-foreground">
                  Manage all images, PDFs, and videos (MP4, MOV) across the website
                </p>
                <Button onClick={() => navigate('/admin')} variant="outline" className="flex-shrink-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
              </div>
            </div>

            {/* Export Component */}
            <div className="mb-8">
              <AdminMediaExport />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                <TabsTrigger value="website">Website Library</TabsTrigger>
                <TabsTrigger value="exhibitors">Exhibitors Library</TabsTrigger>
                <TabsTrigger value="speakers">Speakers Library</TabsTrigger>
              </TabsList>

              <TabsContent value="website">
                <div className="mb-4 flex justify-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,video/mp4,video/quicktime"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={handleUploadClick}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Media
                      </>
                    )}
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading media library...</p>
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No media items yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload images through the button above
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-lg overflow-hidden border bg-card hover:shadow-lg transition-all"
                  >
                    <div className="aspect-square relative bg-muted">
                      {item.file_type === 'image' ? (
                        <img
                          src={item.file_url}
                          alt={item.file_name}
                          className="w-full h-full object-contain"
                        />
                      ) : item.file_type === 'document' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                        </div>
                      ) : item.file_type === 'video' ? (
                        <video
                          src={item.file_url}
                          className="w-full h-full object-contain"
                          controls
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCopyUrl(item)}
                          title="Copy URL"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(item)}
                          title="Edit details"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(item.file_url, '_blank')}
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteItem(item)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {item.file_type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        ) : item.file_type === 'document' ? (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Video className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {item.title || item.file_name}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file_size)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exhibitors">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading exhibitor media...</p>
              </div>
            ) : exhibitorMedia.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No exhibitor media yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exhibitorMedia.map((exhibitor) => (
                  <div key={exhibitor.id} className="border rounded-lg p-4 bg-card">
                    <h4 className="font-semibold mb-4 text-lg truncate">{exhibitor.name}</h4>
                    <div className="space-y-4">
                      {exhibitor.logo_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Logo</p>
                          <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                            <img
                              src={exhibitor.logo_url}
                              alt={`${exhibitor.name} logo`}
                              className="w-full h-full object-contain p-4"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(exhibitor.logo_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      )}
                      {exhibitor.banner_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Banner</p>
                          <div className="aspect-[2/1] relative bg-muted rounded-md overflow-hidden">
                            <img
                              src={exhibitor.banner_url}
                              alt={`${exhibitor.name} banner`}
                              className="w-full h-full object-contain p-4"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(exhibitor.banner_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="speakers">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading speaker media...</p>
              </div>
            ) : speakerMedia.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No speaker media yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {speakerMedia.map((speaker) => (
                  <div key={speaker.id} className="border rounded-lg p-4 bg-card">
                    <h4 className="font-semibold mb-4 text-lg truncate">{speaker.name}</h4>
                    <div className="space-y-4">
                      {speaker.photo_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Headshot</p>
                          <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                            <img
                              src={speaker.photo_url}
                              alt={`${speaker.name} headshot`}
                              className="w-full h-full object-contain p-4"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(speaker.photo_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      )}
                      {speaker.company_logo_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Company Logo</p>
                          <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                            <img
                              src={speaker.company_logo_url}
                              alt={`${speaker.name} company logo`}
                              className="w-full h-full object-contain p-4"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(speaker.company_logo_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
          </div>
        </main>

        <Footer />
      </div>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingItem && editingItem.file_type === 'image' && (
              <div className="w-full aspect-video bg-muted rounded overflow-hidden">
                <img 
                  src={editingItem.file_url} 
                  alt={editForm.alt_text || editForm.file_name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="file_name">File Name</Label>
              <Input
                id="file_name"
                value={editForm.file_name}
                onChange={(e) => setEditForm({ ...editForm, file_name: e.target.value })}
                placeholder="Enter file name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (SEO)</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Enter SEO title"
              />
              <p className="text-xs text-muted-foreground">
                Used as the display name in the media library
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_text">Alt Text (SEO)</Label>
              <Input
                id="alt_text"
                value={editForm.alt_text}
                onChange={(e) => setEditForm({ ...editForm, alt_text: e.target.value })}
                placeholder="Describe the image for accessibility"
              />
              <p className="text-xs text-muted-foreground">
                Important for accessibility and SEO
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (SEO)</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter SEO description"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Helps search engines understand the content
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUploading}
            >
              {isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMediaLibrary;
