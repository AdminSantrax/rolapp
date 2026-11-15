import { useState, useEffect } from 'react';

// Reduce la imagen y la devuelve como JPEG en base64 (así ocupa poco).
export function readImage(file, max, q = 0.8) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagen no válida')); };
    im.src = url;
  });
}

export function useImg(src) {
  const [im, setIm] = useState(null);
  useEffect(() => {
    if (!src) { setIm(null); return; }
    const i = new Image();
    i.onload = () => setIm(i);
    i.src = src;
  }, [src]);
  return im;
}
