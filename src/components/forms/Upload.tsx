import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { cn } from "@/utils";

export default function Upload({
  title = "Upload certificate or product image",
  hint = "Drag & drop PDF, JPG or PNG · Maximum 10 MB",
  onFile,
}: {
  title?: string;
  hint?: string;
  onFile?: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (name?: string) => {
    if (!name) return;
    setFileName(name);
    onFile?.(name);
  };

  return (
    <div
      className={cn("upload-zone", dragging && "dragging")}
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files[0]?.name);
      }}
    >
      <div className="upload-icon"><Icon name="upload" /></div>
      <div>
        <strong>{title}</strong>
        <span>{hint}</span>
        {fileName && (
          <span className="file-chip">
            <Icon name="check" size={12} /> {fileName}
            <button type="button" onClick={() => setFileName(null)} aria-label={`Remove ${fileName}`}>
              <Icon name="close" size={11} />
            </button>
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-input"
        accept=".pdf,.jpg,.jpeg,.png"
        tabIndex={-1}
        aria-hidden="true"
        onChange={e => accept(e.target.files?.[0]?.name)}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        Browse files
      </Button>
    </div>
  );
}
