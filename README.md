# wa-proto-updater

Repo kecil yang menjaga **proto WhatsApp** tetap terbaru, terpisah dari Baileys.
Satu workflow GitHub + satu skrip (`update-proto.mjs`, tanpa dependency) yang:

1. **mencari sendiri** letak `WAProto.proto` di repo (folder mana saja). Kalau belum ada, dibuat di folder utama (`WAProto/`);
2. **mencari yang lebih baru** dari inbox, URL, paket npm, atau file yang kamu taruh;
3. **memproses otomatis** → `WAProto.proto`, `index.js`, `index.d.ts`, `WAProto.json`, `structure.json`, `version.json`, `CHANGES.md`;
4. **mengecek hasilnya**, dan kalau ada yang gagal semua file dikembalikan seperti semula.

## Pasang (3 langkah)

1. Buat repo GitHub baru, lalu upload isi folder ini (termasuk folder `.github`).
2. Di GitHub: **Settings → Actions → General → Workflow permissions → Read and write permissions**
   (kalau mau mode Pull Request: centang juga *Allow GitHub Actions to create and approve pull requests*).
3. Buka tab **Actions → Update WAProto (mirror) → Run workflow**. Selesai — setelah itu jalan sendiri tiap 3 jam.

> Workflow harus ada di `.github/workflows/` (GitHub tidak membaca folder `workflow/`).

## Cara kerja singkat

| Kamu | Yang terjadi |
| --- | --- |
| tidak melakukan apa-apa | tiap 3 jam dicek; kalau ada proto lebih baru → otomatis di-commit |
| menaruh file `.proto` di **folder utama** atau `incoming/` lalu push | langsung diproses, lalu file itu dihapus dari inbox |
| menjalankan manual di komputer | `npm run check` (hanya lapor) · `npm run update` (jalankan) |

Hasil ada di folder tempat `WAProto.proto` ditemukan (default `WAProto/`):

```
WAProto/
├─ WAProto.proto     proto terbaru
├─ index.js          hasil generate (ESM)
├─ index.d.ts        tipe TypeScript
├─ WAProto.json      seluruh proto dalam JSON (protobufjs)
├─ structure.json    daftar ringkas: semua message/enum + nomor field
├─ version.json      versi proto + versi WA Web terakhir yang terdeteksi
└─ CHANGES.md        apa yang berubah pada update terakhir
```

## Sumber proto — baca ini

**Tidak ada sumber resmi tunggal untuk proto WhatsApp terbaru.** Bawaan repo ini memakai dua sumber publik:
Baileys di GitHub dan paket npm `@whiskeysockets/baileys`. Saat repo ini dibuat, keduanya bertanda
`2.3000.1029496320`, sedangkan seed di repo ini `2.3000.1047787617` — jadi **sumber bawaan lebih lama dan akan diabaikan**
(skrip tidak pernah menurunkan versi). Update baru akan masuk kalau:

- sumber di `wa-proto.config.json` punya versi lebih tinggi (tambahkan URL/paket lain di `sources`), atau
- kamu menaruh file `.proto` baru di folder utama / `incoming/` (cara paling mudah), atau
- menjalankan `node update-proto.mjs --from-file ./WAProto-baru.proto`.

Format `sources`: `"https://…/WAProto.proto"` · `"npm:nama-paket"` · `"npm:nama-paket@1.2.3"` · `"path/ke/file.proto"`.
Versi dibaca dari baris `/// WhatsApp Version: x.y.z` di bagian atas file; yang paling tinggi dipakai.

## Config (`wa-proto.config.json`)

```json
{
  "mode": "replace",
  "outputs": ["js", "dts", "json", "structure", "version"],
  "sources": ["https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/WAProto/WAProto.proto", "npm:@whiskeysockets/baileys"],
  "keepInbox": false
}
```

- `mode`: `replace` = proto diganti persis dengan sumber terbaru · `merge` = hanya menambah tipe/field/enum yang belum ada (tidak ada yang dihapus atau diubah).
- `outputs`: pilih dari `js`, `dts`, `json`, `structure`, `version`.
- `keepInbox`: `true` = file di inbox tidak dihapus setelah diproses.
- Lainnya (opsional): `outDir` (folder bila belum ada proto), `inboxDirs`, `allowOlder`, `allowedHosts`, `protobufjsCli`.

## Opsi baris perintah

```
node update-proto.mjs --dry-run              hanya lapor
node update-proto.mjs --force                proses ulang walau versinya sama
node update-proto.mjs --mode merge           ganti mode untuk sekali jalan
node update-proto.mjs --source npm:nama-paket
node update-proto.mjs --bump-version         naikkan "const version = [2, 3000, N]" di kode (butuh akses ke web.whatsapp.com)
node update-proto.mjs --help
```

Butuh Node 20+ dan koneksi internet. Alat generate (`protobufjs-cli`) dipasang otomatis sekali ke folder sementara.

## Keamanan

- Unduhan hanya lewat **https** dari host di `allowedHosts` (GitHub, npm). IP langsung dan host lain ditolak.
- Proto ditolak kalau berisi `import`, `service`, atau bukan proto WhatsApp, atau terlihat terpotong.
- Skrip tidak menjalankan kode dari sumber — hanya membaca teks proto lalu membuat kode lewat `protobufjs-cli`.
- Untuk repo yang dipakai orang lain, jalankan workflow dengan mode `pr` supaya perubahan bisa ditinjau dulu sebelum di-merge.
- Workflow terjadwal dimatikan GitHub otomatis kalau repo tidak ada aktivitas 60 hari — jalankan manual sekali untuk mengaktifkan lagi.

## Kalau ada masalah

| Gejala | Penyebab / solusi |
| --- | --- |
| "Tidak ada yang perlu diupdate" padahal ada proto baru | versinya tidak lebih tinggi dari yang ada; cek baris `/// WhatsApp Version` di file itu |
| `Verifikasi gagal …` | proto sumber rusak/tidak cocok; semua file sudah dikembalikan. Lihat laporan di tab Actions |
| PR gagal dibuat | aktifkan izin PR di langkah 2, atau pakai mode `commit` |
| "Versi WA Web tidak bisa diambil" | hanya peringatan; `version.json` memakai nilai sebelumnya |
