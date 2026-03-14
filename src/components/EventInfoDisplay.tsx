import { Calendar, MapPin, Clock } from "lucide-react";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";

interface EventInfoCardProps {
  type: "date" | "location" | "duration";
  className?: string;
}

/**
 * EventInfoCard - Displays event information directly from event_settings table.
 * This ensures that when admin updates event settings, it reflects on public pages.
 */
export const EventInfoCard = ({ type, className = "" }: EventInfoCardProps) => {
  const { data: eventSettings, isLoading } = useEventSettings();

  const getIcon = () => {
    switch (type) {
      case "date":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "location":
        return <MapPin className="w-5 h-5 text-primary" />;
      case "duration":
        return <Clock className="w-5 h-5 text-primary" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "date":
        return "Date";
      case "location":
        return "Location";
      case "duration":
        return "Duration";
    }
  };

  const getValue = () => {
    if (isLoading) {
      return "Loading...";
    }
    
    switch (type) {
      case "date":
        return eventSettings?.event_date || DEFAULT_EVENT.DATE;
      case "location":
        return eventSettings?.location || DEFAULT_EVENT.LOCATION;
      case "duration":
        // Duration is not in event_settings, so use a static default
        return "2 Full Days";
    }
  };

  return (
    <div className={`h-full flex flex-col justify-center p-6 rounded-xl bg-black border border-white/20 shadow-card hover:shadow-card-hover transition-all duration-300 group ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {getIcon()}
        <h3 className="font-semibold text-white">{getTitle()}</h3>
      </div>
      <p className="text-gray-300 text-center">{getValue()}</p>
    </div>
  );
};

interface EventInfoTextProps {
  field: "event_date" | "location" | "event_name" | "address_line_1" | "address_line_2" | "address_line_3" | "tagline";
  fallback?: string;
  className?: string;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3";
}

/**
 * EventInfoText - Displays a single event setting field.
 * Use this when you need inline event information in any component.
 */
export const EventInfoText = ({ 
  field, 
  fallback, 
  className = "", 
  as: Component = "span" 
}: EventInfoTextProps) => {
  const { data: eventSettings, isLoading } = useEventSettings();

  const getDefaultFallback = () => {
    switch (field) {
      case "event_date":
        return DEFAULT_EVENT.DATE;
      case "location":
        return DEFAULT_EVENT.LOCATION;
      case "event_name":
        return DEFAULT_EVENT.NAME;
      case "address_line_1":
        return DEFAULT_EVENT.ADDRESS_LINE_1;
      case "address_line_2":
        return DEFAULT_EVENT.ADDRESS_LINE_2;
      case "address_line_3":
        return DEFAULT_EVENT.ADDRESS_LINE_3;
      case "tagline":
        return "";
      default:
        return "";
    }
  };

  if (isLoading) {
    return <Component className={className}>{fallback || getDefaultFallback()}</Component>;
  }

  const value = eventSettings?.[field] || fallback || getDefaultFallback();
  
  return <Component className={className}>{value}</Component>;
};

interface EventInfoRowProps {
  showDate?: boolean;
  showLocation?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

/**
 * EventInfoRow - Horizontal display of event date and/or location with icons.
 * Great for hero sections and page headers.
 */
export const EventInfoRow = ({
  showDate = true,
  showLocation = true,
  className = "flex flex-col sm:flex-row gap-4 justify-center items-center",
  iconClassName = "h-6 w-6 text-primary",
  textClassName = "font-semibold"
}: EventInfoRowProps) => {
  const { data: eventSettings } = useEventSettings();

  return (
    <div className={className}>
      {showDate && (
        <div className="flex items-center gap-2">
          <Calendar className={iconClassName} />
          <span className={textClassName}>
            {eventSettings?.event_date || DEFAULT_EVENT.DATE}
          </span>
        </div>
      )}
      {showLocation && (
        <div className="flex items-center gap-2">
          <MapPin className={iconClassName} />
          <span className={textClassName}>
            {eventSettings?.location || DEFAULT_EVENT.LOCATION}
          </span>
        </div>
      )}
    </div>
  );
};
