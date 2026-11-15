import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Page, Modal, CodeBox, ImportBox } from '../components.jsx';
import { useStore, mergeIn, validSheet } from '../lib/storage.js';
import { encode } from '../lib/codec.js';

const CLEARANCES = ['Infrarrojo', 'Rojo', 'Naranja', 'Amarillo', 'Verde', 'Azul', 'Índigo', 'Violeta', 'Ultravioleta'];
const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;

export default function SheetEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useStore('rol.sheets');
  const [modal, setModal] = useState(null);
  const s = store.items.find((x) => x.id === id);
  if (!s) return <Page title="Ficha no encontrada" actions={<Link className="btn" to="/sheets">Volver a fichas</Link>} />;
  const set = (p) => store.save({ ...s, ...p });
  const txt = (k) => ({ value: s[k] ?? '', onChange: (e) => set({ [k]: e.target.value }) });
  const num = (k, max) => ({ type: 'number', min: 0, max, value: s[k] ?? 0, onChange: (e) => set({ [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) }) });
  const stat = (k, v) => set({ stats: { ...s.stats, [k]: Math.max(0, Math.min(20, Number(v) || 0)) } });
  const del = () => { if (window.confirm(`¿Borrar la ficha "${s.name}"? No se puede deshacer.`)) { store.remove(s.id); nav('/sheets'); } };
  const onData = (d) => {
    if (d.id !== s.id && !window.confirm('Este código es de otra ficha. Se añadirá como ficha nueva. ¿Continuar?')) return false;
    const ok = mergeIn(store, d, validSheet);
    if (ok) setModal(null);
    return ok;
  };
  return (
    <Page title={s.name || 'Sin nombre'} actions={<>
      <Link className="btn ghost" to="/sheets">Volver</Link>
      <button className="btn" onClick={() => setModal('in')}>Importar código</button>
      <button className="btn primary" onClick={() => setModal('out')}>Compartir ficha</button>
    </>}>
      <div className="grid2">
        <section className="panel">
          <h2>Identidad</h2>
          <Field label="Nombre"><input {...txt('name')} /></Field>
          <Field label="Clon"><input placeholder="Ej.: Pepe-R-ABC-3" {...txt('clone')} /></Field>
          <Field label="Autorización">
            <select {...txt('clearance')}>{CLEARANCES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Sector"><input {...txt('sector')} /></Field>
          <Field label="Grupo de servicio"><input {...txt('group')} /></Field>
          <Field label="Sociedad secreta"><input {...txt('society')} /></Field>
          <Field label="Poder mutante"><input {...txt('mutant')} /></Field>
        </section>
        <section className="panel">
          <h2>Atributos</h2>
          <div className="stats">
            {Object.entries(s.stats).map(([k, v]) => (
              <Field key={k} label={k}><input type="number" min="0" max="20" value={v} onChange={(e) => stat(k, e.target.value)} /></Field>
            ))}
          </div>
          <div className="stats">
            <Field label="Estrellas de traición"><input {...num('treason', 99)} /></Field>
            <Field label="Moxie"><input {...num('moxie', 99)} /></Field>
          </div>
          <Field label="Equipo"><textarea rows="4" {...txt('gear')} /></Field>
          <Field label="Notas"><textarea rows="6" {...txt('notes')} /></Field>
        </section>
      </div>
      <div className="row end"><button className="btn danger" onClick={del}>Borrar ficha</button></div>
      {modal === 'out' && (
        <Modal title="Compartir ficha" onClose={() => setModal(null)}>
          <CodeBox code={encode('sheet', s)} hint="Envía este código por chat. Quien lo importe recibirá la ficha tal como está ahora. Si cambias algo, vuelve a copiar el código." />
        </Modal>
      )}
      {modal === 'in' && (
        <Modal title="Importar cambios" onClose={() => setModal(null)}>
          <p className="muted">Pega el código de esta ficha para recibir los cambios de la otra persona.</p>
          <ImportBox type="sheet" onData={onData} />
        </Modal>
      )}
    </Page>
  );
}
