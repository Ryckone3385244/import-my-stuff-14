import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { StyledButton } from "./ui/styled-button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, X, Edit, ChevronDown, Blocks } from "lucide-react";
import { useEditMode, EditModeOverride } from "@/contexts/EditModeContext";
import { useBuilderOptional } from "@/contexts/BuilderContext";
import { useQuery } from "@tanstack/react-query";
import { useEventSettings } from "@/hooks/useEventSettings";
import { fetchMenuItems, checkIsAdmin, checkIsAdminOrCSOrPM } from "@/lib/supabaseQueries";
import { DEFAULT_EVENT, QUERY_KEYS, ARIA_LABELS } from "@/lib/constants";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import TickerBar from "./TickerBar";
import { EditableText } from "./editable/EditableText";
import { EditableImage } from "./editable/EditableImage";
import { EditableLink } from "./editable/EditableLink";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isNavbarEditing, setIsNavbarEditing] = useState(false);
  const builder = useBuilderOptional();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<Set<string>>(new Set());
  const [session, setSession] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const { data: menuItems } = useQuery({
    queryKey: [QUERY_KEYS.NAVBAR_MENU_ITEMS],
    queryFn: () => fetchMenuItems("navbar"),
  });

  const { data: eventSettings } = useEventSettings();

  const { data: isAdmin } = useQuery({
    queryKey: [QUERY_KEYS.IS_ADMIN, userId],
    queryFn: () => checkIsAdmin(userId),
    enabled: !!userId,
  });

  const { data: isAdminOrCSOrPM } = useQuery({
    queryKey: [QUERY_KEYS.IS_ADMIN_OR_CS_OR_PM, userId],
    queryFn: () => checkIsAdminOrCSOrPM(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > 10);
      
      const isModalOpen = document.body.classList.contains('modal-open');
      
      if (window.innerWidth < 1024 && !isModalOpen) {
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          setIsHidden(true);
        } else if (currentScrollY < lastScrollY) {
          setIsHidden(false);
        }
      } else {
        setIsHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(!!session);
    setUserId(session?.user?.id || null);
    setUserEmail(session?.user?.email || null);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleMobileDropdown = (itemId: string) => {
    const newOpenDropdowns = new Set(openMobileDropdowns);
    if (newOpenDropdowns.has(itemId)) {
      newOpenDropdowns.delete(itemId);
    } else {
      newOpenDropdowns.add(itemId);
    }
    setOpenMobileDropdowns(newOpenDropdowns);
  };

  const tickerEnabled = (eventSettings as any)?.ticker_enabled && (eventSettings as any)?.ticker_text;

  const navbarEditable = isEditMode && isNavbarEditing;

  return (
    <>
      {/* Persistent admin top bar — visible when logged in as admin/CS/PM */}
      {session && isAdminOrCSOrPM && (
        <div className={`${isEditMode ? 'relative' : 'fixed top-0 left-0 right-0'} z-[102] flex items-center justify-between px-4 py-1.5 border-b border-dashed gap-3`} style={{ background: 'rgba(30,33,40,0.95)', borderColor: 'rgba(77,159,255,0.3)' }}>
          <div className="flex items-center gap-2">
            {isEditMode && (
              !isNavbarEditing ? (
                <button
                  onClick={() => setIsNavbarEditing(true)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-90"
                  style={{ background: '#4d9fff', color: '#fff' }}
                >
                  Edit Navbar
                </button>
              ) : (
                <button
                  onClick={() => setIsNavbarEditing(false)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  Close Navbar Editor
                </button>
              )
            )}
            {userEmail && (
              <span className="text-[11px] text-white/50 hidden md:inline">{userEmail}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                onClick={toggleEditMode}
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-90 flex items-center gap-1.5"
                style={{ background: '#4d9fff', color: '#fff' }}
              >
                <Edit className="h-3 w-3" />
                Edit Mode
              </button>
            )}
            <Link to="/admin">
              <button
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-90 ${
                  location.pathname === '/admin'
                    ? 'bg-primary/20 text-primary'
                    : 'text-white/80 hover:text-white'
                }`}
                style={location.pathname !== '/admin' ? { background: 'rgba(255,255,255,0.1)' } : {}}
              >
                Admin
              </button>
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1 rounded-md text-xs text-white/60 hover:text-white transition-colors"
              aria-label={ARIA_LABELS.LOGOUT}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <EditModeOverride isEditMode={navbarEditable}>
      <div className={`${isEditMode ? 'relative' : `fixed ${session && isAdminOrCSOrPM ? 'top-[33px]' : 'top-0'} left-0 right-0 z-[100]`} transition-all duration-300 ${
        !isEditMode && isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}>
        {tickerEnabled && <TickerBar />}
        <nav className={`${
          isScrolled 
            ? 'bg-[hsl(var(--black-card))]/80 backdrop-blur-lg shadow-[0_8px_30px_rgb(0,0,0,0.3)] border-b border-border' 
            : 'bg-[hsl(var(--black-card))] backdrop-blur-md shadow-lg'
        }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between min-h-20 md:min-h-[100px] py-3">
          {/* Logo Area — Editable */}
          <EditableLink
            pageName="navbar"
            sectionName="logo"
            contentKey="logo-link"
            defaultHref="/"
            className="transition-transform hover:scale-105"
          >
            <div className="flex flex-col gap-2">
              <EditableImage
                pageName="navbar"
                sectionName="logo"
                contentKey="logo-image"
                defaultSrc={eventSettings?.logo_url || "/placeholder.svg"}
                alt={eventSettings?.event_name || DEFAULT_EVENT.NAME}
                className="h-auto max-w-full w-[42%] md:w-[52%] max-h-16 md:max-h-20 object-contain"
              />
              <div className="flex items-center gap-1.5 text-[hsl(var(--black-card-foreground))] text-[11px] md:text-sm">
                <EditableText
                  pageName="navbar"
                  sectionName="logo"
                  contentKey="event-date"
                  defaultValue={eventSettings?.event_date || DEFAULT_EVENT.DATE}
                  className="text-[hsl(var(--black-card-foreground))] text-[11px] md:text-sm whitespace-nowrap"
                  as="span"
                />
                <span className="text-[hsl(var(--black-card-foreground))]">-</span>
                <EditableText
                  pageName="navbar"
                  sectionName="logo"
                  contentKey="event-location"
                  defaultValue={eventSettings?.location || DEFAULT_EVENT.LOCATION}
                  className="text-[hsl(var(--black-card-foreground))] text-[11px] md:text-sm whitespace-nowrap"
                  as="span"
                />
              </div>
            </div>
          </EditableLink>

          {/* Desktop Navigation & Right Buttons (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-5 ml-auto">
            <NavigationMenu className="flex">
              <NavigationMenuList className="space-x-5">
                {menuItems && menuItems.length > 0 ? (
                  (() => {
                    const topLevelItems = menuItems.filter(item => !item.parent_id);
                    return topLevelItems.map((item) => {
                      const children = menuItems.filter(child => child.parent_id === item.id);
                      const hasChildren = children.length > 0;

                      if (hasChildren) {
                        return (
                          <NavigationMenuItem key={item.id} className="relative">
                            <NavigationMenuTrigger className="bg-transparent text-[hsl(var(--black-card-foreground))] hover:text-primary hover:bg-transparent text-sm font-bold tracking-wide data-[state=open]:bg-transparent data-[state=open]:text-primary transition-colors cursor-pointer focus:bg-transparent data-[active]:bg-transparent">
                              {item.label.toUpperCase()}
                            </NavigationMenuTrigger>
                            <NavigationMenuContent className="left-0 top-full mt-2">
                              <ul className="grid w-[200px] gap-1 p-2 bg-[hsl(var(--black-card))] backdrop-blur-lg border border-border/30 rounded-md shadow-xl z-50">
                                 {item.url !== "#" && (
                                   <li>
                                     <NavigationMenuLink asChild>
                                       <Link
                                         to={item.url}
                                         className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-primary/20 hover:text-primary text-[hsl(var(--black-card-foreground))] text-sm font-bold border-b border-border mb-1"
                                         {...(item.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                       >
                                         {item.label}
                                       </Link>
                                     </NavigationMenuLink>
                                   </li>
                                 )}
                                 {children.map((child) => (
                                   <li key={child.id}>
                                     <NavigationMenuLink asChild>
                                       <Link
                                         to={child.url}
                                         className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-primary/20 hover:text-primary text-[hsl(var(--black-card-foreground))] text-sm font-medium"
                                         {...(child.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                       >
                                         {child.label}
                                       </Link>
                                     </NavigationMenuLink>
                                   </li>
                                 ))}
                              </ul>
                            </NavigationMenuContent>
                          </NavigationMenuItem>
                        );
                      }

                      return (
                        <NavigationMenuItem key={item.id}>
                          <Link 
                            to={item.url} 
                            className="relative text-[hsl(var(--black-card-foreground))] hover:text-primary transition-colors text-sm font-bold tracking-wide inline-block px-2 py-2"
                            {...(item.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          >
                            {item.label.toUpperCase()}
                            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-primary scale-x-0 transition-transform duration-300 hover:scale-x-100 origin-center"></span>
                          </Link>
                        </NavigationMenuItem>
                      );
                    });
                  })()
                ) : null}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-[hsl(var(--black-card-foreground))] p-2 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? ARIA_LABELS.CLOSE_MENU : ARIA_LABELS.MENU_TOGGLE}
          >
            {isMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
          </button>
        </div>
      </div>
    </nav>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && !isEditMode && (
        <div 
          className="fixed inset-0 top-[80px] bg-[hsl(var(--black-card))] z-[9999] flex flex-col items-center justify-start space-y-0 overflow-y-auto lg:hidden"
          style={{ display: 'flex' }}
        >
          {menuItems && menuItems.length > 0 ? (
            (() => {
              const topLevelItems = menuItems.filter(item => !item.parent_id);
              return topLevelItems.map((item) => {
                const children = menuItems.filter(child => child.parent_id === item.id);
                const hasChildren = children.length > 0;
                const isOpen = openMobileDropdowns.has(item.id);

                if (hasChildren) {
                  return (
                    <div key={item.id} className="w-full border-b border-border/30">
                      <button
                        onClick={() => toggleMobileDropdown(item.id)}
                        className="w-full text-[hsl(var(--black-card-foreground))] hover:text-primary transition-colors text-xl font-bold font-heading text-center py-4 flex items-center justify-center gap-2"
                      >
                        <span>{item.label.toUpperCase()}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="bg-[hsl(var(--black-card))] border-t border-border/30">
                          {children.map((child) => (
                            <Link
                              key={child.id}
                              to={child.url}
                              className="block text-white hover:text-primary transition-colors text-lg font-medium font-heading text-center py-3"
                              onClick={() => setIsMenuOpen(false)}
                              {...(child.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    to={item.url}
                    className="block text-[hsl(var(--black-card-foreground))] hover:text-primary transition-colors text-xl font-bold font-heading text-center py-4 w-full border-b border-border/30"
                    onClick={() => setIsMenuOpen(false)}
                    {...(item.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <div className="w-[90%] mx-auto">{item.label.toUpperCase()}</div>
                  </Link>
                );
              });
            })()
          ) : null}
        </div>
      )}
      </EditModeOverride>
    </>
  );
};

export default Navbar;
