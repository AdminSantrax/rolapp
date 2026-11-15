import { useState, useEffect } from 'react';

export function validateImageUrl(value) {
  let url;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Introduce una URL válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Usa una URL HTTPS pública y directa a la imagen.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (error) reject(error);
      else resolve(url.href);
    };
    const timer = setTimeout(() => finish(new Error('La imagen tardó demasiado en cargar.')), 12000);

    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo comprobar la imagen.');
        context.drawImage(img, 0, 0, 1, 1);
        canvas.toDataURL('image/png');
        finish();
      } catch {
        finish(new Error('El servidor no permite exportar la imagen (restricción CORS).'));
      }
    };
    img.onerror = () => finish(new Error('No se pudo cargar la imagen desde esa URL.'));
    img.src = url.href;
  });
}

export function useImg(src) {
  const [im, setIm] = useState(null);
  useEffect(() => {
    if (!src) { setIm(null); return; }
    setIm(null);
    const i = new Image();
    if (/^https?:\/\//i.test(src)) i.crossOrigin = 'anonymous';
    i.onload = () => setIm(i);
    i.onerror = () => setIm(null);
    i.src = src;
    return () => { i.onload = null; i.onerror = null; };
  }, [src]);
  return im;
}
