#!/usr/bin/env node
/**
 * update-proto.mjs — cari & update WAProto otomatis (tanpa dependency npm sendiri).
 *
 * Alur:
 *  1. Deteksi otomatis letak WAProto.proto (folder mana saja di repo) + index.js / index.d.ts / GenerateStatics.sh.
 *     Kalau tidak ada sama sekali -> dibuat di folder utama repo (WAProto/).
 *  2. Kumpulkan proto baru dari: inbox (file *.proto di folder utama / incoming/), URL https, paket npm, file lokal.
 *  3. Pilih yang versinya paling baru ("/// WhatsApp Version: x.y.z"). Tidak lebih baru -> tidak melakukan apa-apa.
 *  4. mode "merge"  : hanya MENAMBAH tipe/field/enum yang belum ada (tidak ada yang dihapus/diubah).
 *     mode "replace": proto diganti persis dengan sumber terbaru.
 *  5. Generate ulang index.js, index.d.ts (+ WAProto.json, structure.json, version.json bila diminta), verifikasi,
 *     dan kalau ada yang gagal -> semua file dikembalikan seperti semula.
 *
 * Pakai:  node update-proto.mjs [--dry-run] [--force] [--mode merge|replace] [--source X] [--root DIR] ...
 *         node update-proto.mjs --help
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ───────────────────────── Konfigurasi bawaan ─────────────────────────
const DEFAULTS = {
  mode: 'merge',                                // merge | replace
  sources: [
    'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/WAProto/WAProto.proto',
    'npm:@whiskeysockets/baileys',
  ],
  outputs: ['js', 'dts'],                       // js, dts, json, structure, version
  outDir: 'WAProto',                            // dipakai hanya kalau tidak ada proto di repo
  inboxDirs: ['incoming', 'proto-inbox'],       // folder tempat menaruh file .proto baru (selain *.proto di folder utama)
  keepInbox: false,                             // false = file inbox dihapus setelah diproses
  allowOlder: false,
  allowedHosts: ['raw.githubusercontent.com', 'github.com', 'codeload.github.com', 'objects.githubusercontent.com', 'registry.npmjs.org'],
  protobufjsCli: null,                          // null = ikut package.json, kalau tidak ada: ^2.7.0
};
const WA_HOST = 'web.whatsapp.com';
const WA_HEADERS = { 'sec-fetch-site': 'none', 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };
const SKIP_DIRS = new Set(['node_modules', '.git', '.yarn', 'dist', 'build', 'coverage', '.cache', '.next', 'tmp', 'temp']);
const MAX_PROTO = 40 * 1024 * 1024;
const MAX_TARBALL = 120 * 1024 * 1024;
const MAX_UNPACKED = 400 * 1024 * 1024;
const IS_CI = !!process.env.GITHUB_ACTIONS;

class Fail extends Error { constructor(msg, code = 1) { super(msg); this.code = code; } }
const log = (...a) => console.log(...a);
const warn = (m) => console.warn(IS_CI ? `::warning::${m}` : `⚠️  ${m}`);
const rel = (root, p) => (path.relative(root, p) || '.').split(path.sep).join('/');

// ───────────────────────── Argumen & config ─────────────────────────
function parseArgs(argv) {
  const a = { sources: [] };
  const need = (i) => { if (i + 1 >= argv.length) throw new Fail(`Opsi ${argv[i]} butuh nilai`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    switch (k) {
      case '--help': case '-h': a.help = true; break;
      case '--root': a.root = need(i++); break;
      case '--config': a.config = need(i++); break;
      case '--mode': a.mode = need(i++); break;
      case '--source': a.sources.push(need(i++)); break;
      case '--from-file': a.sources.push(path.resolve(need(i++))); break;
      case '--outputs': a.outputs = need(i++).split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--out-dir': a.outDir = need(i++); break;
      case '--report': a.report = need(i++); break;
      case '--wa-revision': a.waRevision = Number(need(i++)); break;
      case '--dry-run': case '--check': a.dryRun = true; break;
      case '--write': break; // diterima supaya workflow lama tetap jalan (default memang menulis)
      case '--gh-output': break; // output GitHub otomatis kalau GITHUB_OUTPUT ada
      case '--force': a.force = true; break;
      case '--allow-older': a.allowOlder = true; break;
      case '--keep-inbox': a.keepInbox = true; break;
      case '--bump-version': a.bumpVersion = true; break;
      case '--strict': a.strict = true; break;
      default: throw new Fail(`Opsi tidak dikenal: ${k} (coba --help)`);
    }
  }
  return a;
}

function help() {
  log(`update-proto.mjs — update WAProto otomatis

  node update-proto.mjs                  cari proto di repo, cek sumber, update kalau ada yang lebih baru
  node update-proto.mjs --dry-run        hanya lapor, tidak mengubah apa pun

Opsi:
  --root DIR           folder repo (default: otomatis, cari folder .git ke atas)
  --config FILE        file config (default: wa-proto.config.json di folder utama kalau ada)
  --mode merge|replace merge = hanya menambah · replace = ganti persis dengan sumber
  --source X           URL https, "npm:nama-paket[@versi]" atau path file lokal (boleh berulang)
  --from-file PATH     sama seperti --source dengan file lokal
  --outputs a,b,c      js, dts, json, structure, version
  --out-dir DIR        folder tujuan bila di repo belum ada proto (default WAProto)
  --force              proses ulang walau versinya sama
  --allow-older        izinkan sumber yang versinya lebih lama (hanya mode merge)
  --keep-inbox         jangan hapus file inbox setelah diproses
  --bump-version       naikkan "const version = [2, 3000, N]" ke versi WA Web terbaru
  --wa-revision N      pakai angka ini sebagai versi WA Web (tanpa akses internet)
  --report FILE        lokasi laporan markdown
  --strict             exit code 2 kalau semua sumber gagal diakses`);
}

function loadConfig(root, args) {
  let fileCfg = {};
  const cfgPath = args.config ? path.resolve(args.config) : path.join(root, 'wa-proto.config.json');
  if (fs.existsSync(cfgPath)) {
    try { fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
    catch (e) { throw new Fail(`Config tidak valid (${rel(root, cfgPath)}): ${e.message}`); }
  } else if (args.config) throw new Fail(`Config tidak ditemukan: ${args.config}`);
  const cfg = { ...DEFAULTS, ...fileCfg };
  if (args.sources.length) cfg.sources = args.sources;
  for (const k of ['mode', 'outputs', 'outDir', 'allowOlder', 'keepInbox']) if (args[k] !== undefined) cfg[k] = args[k];
  if (!['merge', 'replace'].includes(cfg.mode)) throw new Fail(`mode harus merge atau replace (bukan "${cfg.mode}")`);
  const okOut = new Set(['js', 'dts', 'json', 'structure', 'version']);
  for (const o of cfg.outputs) if (!okOut.has(o)) throw new Fail(`output tidak dikenal: ${o}`);
  cfg._path = fs.existsSync(cfgPath) ? cfgPath : null;
  return cfg;
}

function findRoot(start) {
  let d = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    const p = path.dirname(d);
    if (p === d) return path.resolve(start);
    d = p;
  }
}

// ───────────────────────── Parser proto (tanpa dependency) ─────────────────────────
function stripComments(t) {
  let out = '', i = 0;
  const n = t.length;
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '"') {
      let j = i + 1;
      while (j < n && t[j] !== '"') { if (t[j] === '\\') j++; j++; }
      out += t.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '/' && d === '/') { while (i < n && t[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
    out += c; i++;
  }
  return out;
}

/** -> Map(namaLengkap -> { kind:'message'|'enum', fields: Map }) ; field message = [nomor, tipe, label], enum = nomor */
function parseStructure(text) {
  const toks = stripComments(text).match(/"[^"]*"|[A-Za-z_][\w.]*|\d+|[{}[\]=;<>,()-]/g) || [];
  const out = new Map();
  const stack = [];
  const full = () => stack.filter((s) => s.kind !== 'oneof').map((s) => s.name).join('.');
  const inner = () => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].kind !== 'oneof') return stack[k].kind; return null; };
  const skipStmt = (i) => { while (i < toks.length && toks[i] !== ';' && toks[i] !== '{' && toks[i] !== '}') i++; return toks[i] === ';' ? i + 1 : i; };
  let i = 0;
  while (i < toks.length) {
    const tk = toks[i];
    if ((tk === 'message' || tk === 'enum') && toks[i + 2] === '{') {
      stack.push({ kind: tk, name: toks[i + 1] });
      out.set(full(), { kind: tk, fields: new Map() });
      i += 3; continue;
    }
    if (tk === 'oneof' && toks[i + 2] === '{') { stack.push({ kind: 'oneof', name: toks[i + 1] }); i += 3; continue; }
    if (tk === '}') { stack.pop(); i++; continue; }
    if (stack.length) {
      const ck = inner();
      if (ck === 'enum') {
        if (/^[A-Za-z_]\w*$/.test(tk) && toks[i + 1] === '=') {
          let j = i + 2, neg = false;
          if (toks[j] === '-') { neg = true; j++; }
          if (/^\d+$/.test(toks[j])) out.get(full()).fields.set(tk, neg ? -Number(toks[j]) : Number(toks[j]));
          i = skipStmt(i); continue;
        }
        i = skipStmt(i); continue;
      }
      if (ck === 'message') {
        let j = i, label = '';
        if (['optional', 'repeated', 'required'].includes(toks[j])) { label = toks[j]; j++; }
        let typ;
        if (toks[j] === 'map' && toks[j + 1] === '<') { typ = `map<${toks[j + 2]},${toks[j + 4]}>`; j += 6; }
        else { typ = toks[j]; j++; }
        if (toks[j + 1] === '=' && /^\d+$/.test(toks[j + 2] || '')) {
          out.get(full()).fields.set(toks[j], [Number(toks[j + 2]), typ, label]);
          i = skipStmt(i); continue;
        }
        i = skipStmt(i); continue;
      }
    }
    i++;
  }
  return out;
}

