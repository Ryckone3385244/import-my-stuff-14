import { Helmet } from "react-helmet-async";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, GripVertical, Trash2, Plus, Save, Pencil, X, Check, ArrowLeft, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  menu_order: number;
  is_active: boolean;
  parent_id: string | null;
  depth: number;
  is_custom: boolean;
  open_in_new_tab: boolean;
}

interface Page {
  id: string;
  page_name: string;
  page_url: string;
  status: string;
}

const AdminMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "child" | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);
  const [pendingNavbarChanges, setPendingNavbarChanges] = useState<MenuItem[]>([]);
  const [pendingFooterChanges, setPendingFooterChanges] = useState<MenuItem[]>([]);
  const [pendingPortalChanges, setPendingPortalChanges] = useState<MenuItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [customOpenInNewTab, setCustomOpenInNewTab] = useState(false);
  
  // Use ref to track unsaved changes for useEffect closures
  // Updated synchronously to prevent race conditions with query refetches
  const hasUnsavedChangesRef = useRef(false);
  
  // Helper to set unsaved changes - updates ref SYNCHRONOUSLY to prevent race conditions
  const setHasUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChangesState(value);
  };

  // Warn before closing/refreshing page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  // Fetch available pages
  const { data: pages, refetch: refetchPages, isFetching: isFetchingPages } = useQuery({
    queryKey: ["website-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_pages")
        .select("*")
        .eq("status", "published")
        .order("page_name", { ascending: true });
      if (error) throw error;
      return data as Page[];
    },
    enabled: isAdmin,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: "always", // Refetch every time the component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // Refetch every 5 seconds to catch new pages
  });

  // Navbar menu queries
  const { data: navbarItems, refetch: refetchNavbar } = useQuery({
    queryKey: ["navbar-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("navbar_menu_items")
        .select("*")
        .order("menu_order", { ascending: true });
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: isAdmin,
  });

  const { data: footerItems, refetch: refetchFooter } = useQuery({
    queryKey: ["footer-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footer_menu_items")
        .select("*")
        .order("menu_order", { ascending: true });
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: isAdmin,
  });

  const { data: portalItems, refetch: refetchPortal } = useQuery({
    queryKey: ["portal-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_menu_items")
        .select("*")
        .order("menu_order", { ascending: true });
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: isAdmin,
  });

  // Initialize pending changes when data loads (only if no unsaved changes)
  // Using ref to avoid race conditions with mutations that set hasUnsavedChanges
  useEffect(() => {
    if (navbarItems && !hasUnsavedChangesRef.current) {
      setPendingNavbarChanges(navbarItems);
    }
  }, [navbarItems]);

  useEffect(() => {
    if (footerItems && !hasUnsavedChangesRef.current) {
      setPendingFooterChanges(footerItems);
    }
  }, [footerItems]);

  useEffect(() => {
    if (portalItems && !hasUnsavedChangesRef.current) {
      setPendingPortalChanges(portalItems);
    }
  }, [portalItems]);

  // Add pages to menu mutation
  const addPagesToMenuMutation = useMutation({
    mutationFn: async ({ pages, table }: { pages: Page[]; table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items" }) => {
      // Use pending changes for max order calculation to preserve local changes
      const pendingItems = table === "navbar_menu_items" ? pendingNavbarChanges : table === "footer_menu_items" ? pendingFooterChanges : pendingPortalChanges;
      const maxOrder = pendingItems?.reduce((max, item) => Math.max(max, item.menu_order), -1) ?? -1;
      
      const newItems = pages.map((page, index) => ({
        label: page.page_name,
        url: page.page_url,
        menu_order: maxOrder + index + 1,
        is_active: true,
        parent_id: null,
        depth: 0,
        is_custom: false,
      }));

      const { data, error } = await supabase.from(table).insert(newItems).select();
      if (error) throw error;
      return { insertedItems: data as MenuItem[], table };
    },
    onSuccess: (result) => {
      // Set unsaved changes - ref is updated synchronously by the helper
      setHasUnsavedChanges(true);
      
      // Append new items to pending changes instead of refetching (which would reset local changes)
      if (result.table === "navbar_menu_items") {
        setPendingNavbarChanges(prev => [...prev, ...result.insertedItems]);
      } else if (result.table === "footer_menu_items") {
        setPendingFooterChanges(prev => [...prev, ...result.insertedItems]);
      } else {
        setPendingPortalChanges(prev => [...prev, ...result.insertedItems]);
      }
      toast.success("Pages added to menu! Remember to save your changes.");
      setSelectedPages([]);
    },
    onError: () => toast.error("Failed to add pages"),
  });

  // Add custom link mutation
  const addCustomLinkMutation = useMutation({
    mutationFn: async ({ label, url, table, openInNewTab }: { label: string; url: string; table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items"; openInNewTab: boolean }) => {
      // Use pending changes for max order calculation to preserve local changes
      const pendingItems = table === "navbar_menu_items" ? pendingNavbarChanges : table === "footer_menu_items" ? pendingFooterChanges : pendingPortalChanges;
      const maxOrder = pendingItems?.reduce((max, item) => Math.max(max, item.menu_order), -1) ?? -1;

      const { data, error } = await supabase.from(table).insert([{
        label,
        url,
        menu_order: maxOrder + 1,
        is_active: true,
        parent_id: null,
        depth: 0,
        is_custom: true,
        open_in_new_tab: openInNewTab,
      }]).select();
      if (error) throw error;
      return { insertedItem: (data as MenuItem[])[0], table };
    },
    onSuccess: (result) => {
      // Set unsaved changes - ref is updated synchronously by the helper
      setHasUnsavedChanges(true);
      
      // Append new item to pending changes instead of refetching (which would reset local changes)
      if (result.table === "navbar_menu_items") {
        setPendingNavbarChanges(prev => [...prev, result.insertedItem]);
      } else if (result.table === "footer_menu_items") {
        setPendingFooterChanges(prev => [...prev, result.insertedItem]);
      } else {
        setPendingPortalChanges(prev => [...prev, result.insertedItem]);
      }
      toast.success("Custom link added! Remember to save your changes.");
      setCustomLabel("");
      setCustomUrl("");
      setCustomOpenInNewTab(false);
    },
    onError: () => toast.error("Failed to add custom link"),
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items" }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Update pending changes by removing the deleted item
      if (variables.table === "navbar_menu_items") {
        setPendingNavbarChanges(prev => prev.filter(item => item.id !== variables.id));
      } else if (variables.table === "footer_menu_items") {
        setPendingFooterChanges(prev => prev.filter(item => item.id !== variables.id));
      } else {
        setPendingPortalChanges(prev => prev.filter(item => item.id !== variables.id));
      }
      toast.success("Menu item deleted! Remember to save your changes.");
      setHasUnsavedChanges(true);
    },
    onError: () => toast.error("Failed to delete item"),
  });

  // Save all changes mutation
  const saveChangesMutation = useMutation({
    mutationFn: async ({ items, table }: { items: MenuItem[]; table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items" }) => {
      const updates = items.map((item) =>
        supabase
          .from(table)
          .update({
            label: item.label,
            url: item.url,
            menu_order: item.menu_order,
            parent_id: item.parent_id,
            depth: item.depth,
            is_active: item.is_active,
            open_in_new_tab: item.open_in_new_tab,
          })
          .eq("id", item.id)
      );
      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      if (variables.table === "navbar_menu_items") {
        refetchNavbar();
      } else if (variables.table === "footer_menu_items") {
        refetchFooter();
      } else {
        refetchPortal();
      }
      setHasUnsavedChanges(false);
      toast.success("Menu saved successfully!");
    },
    onError: () => toast.error("Failed to save menu"),
  });

  const handleAddPages = (table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    if (!pages || selectedPages.length === 0) {
      toast.error("Please select at least one page");
      return;
    }
    const selectedPageObjects = pages.filter((p) => selectedPages.includes(p.id));
    addPagesToMenuMutation.mutate({ pages: selectedPageObjects, table });
  };

  const handleAddCustomLink = (table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    if (!customLabel) {
      toast.error("Please enter a label");
      return;
    }

    // If URL is provided, validate it
    if (customUrl && customUrl.trim() !== "") {
      if (!customUrl.startsWith("/") && !customUrl.startsWith("http")) {
        toast.error("URL must start with / for internal links or http:// for external links");
        return;
      }

      // Check if internal URL exists in website pages
      if (customUrl.startsWith("/") && pages) {
        const urlExists = pages.some(page => page.page_url === customUrl);
        if (!urlExists) {
          toast.warning(`Warning: "${customUrl}" may not exist as a page. The link might lead to a 404 error.`);
        }
      }
    } else {
      // Empty URL creates a non-clickable menu item
      toast.info("Creating non-clickable menu item (useful for items with subitems)");
    }

    addCustomLinkMutation.mutate({ label: customLabel, url: customUrl || "#", table, openInNewTab: customOpenInNewTab });
  };

  const handleToggleOpenInNewTab = (itemId: string, table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    const updateItems = (items: MenuItem[]) =>
      items.map((item) =>
        item.id === itemId ? { ...item, open_in_new_tab: !item.open_in_new_tab } : item
      );

    if (table === "navbar_menu_items") {
      setPendingNavbarChanges(updateItems);
    } else if (table === "footer_menu_items") {
      setPendingFooterChanges(updateItems);
    } else {
      setPendingPortalChanges(updateItems);
    }
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (item: MenuItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setDragOverItem(itemId);

    // Determine drop position based on mouse Y position relative to element
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const elementHeight = rect.height;

    // Divide element into three zones: top 25%, middle 50%, bottom 25%
    if (mouseY < elementHeight * 0.25) {
      setDropPosition("before");
    } else if (mouseY > elementHeight * 0.75) {
      setDropPosition("after");
    } else {
      setDropPosition("child");
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
    setDropPosition(null);
  };

  const handleSaveChanges = (table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    const items = table === "navbar_menu_items" ? pendingNavbarChanges : table === "footer_menu_items" ? pendingFooterChanges : pendingPortalChanges;
    saveChangesMutation.mutate({ items, table });
  };

  const handleDiscardChanges = () => {
    setPendingNavbarChanges(navbarItems || []);
    setPendingFooterChanges(footerItems || []);
    setPendingPortalChanges(portalItems || []);
    setHasUnsavedChanges(false);
    toast.info("Changes discarded");
  };

  const handleDrop = (targetItem: MenuItem, items: MenuItem[], table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      setDropPosition(null);
      return;
    }

    let updatedItems = [...items];
    const draggedIndex = updatedItems.findIndex((i) => i.id === draggedItem.id);
    const targetIndex = updatedItems.findIndex((i) => i.id === targetItem.id);

    // Remove dragged item
    const [removed] = updatedItems.splice(draggedIndex, 1);

    if (dropPosition === "child") {
      // Make dragged item a child of target
      const newTargetIndex = updatedItems.findIndex((i) => i.id === targetItem.id);
      // Insert after target (children appear below parent)
      updatedItems.splice(newTargetIndex + 1, 0, {
        ...removed,
        parent_id: targetItem.id,
        depth: targetItem.depth + 1,
      });
    } else {
      // Reposition based on before/after
      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
      const insertIndex = dropPosition === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
      
      updatedItems.splice(insertIndex, 0, {
        ...removed,
        parent_id: targetItem.parent_id,
        depth: targetItem.depth,
      });
    }

    // Recalculate order
    updatedItems = updatedItems.map((item, index) => ({
      ...item,
      menu_order: index,
    }));

    // Update pending changes
    if (table === "navbar_menu_items") {
      setPendingNavbarChanges(updatedItems);
    } else if (table === "footer_menu_items") {
      setPendingFooterChanges(updatedItems);
    } else {
      setPendingPortalChanges(updatedItems);
    }
    setHasUnsavedChanges(true);
    setDraggedItem(null);
    setDragOverItem(null);
    setDropPosition(null);
  };

  const handleIndent = (item: MenuItem, items: MenuItem[], table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    const itemIndex = items.findIndex((i) => i.id === item.id);
    if (itemIndex === 0) return; // Can't indent first item

    const previousItem = items[itemIndex - 1];
    const updatedItems = items.map((i) =>
      i.id === item.id
        ? { ...i, parent_id: previousItem.id, depth: previousItem.depth + 1 }
        : i
    );

    // Update pending changes instead of saving immediately
    if (table === "navbar_menu_items") {
      setPendingNavbarChanges(updatedItems);
    } else if (table === "footer_menu_items") {
      setPendingFooterChanges(updatedItems);
    } else {
      setPendingPortalChanges(updatedItems);
    }
    setHasUnsavedChanges(true);
  };

  const handleOutdent = (item: MenuItem, items: MenuItem[], table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    if (item.depth === 0) return; // Already top level

    const updatedItems = items.map((i) =>
      i.id === item.id ? { ...i, parent_id: null, depth: 0 } : i
    );

    // Update pending changes instead of saving immediately
    if (table === "navbar_menu_items") {
      setPendingNavbarChanges(updatedItems);
    } else if (table === "footer_menu_items") {
      setPendingFooterChanges(updatedItems);
    } else {
      setPendingPortalChanges(updatedItems);
    }
    setHasUnsavedChanges(true);
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditingLabel(item.label);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingLabel("");
  };

  const handleSaveEdit = (table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items") => {
    if (!editingItemId || !editingLabel.trim()) {
      toast.error("Label cannot be empty");
      return;
    }

    const updateItems = (items: MenuItem[]) =>
      items.map((item) =>
        item.id === editingItemId ? { ...item, label: editingLabel.trim() } : item
      );

    if (table === "navbar_menu_items") {
      setPendingNavbarChanges(updateItems);
    } else if (table === "footer_menu_items") {
      setPendingFooterChanges(updateItems);
    } else {
      setPendingPortalChanges(updateItems);
    }

    setHasUnsavedChanges(true);
    setEditingItemId(null);
    setEditingLabel("");
    toast.success("Label updated! Remember to save your changes.");
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const buildMenuTree = (items: MenuItem[]) => {
    const topLevel = items.filter((item) => !item.parent_id);
    return topLevel;
  };

  const renderMenuItem = (item: MenuItem, items: MenuItem[], table: "navbar_menu_items" | "footer_menu_items" | "portal_menu_items", isLast: boolean) => {
    const children = items.filter((i) => i.parent_id === item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isDragging = draggedItem?.id === item.id;
    const isDragOver = dragOverItem === item.id;

    // Visual feedback based on drop position
    let borderClass = "border-gray-200";
    let bgClass = "";
    if (isDragOver) {
      if (dropPosition === "before") {
        borderClass = "border-t-4 border-t-primary";
      } else if (dropPosition === "after") {
        borderClass = "border-b-4 border-b-primary";
      } else if (dropPosition === "child") {
        borderClass = "border-2 border-primary";
        bgClass = "bg-primary/5";
      }
    }

    return (
      <div key={item.id} className="group">
        <div
          className={`relative flex items-center gap-2 p-3 bg-white border rounded-lg transition-all ${
            isDragging ? "opacity-50" : ""
          } ${borderClass} ${bgClass}`}
          draggable
          onDragStart={() => handleDragStart(item)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop(item, items, table)}
          style={{ marginLeft: `${item.depth * 32}px` }}
        >
          {/* Drop zone indicator */}
          {isDragOver && dropPosition === "child" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-medium text-primary bg-background px-2 py-1 rounded border border-primary">
                Drop as child
              </span>
            </div>
          )}
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
          
          {hasChildren && (
            <button
              onClick={() => toggleExpand(item.id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            {editingItemId === item.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveEdit(table);
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveEdit(table)}
                  title="Save"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-medium truncate">{item.label}</span>
                  {item.open_in_new_tab && (
                    <span className="text-primary text-xs" title="Opens in new tab">↗</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{item.url}</div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {editingItemId !== item.id && (
              <>
                {item.depth > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOutdent(item, items, table)}
                    title="Outdent"
                  >
                    ←
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleIndent(item, items, table)}
                  disabled={items.findIndex((i) => i.id === item.id) === 0}
                  title="Indent"
                >
                  →
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(item)}
                  title="Rename"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleOpenInNewTab(item.id, table)}
                  title={item.open_in_new_tab ? "Opens in new tab (click to toggle)" : "Opens in same tab (click to toggle)"}
                  className={item.open_in_new_tab ? "text-primary" : ""}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteItemMutation.mutate({ id: item.id, table })}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {children.map((child, index) =>
              renderMenuItem(child, items, table, index === children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Menu Management - Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-50 pt-page">
        <Navbar />

        <main className="flex-1">
          <section className="py-12 container mx-auto px-4">
            <div className="mb-8">
              <div className="flex gap-2 mb-4 justify-end">
                <Button variant="outline" onClick={() => navigate("/admin")} className="flex-shrink-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => refetchPages()}
                  disabled={isFetchingPages}
                >
                  {isFetchingPages ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refreshing...</>
                  ) : (
                    <>🔄 Refresh Pages</>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-gray-900">Menu Management</h1>
                  <p className="text-muted-foreground">
                    Drag items to reorder. Hover over an item to drop before, after, or as a child.
                  </p>
                </div>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-orange-600 font-medium">
                      You have unsaved changes
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Tabs defaultValue="navbar" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
                <TabsTrigger value="navbar">Navbar Menu</TabsTrigger>
                <TabsTrigger value="footer">Quick Links</TabsTrigger>
                <TabsTrigger value="portal">Portal Menu</TabsTrigger>
              </TabsList>

              <TabsContent value="navbar">
                <div className="grid lg:grid-cols-[350px_1fr] gap-8">
                  {/* Left Panel - Add Items */}
                  <div className="space-y-4">
                    {/* Pages */}
                    <Collapsible defaultOpen>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Pages</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {pages?.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No website pages found. Create pages in the Pages management section.
                                </p>
                              ) : (
                                pages?.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).map((page) => (
                                  <label key={page.id} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedPages.includes(page.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPages([...selectedPages, page.id]);
                                        } else {
                                          setSelectedPages(selectedPages.filter((id) => id !== page.id));
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{page.page_name}</span>
                                    {!page.page_url.startsWith('/') && (
                                      <span className="text-xs text-orange-600">⚠️ Invalid URL</span>
                                    )}
                                  </label>
                                ))
                              )}
                            </div>
                            {pages && pages.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Showing {pages.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length} website pages
                              </p>
                            )}
                            <Button
                              onClick={() => handleAddPages("navbar_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* Custom Links */}
                    <Collapsible>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Custom Links</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="custom-label">Label</Label>
                              <Input
                                id="custom-label"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder="Menu Label"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="custom-url">URL (optional)</Label>
                              <Input
                                id="custom-url"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="/custom-page or https://example.com"
                              />
                              <p className="text-xs text-muted-foreground">
                                Leave empty to create a non-clickable item (useful for parent items with subitems). Internal links start with / and external links start with http://
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="navbar-open-in-new-tab"
                                checked={customOpenInNewTab}
                                onCheckedChange={(checked) => setCustomOpenInNewTab(checked === true)}
                              />
                              <Label htmlFor="navbar-open-in-new-tab" className="text-sm cursor-pointer">
                                Open in new tab
                              </Label>
                            </div>
                            <Button
                              onClick={() => handleAddCustomLink("navbar_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </div>

                  {/* Right Panel - Menu Structure */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle>Menu Structure</CardTitle>
                        <CardDescription>
                          Drag items to reorder. Top/bottom = position, middle = drop as child.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {hasUnsavedChanges && (
                          <Button
                            variant="outline"
                            onClick={handleDiscardChanges}
                            size="sm"
                          >
                            Discard
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSaveChanges("navbar_menu_items")}
                          disabled={!hasUnsavedChanges || saveChangesMutation.isPending}
                          size="sm"
                        >
                          {saveChangesMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                          ) : (
                            <><Save className="mr-2 h-4 w-4" />Save Menu</>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingNavbarChanges && pendingNavbarChanges.length > 0 ? (
                        <div className="space-y-2">
                          {buildMenuTree(pendingNavbarChanges).map((item, index) =>
                            renderMenuItem(
                              item,
                              pendingNavbarChanges,
                              "navbar_menu_items",
                              index === pendingNavbarChanges.length - 1
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No menu items yet. Add items from the left panel.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="footer">
                <div className="grid lg:grid-cols-[350px_1fr] gap-8">
                  {/* Left Panel */}
                  <div className="space-y-4">
                    <Collapsible defaultOpen>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Pages</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {pages?.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No website pages found. Create pages in the Pages management section.
                                </p>
                              ) : (
                                pages?.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).map((page) => (
                                  <label key={page.id} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedPages.includes(page.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPages([...selectedPages, page.id]);
                                        } else {
                                          setSelectedPages(selectedPages.filter((id) => id !== page.id));
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{page.page_name}</span>
                                    {!page.page_url.startsWith('/') && (
                                      <span className="text-xs text-orange-600">⚠️ Invalid URL</span>
                                    )}
                                  </label>
                                ))
                              )}
                            </div>
                            {pages && pages.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Showing {pages.filter(page => !page.page_url.startsWith('/exhibitor-portal') && !page.page_url.startsWith('/exhibitor/')).length} website pages
                              </p>
                            )}
                            <Button
                              onClick={() => handleAddPages("footer_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    <Collapsible>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Custom Links</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="footer-custom-label">Label</Label>
                              <Input
                                id="footer-custom-label"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder="Menu Label"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="footer-custom-url">URL (optional)</Label>
                              <Input
                                id="footer-custom-url"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="/custom-page or https://example.com"
                              />
                              <p className="text-xs text-muted-foreground">
                                Leave empty to create a non-clickable item (useful for parent items with subitems). Internal links start with / and external links start with http://
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="footer-open-in-new-tab"
                                checked={customOpenInNewTab}
                                onCheckedChange={(checked) => setCustomOpenInNewTab(checked === true)}
                              />
                              <Label htmlFor="footer-open-in-new-tab" className="text-sm cursor-pointer">
                                Open in new tab
                              </Label>
                            </div>
                            <Button
                              onClick={() => handleAddCustomLink("footer_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </div>

                  {/* Right Panel */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle>Menu Structure</CardTitle>
                        <CardDescription>
                          Drag items to reorder. Top/bottom = position, middle = drop as child.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {hasUnsavedChanges && (
                          <Button
                            variant="outline"
                            onClick={handleDiscardChanges}
                            size="sm"
                          >
                            Discard
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSaveChanges("footer_menu_items")}
                          disabled={!hasUnsavedChanges || saveChangesMutation.isPending}
                          size="sm"
                        >
                          {saveChangesMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                          ) : (
                            <><Save className="mr-2 h-4 w-4" />Save Menu</>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingFooterChanges && pendingFooterChanges.length > 0 ? (
                        <div className="space-y-2">
                          {buildMenuTree(pendingFooterChanges).map((item, index) =>
                            renderMenuItem(
                              item,
                              pendingFooterChanges,
                              "footer_menu_items",
                              index === pendingFooterChanges.length - 1
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No menu items yet. Add items from the left panel.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="portal">
                <div className="grid lg:grid-cols-[350px_1fr] gap-8">
                  {/* Left Panel */}
                  <div className="space-y-4">
                    <Collapsible defaultOpen>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Pages</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {pages?.filter(page => page.page_url.startsWith('/exhibitor-portal') || page.page_url.startsWith('/exhibitor/')).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No portal pages found. Create portal pages with URLs starting with /exhibitor-portal/ or /exhibitor/
                                </p>
                              ) : (
                                pages?.filter(page => page.page_url.startsWith('/exhibitor-portal') || page.page_url.startsWith('/exhibitor/')).map((page) => (
                                  <label key={page.id} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedPages.includes(page.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPages([...selectedPages, page.id]);
                                        } else {
                                          setSelectedPages(selectedPages.filter((id) => id !== page.id));
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{page.page_name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                            {pages && pages.filter(page => page.page_url.startsWith('/exhibitor-portal') || page.page_url.startsWith('/exhibitor/')).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Showing {pages.filter(page => page.page_url.startsWith('/exhibitor-portal') || page.page_url.startsWith('/exhibitor/')).length} portal pages
                              </p>
                            )}
                            <Button
                              onClick={() => handleAddPages("portal_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    <Collapsible>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                            <CardTitle className="text-base">Custom Links</CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="portal-custom-label">Label</Label>
                              <Input
                                id="portal-custom-label"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder="Menu Label"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="portal-custom-url">URL (optional)</Label>
                              <Input
                                id="portal-custom-url"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="/custom-page or https://example.com"
                              />
                              <p className="text-xs text-muted-foreground">
                                Leave empty to create a non-clickable item (useful for parent items with subitems). Internal links start with / and external links start with http://
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="portal-open-in-new-tab"
                                checked={customOpenInNewTab}
                                onCheckedChange={(checked) => setCustomOpenInNewTab(checked === true)}
                              />
                              <Label htmlFor="portal-open-in-new-tab" className="text-sm cursor-pointer">
                                Open in new tab
                              </Label>
                            </div>
                            <Button
                              onClick={() => handleAddCustomLink("portal_menu_items")}
                              className="w-full"
                              size="sm"
                            >
                              Add to Menu
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </div>

                  {/* Right Panel */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle>Portal Menu Structure</CardTitle>
                        <CardDescription>
                          Drag items to reorder. Top/bottom = position, middle = drop as child.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {hasUnsavedChanges && (
                          <Button
                            variant="outline"
                            onClick={handleDiscardChanges}
                            size="sm"
                          >
                            Discard
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSaveChanges("portal_menu_items")}
                          disabled={!hasUnsavedChanges || saveChangesMutation.isPending}
                          size="sm"
                        >
                          {saveChangesMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                          ) : (
                            <><Save className="mr-2 h-4 w-4" />Save Menu</>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingPortalChanges && pendingPortalChanges.length > 0 ? (
                        <div className="space-y-2">
                          {buildMenuTree(pendingPortalChanges).map((item, index) =>
                            renderMenuItem(
                              item,
                              pendingPortalChanges,
                              "portal_menu_items",
                              index === pendingPortalChanges.length - 1
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No menu items yet. Add items from the left panel.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminMenu;