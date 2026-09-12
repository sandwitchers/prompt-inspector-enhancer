export interface PromptAnalysisReport {
  originalPrompt: string;
  wordCount: number;
  estimatedTokens: number;
  clarityScore: number; // 0 - 100
  hasRoleDefined: boolean;
  hasTaskDefined: boolean;
  hasConstraintsDefined: boolean;
  hasOutputFormatDefined: boolean;
  identifiedVulnerabilities: string[];
  recommendations: string[];
}

export interface EnhancedPromptResult {
  originalPrompt: string;
  enhancedPrompt: string;
  improvementsApplied: string[];
  metricsBefore: {
    clarityScore: number;
    estimatedTokens: number;
  };
  metricsAfter: {
    clarityScore: number;
    estimatedTokens: number;
  };
}
