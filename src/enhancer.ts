import { PromptAnalysisReport, EnhancedPromptResult } from './types.js';
import { PromptAnalyzer } from './analyzer.js';

export class PromptEnhancer {
  public static enhance(prompt: string): EnhancedPromptResult {
    const analysisBefore = PromptAnalyzer.analyze(prompt);
    let enhanced = prompt.trim();
    const improvements: string[] = [];

    if (!analysisBefore.hasRoleDefined) {
      enhanced = `Bertindaklah sebagai AI Assistant dan Subject Matter Expert yang sangat teliti, analitis, dan berpengalaman.\n\n[Konteks/Tugas Utama]:\n${enhanced}`;
      improvements.push('Menambahkan definisi peran (Persona Injection).');
    }

    if (!analysisBefore.hasOutputFormatDefined) {
      enhanced += `\n\n[Format Keluaran]:\n- Berikan jawaban yang terstruktur dengan jelas menggunakan format Markdown.\n- Gunakan sub-judul, paragraf deskriptif, dan poin-poin jika diperlukan.`;
      improvements.push('Menambahkan spesifikasi format keluaran terstruktur.');
    }

    if (!analysisBefore.hasConstraintsDefined) {
      enhanced += `\n\n[Batasan]:\n- Pastikan jawaban akurat, langsung pada sasaran, mendalam, dan bebas dari basa-basi yang tidak perlu.`;
      improvements.push('Menambahkan batasan kualitas dan kejelasan.');
    }

    const analysisAfter = PromptAnalyzer.analyze(enhanced);

    return {
      originalPrompt: prompt,
      enhancedPrompt: enhanced,
      improvementsApplied: improvements,
      metricsBefore: {
        clarityScore: analysisBefore.clarityScore,
        estimatedTokens: analysisBefore.estimatedTokens,
      },
      metricsAfter: {
        clarityScore: analysisAfter.clarityScore,
        estimatedTokens: analysisAfter.estimatedTokens,
      },
    };
  }
}
