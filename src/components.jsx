import { useState } from 'react';
import { decode } from './lib/codec';
import { validateImageUrl } from './lib/image.js';

export const Page = ({ title, actions, children }) => (
  <div className="page">
    <header className="page-head"><h1>{title}</h1><div className="row">{actions}</div></header>
    {children}
  </div>
);

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="btn ghost" onClick={onClose}>Cerrar</button></div>
        {children}
      </div>
    </div>
  );
}

export function ImageUrlDialog({ title, onClose, onAccept, initialValue = '' }) {
  const [url, setUrl] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    let validUrl;
    try {
      validUrl = await validateImageUrl(url);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onAccept(validUrl);
    onClose();
  };
  return (
    <>
      <Modal title={title} onClose={onClose}>
        <form className="codebox" onSubmit={submit}>
          <label className="field">
            <span>Enlace directo a una imagen</span>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required autoFocus />
          </label>
          <p className="muted">Debe ser pública y permitir su exportación. Se comprobará antes de guardarla.</p>
          <div className="row">
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Comprobando...' : 'Validar y usar imagen'}</button>
            <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </Modal>
      {error && (
        <Modal title="No se puede usar esta imagen" onClose={() => setError('')}>
          <p>No se guardó la imagen. No se podrá exportar junto con la ficha o el mapa y, por tanto, el enlace compartido no sería válido.</p>
          <p className="muted">{error}</p>
          <button className="btn" onClick={() => setError('')}>Entendido</button>
        </Modal>
      )}
    </>
  );
}

export function CodeBox({ code, hint }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* sin permiso */ }
  };
  return (
    <div className="codebox">
      {hint && <p className="muted">{hint}</p>}
      <textarea readOnly value={code} onFocus={(e) => e.target.select()} />
      <button className="btn primary" onClick={copy}>{ok ? 'Copiado' : 'Copiar código'}</button>
    </div>
  );
}

export function ImportBox({ type, onData }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    try {
      const { type: t, data } = decode(v);
      if (t !== type) throw new Error(`Este código es de ${t === 'sheet' ? 'una ficha' : 'un mapa'}, no de ${type === 'sheet' ? 'una ficha' : 'un mapa'}.`);
      if (onData(data) !== false) { setV(''); setErr(''); }
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="codebox">
      <textarea placeholder="Pega aquí un código que empiece por ROL1-" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn primary" disabled={!v.trim()} onClick={go}>Importar código</button>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}
