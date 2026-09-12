# Prompt Inspector (Beautify Fork)

Fork dari [Extension-PromptInspector](https://github.com/SillyTavern/Extension-PromptInspector) milik Cohee1207.
Menambahkan opsi tampilan **Beautify** khusus untuk keperluan debugging preset — melihat posisi entry,
menghitung karakter, dan (yang paling penting) menyorot macro `{{seperti_ini}}` yang masih belum ter-resolve
di prompt final sebelum dikirim ke API.

## Fitur tambahan dari fork ini

- **Beautify view** (opsi baru di dropdown format):
  - Chat Completion: tiap elemen array prompt ditampilkan sebagai kartu terpisah, lengkap dengan nomor
    posisi (`#0`, `#1`, dst — sesuai urutan aktual yang dikirim ke LLM), badge role (system/user/assistant/tool),
    badge `name` kalau ada, jumlah karakter, dan jumlah macro yang belum resolve.
  - Text Completion: mencoba mendeteksi otomatis format instruct umum (ChatML, `[INST]`, Alpaca `###`),
    lalu memecah prompt jadi blok-blok. Kalau tidak terdeteksi, fallback ke pemisahan baris kosong —
    dan ini selalu diberi label jujur di UI, karena ini heuristik, bukan pemetaan pasti ke entry preset asli.
  - Highlight otomatis untuk macro yang masih literal `{{...}}` di teks final (indikasi macro salah nama/tidak didukung).
  - Kotak pencarian untuk menyaring semua entry/blok berdasarkan teks.
  - Tombol salin per-entry.
- Opsi **Raw Text** baru untuk Text Completion (sebelumnya dropdown format cuma muncul untuk Chat Completion).
- **Beautify bersifat read-only by design** — ini murni lapisan visualisasi di atas konten JSON/Raw yang
  sedang aktif. Semua editing tetap dilakukan lewat mode JSON / YAML / Raw Text seperti sebelumnya, supaya
  tidak ada risiko field/struktur data preset kamu rusak akibat proses render-ulang dari kartu.

## Batasan yang perlu kamu tahu

- Nomor posisi di Beautify adalah **index urutan dalam array prompt final** (yang memang menentukan urutan
  ke LLM) — bukan `identifier` asli dari Prompt Manager. Field itu kemungkinan besar sudah tidak ada lagi
  di titik prompt sudah final dan siap dikirim, jadi extension ini tidak berpura-pura punya info yang tidak ada.
- Segmentasi Text Completion adalah heuristik regex sederhana, bukan parser resmi dari SillyTavern.

## Usage

1. Pastikan SillyTavern 1.12.1 atau lebih baru.
2. Install manual: salin folder ini ke `data/<user>/extensions/third-party/` di instalasi SillyTavern kamu
   (ganti folder `Extension-PromptInspector` yang lama kalau kamu ingin mengganti total), lalu restart/refresh.
   Atau install via URL kalau kamu sudah push fork ini ke GitHub kamu sendiri.
3. Cari opsi "Inspect Prompts" di wand menu (menu ekstensi) untuk toggle inspeksi.
4. Kirim prompt apa saja untuk memunculkan popup. Pilih "Beautify" di dropdown kanan atas.

## Catatan soal auto-update

`auto_update` di manifest fork ini sengaja di-set `false`. Manifest asli menunjuk ke repo upstream
`SillyTavern/Extension-PromptInspector` — kalau auto-update dinyalakan sementara `homePage` masih menunjuk
ke sana, updater SillyTavern bisa menimpa balik fork ini dengan versi original tanpa fitur Beautify.
Kalau kamu push fork ini ke repo GitHub kamu sendiri, update `homePage` di `manifest.json` ke URL repo
kamu, baru aman untuk mengaktifkan `auto_update` lagi.

## Remarks (dari extension asli)

1. Chat Completion prompts should be a valid JSON-serialized array of objects.
2. Text Completion prompts can be any string that doesn't overflow the prompt length limit in tokens.
3. Pressed "Cancel" discards any changes, but doesn't cancel the request.
4. Pressing "OK" sends the modified prompt to the server. Modified prompts are ephemeral and not saved.

## License

AGPL-3.0 (mengikuti lisensi extension asli)
