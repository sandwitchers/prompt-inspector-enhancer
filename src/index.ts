import { Command } from 'commander';
import chalk from 'chalk';
import { PromptAnalyzer } from './analyzer.js';
import { PromptEnhancer } from './enhancer.js';
import * as fs from 'fs';

const program = new Command();

program
  .name('prompt-inspector-enhancer')
  .description('CLI tool untuk inspeksi dan optimasi prompt LLM')
  .version('1.0.0');

program
  .command('inspect')
  .description('Analisis dan tingkatkan sebuah prompt')
  .requiredOption('-p, --prompt <string>', 'Teks prompt yang akan diinspeksi')
  .action((options) => {
    console.log(chalk.blue.bold('\n=== PROMPT INSPECTOR & ENHANCER ===\n'));
    console.log(chalk.yellow('Prompt Asli:'));
    console.log(`"${options.prompt}"\n`);

    const analysis = PromptAnalyzer.analyze(options.prompt);
    console.log(chalk.cyan('--- Laporan Analisis ---'));
    console.log(`• Jumlah Kata        : ${analysis.wordCount}`);
    console.log(`• Estimasi Token     : ${analysis.estimatedTokens}`);
    console.log(`• Skor Kejelasan     : ${analysis.clarityScore}/100`);
    console.log(`• Peran Didefinisikan: ${analysis.hasRoleDefined ? 'Ya' : 'Tidak'}`);
    console.log(`• Format Output      : ${analysis.hasOutputFormatDefined ? 'Ya' : 'Tidak'}`);

    if (analysis.identifiedVulnerabilities.length > 0) {
      console.log(chalk.red('\nPotensi Kerentanan/Kelemahan:'));
      analysis.identifiedVulnerabilities.forEach(v => console.log(chalk.red(`  - ${v}`)));
    }

    const enhancedResult = Repository = PromptEnhancer.enhance(options.prompt);
    console.log(chalk.green.bold('\n=== HASIL PROMPT YANG DIOPTIMALKAN ===\n'));
    console.log(chalk.white(enhancedResult.enhancedPrompt));
    console.log(chalk.cyan(`\nPeningkatan Skor Kejelasan: ${enhancedResult.metricsBefore.clarityScore} -> ${enhancedResult.metricsAfter.clarityScore}`));
  });

program
  .command('batch')
  .description('Proses file batch berisi daftar prompt')
  .requiredOption('-i, --input <path>', 'Path ke file JSON contoh prompt')
  .action((options) => {
    try {
      const data = fs.readFileSync(options.input, 'utf-8');
      const prompts: string[] = JSON.parse(data);
      console.log(chalk.blue.bold(`\nMemproses ${prompts.length} prompt dari ${options.input}...\n`));

      prompts.forEach((p, idx) => {
        console.log(chalk.yellow(`[Prompt #${idx + 1}]`));
        const res = PromptEnhancer.enhance(p);
        console.log(`Original: ${p}`);
        console.log(chalk.green(`Enhanced:\n${res.enhancedPrompt}\n`));
        console.log('--------------------------------------------------');
      });
    } catch (err: any) {
      console.error(chalk.red(`Gagal membaca file: ${err.message}`));
    }
  });

program.parse(process.argv);
