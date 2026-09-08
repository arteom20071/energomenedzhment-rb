import { useEffect, useRef, useState } from "react";

import type { SlideElement } from "../../domain/presentation";

export interface TextInlineEditorProps {
  element: SlideElement;
  scale: number;
  onCommit: (content: string) => void;
  onCancel: () => void;
}

export function TextInlineEditor({
  element,
  scale,
  onCommit,
  onCancel,
}: TextInlineEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const [initialContent] = useState(element.content ?? "");

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const style = {
    position: "absolute" as const,
    left: `${element.x * scale}px`,
    top: `${element.y * scale}px`,
    width: `${element.width * scale}px`,
    height: `${element.height * scale}px`,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "center center",
    zIndex: element.zIndex + 1000,
    outline: "2px solid rgb(99 102 241)",
    overflow: "auto" as const,
  };

  return (
    <div
      ref={editorRef}
      role="textbox"
      aria-label="Edit text"
      contentEditable
      suppressContentEditableWarning
      data-testid={`text-editor-${element.id}`}
      style={style}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelledRef.current = true;
          onCancel();
        }
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onCommit(editorRef.current?.textContent ?? "");
        }
        event.stopPropagation();
      }}
      onBlur={() => {
        if (cancelledRef.current) {
          cancelledRef.current = false;
          return;
        }
        onCommit(editorRef.current?.textContent ?? "");
      }}
    >
      {initialContent}
    </div>
  );
}