function parseVersion(text) {
  const m = /\/\/\/\s*WhatsApp Version:\s*(\d+(?:\.\d+)+)/.exec(text);
  return m ? m[1] : null;
}
const verParts = (v) => (v ? v.split('.').map(Number) : [0]);
function cmpVer(a, b) {
  const x = verParts(a), y = verParts(b), n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
const syntaxOf = (t) => (/^\s*syntax\s*=\s*"(proto[23])"/m.exec(t) || [])[1] || 'proto2';

function validateProtoText(text, label) {
  if (typeof text !== 'string' || text.length < 20000) throw new Fail(`${label}: isi terlalu kecil untuk proto WhatsApp`);
  if (text.length > MAX_PROTO) throw new Fail(`${label}: terlalu besar`);
  if (text.includes('\0')) throw new Fail(`${label}: berisi karakter biner`);
  if (!/package\s+proto\s*;/.test(text) || !/message\s+WebMessageInfo\b/.test(text)) throw new Fail(`${label}: bukan proto WhatsApp (tidak ada "package proto" / WebMessageInfo)`);
  if (/^\s*import\s+(public\s+|weak\s+)?"/m.test(text)) throw new Fail(`${label}: berisi perintah "import" — ditolak demi keamanan`);
  if (/^\s*(service|extend)\s+\w+/m.test(text)) throw new Fail(`${label}: berisi "service/extend" — tidak dikenal sebagai proto WhatsApp`);
  const st = parseStructure(text);
  if (st.size < 300) throw new Fail(`${label}: hanya ${st.size} tipe terbaca (mencurigakan / terpotong)`);
  return st;
}

// ───────────────────────── Rencana & merge aditif ─────────────────────────
function computePlan(L, R) {
  const plan = { missing: [], newFields: [], newEnum: [], renamed: [], changed: [], enumAlias: [] };
  plan.missing = [...R.keys()].filter((k) => !L.has(k));
  for (const [k, rv] of R) {
    const lv = L.get(k);
    if (!lv || lv.kind !== rv.kind) continue;
    for (const [f, v] of rv.fields) {
      if (lv.fields.has(f)) {
        if (rv.kind === 'message') { const o = lv.fields.get(f); if (o[0] !== v[0] || o[1] !== v[1]) plan.changed.push({ k, f, old: o, now: v }); }
        else if (lv.fields.get(f) !== v) plan.changed.push({ k, f, old: lv.fields.get(f), now: v });
        continue;
      }
      if (rv.kind === 'enum') {
        if ([...lv.fields.values()].includes(v)) plan.enumAlias.push({ k, f, v });
        else plan.newEnum.push({ k, f, v });
        continue;
      }
      const same = [...lv.fields].filter(([, o]) => o[0] === v[0]).map(([n]) => n);
      (same.length ? plan.renamed : plan.newFields).push({ k, f, v, same });
    }
  }
  return plan;
}
const planSize = (p) => p.missing.length + p.newFields.length + p.newEnum.length;

const OPEN_RE = /^\s*(message|enum|oneof)\s+(\w+)\s*\{\s*(\/\/.*)?$/;
const FIELD_RE = /^\s*(?:(?:optional|repeated|required)\s+)?(?:map\s*<[^>]+>|[\w.]+)\s+\w+\s*=\s*\d+/;
const ENUM_RE = /^\s*[A-Za-z_]\w*\s*=\s*-?\d+/;
const indentOf = (s) => s.length - s.trimStart().length;

function buildTree(lines) {
  const root = { kind: 'root', name: '', start: -1, end: lines.length, children: [], full: '' };
  const st = [root];
  for (let i = 0; i < lines.length; i++) {
    const m = OPEN_RE.exec(lines[i]);
    if (m) {
      const parent = st[st.length - 1];
      const full = m[1] === 'oneof' ? parent.full : (parent.full ? parent.full + '.' : '') + m[2];
      const n = { kind: m[1], name: m[2], start: i, end: null, children: [], full };
      parent.children.push(n); st.push(n);
    } else if (lines[i].split('//')[0].trim() === '}') {
      if (st.length < 2) throw new Fail('Format proto tidak didukung: kurung "}" berlebih');
      st.pop().end = i;
    }
  }
  if (st.length !== 1) throw new Fail('Format proto tidak didukung: kurung tidak seimbang');
  return root;
}
function indexTree(root) {
  const d = new Map();
  (function walkTree(n) { for (const c of n.children) { if (c.kind !== 'oneof') d.set(c.full, c); walkTree(c); } })(root);
  return d;
}
/** baris statement milik node sendiri (bukan di dalam message/enum anak; isi oneof ikut dihitung) */
function ownLines(node) {
  const skip = node.children.filter((c) => c.kind !== 'oneof').map((c) => [c.start, c.end]);
  const out = [];
  for (let i = node.start + 1; i < node.end; i++) if (!skip.some(([a, b]) => i >= a && i <= b)) out.push(i);
  return out;
}
function adaptLine(line, from, to) {
  if (from === 'proto2' && to === 'proto3') return line.replace(/^(\s*)required\s+/, '$1optional ').replace(/\s*\[\s*default\s*=[^\]]*\]/, '');
  return line;
}

function applyMerge(localText, remoteText, plan) {
  const eol = localText.includes('\r\n') ? '\r\n' : '\n';
  const ul = localText.replace(/\r\n/g, '\n').split('\n');
  const pl = remoteText.replace(/\r\n/g, '\n').split('\n');
  const from = syntaxOf(remoteText), to = syntaxOf(localText);
  let uidx = indexTree(buildTree(ul));
  const pidx = indexTree(buildTree(pl));
  const log_ = [];
  const refresh = () => { uidx = indexTree(buildTree(ul)); };
  const adapt = (l) => adaptLine(l, from, to);

  // 1) tipe baru (hanya yang paling luar; anak ikut di dalam blok)
  const miss = new Set(plan.missing);
  const tops = plan.missing.filter((k) => !k.includes('.') || !miss.has(k.slice(0, k.lastIndexOf('.'))));
  for (const k of tops) {
    const pn = pidx.get(k);
    if (!pn) throw new Fail(`Tipe "${k}" tidak ditemukan di sumber (format satu baris tidak didukung)`);
    let block = pl.slice(pn.start, pn.end + 1).map(adapt);
    if (k.includes('.')) {
      const parent = uidx.get(k.slice(0, k.lastIndexOf('.')));
      if (!parent) throw new Fail(`Induk tipe "${k}" tidak ditemukan di proto lokal`);
      const shift = indentOf(ul[parent.start]) + 4 - indentOf(pl[pn.start]);
      block = block.map((b) => (!b.trim() ? b : shift > 0 ? ' '.repeat(shift) + b : shift < 0 ? b.slice(-shift) : b));
      ul.splice(parent.end, 0, '', ...block);
    } else ul.push('', ...block);
    refresh();
    log_.push(`tipe baru   : ${k} (${block.length} baris)`);
  }

  // 2) field baru
  for (const { k, f, v } of plan.newFields) {
    const node = uidx.get(k), pnode = pidx.get(k);
    if (!node || !pnode) throw new Fail(`Tipe "${k}" tidak ditemukan saat menambah field ${f}`);
    const re = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*${v[0]}\\b`);
    let src = null, oneof = null;
    for (const i of ownLines(pnode)) {
      if (re.test(pl[i]) && FIELD_RE.test(pl[i])) {
        src = pl[i];
        for (const c of pnode.children) if (c.kind === 'oneof' && c.start < i && i < c.end) oneof = c.name;
        break;
      }
    }
    if (!src) throw new Fail(`Baris field ${k}.${f} tidak ditemukan di sumber`);
    const text = adapt(src).trim();
    if (oneof) {
      const on = node.children.find((c) => c.kind === 'oneof' && c.name === oneof);
      if (on) { ul.splice(on.end, 0, ' '.repeat(indentOf(ul[on.start]) + 4) + text); log_.push(`field oneof : ${k}.${f} = ${v[0]} (oneof ${oneof})`); }
      else {
        const ind = indentOf(ul[node.start]) + 4;
        ul.splice(node.end, 0, ' '.repeat(ind) + `oneof ${oneof} {`, ' '.repeat(ind + 4) + text, ' '.repeat(ind) + '}');
        log_.push(`field oneof : ${k}.${f} = ${v[0]} (oneof baru ${oneof})`);
      }
    } else {
      const direct = ownLines(node).filter((i) => FIELD_RE.test(ul[i]) && !node.children.some((c) => c.kind === 'oneof' && c.start <= i && i <= c.end));
      const last = Math.max(node.start, ...direct, ...node.children.filter((c) => c.kind === 'oneof').map((c) => c.end));
      ul.splice(last + 1, 0, ' '.repeat(indentOf(ul[node.start]) + 4) + text);
      log_.push(`field       : ${k}.${f} = ${v[0]}`);
    }
    refresh();
  }

  // 3) nilai enum baru
  for (const { k, f, v } of plan.newEnum) {
    const node = uidx.get(k), pnode = pidx.get(k);
    if (!node || !pnode) throw new Fail(`Enum "${k}" tidak ditemukan saat menambah ${f}`);
    const re = new RegExp(`^\\s*${f}\\s*=\\s*${v}\\b`);
    const srcIdx = ownLines(pnode).find((i) => re.test(pl[i]));
    if (srcIdx === undefined) throw new Fail(`Baris enum ${k}.${f} tidak ditemukan di sumber`);
    const vals = ownLines(node).filter((i) => ENUM_RE.test(ul[i]));
    const last = vals.length ? Math.max(...vals) : node.start;
    const ind = vals.length ? indentOf(ul[last]) : indentOf(ul[node.start]) + 4;
    ul.splice(last + 1, 0, ' '.repeat(ind) + pl[srcIdx].trim());
    refresh();
    log_.push(`enum        : ${k}.${f} = ${v}`);
  }
  return { text: ul.join(eol), log: log_ };
}

function setVersionHeader(text, version) {
  const line = `/// WhatsApp Version: ${version}`;
  if (/\/\/\/\s*WhatsApp Version:/.test(text)) return text.replace(/\/\/\/\s*WhatsApp Version:[^\n\r]*/, line);
  if (/package\s+proto\s*;/.test(text)) return text.replace(/(package\s+proto\s*;[^\n]*\n)/, `$1\n${line}\n`);
  return `${line}\n${text}`;
}

// ───────────────────────── Tar & HTTP ─────────────────────────
const rstr = (b, o, l) => { const s = b.subarray(o, o + l); const z = s.indexOf(0); return s.subarray(0, z === -1 ? s.length : z).toString('utf8'); };
function parseTar(buf, onFile) {
  let off = 0, longName = null, paxPath = null, count = 0;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((x) => x === 0)) break;
    let name = rstr(h, 0, 100);
    const size = parseInt(rstr(h, 124, 12).trim() || '0', 8);
    if (!Number.isFinite(size) || size < 0) break;
    const type = h[156] === 0 ? '0' : String.fromCharCode(h[156]);
    if (rstr(h, 257, 5) === 'ustar') { const p = rstr(h, 345, 155); if (p) name = p + '/' + name; }
    off += 512;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = rstr(data, 0, data.length); continue; }
    if (type === 'x') {
      const s = data.toString('utf8'); let i = 0;
      while (i < s.length) {
        const sp = s.indexOf(' ', i); if (sp < 0) break;
        const len = parseInt(s.slice(i, sp), 10); if (!len) break;
        const rec = s.slice(sp + 1, i + len - 1); const eq = rec.indexOf('=');
        if (eq > 0 && rec.slice(0, eq) === 'path') paxPath = rec.slice(eq + 1);
        i += len;
      }
      continue;
    }
    if (type === 'g') continue;
    if (longName) { name = longName; longName = null; }
    if (paxPath) { name = paxPath; paxPath = null; }
    if (type === '0') { if (++count > 30000) throw new Fail('Arsip berisi terlalu banyak file'); onFile(name, data); }
  }
}

async function httpGet(url, hosts, max = MAX_PROTO, headers = {}) {
  let cur = url;
  for (let hop = 0; hop < 6; hop++) {
    const u = new URL(cur);
    if (u.protocol !== 'https:') throw new Fail(`Hanya https yang diizinkan: ${cur}`);
    if (net.isIP(u.hostname.replace(/^\[|\]$/g, ''))) throw new Fail('Alamat IP langsung tidak diizinkan');
    if (!hosts.includes(u.hostname)) throw new Fail(`Host tidak ada di allowedHosts: ${u.hostname}`);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);
    try {
      const res = await fetch(u, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'wa-proto-updater/1.0', ...headers } });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location'); if (!loc) throw new Fail('Redirect tanpa lokasi');
        cur = new URL(loc, u).toString(); continue;
      }
      if (!res.ok) throw new Fail(`HTTP ${res.status} dari ${u.hostname}`);
      if (Number(res.headers.get('content-length') || 0) > max) throw new Fail('Ukuran unduhan melebihi batas');
      const chunks = []; let total = 0;
      for await (const c of res.body) { total += c.length; if (total > max) { ctl.abort(); throw new Fail('Ukuran unduhan melebihi batas'); } chunks.push(c); }
      return Buffer.concat(chunks);
    } finally { clearTimeout(timer); }
  }
  throw new Fail('Terlalu banyak redirect');
}

