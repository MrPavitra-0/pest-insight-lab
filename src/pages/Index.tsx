import { useState } from "react";
import { Sprout, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { DetectionResults } from "@/components/DetectionResults";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const { toast } = useToast();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Convert image to base64
      const imageBase64 = await fileToBase64(selectedImage);
      
      // Call the AI analysis edge function
      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: { imageBase64 }
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.predictions);
      
      toast({
        title: "Analysis complete",
        description: "AI-powered pest detection results are ready",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setResults(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      {/* Header */}
      <header className="border-b border-border/50 glass-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
                <Sprout className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Crop Guardian</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Precision Agriculture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Enterprise Grade</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card shadow-soft mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Supervised Learning Model</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Advanced Pest Detection for Wheat Crops
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload crop images for instant AI-powered pest identification with treatment recommendations
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Step 1: Upload */}
          <div className="glass-strong rounded-3xl p-8 shadow-strong animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shadow-medium">
                1
              </div>
              <h3 className="text-2xl font-bold text-foreground">Upload Image for Detection</h3>
            </div>
            <ImageUpload
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
              onClearImage={handleClearImage}
            />
            {selectedImage && !results && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  size="lg"
                  className="gradient-primary text-primary-foreground shadow-medium hover:shadow-strong transition-smooth min-w-48"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analyze Image
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Results */}
          {results && (
            <div className="glass-strong rounded-3xl p-8 shadow-strong animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shadow-medium">
                  2
                </div>
                <h3 className="text-2xl font-bold text-foreground">Detection Results</h3>
              </div>
              <DetectionResults results={results} />
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleClearImage}
                  variant="outline"
                  size="lg"
                  className="min-w-48"
                >
                  Analyze Another Image
                </Button>
              </div>
            </div>
          )}

          {!selectedImage && !results && (
            <div className="glass-strong rounded-3xl p-8 shadow-strong">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold">
                  2
                </div>
                <h3 className="text-2xl font-bold text-foreground">Detection Results</h3>
              </div>
              <p className="text-muted-foreground">
                Upload an image and click "Analyze Image" to see the pest detection results here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-border/50">
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by Advanced Supervised Learning • Enterprise Agricultural AI Platform</p>
        </div>
      </footer>
    </div>
  );
}
