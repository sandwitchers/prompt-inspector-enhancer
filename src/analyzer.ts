import { PromptAnalysisReport } from './types.js';

export class PromptAnalyzer {
  public static analyze(prompt: string): PromptAnalysisReport {
    const trimmed = prompt.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const estimatedTokens = Math.ceil(wordCount * 1.33);

    const lower = trimmed.toLowerCase();

    const hasRoleDefined = /act as|you are a|sebagai|peranmu/i.test(lower);
    const hasTaskDefined = /tulis|buat|analisis|jelaskan|write|create|analyze|explain/i.test(lower);
    const hasConstraintsDefined = /jangan|pastikan|batasi|maksimal|only|do not|ensure|limit/i.test(lower);
    const hasOutputFormatDefined = /format|json|markdown|list|tabel|table|bullet/i.test(lower);

    let clarityScore = 40;
    if (hasRoleDefined) clarityScore += 15;
    if (hasTaskDefined) clarityScore += 20;
    if (hasConstraintsDefined) clarityScore += 15;
    if (hasOutputFormatDefined) clarityScore += 10;

    if (wordCount < 5) {
      clarityScore = Math.max(10, clarityScore - 30);
    }

    const vulnerabilities: string[] = [];
    if (!hasConstraintsDefined) {
      vulnerabilities.push('Kurangnya batasan (constraints) dapat memicu halusinasi model atau keluaran di luar konteks.');
    }
    if (wordCount < 8) {
      vulnerabilities.push('Prompt terlalu pendek; memberikan ruang interpretasi yang terlalu luas bagi LLM.');
    }

    const recommendations: string[] = [];
    if (!hasRoleDefined) {
      recommendations.push('Tambahkan persona/peran spesifik (misal: "Bertindaklah sebagai ahli pemrogram senior...").');
    }
    if (!hasOutputFormatDefined) {
      recommendations.push('Tentukan format keluaran yang diinginkan (misal: "Sajikan dalam format Markdown dengan poin-poin").');
    }
    if (!hasConstraintsDefined) {
      recommendations.push('Tambahkan batasan ketat untuk menjaga fokus dan panjang respons.');
    }

    return {
      originalPrompt: trimmed,
      wordCount,
      estimatedTokens,
      clarityScore,
      hasRoleDefined,
      hasTaskDefined,
      hasConstraintsDefined,
      hasOutputFormatDefined,
      identifiedVulnerabilities: vulnerabilities,
      recommendations,
    };
  }
}
