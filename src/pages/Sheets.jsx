import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, Modal, ImportBox } from '../components.jsx';
import { useStore, uid, mergeIn, validSheet } from '../lib/storage.js';

export const newSheet = () => ({
  id: uid(), name: 'Nuevo ciudadano', clone: '', clearance: 'Rojo', sector: '', group: '',
  society: '', mutant: '', treason: 0, moxie: 6,
  stats: { Violencia: 0, Cerebro: 0, Descaro: 0, Humor: 0 }, gear: '', notes: '', updatedAt: Date.now(),
});

export default function Sheets() {
  const store = useStore('rol.sheets');
  const nav = useNavigate();
  const [imp, setImp] = useState(false);
  const create = () => { const s = newSheet(); store.put(s); nav('/sheets/' + s.id); };
  const onData = (d) => { const ok = mergeIn(store, d, validSheet); if (ok) setImp(false); return ok; };
  return (
    <Page title="Fichas" actions={<>
      <button className="btn" onClick={() => setImp(true)}>Importar código</button>
      <button className="btn primary" onClick={create}>Nueva ficha</button>
    </>}>
      {store.items.length === 0 ? (
        <div className="empty"><p>Aún no tienes fichas.</p><p className="muted">Crea una, o pega el código que te haya pasado un jugador o tu GM.</p></div>
      ) : (
        <div className="list">
          {store.items.map((s) => (
            <Link key={s.id} to={'/sheets/' + s.id} className="item">
              <strong>{s.name || 'Sin nombre'}</strong>
              <span className="muted">{s.clearance} · {s.clone || 'sin clon'}</span>
              <span className="muted">Editada {new Date(s.updatedAt).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}
      {imp && <Modal title="Importar ficha" onClose={() => setImp(false)}><ImportBox type="sheet" onData={onData} /></Modal>}
    </Page>
  );
}