// ───────────────────────── Deteksi lokasi (folder & file) ─────────────────────────
function* walk(dir, depth = 0, max = 7) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && depth < max) yield* walk(p, depth + 1, max); }
    else if (e.isFile()) yield p;
  }
}
const isWaProto = (t) => /package\s+proto\s*;/.test(t) && /message\s+WebMessageInfo\b/.test(t);

function detectLayout(root, cfg) {
  const inboxDirs = cfg.inboxDirs.map((d) => path.join(root, d) + path.sep);
  const inInbox = (f) => inboxDirs.some((d) => f.startsWith(d)) || (path.dirname(f) === root && path.basename(f).toLowerCase() !== 'waproto.proto');
  const protos = [...walk(root)].filter((f) => f.toLowerCase().endsWith('.proto'));
  const targets = [], inbox = [];
  for (const f of protos) {
    let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!isWaProto(t)) continue;
    (inInbox(f) ? inbox : targets).push(f);
  }
  let chosen = targets.filter((f) => path.basename(f).toLowerCase() === 'waproto.proto');
  if (!chosen.length) chosen = targets;
  const list = chosen.map((protoPath) => {
    const dir = path.dirname(protoPath);
    const ex = (n) => (fs.existsSync(path.join(dir, n)) ? path.join(dir, n) : null);
    return { protoPath, dir, exists: true, js: ex('index.js'), dts: ex('index.d.ts'), genScript: ex('GenerateStatics.sh'), fixImports: ex('fix-imports.js') };
  });
  return { targets: list, inbox };
}

