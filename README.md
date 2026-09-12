# Prompt Inspector Enhancer

**Prompt Inspector Enhancer** adalah toolkit tingkat lanjut untuk menganalisis, mendiagnosis, dan mengoptimalkan *prompt* LLM (Large Language Model) secara otomatis. Alat ini dirancang untuk para pengembang AI, *prompt engineer*, dan peneliti guna memastikan *prompt* memiliki struktur yang kuat, bebas dari ambiguitas, efisien dalam penggunaan token, serta tahan terhadap injeksi instruksi.

## Fitur Utama

1. **Analisis Komprehensif (Inspector)**:
   - Evaluasi tingkat kejelasan (Clarity Score).
   - Deteksi potensi ambiguitas dan kontradiksi.
   - Analisis struktur (Role, Task, Constraints, Output Format).
   - Estimasi penggunaan token.

2. **Optimasi Otomatis (Enhancer)**:
   - Penerapan kerangka kerja *Structured Prompting* (RTCO: Role, Task, Context, Output).
   - Injeksi instruksi *Chain-of-Thought* (CoT) untuk penalaran tingkat lanjut.
   - Pembersihan redundansi teks.

3. **Antarmuka CLI & API**:
   - Dapat dijalankan langsung melalui baris perintah atau diintegrasikan ke dalam *pipeline* CI/CD pengembangan aplikasi AI.

---

## Instalasi

```bash
git clone https://github.com/sandwitchers/prompt-inspector-enhancer.git
cd prompt-inspector-enhancer
npm install
```

## Penggunaan

### Memeriksa dan Meningkatkan Prompt via CLI

```bash
npm run inspect -- --prompt "Tulis cerita tentang kucing"
```

Atau menggunakan file contoh:

```bash
npm run enhance-file -- --input examples/sample_prompts.json
```
