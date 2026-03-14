import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageUploadButton } from "@/components/blog/ImageUploadButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Loader2, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
}

export const AdminBlogPosts = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image_url: "",
    status: "draft",
    seo_title: "",
    seo_description: "",
    tags: "",
    custom_prompt: "",
  });

  const { data: blogPosts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const addPostMutation = useMutation({
    mutationFn: async (post: typeof formData) => {
      const { data, error } = await supabase.from("blog_posts").insert([{
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        content: post.content,
        featured_image_url: post.featured_image_url || null,
        status: post.status,
        published_at: post.status === 'published' ? new Date().toISOString() : null,
        seo_title: post.seo_title || null,
        seo_description: post.seo_description || null,
        tags: post.tags ? post.tags.split(',').map(t => t.trim()) : null,
      }]).select().maybeSingle();
      if (error) throw error;
      return data as BlogPost | null;
    },
    onSuccess: async (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post created successfully");
      const hadManualImage = !!formData.featured_image_url;
      resetForm();
      setIsDialogOpen(false);
      
      // Only auto-generate AI image if no image was manually provided
      if (newPost && !hadManualImage) {
        toast.info("Generating AI image...");
        try {
          await generateImageMutation.mutateAsync({ post: newPost });
        } catch (error) {
          console.error("Failed to generate image:", error);
        }
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create blog post';
      toast.error(message);
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, post }: { id: string; post: typeof formData }) => {
      const updateData: {
        title: string;
        slug: string;
        excerpt: string | null;
        content: string;
        featured_image_url: string | null;
        status: string;
        seo_title: string | null;
        seo_description: string | null;
        tags: string[] | null;
        published_at?: string | null;
      } = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        content: post.content,
        featured_image_url: post.featured_image_url || null,
        status: post.status,
        seo_title: post.seo_title || null,
        seo_description: post.seo_description || null,
        tags: post.tags ? post.tags.split(',').map(t => t.trim()) : null,
      };

      // Set published_at when status is published (if not already set or when changing to published)
      if (post.status === 'published') {
        if (!editingPost?.published_at || editingPost?.status !== 'published') {
          updateData.published_at = new Date().toISOString();
        }
      } else {
        // Clear published_at if changing back to draft
        updateData.published_at = null;
      }

      const { error } = await supabase
        .from("blog_posts")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update blog post';
      toast.error(message);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post deleted successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete blog post';
      toast.error(message);
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async (params: { post: BlogPost; customPrompt?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-blog-image', {
        body: { 
          postId: params.post.id,
          title: params.post.title,
          slug: params.post.slug,
          customPrompt: params.customPrompt
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      
      // Update form data with new image URL immediately
      if (data?.imageUrl) {
        setFormData(prev => ({ ...prev, featured_image_url: data.imageUrl, custom_prompt: "" }));
      }
      
      // Then invalidate queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Featured image generated successfully");
    },
    onError: (error) => {
      console.error('Image generation error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate image';
      toast.error(message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featured_image_url: "",
      status: "draft",
      seo_title: "",
      seo_description: "",
      tags: "",
      custom_prompt: "",
    });
    setEditingPost(null);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      featured_image_url: post.featured_image_url || "",
      status: post.status,
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      tags: post.tags ? post.tags.join(", ") : "",
      custom_prompt: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      updatePostMutation.mutate({ id: editingPost.id, post: formData });
    } else {
      addPostMutation.mutate(formData);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Blog Posts</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Blog Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Blog Post" : "Add New Blog Post"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="blog-post-url"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured_image_url">Featured Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="featured_image_url"
                    type="url"
                    value={formData.featured_image_url}
                    onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                    placeholder="Or paste image URL"
                  />
                  <ImageUploadButton
                    onImageUploaded={(url) => setFormData({ ...formData, featured_image_url: url })}
                    buttonText="Upload"
                  />
                  {formData.featured_image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, featured_image_url: "" })}
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                
                {editingPost && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="custom_prompt">AI Image Prompt (Optional)</Label>
                    <Textarea
                      id="custom_prompt"
                      value={formData.custom_prompt}
                      onChange={(e) => setFormData({ ...formData, custom_prompt: e.target.value })}
                      placeholder="Leave empty to auto-generate based on title, or write a custom prompt..."
                      rows={2}
                      maxLength={500}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateImageMutation.mutate({ 
                        post: editingPost, 
                        customPrompt: formData.custom_prompt.trim() || undefined 
                      })}
                      disabled={generateImageMutation.isPending}
                      className="w-full"
                    >
                      {generateImageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4 mr-2" />
                      )}
                      {generateImageMutation.isPending ? "Generating..." : "Generate AI Image"}
                    </Button>
                  </div>
                )}
                
                {formData.featured_image_url && (
                  <img
                    src={formData.featured_image_url}
                    alt="Featured image preview"
                    className="mt-2 max-h-48 rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Input
                    id="seo_description"
                    value={formData.seo_description}
                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addPostMutation.isPending || updatePostMutation.isPending}>
                  {(addPostMutation.isPending || updatePostMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPost ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogPosts?.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>{post.slug}</TableCell>
                <TableCell>
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                    {post.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(post)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this blog post?")) {
                          deletePostMutation.mutate(post.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {blogPosts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No blog posts yet. Create your first blog post!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