// ───────────────────────── Sumber proto ─────────────────────────
async function loadSource(spec, cfg, root) {
  const hosts = cfg.allowedHosts;
  if (/^npm:/i.test(spec)) {
    const m = /^npm:((?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*)(?:@([\w.+-]+))?$/i.exec(spec);
    if (!m) throw new Fail(`Format sumber npm salah: ${spec}`);
    const meta = JSON.parse((await httpGet(`https://registry.npmjs.org/${m[1].replace('/', '%2f')}/${encodeURIComponent(m[2] || 'latest')}`, hosts, 5 * 1024 * 1024)).toString('utf8'));
    if (!meta?.dist?.tarball) throw new Fail(`Paket tidak ditemukan: ${spec}`);
    const gz = await httpGet(meta.dist.tarball, hosts, MAX_TARBALL);
    let tar; try { tar = zlib.gunzipSync(gz, { maxOutputLength: MAX_UNPACKED }); } catch { throw new Fail(`Arsip ${spec} rusak / terlalu besar`); }
    let best = null;
    parseTar(tar, (name, data) => {
      if (/(^|\/)WAProto\.proto$/i.test(name) && (!best || name.length < best.name.length)) best = { name, data: Buffer.from(data) };
    });
    if (!best) throw new Fail(`Tidak ada WAProto.proto di ${spec}`);
    return { origin: 'npm', label: `npm:${meta.name}@${meta.version}`, text: best.data.toString('utf8') };
  }
  if (/^https?:\/\//i.test(spec)) {
    return { origin: 'url', label: spec, text: (await httpGet(spec, hosts)).toString('utf8') };
  }
  const p = path.resolve(root, spec);
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) throw new Fail(`File sumber tidak ada: ${spec}`);
  if (fs.statSync(p).size > MAX_PROTO) throw new Fail(`File sumber terlalu besar: ${spec}`);
  const rp = rel(root, p);
  return { origin: 'file', label: `file:${rp.startsWith('..') ? path.basename(p) : rp}`, text: fs.readFileSync(p, 'utf8'), path: p };
}

