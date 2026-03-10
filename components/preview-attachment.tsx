import Image from "next/image";
import { FileTextIcon, FileIcon } from "lucide-react";
import { useState } from "react";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

function AttachmentViewer({
  attachment,
  open,
  onOpenChange,
}: {
  attachment: Attachment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { name, url, contentType } = attachment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-2">
        <VisuallyHidden>
          <DialogTitle>{name ?? "Attachment"}</DialogTitle>
        </VisuallyHidden>
        {contentType?.startsWith("image") ? (
          <div className="relative flex max-h-[80vh] items-center justify-center overflow-hidden rounded-md">
            <img
              alt={name ?? "Attachment"}
              className="max-h-[80vh] w-auto rounded-md object-contain"
              src={url}
            />
          </div>
        ) : contentType === "application/pdf" ? (
          <iframe
            className="h-[80vh] w-full rounded-md border-0"
            src={url}
            title={name ?? "PDF"}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <FileIcon className="size-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{name}</p>
            <a
              className="text-sm text-primary underline"
              href={url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open file
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleClick = () => {
    if (!isUploading && url) {
      setViewerOpen(true);
    }
  };

  return (
    <>
      <div
        className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
        data-testid="input-attachment-preview"
        onClick={handleClick}
        style={{ cursor: isUploading ? "default" : "pointer" }}
      >
        {contentType?.startsWith("image") ? (
          <Image
            alt={name ?? "An image attachment"}
            className="size-full object-cover"
            height={64}
            src={url}
            width={64}
          />
        ) : contentType === "application/pdf" ? (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileTextIcon size={20} />
            <span className="text-[9px] font-medium uppercase">PDF</span>
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileIcon size={20} />
            <span className="text-[9px] font-medium uppercase">File</span>
          </div>
        )}

        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            data-testid="input-attachment-loader"
          >
            <Loader size={16} />
          </div>
        )}

        {onRemove && !isUploading && (
          <Button
            className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            size="sm"
            variant="destructive"
          >
            <CrossSmallIcon size={8} />
          </Button>
        )}

        <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
          {name}
        </div>
      </div>

      {!isUploading && url && (
        <AttachmentViewer
          attachment={attachment}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
};
