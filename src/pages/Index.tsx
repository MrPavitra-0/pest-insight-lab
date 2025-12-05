import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sprout, Sparkles, Shield, Leaf, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { DetectionResults } from "@/components/DetectionResults";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { t } = useTranslation();
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
        title: t("toast.noImage"),
        description: t("toast.noImageDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const imageBase64 = await fileToBase64(selectedImage);
      
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
        title: t("toast.analysisComplete"),
        description: t("toast.analysisCompleteDesc"),
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: t("toast.analysisFailed"),
        description: error instanceof Error ? error.message : t("toast.analysisFailedDesc"),
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
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Decorative Elements */}
      <div className="absolute inset-0 pattern-dots opacity-50" />
      <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-soft" />
      <div className="absolute -bottom-20 -left-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }} />
      
      {/* Floating decorative shapes */}
      <div className="absolute top-40 left-[10%] animate-float opacity-20">
        <Leaf className="w-12 h-12 text-primary" />
      </div>
      <div className="absolute top-60 right-[15%] animate-float-slow opacity-15">
        <Sprout className="w-16 h-16 text-primary" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-xl bg-background/60">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-smooth" />
                <div className="relative p-3 rounded-2xl gradient-primary shadow-medium">
                  <Sprout className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight">{t("header.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t("header.enterpriseGrade")}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-16 pb-12">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/60 border border-border/50 shadow-soft mb-8">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">{t("hero.badge")}</span>
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-foreground mb-6 tracking-tight text-balance leading-[1.1]">
            {t("hero.title").split(' ').map((word, i) => (
              <span key={i} className={i === 1 ? "text-primary italic" : ""}>
                {word}{' '}
              </span>
            ))}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("hero.description")}
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Step 1: Upload */}
          <div 
            className="relative glass-strong rounded-[2rem] p-8 md:p-10 shadow-medium hover-lift animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="absolute top-0 left-8 -translate-y-1/2">
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-full gradient-primary shadow-medium">
                <span className="text-sm font-semibold text-primary-foreground">01</span>
                <span className="text-sm font-medium text-primary-foreground">{t("upload.stepTitle")}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <ImageUpload
                onImageSelect={setSelectedImage}
                selectedImage={selectedImage}
                onClearImage={handleClearImage}
              />
            </div>
            
            {selectedImage && !results && (
              <div className="mt-8 flex justify-center animate-fade-in">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  size="lg"
                  className="relative group gradient-primary text-primary-foreground px-8 py-6 text-base font-medium shadow-medium hover:shadow-strong transition-smooth rounded-2xl"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("upload.analyzing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-3 h-5 w-5" />
                      {t("upload.analyzeButton")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Results */}
          {results && (
            <div 
              className="relative glass-strong rounded-[2rem] p-8 md:p-10 shadow-medium animate-fade-in-up"
            >
              <div className="absolute top-0 left-8 -translate-y-1/2">
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full gradient-accent shadow-medium">
                  <span className="text-sm font-semibold text-accent-foreground">02</span>
                  <span className="text-sm font-medium text-accent-foreground">{t("results.stepTitle")}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <DetectionResults results={results} />
              </div>
              
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleClearImage}
                  variant="outline"
                  size="lg"
                  className="px-8 py-6 text-base font-medium rounded-2xl border-2 hover:bg-secondary/50 transition-smooth"
                >
                  {t("results.analyzeAnother")}
                </Button>
              </div>
            </div>
          )}

          {!selectedImage && !results && (
            <div 
              className="relative glass-card rounded-[2rem] p-8 md:p-10 border-dashed border-2 border-border/60 animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              <div className="absolute top-0 left-8 -translate-y-1/2">
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-muted border border-border shadow-soft">
                  <span className="text-sm font-semibold text-muted-foreground">02</span>
                  <span className="text-sm font-medium text-muted-foreground">{t("results.stepTitle")}</span>
                </div>
              </div>
              <div className="mt-4 text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t("results.placeholder")}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-4 py-12 mt-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="h-4 w-4" />
            <p>{t("footer.text")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
