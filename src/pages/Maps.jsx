import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, Modal, ImportBox } from '../components.jsx';
import { useStore, uid, mergeIn, validMap } from '../lib/storage.js';

export const newMap = () => ({ id: uid(), name: 'Nueva mazmorra', rooms: [], walls: [], tokens: [], updatedAt: Date.now() });

export default function Maps() {
  const store = useStore('rol.maps');
  const nav = useNavigate();
  const [imp, setImp] = useState(false);
  const create = () => { const m = newMap(); store.put(m); nav('/maps/' + m.id); };
  const onData = (d) => { const ok = mergeIn(store, d, validMap); if (ok) setImp(false); return ok; };
  return (
    <Page title="Mapas" actions={<>
      <button className="btn" onClick={() => setImp(true)}>Importar código</button>
      <button className="btn primary" onClick={create}>Nuevo mapa</button>
    </>}>
      {store.items.length === 0 ? (
        <div className="empty"><p>Aún no tienes mapas.</p><p className="muted">Crea uno y dibuja salas, paredes y fichas.</p></div>
      ) : (
        <div className="list">
          {store.items.map((m) => (
            <Link key={m.id} to={'/maps/' + m.id} className="item">
              <strong>{m.name || 'Sin nombre'}</strong>
              <span className="muted">{m.rooms.length} salas · {m.walls.length} paredes · {m.tokens.length} fichas</span>
              <span className="muted">Editado {new Date(m.updatedAt).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}
      {imp && <Modal title="Importar mapa" onClose={() => setImp(false)}><ImportBox type="map" onData={onData} /></Modal>}
    </Page>
  );
}