const ORIGIN_RANK = { inbox: 0, file: 1, url: 2, npm: 3 };
async function collectCandidates(cfg, root, inboxFiles) {
  const cands = [], problems = [];
  for (const f of inboxFiles) {
    try { cands.push({ origin: 'inbox', label: `inbox:${rel(root, f)}`, text: fs.readFileSync(f, 'utf8'), path: f }); }
    catch (e) { problems.push(`${rel(root, f)}: ${e.message}`); }
  }
  const results = await Promise.allSettled(cfg.sources.map((s) => loadSource(s, cfg, root)));
  results.forEach((r, i) => { if (r.status === 'fulfilled') cands.push(r.value); else problems.push(`${cfg.sources[i]}: ${r.reason?.message || r.reason}`); });
  const valid = [];
  for (const c of cands) {
    try { c.struct = validateProtoText(c.text, c.label); c.version = parseVersion(c.text); valid.push(c); }
    catch (e) { problems.push(e.message); }
  }
  valid.sort((a, b) => cmpVer(b.version, a.version) || ORIGIN_RANK[a.origin] - ORIGIN_RANK[b.origin]);
  return { valid, problems, attempted: cands.length };
}

// ───────────────────────── Alat (pbjs / pbts) ─────────────────────────
function findTools(root, targets, cfg) {
  const dirs = [path.join(root, 'node_modules', '.bin'), ...targets.flatMap((t) => [path.join(t.dir, '..', 'node_modules', '.bin'), path.join(t.dir, 'node_modules', '.bin')])];
  for (const d of dirs) if (fs.existsSync(path.join(d, 'pbjs')) && fs.existsSync(path.join(d, 'pbts'))) return { binDir: d, nodeModules: path.dirname(d), installed: false };
  let range = cfg.protobufjsCli;
  if (!range) {
    try { const pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); range = pj.devDependencies?.['protobufjs-cli'] || pj.dependencies?.['protobufjs-cli']; } catch { /* abaikan */ }
  }
  range = range || '^2.7.0';
  if (!/^[\w.^~<>=| -]+$/.test(range)) throw new Fail(`Versi protobufjs-cli tidak valid: ${range}`);
  const dir = path.join(os.tmpdir(), `wa-proto-tools-${crypto.createHash('sha1').update(range).digest('hex').slice(0, 10)}`);
  const bin = path.join(dir, 'node_modules', '.bin');
  if (!fs.existsSync(path.join(bin, 'pbjs'))) {
    log(`🔧 Memasang protobufjs-cli@${range} (sekali saja, ke ${dir})…`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"wa-proto-tools","private":true}');
    const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error', `protobufjs-cli@${range}`], { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' });
    if (r.status !== 0 || !fs.existsSync(path.join(bin, 'pbjs'))) throw new Fail(`Gagal memasang protobufjs-cli: ${(r.stderr || r.stdout || '').slice(-400)}`);
  }
  return { binDir: bin, nodeModules: path.join(dir, 'node_modules'), installed: true };
}

