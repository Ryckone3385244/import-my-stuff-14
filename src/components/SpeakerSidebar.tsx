import { User, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const menuItems = [
  { id: "home", label: "Home", url: "/speaker-portal" },
  { id: "profile", label: "Your Profile", url: "/speaker-portal/profile" },
  { id: "upload", label: "Upload Your Form", url: "/speaker-portal/upload" },
  { id: "session", label: "Your Session", url: "/speaker-portal/session" },
  { id: "contact", label: "Contact Us", url: "/speaker-portal/contact" },
];

export function SpeakerSidebar({ 
  speakerName, 
  photoUrl, 
  renderTrigger, 
  alwaysVisible 
}: { 
  speakerName?: string; 
  photoUrl?: string; 
  renderTrigger?: boolean; 
  alwaysVisible?: boolean;
}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  const sidebarContent = (
    <>
      <Link 
        to="/speaker-portal"
        className="block p-4 border-b bg-card hover:bg-muted/50 transition-colors cursor-pointer rounded-t-lg"
      >
        <div className="w-36 h-36 mx-auto bg-card border border-border rounded-full flex items-center justify-center overflow-hidden p-1">
          {photoUrl ? (
            <img src={photoUrl} alt={speakerName || "Speaker photo"} className="w-full h-full object-cover rounded-full" />
          ) : (
            <User className="h-16 w-16 text-muted-foreground" />
          )}
        </div>
        {speakerName && (
          <div className="text-center mt-3">
            <h2 className="font-bold text-sm">{speakerName}</h2>
          </div>
        )}
      </Link>

      <div className="p-3 space-y-1 bg-card rounded-b-lg">
        {menuItems.map(item => (
          <Link
            key={item.id}
            to={item.url}
            className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 text-sm ${
              isActive(item.url) ? 'bg-muted font-medium' : ''
            }`}
          >
            <span>{item.label}</span>
          </Link>
        ))}
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