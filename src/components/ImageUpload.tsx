import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon, Camera, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageEditor } from "./ImageEditor";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClearImage: () => void;
}

export function ImageUpload({ onImageSelect, selectedImage, onClearImage }: ImageUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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

  const handleEditSave = (editedBlob: Blob) => {
    const editedFile = new File([editedBlob], selectedImage?.name || "edited-image.jpg", {
      type: "image/jpeg",
    });
    onImageSelect(editedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(editedBlob);
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="space-y-4">
          {/* Drag and drop area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-12 transition-smooth cursor-pointer group",
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
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className={cn(
                "relative p-5 rounded-2xl transition-smooth",
                "bg-gradient-to-br from-primary/10 to-primary/5",
                "group-hover:from-primary/20 group-hover:to-primary/10",
                isDragging && "scale-110 from-primary/25 to-primary/15"
              )}>
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-smooth" />
                <Upload className={cn(
                  "relative h-10 w-10 transition-smooth",
                  isDragging ? "text-primary scale-110" : "text-primary/60 group-hover:text-primary"
                )} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  {isDragging ? t("upload.dropHere") : t("upload.dragDrop")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("upload.fileTypes")}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-sm text-muted-foreground font-medium">{t("upload.or")}</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Camera capture button */}
          <label className="relative flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-border/60 bg-gradient-to-b from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 hover:border-primary/40 transition-smooth cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-smooth">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">{t("upload.takePhoto")}</p>
              <p className="text-sm text-muted-foreground">{t("upload.useCamera")}</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-strong animate-scale-in group">
          {/* Action buttons */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditorOpen(true)}
              className="h-10 w-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-smooth"
            >
              <Pencil className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-10 w-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-smooth"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
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

      {/* Image Editor Modal */}
      {preview && (
        <ImageEditor
          imageUrl={preview}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
