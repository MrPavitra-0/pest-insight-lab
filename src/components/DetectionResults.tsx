import { CheckCircle2, AlertTriangle, Sprout, Bug } from "lucide-react";
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

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) return { variant: "default" as const, label: "High Confidence" };
  if (confidence >= 0.6) return { variant: "secondary" as const, label: "Medium Confidence" };
  return { variant: "outline" as const, label: "Low Confidence" };
};

export function DetectionResults({ results }: DetectionResultsProps) {
  const topResult = results[0];
  const Icon = pestIcons[topResult.class_name] || Bug;
  const badge = getConfidenceBadge(topResult.confidence);
  const displayName = topResult.display_name || topResult.class_name.replace(/_/g, " ");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Result Card */}
      <Card className="glass-strong p-6 shadow-strong border-2 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-2xl bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground capitalize mb-1">
                  {displayName}
                </h3>
                <Badge variant={badge.variant} className="font-medium">
                  {badge.label}
                </Badge>
              </div>
              <div className="text-right">
                <div className={cn("text-3xl font-bold", getConfidenceColor(topResult.confidence))}>
                  {(topResult.confidence * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Detection Accuracy</span>
                <span className="font-medium">{(topResult.confidence * 100).toFixed(1)}%</span>
              </div>
              <Progress value={topResult.confidence * 100} className="h-2" />
            </div>

            {/* AI Explanation */}
            {topResult.explanation && (
              <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
                <p className="font-semibold text-foreground mb-1">Visual Analysis</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topResult.explanation}
                </p>
              </div>
            )}

            {topResult.treatment && (
              <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground mb-1">Recommended Treatment</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {topResult.treatment}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Alternative Detections */}
      {results.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Alternative Detections
          </h4>
          <div className="grid gap-3">
            {results.slice(1).map((result, index) => {
              const ResultIcon = pestIcons[result.class_name] || Bug;
              const altDisplayName = result.display_name || result.class_name.replace(/_/g, " ");
              return (
                <Card
                  key={index}
                  className="glass-card p-4 hover:shadow-medium transition-smooth"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted">
                      <ResultIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground capitalize">
                        {altDisplayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                    <Progress value={result.confidence * 100} className="w-24 h-2" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
