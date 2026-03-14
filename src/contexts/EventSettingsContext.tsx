import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEventSettings } from "@/lib/supabaseQueries";
import { QUERY_KEYS, DEFAULT_EVENT } from "@/lib/constants";

// Type for event settings from database
interface EventSettings {
  id: string;
  event_name: string;
  event_date: string;
  location: string;
  tagline: string;
  address_line_1: string | null;
  address_line_2: string | null;
  address_line_3: string | null;
  logo_url: string | null;
  copyright_text: string | null;
  // Add other fields as needed
  [key: string]: any;
}

interface EventSettingsContextType {
  eventSettings: EventSettings | null | undefined;
  isLoading: boolean;
  error: Error | null;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventTagline: string;
  replacePlaceholders: (text: string | null | undefined) => string;
}

const EventSettingsContext = createContext<EventSettingsContextType | undefined>(undefined);

/**
 * Replaces placeholder tokens in text with actual event settings values.
 * Supported placeholders (case-insensitive): {eventName}, {eventDate}, {eventLocation}, {eventTagline}
 * Also handles variations like {eventname}, {EVENTNAME}, {eventTagline}, {eventtagline}, etc.
 */
export const createPlaceholderReplacer = (settings: EventSettings | null | undefined) => {
  const eventName = settings?.event_name || DEFAULT_EVENT.NAME;
  const eventDate = settings?.event_date || DEFAULT_EVENT.DATE;
  const eventLocation = settings?.location || DEFAULT_EVENT.LOCATION;
  const eventTagline = settings?.tagline || "";
  const contactEmail = settings?.contact_email || "";

  return (text: string | null | undefined): string => {
    if (!text) return "";
    
    // Case-insensitive replacements using regex with 'i' flag
    return text
      .replace(/{eventName}/gi, eventName)
      .replace(/{eventDate}/gi, eventDate)
      .replace(/{eventLocation}/gi, eventLocation)
      .replace(/{eventTagline}/gi, eventTagline)
      .replace(/{contactEmail}/gi, contactEmail);
  };
};

/**
 * Standalone helper function for replacing placeholders when you have settings object
 */
export const replacePlaceholders = (
  text: string | null | undefined,
  settings: EventSettings | null | undefined
): string => {
  const replacer = createPlaceholderReplacer(settings);
  return replacer(text);
};

export const EventSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data: eventSettings, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.EVENT_SETTINGS],
    queryFn: fetchEventSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
  });

  // Derive common values with memoization
  const eventName = eventSettings?.event_name || DEFAULT_EVENT.NAME;
  const eventDate = eventSettings?.event_date || DEFAULT_EVENT.DATE;
  const eventLocation = eventSettings?.location || DEFAULT_EVENT.LOCATION;
  const eventTagline = eventSettings?.tagline || "";

  // Create the replacer function
  const replacePlaceholdersFn = useMemo(
    () => createPlaceholderReplacer(eventSettings),
    [eventSettings]
  );

  const value: EventSettingsContextType = useMemo(
    () => ({
      eventSettings,
      isLoading,
      error: error as Error | null,
      eventName,
      eventDate,
      eventLocation,
      eventTagline,
      replacePlaceholders: replacePlaceholdersFn,
    }),
    [eventSettings, isLoading, error, eventName, eventDate, eventLocation, eventTagline, replacePlaceholdersFn]
  );

  return (
    <EventSettingsContext.Provider value={value}>
      {children}
    </EventSettingsContext.Provider>
  );
};

export const useEventSettingsContext = () => {
  const context = useContext(EventSettingsContext);
  if (context === undefined) {
    throw new Error("useEventSettingsContext must be used within an EventSettingsProvider");
  }
  return context;
};

export default EventSettingsContext;
