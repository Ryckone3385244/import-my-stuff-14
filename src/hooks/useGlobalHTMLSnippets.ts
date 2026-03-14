import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Helper to parse HTML string and extract elements
const parseHTMLString = (htmlString: string): DocumentFragment => {
  const template = document.createElement("template");
  template.innerHTML = htmlString.trim();
  return template.content;
};

// Helper to safely inject head elements (meta, link, style, script, etc.)
const injectHeadElements = (htmlString: string, markerId: string) => {
  // Remove any previously injected elements with this marker
  document.querySelectorAll(`[data-global-snippet="${markerId}"]`).forEach(el => el.remove());
  
  const fragment = parseHTMLString(htmlString);
  const children = Array.from(fragment.childNodes);
  
  children.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Clone the element to inject
      const clone = element.cloneNode(true) as Element;
      clone.setAttribute("data-global-snippet", markerId);
      
      if (tagName === "script") {
        // Scripts need to be recreated to execute
        const newScript = document.createElement("script");
        Array.from(clone.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = clone.textContent;
        document.head.appendChild(newScript);
      } else if (["meta", "link", "style", "base", "title"].includes(tagName)) {
        // These are valid head elements - inject directly
        document.head.appendChild(clone);
      } else {
        // For other elements (like noscript in head), also add to head
        document.head.appendChild(clone);
      }
    } else if (node.nodeType === Node.COMMENT_NODE) {
      // Preserve HTML comments
      const comment = document.createComment(node.textContent || "");
      document.head.appendChild(comment);
    }
  });
};

// Helper to inject body elements
const injectBodyElements = (htmlString: string, markerId: string, position: "start" | "end") => {
  // Remove any previously injected container with this marker
  const existingContainer = document.getElementById(markerId);
  if (existingContainer) {
    existingContainer.remove();
  }
  
  const container = document.createElement("div");
  container.id = markerId;
  container.setAttribute("data-global-snippet", markerId);
  container.innerHTML = htmlString;
  
  // Execute any scripts within
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
  
  if (position === "start" && document.body.firstChild) {
    document.body.insertBefore(container, document.body.firstChild);
  } else {
    document.body.appendChild(container);
  }
};

export const useGlobalHTMLSnippets = () => {
  useEffect(() => {
    let cancelled = false;

    const loadSnippets = async () => {
      try {
        const { data, error } = await supabase
          .from("global_html_snippets")
          .select("before_head_end, after_body_start, before_body_end")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || error || !data) return;

        // Inject before_head_end (meta tags, scripts, styles, etc.)
        if (data.before_head_end) {
          injectHeadElements(data.before_head_end, "global-head-snippets");
        } else {
          document
            .querySelectorAll('[data-global-snippet="global-head-snippets"]')
            .forEach((el) => el.remove());
        }

        // Inject after_body_start (noscript fallbacks, etc.)
        if (data.after_body_start) {
          injectBodyElements(
            data.after_body_start,
            "global-body-start-snippets",
            "start"
          );
        } else {
          document.getElementById("global-body-start-snippets")?.remove();
        }

        // Inject before_body_end scripts
        if (data.before_body_end) {
          injectBodyElements(data.before_body_end, "global-body-end-snippets", "end");
        } else {
          document.getElementById("global-body-end-snippets")?.remove();
        }
      } catch (error) {
        console.error("Error loading global HTML snippets:", error);
      }
    };

    loadSnippets();

    // Live-update when admin changes Global HTML
    const channel = supabase
      .channel("global_html_snippets_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_html_snippets" },
        () => loadSnippets()
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
      document.querySelectorAll('[data-global-snippet]').forEach((el) => el.remove());
    };
  }, []);
};
