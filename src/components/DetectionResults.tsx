import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, Sprout, Bug, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DetectionResult {
  class_name: string;
  display_name?: string;
  confidence: number;
  treatment?: string;
  explanation?: string;
}

interface DetectionResultsProps {
  results: DetectionResult[];
}

const pestIcons: Record<string, any> = {
  "healthy": Sprout,
  "wheat_rust": AlertTriangle,
  "aphids": Bug,
  "armyworm": Bug,
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "text-primary";
  if (confidence >= 0.6) return "text-accent";
  return "text-muted-foreground";
};

export function DetectionResults({ results }: DetectionResultsProps) {
  const { t } = useTranslation();
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { variant: "default" as const, label: t("results.highConfidence"), color: "bg-primary/10 text-primary border-primary/20" };
    if (confidence >= 0.6) return { variant: "secondary" as const, label: t("results.mediumConfidence"), color: "bg-accent/10 text-accent border-accent/20" };
    return { variant: "outline" as const, label: t("results.lowConfidence"), color: "bg-muted text-muted-foreground border-border" };
  };

  const topResult = results[0];
  const Icon = pestIcons[topResult.class_name] || Bug;
  const badge = getConfidenceBadge(topResult.confidence);
  const displayName = topResult.display_name || topResult.class_name.replace(/_/g, " ");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Result Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/30 p-6 md:p-8 shadow-medium border border-border/50">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-30" />
              <div className="relative p-5 rounded-2xl bg-primary/10 border border-primary/20">
                <Icon className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h3 className="text-3xl font-serif text-foreground capitalize mb-2">
                  {displayName}
                </h3>
                <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", badge.color)}>
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className={cn("text-3xl font-bold tracking-tight", getConfidenceColor(topResult.confidence))}>
                    {(topResult.confidence * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">{t("results.confidence")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("results.detectionAccuracy")}</span>
                <span className="font-medium text-foreground">{(topResult.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full gradient-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${topResult.confidence * 100}%` }}
                />
              </div>
            </div>

            {/* AI Explanation */}
            {topResult.explanation && (
              <div className="p-5 rounded-xl bg-muted/40 border border-border/50">
                <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {t("results.visualAnalysis")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topResult.explanation}
                </p>
              </div>
            )}

            {topResult.treatment && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">{t("results.recommendedTreatment")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {topResult.treatment}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alternative Detections */}
      {results.length > 1 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("results.alternativeDetections")}
          </h4>
          <div className="grid gap-3">
            {results.slice(1).map((result, index) => {
              const ResultIcon = pestIcons[result.class_name] || Bug;
              const altDisplayName = result.display_name || result.class_name.replace(/_/g, " ");
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:shadow-medium transition-smooth group"
                >
                  <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/80 transition-smooth">
                    <ResultIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground capitalize">
                      {altDisplayName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(result.confidence * 100).toFixed(1)}% {t("results.confidence").toLowerCase()}
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground/40 rounded-full"
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
