import { useState, useEffect } from "react";
import { useEventSettings } from "@/hooks/useEventSettings";
import { parse, differenceInMonths, differenceInDays, differenceInHours, differenceInMinutes, addMonths } from "date-fns";

interface TimeUnit {
  value: number;
  label: string;
}

export const EventCountdown = () => {
  const { data: eventSettings } = useEventSettings();
  const [countdown, setCountdown] = useState<TimeUnit[]>([]);

  useEffect(() => {
    if (!eventSettings?.event_date) return;

    const calculateCountdown = () => {
      // Parse the event date - handle various formats:
      // "29 & 30 September 2026", "29th & 30th September 2026", "September 9 & 10, 2026"
      const dateString = eventSettings.event_date;
      
      // Try format: "Month Day & Day, Year" (e.g. "September 9 & 10, 2026")
      const monthFirstMatch = dateString.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:&\s*\d{1,2}(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
      // Try format: "Day & Day Month Year" (e.g. "29 & 30 September 2026")
      const dayFirstMatch = dateString.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:&\s*\d{1,2}(?:st|nd|rd|th)?)?\s+(\w+)\s+(\d{4})/);
      
      let eventDate: Date;
      if (monthFirstMatch) {
        const [, month, day, year] = monthFirstMatch;
        eventDate = parse(`${day} ${month} ${year}`, "d MMMM yyyy", new Date());
      } else if (dayFirstMatch) {
        const [, day, month, year] = dayFirstMatch;
        eventDate = parse(`${day} ${month} ${year}`, "d MMMM yyyy", new Date());
      } else {
        return;
      }
      
      if (isNaN(eventDate.getTime())) return;

      const now = new Date();
      
      if (eventDate <= now) {
        setCountdown([
          { value: 0, label: "months" },
          { value: 0, label: "days" },
          { value: 0, label: "hours" },
          { value: 0, label: "minutes" },
        ]);
        return;
      }

      // Calculate months
      const months = differenceInMonths(eventDate, now);
      
      // Calculate remaining days after months
      const afterMonths = addMonths(now, months);
      const days = differenceInDays(eventDate, afterMonths);
      
      // Calculate remaining hours after days
      const totalHours = differenceInHours(eventDate, now);
      const hours = totalHours % 24;
      
      // Calculate remaining minutes after hours
      const totalMinutes = differenceInMinutes(eventDate, now);
      const minutes = totalMinutes % 60;

      setCountdown([
        { value: months, label: months === 1 ? "month" : "months" },
        { value: days, label: days === 1 ? "day" : "days" },
        { value: hours, label: hours === 1 ? "hour" : "hours" },
        { value: minutes, label: minutes === 1 ? "minute" : "minutes" },
      ]);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [eventSettings?.event_date]);

  if (!eventSettings?.event_date || countdown.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="text-xl font-semibold text-foreground">Countdown to the event:</h3>
        <div className="flex gap-4 flex-wrap">
          {countdown.map((unit, index) => (
            <div
              key={index}
              className="flex flex-col items-center bg-primary/10 rounded-lg px-4 py-3 min-w-[80px]"
            >
              <span className="text-3xl font-bold text-primary">{unit.value}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{unit.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
