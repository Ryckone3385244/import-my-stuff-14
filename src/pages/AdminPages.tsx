import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useNavigate, Link } from "react-router-dom";
import { validateRename, renamePage, toPageKey } from "@/lib/pageMigration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus, Image as ImageIcon, ExternalLink, ArrowLeft, Copy } from "lucide-react";
import { ImagePickerDialog } from "@/components/editable/ImagePickerDialog";

interface WebsitePage {
  id: string;
  page_name: string;
  page_url: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  is_active: boolean;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

const AdminPages = () => {
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPage, setEditingPage] = useState<WebsitePage | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"website" | "portal">("website");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { replacePlaceholders } = useEventSettingsContext();

  const [formData, setFormData] = useState({
    page_name: "",
    page_url: "",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    thumbnail_url: "",
    tags: "",
    is_active: true,
    status: "published" as 'published' | 'draft',
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
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
      console.error("Error fetching user roles:", roleError);
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast({
        title: "Access denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadPages();
  };

  const loadPages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('website_pages')
      .select('*')
      .order('page_url', { ascending: true });

    if (error) {
      console.error('Error loading pages:', error);
      toast({
        title: "Error",
        description: "Failed to load pages",
        variant: "destructive",
      });
    } else {
      setPages(data || []);
    }
    setIsLoading(false);
  };

  const handleEdit = (page: WebsitePage) => {
    setEditingPage(page);
    setFormData({
      page_name: page.page_name,
      page_url: page.page_url,
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      seo_keywords: page.seo_keywords || "",
      thumbnail_url: page.thumbnail_url || "",
      tags: page.tags?.join(", ") || "",
      is_active: page.is_active,
      status: page.status || "published",
    });
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingPage(null);
    setFormData({
      page_name: "",
      page_url: activeTab === "portal" ? "/exhibitor-portal/" : "/",
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
      thumbnail_url: "",
      tags: "",
      is_active: true,
      status: "published",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Auto-generate URL from page name if empty
      let pageUrl = formData.page_url.trim();
      if (!pageUrl) {
        const urlSlug = formData.page_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        pageUrl = activeTab === "portal" ? `/exhibitor-portal/${urlSlug}` : `/${urlSlug}`;
      }

      // Validate portal pages have correct URL prefix
      if (activeTab === "portal" && !pageUrl.startsWith('/exhibitor-portal/') && !pageUrl.startsWith('/exhibitor/')) {
        toast({
          title: "Invalid URL",
          description: "Portal pages must start with /exhibitor-portal/ or /exhibitor/",
          variant: "destructive",
        });
        return;
      }

      // Ensure URL starts with / and is lowercase (prevent case mismatches)
      if (!pageUrl.startsWith('/')) {
        pageUrl = '/' + pageUrl;
      }
      pageUrl = pageUrl.toLowerCase();

      const pageData = {
        page_name: formData.page_name,
        page_url: pageUrl,
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        seo_keywords: formData.seo_keywords || null,
        thumbnail_url: formData.thumbnail_url || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_active: formData.is_active,
        status: formData.status,
      };

      if (editingPage) {
        const urlChanged = editingPage.page_url !== pageUrl;

        // SAFEGUARD 1: Pre-Migration Validation (overwrite mode - always valid)
        if (urlChanged) {
          const validation = await validateRename(editingPage.page_url, pageUrl);
          // validation.valid is always true in v7 (overwrite mode)
          console.log(`[PageMigration] Validation passed for rename from "${editingPage.page_url}" to "${pageUrl}"`);
        }

        // SAFEGUARD 5: Atomic Operations - Start tracking failures
        const errors: string[] = [];

        // Update the website_pages record first
        const { error: pageError } = await supabase
          .from('website_pages')
          .update(pageData)
          .eq('id', editingPage.id);

        if (pageError) {
          toast({
            title: "Error",
            description: pageError.message,
            variant: "destructive",
          });
          return;
        }

        // SAFEGUARD 2 & 3 & 4: Strict Content Migration with SEO Redirect and Menu Sync
        if (urlChanged) {
          const migrationResult = await renamePage(editingPage.page_url, pageUrl);

          if (!migrationResult.success) {
            errors.push(`Content migration failed: ${migrationResult.error}`);
          }

          // Build success message with migration details
          const migrated = migrationResult.migrated;
          let migrationDetails = '';
          if (migrated) {
            const parts: string[] = [];
            if (migrated.pageContent > 0) parts.push(`${migrated.pageContent} content items`);
            if (migrated.sectionOrder > 0) parts.push(`${migrated.sectionOrder} sections`);
            if (migrated.columnOrder > 0) parts.push(`${migrated.columnOrder} columns`);
            if (migrated.menuItems > 0) parts.push(`${migrated.menuItems} menu links`);
            
            if (parts.length > 0) {
              migrationDetails = ` Migrated: ${parts.join(', ')}.`;
            }
          }

          // Update menu item labels that now point to this URL
          const menuTables = ['navbar_menu_items', 'footer_menu_items', 'portal_menu_items'] as const;
          for (const menuTable of menuTables) {
            await supabase
              .from(menuTable)
              .update({ label: formData.page_name })
              .eq('url', pageUrl);
          }

          // SAFEGUARD 5: Report any partial failures
          if (errors.length > 0) {
            toast({
              title: "Partial Success",
              description: `Page updated but some operations failed: ${errors.join('; ')}${migrationDetails}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: `Page URL changed from "${editingPage.page_url}" to "${pageUrl}".${migrationDetails}`,
            });
          }
        } else {
          // No URL change - just update menu labels
          const menuTables = ['navbar_menu_items', 'footer_menu_items', 'portal_menu_items'] as const;
          for (const menuTable of menuTables) {
            await supabase
              .from(menuTable)
              .update({ label: formData.page_name })
              .eq('url', pageUrl);
          }

          toast({
            title: "Success",
            description: "Page updated successfully.",
          });
        }
      } else {
        // Creating a new page
        const { error } = await supabase
          .from('website_pages')
          .insert([pageData])
          .select()
          .maybeSingle();

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Page created successfully. Add it to a menu from the Menu Management page.",
        });
      }

      setShowDialog(false);
      loadPages();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;

    // Get the page info before deleting to know which menu to update
    const { data: pageToDelete, error: pageError } = await supabase
      .from('website_pages')
      .select('page_url')
      .eq('id', id)
      .maybeSingle();
    
    if (pageError) {
      console.error("Error fetching page to delete:", pageError);
    }

    const { error } = await supabase
      .from('website_pages')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Also delete from all menus that reference this page
    if (pageToDelete) {
      const menuTables = ['navbar_menu_items', 'footer_menu_items', 'portal_menu_items'] as const;
      
      for (const menuTable of menuTables) {
        await supabase
          .from(menuTable)
          .delete()
          .eq('url', pageToDelete.page_url);
      }
    }

    toast({
      title: "Success",
      description: "Page deleted successfully. Menu items linking to this page have been removed.",
    });

    loadPages();
  };

  const handleImageSelect = (url: string) => {
    setFormData(prev => ({ ...prev, thumbnail_url: url }));
    setShowImagePicker(false);
  };

  const handleDuplicate = async (page: WebsitePage) => {
    if (!confirm(`Are you sure you want to duplicate "${page.page_name}"?`)) return;

    try {
      // Generate new page name and URL
      const newPageName = `${page.page_name} (Copy)`;
      const urlWithoutSlash = page.page_url.replace(/\/$/, '').replace(/^\//, '');
      const newPageUrl = `/${(urlWithoutSlash || 'home')}-copy`;

      // DynamicPage derives pageName from URL segments joined with '-'
      const toDynamicPageName = (pageUrl: string) =>
        pageUrl.split('/').filter(Boolean).join('-');

      const toContentPageName = (pageUrl: string) => {
        const trimmed = pageUrl.replace(/\/+$/, '');
        if (trimmed === '' || trimmed === '/') return 'home';
        return trimmed
          .replace(/^\//, '')
          .split('/')
          .filter(Boolean)
          .join('-')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      };

      const originalCandidates = Array.from(
        new Set(
          [toDynamicPageName(page.page_url), toContentPageName(page.page_url)].filter(
            (v): v is string => !!v
          )
        )
      );

      const newPageKey = toDynamicPageName(newPageUrl) || toContentPageName(newPageUrl);

      // Create new page entry
      const { data: newPage, error: pageError } = await supabase
        .from('website_pages')
        .insert({
          page_name: newPageName,
          page_url: newPageUrl,
          seo_title: page.seo_title ? `${page.seo_title} (Copy)` : null,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          thumbnail_url: page.thumbnail_url,
          tags: page.tags,
          is_active: false,
          status: 'draft',
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Fetch all original data
      const [sectionOrderRes, columnOrderRes, pageContentRes] = await Promise.all([
        supabase.from('page_section_order').select('*').in('page_name', originalCandidates),
        supabase.from('section_column_order').select('*').in('page_name', originalCandidates),
        supabase.from('page_content').select('*').in('page_name', originalCandidates),
      ]);

      if (sectionOrderRes.error) throw sectionOrderRes.error;
      if (columnOrderRes.error) throw columnOrderRes.error;
      if (pageContentRes.error) throw pageContentRes.error;

      const sectionOrderAll = sectionOrderRes.data || [];
      const columnOrderAll = columnOrderRes.data || [];
      const pageContentAll = pageContentRes.data || [];

      // Pick best-matching source page_name
      const scoreByPageName = (candidate: string) => {
        const s = sectionOrderAll.filter(r => r.page_name === candidate).length;
        const c = columnOrderAll.filter(r => r.page_name === candidate).length;
        const p = pageContentAll.filter(r => r.page_name === candidate).length;
        return s + c + p;
      };

      const sourcePageName =
        [...originalCandidates].sort((a, b) => scoreByPageName(b) - scoreByPageName(a))
          .find((c) => scoreByPageName(c) > 0) || originalCandidates[0];

      const sectionOrder = sectionOrderAll.filter(r => r.page_name === sourcePageName);
      const columnOrder = columnOrderAll.filter(r => r.page_name === sourcePageName);
      const pageContent = pageContentAll.filter(r => r.page_name === sourcePageName);

      // Helper: check if a section is dynamic (renderable by DynamicPage)
      const isDynamicSection = (sectionId: string) =>
        sectionId === 'title' || sectionId.startsWith('new-section-');

      // Helper: check if content_key is auxiliary (settings/link) - should not be treated as main content
      const isAuxiliaryKey = (key: string) =>
        key.endsWith('-settings') || key.endsWith('-link');

      // Helper: check if value looks like a URL
      const isUrl = (v: string) => /^https?:\/\//i.test(v.trim());

      // Helper: check if value is valid JSON
      const tryParseJson = (v: string) => {
        try { return JSON.parse(v); } catch { return null; }
      };

      // Separate dynamic sections from hardcoded sections
      const dynamicSections = sectionOrder.filter(s => isDynamicSection(s.section_id));
      const hardcodedSections = sectionOrder.filter(s => !isDynamicSection(s.section_id));

      // 1. Copy existing dynamic sections as-is
      if (dynamicSections.length > 0) {
        const sectionCopy = dynamicSections.map(({ id, created_at, updated_at, ...rest }) => ({
          ...rest,
          page_name: newPageKey,
        }));
        await supabase.from('page_section_order').upsert(sectionCopy, { onConflict: 'page_name,section_id' });
      }

      // 2. Copy column orders for dynamic sections
      const dynamicSectionIds = new Set(dynamicSections.map(s => s.section_id));
      const dynamicColumnOrders = columnOrder.filter(c => dynamicSectionIds.has(c.section_id));
      if (dynamicColumnOrders.length > 0) {
        const colCopy = dynamicColumnOrders.map(({ id, created_at, updated_at, ...rest }) => ({
          ...rest,
          page_name: newPageKey,
        }));
        await supabase.from('section_column_order').upsert(colCopy, { onConflict: 'page_name,section_id,column_id' });
      }

      // 3. Copy page_content for dynamic sections (excluding auxiliary keys from main content processing)
      // We copy ALL content for dynamic sections, including auxiliary keys (they're needed for settings)
      const dynamicContentSectionNames = new Set<string>();
      dynamicSections.forEach(s => {
        dynamicContentSectionNames.add(s.section_id);
        // Also include card-based section names
        for (let i = 0; i < 4; i++) {
          dynamicContentSectionNames.add(`${s.section_id}-card-${i}`);
        }
      });
      // Also include 'title' section content
      dynamicContentSectionNames.add('title');

      const dynamicContent = pageContent.filter(c => {
        // Include if section_name starts with a dynamic section id or is 'title'
        return Array.from(dynamicContentSectionNames).some(
          sn => c.section_name === sn || c.section_name.startsWith(sn + '-')
        );
      });

      if (dynamicContent.length > 0) {
        const contentCopy = dynamicContent.map(({ id, created_at, updated_at, ...rest }) => ({
          ...rest,
          page_name: newPageKey,
        }));
        await supabase.from('page_content').upsert(contentCopy, { onConflict: 'page_name,section_name,content_key' });
      }

      // 4. Ensure title section exists with heading/description
      const findContent = (sectionName: string, contentKey: string) =>
        pageContent.find(r => r.section_name === sectionName && r.content_key === contentKey)?.content_value ?? null;

      const fallbackHeading =
        findContent('title', 'heading') ||
        findContent('hero', 'title') ||
        findContent('hero', 'heading') ||
        page.page_name;

      const fallbackDescription =
        findContent('title', 'description') ||
        findContent('hero', 'subtitle') ||
        findContent('hero', 'subtitle2') ||
        findContent('hero', 'description') ||
        '';

      await supabase.from('page_content').upsert([
        { page_name: newPageKey, section_name: 'title', content_key: 'heading', content_type: 'text', content_value: fallbackHeading },
        { page_name: newPageKey, section_name: 'title', content_key: 'description', content_type: 'text', content_value: fallbackDescription },
      ], { onConflict: 'page_name,section_name,content_key' });

      // 5. Convert hardcoded sections into dynamic equivalents
      if (hardcodedSections.length > 0) {
        let sectionOrderIndex = dynamicSections.length;

        for (const hardcodedSection of hardcodedSections) {
          const sectionId = hardcodedSection.section_id;
          
          // Get all content for this hardcoded section (excluding auxiliary keys)
          const sectionContent = pageContent.filter(
            c => c.section_name === sectionId && !isAuxiliaryKey(c.content_key)
          );

          if (sectionContent.length === 0) continue;

          // Create a new dynamic section
          const newSectionId = `new-section-1-col-${Date.now()}-${sectionOrderIndex}`;
          const cardId = `${newSectionId}-card-0`;

          await supabase.from('page_section_order').upsert({
            page_name: newPageKey,
            section_id: newSectionId,
            section_order: sectionOrderIndex,
            visible: hardcodedSection.visible ?? true,
            status: 'published',
            background_type: hardcodedSection.background_type || 'none',
            background_value: hardcodedSection.background_value || null,
          }, { onConflict: 'page_name,section_id' });

          // Convert content into proper dynamic blocks
          const blocks: { id: string; type: string; content: string; order: number }[] = [];
          let blockOrder = 0;

          for (const contentRow of sectionContent) {
            const key = contentRow.content_key;
            const value = contentRow.content_value;

            if (!value || typeof value !== 'string') continue;

            // Try to detect content type
            const parsed = tryParseJson(value);

            // Skip if it's a settings/metadata JSON (has width, aspectRatio, etc.)
            if (parsed && (parsed.width !== undefined || parsed.aspectRatio !== undefined || parsed.objectFit !== undefined)) {
              continue;
            }

            // Check if it's already a block format
            if (parsed && parsed.type && parsed.content !== undefined) {
              blocks.push({
                id: `block_${Date.now()}_${blockOrder}`,
                type: parsed.type,
                content: parsed.content,
                order: blockOrder++,
              });
              continue;
            }

            // Check if it's an image URL
            if (isUrl(value) && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(value)) {
              blocks.push({
                id: `block_${Date.now()}_${blockOrder}`,
                type: 'image',
                content: value,
                order: blockOrder++,
              });
              continue;
            }

            // Check if it's a video URL
            if (isUrl(value) && (/\.(mp4|webm|ogg)(\?|$)/i.test(value) || /youtube|vimeo|youtu\.be/i.test(value))) {
              blocks.push({
                id: `block_${Date.now()}_${blockOrder}`,
                type: 'video',
                content: value,
                order: blockOrder++,
              });
              continue;
            }

            // Check if key suggests it's a heading/title
            if (['title', 'heading', 'section-title', 'subtitle'].includes(key)) {
              // Add as text with heading formatting
              blocks.push({
                id: `block_${Date.now()}_${blockOrder}`,
                type: 'text',
                content: key.includes('sub') ? `<p>${value}</p>` : `<h2>${value}</h2>`,
                order: blockOrder++,
              });
              continue;
            }

            // Default: treat as text content
            // Skip if it looks like raw JSON that wasn't handled
            if (value.startsWith('{') || value.startsWith('[')) {
              continue;
            }

            // If it already has HTML tags, use as-is; otherwise wrap in <p>
            const hasHtml = /<[a-z][\s\S]*>/i.test(value);
            blocks.push({
              id: `block_${Date.now()}_${blockOrder}`,
              type: 'text',
              content: hasHtml ? value : `<p>${value}</p>`,
              order: blockOrder++,
            });
          }

          // Insert all blocks for this section
          if (blocks.length > 0) {
            const blockInserts = blocks.map(block => ({
              page_name: newPageKey,
              section_name: cardId,
              content_key: block.id,
              content_type: 'text',
              content_value: JSON.stringify({
                type: block.type,
                content: block.content,
                order: block.order,
                version: 1,
              }),
            }));

            await supabase.from('page_content').insert(blockInserts);
          }

          sectionOrderIndex++;
        }
      }

      toast({
        title: 'Success',
        description: `Page duplicated as "${newPageName}" with content.`,
      });

      loadPages();
    } catch (error: any) {
      console.error('Error duplicating page:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate page',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DynamicHelmet titlePrefix="Page Management - Admin" noIndex />

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 pt-[168px] md:pt-[152px]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-900">Page Management</h1>
                <p className="text-muted-foreground">
                  Manage website pages and SEO settings
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Page
                </Button>
                <Button onClick={() => navigate('/admin')} variant="outline" className="flex-shrink-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pages...</p>
              </div>
            ) : (
              <Tabs defaultValue="website" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as "website" | "portal")}>
                <TabsList>
                  <TabsTrigger value="website">Website</TabsTrigger>
                  <TabsTrigger value="portal">Portal</TabsTrigger>
                </TabsList>
                
                <TabsContent value="website">
                  <div className="bg-white rounded-lg shadow">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page Name</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>SEO Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages
                          .filter(page => !page.page_url.startsWith('/exhibitor-portal/') && !page.page_url.startsWith('/exhibitor/'))
                          .map((page) => (
                            <TableRow key={page.id}>
                              <TableCell className="font-medium">{page.page_name}</TableCell>
                              <TableCell>
                                <Link 
                                  to={page.page_url}
                                  className="text-gray-700 hover:text-green-600 transition-colors flex items-center gap-1"
                                >
                                  {page.page_url}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {page.seo_title ? replacePlaceholders(page.seo_title) : <span className="text-muted-foreground">No SEO title</span>}
                              </TableCell>
                              <TableCell>
                                {page.status === 'published' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Draft
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(page)}
                                    title="Edit page"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDuplicate(page)}
                                    title="Duplicate page"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(page.id)}
                                    title="Delete page"
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
                </TabsContent>

                <TabsContent value="portal">
                  <div className="bg-white rounded-lg shadow">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page Name</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>SEO Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages
                          .filter(page => page.page_url === '/exhibitor-portal' || page.page_url.startsWith('/exhibitor-portal/') || page.page_url.startsWith('/exhibitor/'))
                          .map((page) => (
                            <TableRow key={page.id}>
                              <TableCell className="font-medium">{page.page_name}</TableCell>
                              <TableCell>
                                <Link 
                                  to={page.page_url}
                                  className="text-gray-700 hover:text-green-600 transition-colors flex items-center gap-1"
                                >
                                  {page.page_url}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {page.seo_title ? replacePlaceholders(page.seo_title) : <span className="text-muted-foreground">No SEO title</span>}
                              </TableCell>
                              <TableCell>
                                {page.status === 'published' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Draft
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(page)}
                                    title="Edit page"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDuplicate(page)}
                                    title="Duplicate page"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(page.id)}
                                    title="Delete page"
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
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>

        <Footer />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-gray-50 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Edit Page' : 'Add New Page'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
            <div className="space-y-2">
              <Label htmlFor="page_name" className="text-black">Page Name *</Label>
              <Input
                id="page_name"
                value={formData.page_name}
                onChange={(e) => setFormData(prev => ({ ...prev, page_name: e.target.value }))}
                placeholder="Home"
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_url" className="text-black">Page URL *</Label>
              <Input
                id="page_url"
                value={formData.page_url}
                onChange={(e) => setFormData(prev => ({ ...prev, page_url: e.target.value }))}
                placeholder="/"
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_title" className="text-black">SEO Title</Label>
              <Input
                id="seo_title"
                value={formData.seo_title}
                onChange={(e) => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                placeholder="Customer Connect Expo 2026 | The Ultimate Food Service Event"
                maxLength={120}
                className="bg-white text-gray-700"
              />
              <p className="text-xs text-muted-foreground">{formData.seo_title.length}/120 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_description" className="text-black">SEO Description</Label>
              <Textarea
                id="seo_description"
                value={formData.seo_description}
                onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
                placeholder="Join us at Customer Connect Expo 2026..."
                maxLength={300}
                rows={3}
                className="bg-white text-gray-700"
              />
              <p className="text-xs text-muted-foreground">{formData.seo_description.length}/300 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_keywords" className="text-black">SEO Keywords</Label>
              <Input
                id="seo_keywords"
                value={formData.seo_keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, seo_keywords: e.target.value }))}
                placeholder="food service, expo, trade show"
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black">Page Thumbnail (Optional)</Label>
              {formData.thumbnail_url && (
                <div className="relative w-full h-40 mb-2">
                  <img 
                    src={formData.thumbnail_url} 
                    alt="Thumbnail preview" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImagePicker(true)}
                className="w-full"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {formData.thumbnail_url ? 'Change Thumbnail' : 'Add Thumbnail'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-black">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="events, food-service, networking"
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-black">Page Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'published' | 'draft') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-white text-gray-700">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft pages will not be visible on the frontend
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="text-black">Page is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPage ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImagePickerDialog
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        onImageSelect={handleImageSelect}
        onFileUpload={() => {}}
      />
    </>
  );
};

export default AdminPages;