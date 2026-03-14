import { Link } from "react-router-dom";
import { useEventSettings } from "@/hooks/useEventSettings";

const TickerBar = () => {
  const { data: eventSettings } = useEventSettings();

  // Don't render if ticker is not enabled or no text
  if (!eventSettings?.ticker_enabled || !eventSettings?.ticker_text) {
    return null;
  }

  const hasLink = eventSettings.ticker_link_text && eventSettings.ticker_link_url;

  return (
    <div className="bg-primary text-primary-foreground py-1.5 md:py-2 px-3 md:px-4 text-center text-xs md:text-sm font-medium leading-tight whitespace-nowrap overflow-hidden">
      <span>{eventSettings.ticker_text}</span>
      {hasLink && (
        <>
          {" "}
          {eventSettings.ticker_link_url?.startsWith("/") ? (
            <Link
              to={eventSettings.ticker_link_url}
              className="underline hover:no-underline font-bold"
            >
              {eventSettings.ticker_link_text}
            </Link>
          ) : (
            <a
              href={eventSettings.ticker_link_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline font-bold"
            >
              {eventSettings.ticker_link_text}
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default TickerBar;
