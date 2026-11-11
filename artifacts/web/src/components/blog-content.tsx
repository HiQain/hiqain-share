import { cn } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function convertPlainTextToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function stripInlineTextColor(value: string): string {
  return (
    value
      // Remove `color: ...;` declarations from inline style attributes (keeps background-color).
      .replace(/(?<![-\w])color\s*:\s*[^;"']+;?/gi, "")
      // Drop now-empty style attributes left behind.
      .replace(/\sstyle=("|')\s*\1/gi, "")
      // Remove legacy <font color="..."> attributes.
      .replace(/(<font[^>]*?)\scolor=("|')[^"']*\2/gi, "$1")
  );
}

function sanitizeRichHtml(value: string): string {
  return stripInlineTextColor(
    value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, ""),
  );
}

export function toRenderableBlogHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  const html = looksLikeHtml ? trimmed : convertPlainTextToHtml(trimmed);
  return sanitizeRichHtml(html);
}

type BlogContentProps = {
  content: string;
  className?: string;
};

export function BlogContent({ content, className }: BlogContentProps) {
  return (
    <div
      className={cn(
        "prose max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:text-muted-foreground prose-li:text-muted-foreground",
        "prose-strong:text-foreground prose-a:text-primary",
        "prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: toRenderableBlogHtml(content) }}
    />
  );
}
