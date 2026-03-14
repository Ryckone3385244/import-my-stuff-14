import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useEventSettings } from '@/hooks/useEventSettings';

export const AnnouncementPopup = () => {
  const { data: eventSettings } = useEventSettings();
  const [isOpen, setIsOpen] = useState(false);

  const popupEnabled = (eventSettings as any)?.popup_enabled;
  const popupImageUrl = (eventSettings as any)?.popup_image_url;
  const popupLinkUrl = (eventSettings as any)?.popup_link_url;

  useEffect(() => {
    if (popupEnabled && popupImageUrl) {
      setIsOpen(true);
    }
  }, [popupEnabled, popupImageUrl]);

  if (!isOpen || !popupEnabled || !popupImageUrl) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleImageClick = () => {
    if (popupLinkUrl) {
      const isExternal = popupLinkUrl.startsWith('http://') || popupLinkUrl.startsWith('https://');
      if (isExternal) {
        window.open(popupLinkUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = popupLinkUrl;
      }
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-[fade-in_0.5s_ease-out]"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl w-full animate-[scale-in_0.6s_ease-out]">
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 md:top-2 md:right-2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          aria-label="Close popup"
        >
          <X className="h-6 w-6" />
        </button>
        
        <img
          src={popupImageUrl}
          alt="Announcement"
          className={`w-full max-h-[80vh] object-contain rounded-lg shadow-2xl ${popupLinkUrl ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
          onClick={popupLinkUrl ? handleImageClick : undefined}
        />
      </div>
    </div>
  );
};
