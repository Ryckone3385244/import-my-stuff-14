import { ChevronDown, Building2, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  menu_order: number;
  is_active: boolean;
  parent_id: string | null;
  depth: number;
}

export function ExhibitorSidebar({ exhibitorName, standNumber, logoUrl, renderTrigger, alwaysVisible }: { exhibitorName?: string; standNumber?: string; logoUrl?: string; renderTrigger?: boolean; alwaysVisible?: boolean }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [exhibitorId, setExhibitorId] = useState<string | null>(null);
  const [supabaseClient, setSupabaseClient] = useState(supabase);

  // Get exhibitor ID for inquiry count
  useEffect(() => {
    const getExhibitorId = async () => {
      const impToken = sessionStorage.getItem('impersonation_token');
      const impRefresh = sessionStorage.getItem('impersonation_refresh');
      
      let client = supabase;
      
      if (impToken && impRefresh) {
        client = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
              },
              persistSession: false,
              autoRefreshToken: true,
            },
          }
        );
        
        await client.auth.setSession({
          access_token: impToken,
          refresh_token: impRefresh,
        });
        
        setSupabaseClient(client);
      }
      
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        const { data: exhibitor, error: exhibitorError } = await client
          .from("exhibitors")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (exhibitorError) {
          console.error("Error fetching exhibitor ID:", exhibitorError);
          return;
        }
        
        if (exhibitor) {
          setExhibitorId(exhibitor.id);
        }
      }
    };

    getExhibitorId();
  }, []);

  // Fetch menu items from database
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["portal-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_menu_items")
        .select("*")
        .eq("is_active", true)
        .order("menu_order", { ascending: true });
      if (error) throw error;
      return data as MenuItem[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch new inquiry count
  const { data: inquiryCount = 0 } = useQuery({
    queryKey: ["exhibitor-new-inquiries", exhibitorId],
    queryFn: async () => {
      if (!exhibitorId) return 0;
      
      const { count, error } = await supabaseClient
        .from("exhibitor_inquiries")
        .select("*", { count: "exact", head: true })
        .eq("exhibitor_id", exhibitorId)
        .eq("status", "new");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!exhibitorId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const isActive = (path: string) => currentPath === path;

  // Check if any child of a parent item is active
  const hasActiveChild = (parentId: string) => {
    const children = menuItems?.filter(item => item.parent_id === parentId) || [];
    return children.some(child => isActive(child.url));
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

  // Auto-expand parent items if their child is active
  useEffect(() => {
    if (menuItems) {
      const newExpanded = new Set(expandedItems);
      menuItems.forEach(item => {
        if (!item.parent_id && hasActiveChild(item.id)) {
          newExpanded.add(item.id);
        }
      });
      setExpandedItems(newExpanded);
    }
  }, [currentPath, menuItems]);

  // Filter top-level items (no parent)
  const topLevelItems = menuItems?.filter(item => !item.parent_id) || [];

  // Get children for a specific parent
  const getChildren = (parentId: string) => {
    return menuItems?.filter(item => item.parent_id === parentId) || [];
  };

  const renderMenuItem = (item: MenuItem) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const showBadge = item.url === "/exhibitor-portal/inquiries" && inquiryCount > 0;

    return (
      <div key={item.id}>
        {hasChildren ? (
          <div>
            <button
              onClick={() => toggleExpand(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer flex justify-between items-center ${
                isActive(item.url) ? 'bg-muted font-medium' : ''
              }`}
            >
              <span className="text-sm">{item.label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {children.map(child => (
                  <Link
                    key={child.id}
                    to={child.url}
                    className={`block px-3 py-2 rounded-md hover:bg-muted/50 text-sm ${
                      isActive(child.url) ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            to={item.url}
            className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 text-sm ${
              isActive(item.url) ? 'bg-muted font-medium' : ''
            }`}
          >
            <span>{item.label}</span>
            {showBadge && (
              <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-primary text-primary-foreground">
                {inquiryCount}
              </Badge>
            )}
          </Link>
        )}
      </div>
    );
  };

  // Always visible sidebar content
  const sidebarContent = (
    <>
      <Link 
        to="/exhibitor-portal"
        className="block p-4 border-b bg-card hover:bg-muted/50 transition-colors cursor-pointer rounded-t-lg"
      >
        <div className="w-16 h-16 mx-auto bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
          {logoUrl ? (
            <img src={logoUrl} alt={exhibitorName || "Exhibitor logo"} className="w-full h-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        {exhibitorName && (
          <div className="text-center mt-3">
            <h2 className="font-bold text-sm">{exhibitorName}</h2>
            {standNumber && (
              <p className="text-xs text-muted-foreground mt-1">Stand {standNumber}</p>
            )}
          </div>
        )}
      </Link>

      <div className="p-3 space-y-1 bg-card rounded-b-lg">
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-2">Loading menu...</p>
        ) : topLevelItems.length > 0 ? (
          topLevelItems.map(item => renderMenuItem(item))
        ) : (
          <p className="text-sm text-muted-foreground p-2">No menu items available</p>
        )}
      </div>
    </>
  );

  if (alwaysVisible) {
    return (
      <Card className="w-full shadow-lg">
        {sidebarContent}
      </Card>
    );
  }

  return (
    <>
      {renderTrigger && (
        <div className="relative">
          <Button
            onMouseEnter={() => setIsOpen(true)}
            variant="outline"
            size="icon"
            className="h-10 w-10"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {isOpen && (
            <div
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => setIsOpen(false)}
              className="absolute top-12 left-0 z-[90]"
            >
              <Card className="w-64 shadow-xl max-h-[calc(100vh-200px)] overflow-y-auto">
                {sidebarContent}
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}
