import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
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
            "relative border-2 border-dashed rounded-2xl p-16 transition-smooth cursor-pointer group",
            "bg-gradient-to-b from-muted/30 to-muted/10",
            isDragging
              ? "border-primary bg-primary/5 shadow-glow scale-[1.02]"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className={cn(
              "relative p-6 rounded-3xl transition-smooth",
              "bg-gradient-to-br from-primary/10 to-primary/5",
              "group-hover:from-primary/20 group-hover:to-primary/10",
              isDragging && "scale-110 from-primary/25 to-primary/15"
            )}>
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-smooth" />
              <Camera className={cn(
                "relative h-12 w-12 transition-smooth",
                isDragging ? "text-primary scale-110" : "text-primary/60 group-hover:text-primary"
              )} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                {isDragging ? t("upload.dropHere") : t("upload.dragDrop")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("upload.fileTypes")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-strong animate-scale-in group">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-smooth"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted rounded-2xl">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-contain transition-smooth group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-primary/10">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{selectedImage?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
