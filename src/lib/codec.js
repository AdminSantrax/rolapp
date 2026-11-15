import LZ from 'lz-string';

// Código compartible: ROL1-<tipo>-<datos comprimidos>
export const encode = (type, data) =>
  `ROL1-${type}-` + LZ.compressToEncodedURIComponent(JSON.stringify(data));

export function decode(code) {
  const m = /^ROL1-(sheet|map)-(.+)$/.exec(code.replace(/\s+/g, ''));
  if (!m) throw new Error('El código no es válido. Debe empezar por ROL1-.');
  const raw = LZ.decompressFromEncodedURIComponent(m[2]);
  if (!raw) throw new Error('El código está incompleto o dañado. Cópialo de nuevo entero.');
  try { return { type: m[1], data: JSON.parse(raw) }; }
  catch { throw new Error('El código está dañado. Cópialo de nuevo entero.'); }
}
