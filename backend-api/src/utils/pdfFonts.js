/**
 * PDFKit font Helvetica = WinAnsi → tiếng Việt UTF-8 bị “vỡ” (mojibake).
 * Bắt buộc nhúng DejaVu Sans TTF; đọc file thành Buffer để tránh lỗi đường dẫn Windows.
 */
const path = require('path');
const fs = require('fs');

function tryReadTtf(dir, filename) {
  const p = path.resolve(dir, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p);
  } catch (e) {
    console.warn(`[pdfFonts] Không đọc được ${p}:`, e.message);
    return null;
  }
}

function collectDejaVuDirs() {
  const dirs = [];

  try {
    const pkgJson = require.resolve('dejavu-fonts-ttf/package.json');
    dirs.push(path.resolve(path.dirname(pkgJson), 'ttf'));
  } catch (_) {
    /* chưa npm install */
  }

  dirs.push(path.resolve(__dirname, '../../assets/fonts/dejavu'));
  dirs.push(path.resolve(__dirname, '../../node_modules/dejavu-fonts-ttf/ttf'));
  dirs.push(path.resolve(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf'));

  return [...new Set(dirs)];
}

let dejavuLoadMemo = undefined;

function loadDejaVuBuffers() {
  if (dejavuLoadMemo !== undefined) return dejavuLoadMemo;

  for (const dir of collectDejaVuDirs()) {
    const regular = tryReadTtf(dir, 'DejaVuSans.ttf');
    if (!regular) continue;

    const bold = tryReadTtf(dir, 'DejaVuSans-Bold.ttf') || regular;
    const oblique = tryReadTtf(dir, 'DejaVuSans-Oblique.ttf') || regular;

    console.log(`[pdfFonts] Đã nạp DejaVu Sans (UTF-8) từ: ${dir}`);
    dejavuLoadMemo = { regular, bold, oblique, sourceDir: dir };
    return dejavuLoadMemo;
  }

  console.error(
    '[pdfFonts] LỖI: Không tìm thấy DejaVuSans.ttf. Chạy trong thư mục backend-api: npm install dejavu-fonts-ttf',
  );
  console.error('[pdfFonts] Đã thử các thư mục:', collectDejaVuDirs().join(' | '));
  dejavuLoadMemo = null;
  return null;
}

/** Cache một lần / process */
let cachedPick = null;

/**
 * @returns {{ regular: Buffer|string, bold: Buffer|string, oblique: Buffer|string, embedded?: boolean }}
 */
function pickPdfFonts() {
  if (cachedPick) return cachedPick;

  const loaded = loadDejaVuBuffers();
  if (loaded) {
    cachedPick = {
      regular: loaded.regular,
      bold: loaded.bold,
      oblique: loaded.oblique,
      embedded: true,
    };
    return cachedPick;
  }

  cachedPick = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    oblique: 'Helvetica-Oblique',
    embedded: false,
  };
  return cachedPick;
}

function resolveDejaVuPaths() {
  const loaded = loadDejaVuBuffers();
  if (!loaded) return null;
  return {
    regular: path.join(loaded.sourceDir, 'DejaVuSans.ttf'),
    bold: path.join(loaded.sourceDir, 'DejaVuSans-Bold.ttf'),
    oblique: path.join(loaded.sourceDir, 'DejaVuSans-Oblique.ttf'),
  };
}

function findDejaVuTtfDir() {
  const loaded = loadDejaVuBuffers();
  return loaded ? loaded.sourceDir : null;
}

module.exports = { pickPdfFonts, resolveDejaVuPaths, findDejaVuTtfDir, loadDejaVuBuffers };