function sh(cmd, cwd, tools, shimDir) {
  const env = { ...process.env, PATH: [shimDir, tools.binDir, process.env.PATH].filter(Boolean).join(path.delimiter) };
  const r = spawnSync('sh', ['-c', cmd], { cwd, env, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  if (r.status !== 0) throw new Fail(`Perintah gagal (${cmd.slice(0, 90)}):\n${(r.stderr || r.stdout || '').slice(-1200)}`);
}
function makeShim() {
  // GenerateStatics.sh memanggil "yarn pbjs ..." — shim ini meneruskannya ke pbjs/pbts lokal tanpa butuh yarn.
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-proto-shim-'));
  fs.writeFileSync(path.join(d, 'yarn'), '#!/bin/sh\nexec "$@"\n', { mode: 0o755 });
  return d;
}
function builtinFixImports(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/import \* as (\$protobuf) from/g, 'import $1 from').replace(/(['"])protobufjs\/minimal(['"])/g, '$1protobufjs/minimal.js$2');
  fs.writeFileSync(file, c);
}

function generate(t, cfg, tools) {
  const want = (o) => cfg.outputs.includes(o);
  const shim = makeShim();
  try {
    if (want('js') || want('dts')) {
      if (t.genScript) sh(`sh ./${path.basename(t.genScript)}`, t.dir, tools, shim);
      else {
        const p = './WAProto.proto';
        const base = 'pbjs -t static-module --no-beautify -w es6 --no-bundle --no-delimited --no-verify';
        if (want('js')) sh(`${base} --no-comments -o ./index.js ${p}`, t.dir, tools, shim);
        if (want('dts')) sh(`${base} ${p} | pbts --no-comments -o ./index.d.ts -`, t.dir, tools, shim);
        if (want('js')) {
          if (t.fixImports) sh('node ./fix-imports.js', t.dir, tools, shim);
          else builtinFixImports(path.join(t.dir, 'index.js'));
        }
      }
    }
    if (want('json')) sh('pbjs -t json -o ./WAProto.json ./WAProto.proto', t.dir, tools, shim);
  } finally { fs.rmSync(shim, { recursive: true, force: true }); }
}

// ───────────────────────── Verifikasi ─────────────────────────
async function verify(t, cfg, tools, root, oldStruct, newStruct, mode) {
  const checks = [];
  const ok = (name, detail = '') => checks.push({ ok: true, name, detail });
  const bad = (name, detail) => { checks.push({ ok: false, name, detail }); };

  // a) tidak ada yang hilang (merge) / tidak terpotong (replace)
  let removedT = 0, removedF = 0;
  for (const [k, ov] of oldStruct) {
    const nv = newStruct.get(k);
    if (!nv) { removedT++; continue; }
    for (const f of ov.fields.keys()) if (!nv.fields.has(f)) removedF++;
  }
  if (mode === 'merge') (removedT || removedF) ? bad('tidak ada yang hilang', `${removedT} tipe & ${removedF} field hilang`) : ok('tidak ada tipe/field/enum yang hilang');
  else if (oldStruct.size && newStruct.size < oldStruct.size * 0.8) bad('ukuran wajar', `tipe turun ${oldStruct.size} → ${newStruct.size}`);
  else ok('jumlah tipe wajar', `${newStruct.size} tipe`);

  // b) d.ts
  if (cfg.outputs.includes('dts')) {
    const f = path.join(t.dir, 'index.d.ts');
    (fs.existsSync(f) && /export namespace proto/.test(fs.readFileSync(f, 'utf8'))) ? ok('index.d.ts terbentuk') : bad('index.d.ts', 'kosong / tidak berisi namespace proto');
  }
  // c) js benar-benar bisa di-import dan dipakai
  if (cfg.outputs.includes('js')) {
    const f = path.join(t.dir, 'index.js');
    if (!fs.existsSync(f)) bad('index.js', 'tidak terbentuk');
    else {
      const holder = fs.existsSync(path.join(root, 'node_modules', 'protobufjs')) ? root : path.dirname(tools.nodeModules);
      const tmp = path.join(holder, `.wa-proto-verify-${process.pid}`);
      try {
        fs.mkdirSync(tmp, { recursive: true });
        fs.copyFileSync(f, path.join(tmp, 'index.mjs'));
        const mod = await import(pathToFileURL(path.join(tmp, 'index.mjs')).href);
        const proto = mod.proto || mod.default?.proto;
        if (!proto?.Message || !proto?.WebMessageInfo) bad('index.js', 'tidak mengekspor proto.Message / WebMessageInfo');
        else {
          const m = proto.Message.decode(proto.Message.encode(proto.Message.create({ conversation: 'ok' })).finish());
          const w = proto.WebMessageInfo.decode(proto.WebMessageInfo.encode(proto.WebMessageInfo.create({ key: { id: 'A' }, message: { conversation: 'x' } })).finish());
          const tops = [...newStruct.keys()].filter((k) => !k.includes('.') && newStruct.get(k).kind === 'message');
          const lacking = tops.filter((k) => typeof proto[k] !== 'function');
          if (m.conversation !== 'ok' || w.message?.conversation !== 'x') bad('index.js', 'uji encode/decode gagal');
          else if (lacking.length) bad('index.js', `${lacking.length} tipe tidak ada di hasil generate (mis. ${lacking[0]})`);
          else ok('index.js bisa dimuat & encode/decode jalan', `${tops.length} tipe utama`);
        }
      } catch (e) { bad('index.js', `gagal dimuat: ${String(e.message).split('\n')[0]}`); }
      finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    }
  }
  return checks;
}

// ───────────────────────── Output tambahan ─────────────────────────
/** array pendek (angka/string) dijadikan satu baris supaya file kecil & diff-nya enak dibaca */
function compactArrays(json) {
  return json.replace(/\[\s*((?:-?\d+|"[^"\\]*")(?:,\s*(?:-?\d+|"[^"\\]*"))*)\s*\]/g, (_, inner) => `[${inner.split(/,\s*/).join(', ')}]`);
}
function structureJson(struct, version) {
  const names = [...struct.keys()].sort();
  const messages = {}, enums = {};
  for (const k of names) {
    const v = struct.get(k);
    if (v.kind === 'message') messages[k] = Object.fromEntries([...v.fields].sort((a, b) => a[1][0] - b[1][0]));
    else enums[k] = Object.fromEntries([...v.fields].sort((a, b) => a[1] - b[1]));
  }
  return compactArrays(JSON.stringify({ protoVersion: version, counts: { messages: Object.keys(messages).length, enums: Object.keys(enums).length }, fields: '[nomor, tipe, label]', messages, enums }, null, 1)) + '\n';
}
function writeIfChanged(file, content, changed, root) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  changed.add(rel(root, file));
  return true;
}

async function fetchWaRevision(cfg, args) {
  if (Number.isFinite(args.waRevision) && args.waRevision > 0) return args.waRevision;
  try {
    // header yang sama dengan fetchLatestWaWebVersion() di Baileys (web.whatsapp.com menolak permintaan tanpa header browser)
    const txt = (await httpGet(`https://${WA_HOST}/sw.js`, [...cfg.allowedHosts, WA_HOST], 8 * 1024 * 1024, WA_HEADERS)).toString('utf8');
    const m = /\\?"client_revision\\?":\s*(\d+)/.exec(txt);
    return m ? Number(m[1]) : null;
  } catch (e) { warn(`Versi WA Web tidak bisa diambil: ${e.message}`); return null; }
}
function bumpVersionFiles(root, revision, dry) {
  const changes = [];
  for (const f of walk(root)) {
    if (!/\.(js|mjs|cjs|ts)$/.test(f) || /[\\/]WAProto[\\/]/.test(f) || /update-proto\.mjs$/.test(f)) continue;
    let s; try { s = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const re = /(const\s+version\s*=\s*\[\s*2\s*,\s*3000\s*,\s*)(\d+)(\s*\])/;
    const m = re.exec(s);
    if (!m || Number(m[2]) >= revision) continue;
    changes.push({ file: rel(root, f), from: Number(m[2]), to: revision });
    if (!dry) fs.writeFileSync(f, s.replace(re, `$1${revision}$3`));
  }
  return changes;
}

// ───────────────────────── Laporan ─────────────────────────
function buildReport({ results, best, problems, cfg, waRevision, bumps, dry, notes }) {
  const L = [];
  const up = results.filter((r) => r.updated);
  const head = up.length ? `Update WAProto → ${up[0].to}` : 'WAProto sudah terbaru';
  L.push(`## ${dry ? '🔎 (simulasi) ' : ''}${head}`, '');
  if (best) L.push(`- **Sumber terpilih:** \`${best.label}\` (versi ${best.version || '?'})`);
  L.push(`- **Mode:** ${cfg.mode === 'merge' ? 'merge — hanya menambah, tidak ada yang dihapus/diubah' : 'replace — diganti persis dengan sumber'}`);
  for (const r of results) {
    L.push('', `### \`${r.protoRel}\`${r.created ? ' (dibuat baru di folder utama)' : ' (terdeteksi otomatis)'}`);
    L.push(`- Versi: ${r.from || '-'} → **${r.to || r.from || '-'}**${r.updated ? '' : ' (tidak ada perubahan)'}`);
    if (r.plan) {
      L.push(`- Tambahan: **${r.plan.missing.length}** tipe · **${r.plan.newFields.length}** field · **${r.plan.newEnum.length}** nilai enum`);
      if (r.plan.renamed.length) L.push(`- Dilewati (nomor sama, nama beda): ${r.plan.renamed.length}`);
      if (r.plan.enumAlias.length) L.push(`- Dilewati (nilai enum sudah dipakai nama lain): ${r.plan.enumAlias.length}`);
      if (r.plan.changed.length && cfg.mode === 'merge') L.push(`- Beda definisi (tidak diubah di mode merge): ${r.plan.changed.length}`);
    }
    if (r.files?.length) L.push(`- File berubah: ${r.files.map((f) => `\`${f}\``).join(', ')}`);
    for (const c of r.checks || []) L.push(`- ${c.ok ? '✅' : '❌'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    for (const w of r.warnings || []) L.push(`- ⚠️ ${w}`);
    if (r.log?.length) {
      L.push('', '<details><summary>Rincian perubahan</summary>', '', '```');
      L.push(...r.log.slice(0, 120)); if (r.log.length > 120) L.push(`… dan ${r.log.length - 120} lagi (lihat CHANGES.md)`);
      L.push('```', '</details>');
    }
  }
  if (waRevision) L.push('', `- **Versi WA Web terbaru:** ${waRevision}`);
  for (const b of bumps) L.push(`- ${dry ? '(simulasi) ' : ''}Versi di \`${b.file}\`: ${b.from} → ${b.to}`);
  for (const n of notes) L.push(`- ℹ️ ${n}`);
  if (problems.length) { L.push('', '**Sumber yang gagal / ditolak:**'); for (const p of problems) L.push(`- ${p.replace(/\n/g, ' ')}`); }
  L.push('', '_Dibuat otomatis oleh `update-proto.mjs`. Tinjau perubahan sebelum merge._');
  return L.join('\n') + '\n';
}

function changesMd(r, best) {
  const L = [`# Perubahan WAProto ${r.from || '-'} → ${r.to}`, '', `Sumber: ${best.label}`, ''];
  const sec = (title, arr) => { if (arr.length) { L.push(`## ${title} (${arr.length})`, '', ...arr.slice(0, 400).map((x) => `- ${x}`), ...(arr.length > 400 ? [`- … dan ${arr.length - 400} lagi`] : []), ''); } };
  sec('Tipe baru', r.plan.missing);
  sec('Field baru', r.plan.newFields.map((x) => `${x.k}.${x.f} = ${x.v[0]}`));
  sec('Nilai enum baru', r.plan.newEnum.map((x) => `${x.k}.${x.f} = ${x.v}`));
  sec('Dilewati: nomor sama, nama beda', r.plan.renamed.map((x) => `${x.k}.${x.f} = ${x.v[0]} (sudah ada: ${x.same.join(', ')})`));
  if (r.removed?.length) sec('Ada di versi lama, tidak ada di sumber baru (mode replace)', r.removed);
  return L.join('\n');
}

// ───────────────────────── Proses satu target ─────────────────────────
async function processTarget(t, ctx) {
  const { cfg, best, root, args, tools } = ctx;
  const r = { protoRel: rel(root, t.protoPath), created: !t.exists, updated: false, files: [], warnings: [], checks: [], log: [] };
  const localText = t.exists ? fs.readFileSync(t.protoPath, 'utf8') : null;
  const localStruct = localText ? parseStructure(localText) : new Map();
  r.from = localText ? parseVersion(localText) : null;
  r.to = r.from;
  const mode = t.exists ? cfg.mode : 'replace';

  let plan = null, decision = false, why = '';
  if (best) {
    const cmp = cmpVer(best.version, r.from);
    const older = args.allowOlder || cfg.allowOlder;
    plan = computePlan(localStruct, best.struct);
    if (!t.exists) { decision = true; }
    else if (cmp < 0 && !older && !args.force) why = `sumber (${best.version}) lebih lama dari lokal (${r.from})`;
    else if (mode === 'merge') {
      decision = !!args.force || planSize(plan) > 0 || cmp > 0;   // versi naik walau struktur sama -> catat versinya
      if (!decision) why = 'sudah sama';
    } else {
      const same = localText.replace(/\r\n/g, '\n') === best.text.replace(/\r\n/g, '\n');
      decision = !!args.force || cmp > 0 || (cmp === 0 && !same);
      if (!decision) why = 'sudah sama';
    }
  } else why = 'tidak ada sumber yang bisa dipakai';
  r.plan = decision ? plan : null;

  if (decision) {
    let finalText;
    if (!t.exists || mode === 'replace') {
      finalText = best.text;
      if (t.exists) r.removed = [...localStruct.keys()].filter((k) => !best.struct.has(k));
      r.log = [`proto ${t.exists ? 'diganti dengan' : 'dibuat dari'} ${best.label}`];
    } else {
      const m = applyMerge(localText, best.text, plan);
      // header versi hanya boleh naik (sumber lama + --allow-older tidak boleh menurunkannya)
      const hv = cmpVer(best.version, r.from) > 0 ? best.version : r.from;
      finalText = hv ? setVersionHeader(m.text, hv) : m.text;
      r.log = m.log;
    }
    if (plan.enumAlias.length || plan.renamed.length) r.warnings.push(`${plan.renamed.length + plan.enumAlias.length} item dilewati karena bentrok nomor (lihat CHANGES.md)`);
    const newStruct = parseStructure(finalText);
    const noZero = [...newStruct].filter(([k, v]) => v.kind === 'enum' && v.fields.size && ![...v.fields.values()].includes(0) && plan.missing.includes(k));
    if (noZero.length && syntaxOf(finalText) === 'proto3') r.warnings.push(`${noZero.length} enum baru tidak punya nilai 0 (proto3): ${noZero.slice(0, 3).map(([k]) => k).join(', ')}${noZero.length > 3 ? '…' : ''}`);
    r.to = parseVersion(finalText) || best.version || r.from;
    r.source = best.label;

    if (args.dryRun) { r.updated = true; r.dry = true; return r; }

    // ---- tulis dengan cadangan; gagal -> kembalikan semuanya ----
    const names = ['WAProto.proto', 'index.js', 'index.d.ts', 'WAProto.json', 'structure.json', 'version.json', 'CHANGES.md'];
    const backup = new Map();
    for (const n of names) { const p = path.join(t.dir, n); if (fs.existsSync(p)) backup.set(p, fs.readFileSync(p)); }
    const dirExisted = fs.existsSync(t.dir);
    const restore = () => {
      for (const n of names) { const p = path.join(t.dir, n); if (backup.has(p)) fs.writeFileSync(p, backup.get(p)); else fs.rmSync(p, { force: true }); }
      if (!dirExisted) fs.rmSync(t.dir, { recursive: true, force: true });
    };
    try {
      fs.mkdirSync(t.dir, { recursive: true });
      fs.writeFileSync(t.protoPath, finalText);   // proto harus tersimpan dulu supaya generator bisa membacanya
      generate(t, cfg, tools);
      r.checks = await verify(t, cfg, tools, root, localStruct, newStruct, mode);
      if (r.checks.some((c) => !c.ok)) throw new Fail('Verifikasi gagal: ' + r.checks.filter((c) => !c.ok).map((c) => `${c.name} (${c.detail})`).join('; '));
    } catch (e) { restore(); throw e; }

    const changed = new Set();
    for (const [p, buf] of backup) if (fs.existsSync(p) && !fs.readFileSync(p).equals(buf)) changed.add(rel(root, p));
    for (const n of names) { const p = path.join(t.dir, n); if (!backup.has(p) && fs.existsSync(p)) changed.add(rel(root, p)); }
    if (cfg.outputs.includes('structure')) writeIfChanged(path.join(t.dir, 'structure.json'), structureJson(newStruct, r.to), changed, root);
    if (t.exists) writeIfChanged(path.join(t.dir, 'CHANGES.md'), changesMd(r, best), changed, root);
    r.files = [...changed].sort();
    r.updated = changed.size > 0;
  } else {
    r.note = why;
    if (localText && cfg.outputs.includes('structure') && !args.dryRun) {
      const changed = new Set();
      writeIfChanged(path.join(t.dir, 'structure.json'), structureJson(localStruct, r.from), changed, root);
      if (changed.size) { r.files = [...changed]; r.updated = true; r.to = r.from; }
    }
  }
  return r;
}

// ───────────────────────── Main ─────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return help();
  const root = args.root ? path.resolve(args.root) : findRoot(process.cwd());
  if (!fs.existsSync(root)) throw new Fail(`Folder tidak ada: ${root}`);
  const cfg = loadConfig(root, args);
  log(`📁 Folder utama : ${root}`);
  if (cfg._path) log(`⚙️  Config       : ${rel(root, cfg._path)}`);

  // 1) deteksi otomatis
  const layout = detectLayout(root, cfg);
  let targets = layout.targets;
  if (targets.length) {
    for (const t of targets) {
      const extra = [t.js && 'index.js', t.dts && 'index.d.ts', t.genScript && 'GenerateStatics.sh', t.fixImports && 'fix-imports.js'].filter(Boolean);
      log(`📍 Terdeteksi   : ${rel(root, t.protoPath)}${extra.length ? `  (+ ${extra.join(', ')})` : ''}`);
    }
  } else {
    const dir = path.join(root, args.outDir || cfg.outDir);
    const ex = (n) => (fs.existsSync(path.join(dir, n)) ? path.join(dir, n) : null);   // skrip bantu yang sudah ada tetap dipakai
    targets = [{ protoPath: path.join(dir, 'WAProto.proto'), dir, exists: false, js: ex('index.js'), dts: ex('index.d.ts'), genScript: ex('GenerateStatics.sh'), fixImports: ex('fix-imports.js') }];
    log(`📍 Belum ada proto di repo → akan dibuat di folder utama: ${rel(root, dir)}/`);
  }
  for (const f of layout.inbox) log(`📥 Inbox         : ${rel(root, f)}`);

  // 2) kumpulkan sumber
  const { valid, problems, attempted } = await collectCandidates(cfg, root, layout.inbox);
  const best = valid[0] || null;
  if (best) log(`🌐 Sumber terbaik: ${best.label} → versi ${best.version || '?'}` + (valid.length > 1 ? `  (${valid.length} sumber valid)` : ''));
  else warn(attempted === 0 ? 'Tidak ada sumber proto yang dikonfigurasi.' : 'Tidak ada sumber proto yang bisa dipakai.');
  for (const p of problems) warn(`Sumber dilewati — ${p.replace(/\n/g, ' ')}`);
  if (!best && args.strict) throw new Fail('Semua sumber gagal', 2);

  // 3) alat generate (hanya dipasang kalau memang perlu)
  const tools = best && !args.dryRun ? findTools(root, layout.targets, cfg) : null;

  // 4) proses tiap target
  const results = [];
  const ctx = { cfg, best, root, args, tools };
  for (const t of targets) {
    const r = await processTarget(t, ctx);
    results.push(r);
    log(r.updated ? `${r.dry ? '🔎' : '✅'} ${r.protoRel}: ${r.from || '-'} → ${r.to}${r.dry ? ' (simulasi)' : ''}` : `⏺️  ${r.protoRel}: tidak diubah${r.note ? ` — ${r.note}` : ''}`);
  }

  // 5) versi WA Web (opsional)
  const notes = [];
  let waRevision = null, bumps = [];
  if (cfg.outputs.includes('version') || args.bumpVersion) {
    waRevision = await fetchWaRevision(cfg, args);
    if (cfg.outputs.includes('version') && !args.dryRun) {
      for (const t of targets) {
        const r = results.find((x) => x.protoRel === rel(root, t.protoPath));
        if (!fs.existsSync(t.dir)) continue;
        const vf = path.join(t.dir, 'version.json');
        let prev = null; try { prev = JSON.parse(fs.readFileSync(vf, 'utf8')); } catch { /* belum ada */ }
        // jangan menimpa angka WA yang sudah ada dengan null kalau pengambilan gagal
        const content = compactArrays(JSON.stringify({
          proto: r?.to ?? prev?.proto ?? null,
          waWebRevision: waRevision ?? prev?.waWebRevision ?? null,
          waWebVersion: waRevision ? [2, 3000, waRevision] : (prev?.waWebVersion ?? null),
          source: r?.source ?? prev?.source ?? null,   // sumber proto yang BENAR-BENAR dipakai (bukan sekadar kandidat terbaik)
        }, null, 2)) + '\n';
        const changed = new Set();
        if (writeIfChanged(vf, content, changed, root) && r) { r.files = [...new Set([...(r.files || []), ...changed])]; r.updated = true; r.to = r.to || r.from; }
      }
    }
    if (args.bumpVersion) {
      if (!waRevision) notes.push('Naikkan versi dilewati: versi WA Web terbaru tidak bisa didapat.');
      else { bumps = bumpVersionFiles(root, waRevision, args.dryRun); if (!bumps.length) notes.push(`Versi di kode sudah ≥ ${waRevision}.`); }
    }
  }

  // 6) bersihkan inbox yang sudah diproses
  if (best?.origin === 'inbox' && !args.dryRun && !(cfg.keepInbox || args.keepInbox) && results.some((r) => r.updated || r.note === 'sudah sama')) {
    fs.rmSync(best.path, { force: true });
    log(`🧹 Inbox diproses & dihapus: ${rel(root, best.path)}`);
  } else if (best?.origin === 'inbox' && results.every((r) => !r.updated)) notes.push(`File inbox ${rel(root, best.path)} tidak lebih baru dari yang ada — dibiarkan.`);

  // 7) laporan & output CI
  const anyUpdated = results.some((r) => r.updated) || bumps.length > 0;
  const report = buildReport({ results, best, problems, cfg, waRevision, bumps, dry: !!args.dryRun, notes });
  const reportPath = args.report ? path.resolve(args.report) : path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'wa-proto-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  const first = results.find((r) => r.updated) || results[0];
  const summary = anyUpdated ? `WAProto ${first?.from || '-'} -> ${first?.to || waRevision || '-'}` : 'WAProto sudah terbaru';
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `updated=${anyUpdated && !args.dryRun}\nupdate_available=${anyUpdated}\nfrom=${first?.from || ''}\nto=${first?.to || waRevision || ''}\nreport=${reportPath}\nsummary=${summary}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  log(`\n${anyUpdated ? (args.dryRun ? '🔎 Ada update tersedia (simulasi, tidak ada file diubah).' : '✅ Selesai — file sudah diperbarui.') : '✅ Tidak ada yang perlu diupdate.'}`);
  log(`📝 Laporan: ${reportPath}`);
}

main().catch((e) => {
  const code = e instanceof Fail ? e.code : 1;
  console.error(IS_CI ? `::error::${e.message}` : `❌ ${e.message}`);
  if (!(e instanceof Fail)) console.error(e.stack);
  process.exit(code);
});
