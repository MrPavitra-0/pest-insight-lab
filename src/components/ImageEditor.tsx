import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, RotateCw, Crop as CropIcon, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageEditorProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedImageBlob: Blob) => void;
}

export function ImageEditor({ imageUrl, isOpen, onClose, onSave }: ImageEditorProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleCropMode = () => {
    setIsCropping(!isCropping);
    if (!isCropping) {
      setCrop({
        unit: "%",
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      });
    } else {
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  };

  const generateEditedImage = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Handle rotation
    const radians = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    // If cropping is active and we have a completed crop
    if (isCropping && completedCrop) {
      sourceX = completedCrop.x * scaleX;
      sourceY = completedCrop.y * scaleY;
      sourceWidth = completedCrop.width * scaleX;
      sourceHeight = completedCrop.height * scaleY;
    }

    // Calculate rotated dimensions
    const rotatedWidth = sourceWidth * cos + sourceHeight * sin;
    const rotatedHeight = sourceWidth * sin + sourceHeight * cos;

    canvas.width = rotatedWidth;
    canvas.height = rotatedHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
    ctx.rotate(radians);
    ctx.translate(-sourceWidth / 2, -sourceHeight / 2);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.95
      );
    });
  }, [rotation, isCropping, completedCrop]);

  const handleSave = async () => {
    const blob = await generateEditedImage();
    if (blob) {
      onSave(blob);
      handleReset();
    }
  };

  const handleReset = () => {
    setRotation(0);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCropping(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t("editor.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateLeft}
              className="gap-2 hover:bg-primary/10"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editor.rotateLeft")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateRight}
              className="gap-2 hover:bg-primary/10"
            >
              <RotateCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editor.rotateRight")}</span>
            </Button>
            <div className="w-px h-6 bg-border/50 mx-2" />
            <Button
              variant={isCropping ? "default" : "ghost"}
              size="sm"
              onClick={toggleCropMode}
              className={cn("gap-2", isCropping && "bg-primary text-primary-foreground")}
            >
              <CropIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editor.crop")}</span>
            </Button>
          </div>

          {/* Image preview */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4 rounded-xl bg-muted/30 border border-border/30">
            <div className="relative max-w-full max-h-[50vh]">
              {isCropping ? (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-w-full max-h-[50vh]"
                >
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Edit preview"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      maxWidth: "100%",
                      maxHeight: "50vh",
                      objectFit: "contain",
                    }}
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              ) : (
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Edit preview"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    maxWidth: "100%",
                    maxHeight: "50vh",
                    objectFit: "contain",
                    transition: "transform 0.3s ease",
                  }}
                  crossOrigin="anonymous"
                />
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              {t("editor.reset")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                {t("editor.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-4 w-4" />
                {t("editor.apply")}
              </Button>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
