import { useEffect } from "react";

/**
 * Per-page <title> and meta tags (the TanStack routes declared these in
 * `head()`; React Router leaves it to the page).
 */
export function useDocumentMeta(meta: {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
}) {
  const { title, description, ogTitle, ogDescription } = meta;
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", ogTitle);
    setMeta("property", "og:description", ogDescription);
  }, [title, description, ogTitle, ogDescription]);
}

function setMeta(attr: "name" | "property", key: string, content: string | undefined) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
