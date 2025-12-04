import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClearImage: () => void;
}

export function ImageUpload({ onImageSelect, selectedImage, onClearImage }: ImageUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const handleClear = () => {
    onClearImage();
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-12 transition-smooth",
            "glass-card hover:shadow-medium cursor-pointer group",
            isDragging
              ? "border-primary bg-primary/5 shadow-glow"
              : "border-border hover:border-primary/50"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className={cn(
              "p-6 rounded-full transition-smooth",
              "bg-primary/10 group-hover:bg-primary/20",
              isDragging && "bg-primary/20 scale-110"
            )}>
              <Upload className={cn(
                "h-12 w-12 transition-smooth",
                isDragging ? "text-primary scale-110" : "text-primary/70 group-hover:text-primary"
              )} />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {isDragging ? t("upload.dropHere") : t("upload.dragDrop")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("upload.fileTypes")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative glass-strong rounded-2xl p-4 shadow-medium animate-scale-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur hover:bg-destructive/90 hover:text-destructive-foreground transition-smooth"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span className="truncate font-medium">{selectedImage?.name}</span>
            <span className="ml-auto text-xs">
              {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
