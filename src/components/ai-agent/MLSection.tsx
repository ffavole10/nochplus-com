import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Brain, Database } from "lucide-react";

const MOCK_INSIGHTS: { pattern: string; samples: number; confidence: string; date: string }[] = [];

export function MLSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Machine Learning & Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          AutoHeal learns from every field report to improve accuracy over time. Upload field service reports to train the system.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold text-foreground">87.3%</p>
            <p className="text-xs text-muted-foreground">Accuracy Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Brain className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">142</p>
            <p className="text-xs text-muted-foreground">Patterns Learned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Database className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-foreground">84.2%</p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card>
        <CardContent className="p-5">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">Upload Field Reports</p>
            <p className="text-xs text-muted-foreground mb-3">Drag & drop field reports (PDF, CSV, JSON) to train the system</p>
            <Button variant="outline" size="sm">Browse Files</Button>
            <p className="text-xs text-muted-foreground mt-3">1,247 field reports processed</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Insights */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Learning Insights</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7">View Full Learning Log</Button>
          </div>
          <div className="space-y-3">
            {MOCK_INSIGHTS.map((insight, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{insight.pattern}</p>
                  <p className="text-xs text-muted-foreground">{insight.samples} samples • {insight.date}</p>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-xs">
                  {insight.confidence}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
