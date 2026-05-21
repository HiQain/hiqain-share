import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toRenderableBlogHtml } from "@/components/blog-content";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ label, onClick, children }: ToolbarButtonProps) {
  return (
    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={onClick} aria-label={label}>
      {children}
    </Button>
  );
}

function replaceLegacyFontSizeMarkup(html: string): string {
  return html
    .replace(/<font size="2">([\s\S]*?)<\/font>/gi, '<span style="font-size: 14px">$1</span>')
    .replace(/<font size="3">([\s\S]*?)<\/font>/gi, '<span style="font-size: 16px">$1</span>')
    .replace(/<font size="5">([\s\S]*?)<\/font>/gi, '<span style="font-size: 18px">$1</span>')
    .replace(/<font size="7">([\s\S]*?)<\/font>/gi, '<span style="font-size: 24px">$1</span>');
}

export function RichTextEditor({ label, placeholder, value, onChange, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const [fontSize, setFontSize] = useState("base");
  const normalizedValue = useMemo(() => toRenderableBlogHtml(value), [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML === normalizedValue) return;
    editorRef.current.innerHTML = normalizedValue;
  }, [normalizedValue]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    onChange(replaceLegacyFontSizeMarkup(editorRef.current.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const applyFontSize = (nextSize: string) => {
    setFontSize(nextSize);
    const commandValue =
      nextSize === "sm" ? "2" : nextSize === "lg" ? "5" : nextSize === "xl" ? "7" : "3";
    runCommand("fontSize", commandValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label id={labelId} className="text-sm font-medium">
        {label}
      </label>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/30 p-3">
          <ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => runCommand("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => runCommand("underline")}>
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 1" onClick={() => runCommand("formatBlock", "<h1>")}>
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 2" onClick={() => runCommand("formatBlock", "<h2>")}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Paragraph" onClick={() => runCommand("formatBlock", "<p>")}>
            <Pilcrow className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Undo" onClick={() => runCommand("undo")}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => runCommand("redo")}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="ml-auto min-w-32">
            <Select value={fontSize} onValueChange={applyFontSize}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Font size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="base">Normal</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div
          ref={editorRef}
          role="textbox"
          aria-labelledby={labelId}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder ?? ""}
          onInput={emitChange}
          className={cn(
            "min-h-[260px] bg-background px-4 py-4 text-base outline-none",
            "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
            "[&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold",
            "[&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
            "[&_p]:mb-3 [&_p]:min-h-[1.5rem]",
            "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6",
            "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:mb-1",
          )}
        />
      </div>
    </div>
  );
}
