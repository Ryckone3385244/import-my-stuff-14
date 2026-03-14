import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Sets the favicon for the site.
 * If a custom favicon URL is provided (uploaded by admin), it uses that directly.
 * Otherwise, generates a dynamic favicon based on event name and primary color.
 */
export const useDynamicFavicon = (eventName?: string, faviconUrl?: string | null) => {
  const { stylesLoaded } = useTheme();

  useEffect(() => {
    // If a custom favicon URL is uploaded, use it directly
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = faviconUrl;
      return;
    }

    // Otherwise, auto-generate from event name
    if (!stylesLoaded || !eventName) return;

    const firstLetter = eventName.trim().charAt(0).toUpperCase();

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryHsl = computedStyle.getPropertyValue("--primary").trim();
    const primaryColor = primaryHsl ? `hsl(${primaryHsl})` : "#00C389";

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = primaryColor;
    ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(firstLetter, 32, 35);

    const faviconDataUrl = canvas.toDataURL("image/png");

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.type = "image/png";
    link.href = faviconDataUrl;
  }, [stylesLoaded, eventName, faviconUrl]);
};
