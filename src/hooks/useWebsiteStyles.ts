import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWebsiteStyles = () => {
  const [stylesLoaded, setStylesLoaded] = useState(false);


  useEffect(() => {
    const parseHslTriplet = (value: string) => {
      // Expected: "H S% L%" (commas tolerated). Returns null if invalid.
      const parts = value.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
      if (parts.length < 3) return null;

      const h = Number.parseFloat(parts[0]);
      const s = Number.parseFloat(parts[1].replace('%', ''));
      const l = Number.parseFloat(parts[2].replace('%', ''));

      if ([h, s, l].some((n) => Number.isNaN(n))) return null;
      return { h, s, l };
    };

    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

    const adjustHslLightness = (hsl: string, delta: number) => {
      const parsed = parseHslTriplet(hsl);
      if (!parsed) return null;

      const { h, s, l } = parsed;
      const nextL = clamp(l + delta, 0, 100);
      return `${h} ${s}% ${nextL}%`;
    };

    const applyStylesToDOM = (data: any) => {
      if (!data) {
        console.log('[WebsiteStyles] No style data to apply');
        return;
      }
      
      console.log('[WebsiteStyles] Applying styles to DOM:', Object.keys(data).length, 'properties');

      const root = document.documentElement;
      
      // Apply colors
      if (data.background_color) root.style.setProperty('--background', data.background_color);
      if (data.foreground_color) root.style.setProperty('--foreground', data.foreground_color);
      if (data.muted_color) root.style.setProperty('--muted', data.muted_color);
      
      // Apply card colors
      if (data.card_background_color) root.style.setProperty('--card', data.card_background_color);
      if (data.card_text_color) root.style.setProperty('--card-foreground', data.card_text_color);
      if (data.card_title_color) root.style.setProperty('--card-title', data.card_title_color);
      
      // Apply green card colors
      if (data.green_card_background_color) root.style.setProperty('--green-card', data.green_card_background_color);
      if (data.green_card_text_color) root.style.setProperty('--green-card-foreground', data.green_card_text_color);
      if (data.green_card_title_color) root.style.setProperty('--green-card-title', data.green_card_title_color);
      
      // Apply black card colors
      if (data.black_card_background_color) root.style.setProperty('--black-card', data.black_card_background_color);
      if (data.black_card_text_color) root.style.setProperty('--black-card-foreground', data.black_card_text_color);
      if (data.black_card_title_color) root.style.setProperty('--black-card-title', data.black_card_title_color);
      
      // Apply gray card colors
      if (data.gray_card_background_color) root.style.setProperty('--gray-card', data.gray_card_background_color);
      if (data.gray_card_text_color) root.style.setProperty('--gray-card-foreground', data.gray_card_text_color);
      if (data.gray_card_title_color) root.style.setProperty('--gray-card-title', data.gray_card_title_color);
      
      // Apply transparent card colors
      if (data.transparent_card_text_color) root.style.setProperty('--transparent-card-foreground', data.transparent_card_text_color);
      if (data.transparent_card_title_color) root.style.setProperty('--transparent-card-title', data.transparent_card_title_color);
      
      // Apply brand colors
      if (data.primary_color) {
        root.style.setProperty('--primary', data.primary_color);

        // Ensure derived tokens follow the brand color too (important for remix + export/import consistency)
        const glow = adjustHslLightness(data.primary_color, 10);
        const dark = adjustHslLightness(data.primary_color, -10);
        if (glow) root.style.setProperty('--primary-glow', glow);
        if (dark) root.style.setProperty('--primary-dark', dark);
      }
      if (data.secondary_color) root.style.setProperty('--secondary', data.secondary_color);
      if (data.accent_color) root.style.setProperty('--accent', data.accent_color);

      // Apply gradient colors and angle
      if (data.gradient_start_color) root.style.setProperty('--gradient-start', `hsl(${data.gradient_start_color})`);
      if (data.gradient_end_color) root.style.setProperty('--gradient-end', `hsl(${data.gradient_end_color})`);
      if (data.gradient_angle) root.style.setProperty('--gradient-angle', data.gradient_angle);
      
      // Build admin gradient using CSS variables
      if (data.gradient_start_color && data.gradient_end_color) {
        const angle = data.gradient_angle || '135deg';
        const gradient = `linear-gradient(${angle}, hsl(${data.gradient_start_color}) 0%, hsl(${data.gradient_end_color}) 100%)`;
        root.style.setProperty('--gradient-primary', gradient);
        root.style.setProperty('--gradient-title', gradient);
        root.style.setProperty('--gradient-admin', gradient);
      }

      // Apply header sizes
      if (data.h1_size) root.style.setProperty('--h1-size', data.h1_size);
      if (data.h2_size) root.style.setProperty('--h2-size', data.h2_size);
      if (data.h3_size) root.style.setProperty('--h3-size', data.h3_size);
      if (data.h4_size) root.style.setProperty('--h4-size', data.h4_size);
      if (data.h5_size) root.style.setProperty('--h5-size', data.h5_size);
      if (data.h6_size) root.style.setProperty('--h6-size', data.h6_size);

      // Apply typography - quote font names with spaces for CSS font-family
      const quoteFontFamily = (font: string) => {
        if (!font) return font;
        // If font name contains spaces and isn't already quoted, wrap in quotes
        if (font.includes(' ') && !font.startsWith('"') && !font.startsWith("'")) {
          return `"${font}"`;
        }
        return font;
      };

      const normalizeFontFamily = (font: string) => (font || '').replace(/^["']|["']$/g, '').trim().toLowerCase();
      
      if (data.font_family_heading) {
        root.style.setProperty('--font-heading', quoteFontFamily(data.font_family_heading));
      }
      if (data.font_family_body) {
        root.style.setProperty('--font-body', quoteFontFamily(data.font_family_body));
      }

      // Map heading sizes to text utility variables
      // text-5xl maps to h1, text-4xl to h2, etc.
      if (data.h1_size) root.style.setProperty('--text-5xl', data.h1_size);
      if (data.h2_size) root.style.setProperty('--text-4xl', data.h2_size);
      if (data.h3_size) root.style.setProperty('--text-3xl', data.h3_size);
      if (data.h4_size) root.style.setProperty('--text-2xl', data.h4_size);
      if (data.h5_size) root.style.setProperty('--text-xl', data.h5_size);
      if (data.h6_size) root.style.setProperty('--text-lg', data.h6_size);
      
      // Base text size (1rem default, can be customized)
      root.style.setProperty('--text-base', '1rem');
      root.style.setProperty('--text-sm', '0.875rem');
      root.style.setProperty('--text-xs', '0.75rem');
      
      // Typography properties
      root.style.setProperty('--line-height-base', '1.5');
      root.style.setProperty('--line-height-heading', '1.2');
      root.style.setProperty('--letter-spacing-base', 'normal');
      root.style.setProperty('--letter-spacing-heading', '-0.02em');
      root.style.setProperty('--font-weight-heading', '700');
      root.style.setProperty('--font-weight-body', '400');

      // Apply border radius
      if (data.border_radius) root.style.setProperty('--radius', data.border_radius);

      // Apply card padding
      if (data.card_padding) root.style.setProperty('--card-padding', data.card_padding);

      // Apply image border radius and padding
      if (data.image_border_radius) root.style.setProperty('--image-border-radius', data.image_border_radius);
      if (data.image_padding) root.style.setProperty('--image-padding', data.image_padding);

      // Apply button 1 styles
      if (data.button_color) root.style.setProperty('--button-color', data.button_color);
      if (data.button_text_color) root.style.setProperty('--button-foreground', data.button_text_color);
      if (data.button_border) root.style.setProperty('--button-border', data.button_border);
      if (data.button_border_radius) root.style.setProperty('--button-border-radius', data.button_border_radius);
      if (data.button_padding) root.style.setProperty('--button-padding', data.button_padding);
      if (data.button_font_size) root.style.setProperty('--button-font-size', data.button_font_size);
      if (data.button_font_weight) root.style.setProperty('--button-font-weight', data.button_font_weight);
      if (data.button_font_style) root.style.setProperty('--button-font-style', data.button_font_style);
      if (data.button_text_transform) root.style.setProperty('--button-text-transform', data.button_text_transform);

      // Apply button 2 styles
      if (data.button_2_color) root.style.setProperty('--button-2-color', data.button_2_color);
      if (data.button_2_text_color) root.style.setProperty('--button-2-foreground', data.button_2_text_color);
      if (data.button_2_border) root.style.setProperty('--button-2-border', data.button_2_border);
      if (data.button_2_border_radius) root.style.setProperty('--button-2-border-radius', data.button_2_border_radius);
      if (data.button_2_padding) root.style.setProperty('--button-2-padding', data.button_2_padding);
      if (data.button_2_font_size) root.style.setProperty('--button-2-font-size', data.button_2_font_size);
      if (data.button_2_font_weight) root.style.setProperty('--button-2-font-weight', data.button_2_font_weight);
      if (data.button_2_font_style) root.style.setProperty('--button-2-font-style', data.button_2_font_style);
      if (data.button_2_text_transform) root.style.setProperty('--button-2-text-transform', data.button_2_text_transform);

      // Apply typography settings
      if (data.heading_text_transform) root.style.setProperty('--heading-text-transform', data.heading_text_transform);
      if (data.hero_title_size) root.style.setProperty('--hero-title-size', data.hero_title_size);
      if (data.hero_title_size_mobile) root.style.setProperty('--hero-title-size-mobile', data.hero_title_size_mobile);
      if (data.navbar_menu_size) root.style.setProperty('--navbar-menu-size', data.navbar_menu_size);

      // Load Adobe Fonts FIRST if URL is provided (takes priority over Google Fonts)
      if (data.adobe_fonts_url) {
        const existingLink = document.querySelector('link[data-website-fonts="adobe"]');
        if (existingLink) {
          existingLink.remove();
        }
        
        const link = document.createElement('link');
        link.href = data.adobe_fonts_url;
        link.rel = 'stylesheet';
        link.setAttribute('data-website-fonts', 'adobe');
        document.head.appendChild(link);
        console.log('[WebsiteStyles] Loaded Adobe Fonts:', data.adobe_fonts_url);

        // If the admin saved a friendly display name (e.g. "ATF Railroad Gothic") instead of the CSS family
        // (e.g. "railroad-gothic-atf"), detect the correct family from the kit CSS and map it.
        (async () => {
          try {
            const res = await fetch(data.adobe_fonts_url, { cache: 'no-store' });
            if (!res.ok) return;
            const cssText = await res.text();
            const families = Array.from(
              new Set(Array.from(cssText.matchAll(/font-family:\s*"([^"]+)"/g)).map((m) => m[1]))
            );

            const desired = normalizeFontFamily(data.font_family_heading || '');
            const matchesDesired = desired
              ? families.some((f) => normalizeFontFamily(f) === desired)
              : false;

            if (!matchesDesired && families.length > 0) {
              root.style.setProperty('--font-heading', quoteFontFamily(families[0]));
              console.log('[WebsiteStyles] Mapped Adobe heading font-family to:', families[0]);
              window.dispatchEvent(new CustomEvent('styles-updated'));
            }
          } catch (e) {
            // Non-blocking: if this fails, the saved font family may still be correct.
            console.warn('[WebsiteStyles] Could not inspect Adobe kit CSS for font-family mapping');
          }
        })();
      } else {
        // Only load Google Fonts if no Adobe Fonts URL is set
        const loadGoogleFonts = () => {
          const existingLink = document.querySelector('link[data-website-fonts="google"]');
          if (existingLink) {
            existingLink.remove();
          }

          // Collect font families to load
          const fontsToLoad: string[] = [];
          if (data.font_family_heading) fontsToLoad.push(data.font_family_heading);
          if (data.font_family_body && data.font_family_body !== data.font_family_heading) {
            fontsToLoad.push(data.font_family_body);
          }

          // Skip if no custom fonts or using system fonts
          const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia'];
          const customFonts = fontsToLoad.filter(font => !systemFonts.some(sf => font.toLowerCase().includes(sf.toLowerCase())));
          
          if (customFonts.length === 0) return;

          // Build Google Fonts URL
          const fontParams = customFonts.map(font => {
            const fontName = font.replace(/\s+/g, '+');
            return `family=${fontName}:wght@400;500;600;700`;
          }).join('&');

          const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
          
          const link = document.createElement('link');
          link.href = googleFontsUrl;
          link.rel = 'stylesheet';
          link.setAttribute('data-website-fonts', 'google');
          document.head.appendChild(link);
          
          console.log('[WebsiteStyles] Loaded Google Fonts:', googleFontsUrl);
        };

        loadGoogleFonts();
      }
      // Force a re-render by triggering a custom event
      window.dispatchEvent(new CustomEvent('styles-updated'));
      console.log('[WebsiteStyles] Styles applied successfully');
    };

    const loadStyles = async () => {
      console.log('[WebsiteStyles] Loading styles from database...');
      try {
        const { data, error } = await supabase
          .from('website_styles')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[WebsiteStyles] Error loading website styles:', error);
          setStylesLoaded(true);
          return;
        }

        if (!data) {
          console.warn('[WebsiteStyles] No styles found in database - using defaults');
          setStylesLoaded(true);
          return;
        }

        console.log('[WebsiteStyles] Loaded styles:', data);
        applyStylesToDOM(data);
        setStylesLoaded(true);
      } catch (error) {
        console.error('[WebsiteStyles] Error loading website styles:', error);
        setStylesLoaded(true);
      }
    };

    // Load styles initially
    loadStyles();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('website_styles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'website_styles'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            applyStylesToDOM(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { stylesLoaded };
};
