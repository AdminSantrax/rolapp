import { useState, useCallback } from 'react';

export const uid = () => crypto.randomUUID();

const read = (k) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; }
  catch { return []; }
};

const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ }
};

// Lista persistente en localStorage. Escribe al instante; save() actualiza la fecha, put() la conserva.
export function useStore(key) {
  const [items, setItems] = useState(() => read(key));
  const commit = useCallback((next) => { write(key, next); setItems(next); }, [key]);
  const put = useCallback((it) => {
    const cur = read(key);
    commit(cur.some((x) => x.id === it.id) ? cur.map((x) => (x.id === it.id ? it : x)) : [it, ...cur]);
  }, [key, commit]);
  const save = useCallback((it) => put({ ...it, updatedAt: Date.now() }), [put]);
  const remove = useCallback((id) => commit(read(key).filter((x) => x.id !== id)), [key, commit]);
  return { items, put, save, remove };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const validSheet = (d) => isObj(d) && typeof d.id === 'string' && typeof d.name === 'string' && isObj(d.stats);
export const validMap = (d) => isObj(d) && typeof d.id === 'string' && typeof d.name === 'string'
  && ['rooms', 'walls', 'tokens'].every((k) => Array.isArray(d[k]));

// Fusiona un elemento importado: la versión más reciente gana, pidiendo confirmación.
export function mergeIn(store, data, valid) {
  if (!valid(data)) throw new Error('El código no contiene datos válidos.');
  const cur = store.items.find((x) => x.id === data.id);
  const incoming = Number(data.updatedAt) || 0;
  if (cur) {
    const msg = (cur.updatedAt || 0) > incoming
      ? `Tu copia de "${cur.name}" es más reciente que el código. ¿Sobrescribirla igualmente?`
      : `Ya tienes "${cur.name}". ¿Actualizarla con el código?`;
    if (!window.confirm(msg)) return false;
  }
  store.put({ ...data, updatedAt: incoming || Date.now() });
  return true;
}
