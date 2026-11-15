import { useRef, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Ellipse, Line, Group, Circle, Text, Image as KImage } from 'react-konva';
import { Modal, CodeBox, ImageUrlDialog } from '../components.jsx';
import { useStore, uid } from '../lib/storage.js';
import { encode } from '../lib/codec.js';
import { useImg } from '../lib/image.js';

const CELL = 48, COLS = 48, ROWS = 32, R = CELL * 0.4;
const COLORS = ['#e5484d', '#f59f3b', '#e8c547', '#4cc38a', '#3e8bff', '#8b6cff'];
const ROOM_COLORS = ['#2a3144', '#3f3a5e', '#2f4f47', '#5a3d3a', '#3a4f66'];
const TOOLS = [['select', 'Seleccionar'], ['rect', 'Sala rectangular'], ['ellipse', 'Sala circular'], ['poly', 'Sala libre'],
  ['wall', 'Pared'], ['marker', 'Marcador'], ['erase', 'Goma']];
const HELP = {
  select: 'Arrastra fichas para moverlas. Botón derecho: mover la vista.',
  rect: 'Arrastra para dibujar una sala.', ellipse: 'Arrastra para dibujar una sala circular.',
  poly: 'Haz clic para añadir puntos. Cierra pulsando el primero, con doble clic o con Enter.',
  wall: 'Arrastra para trazar una pared.', marker: 'Haz clic para colocar un marcador.',
  erase: 'Mantén pulsado y arrastra sobre lo que quieras borrar.',
};
const rd = (v) => Math.round(v * 100) / 100;
const norm = (r) => (r.t ? r : { id: r.id, t: 'r', c: ROOM_COLORS[0], d: [r.x, r.y, r.w, r.h] });

// Una sala se dibuja en dos pasadas (bordes, luego rellenos): las que se solapan con el mismo color se funden.
function Room({ r, fill }) {
  const base = fill ? { fill: r.c, ek: 'rooms', eid: r.id } : { stroke: '#56627f', strokeWidth: 8, lineJoin: 'round', listening: false };
  const d = r.d;
  if (r.t === 'e') return <Ellipse x={d[0] * CELL} y={d[1] * CELL} radiusX={d[2] * CELL} radiusY={d[3] * CELL} {...base} />;
  if (r.t === 'p') return <Line points={d.map((v) => v * CELL)} closed {...base} />;
  return <Rect x={d[0] * CELL} y={d[1] * CELL} width={d[2] * CELL} height={d[3] * CELL} {...base} />;
}

function Token({ t, sheet, sel, draggable, onSelect, onMove }) {
  const img = useImg(sheet?.img);
  const s = img ? (2 * R) / Math.min(img.width, img.height) : 1;
  const fill = img
    ? { fillPatternImage: img, fillPatternOffset: { x: img.width / 2, y: img.height / 2 }, fillPatternScale: { x: s, y: s }, fillPatternRepeat: 'no-repeat' }
    : { fill: t.color };
  return (
    <Group tk x={t.x * CELL} y={t.y * CELL} draggable={draggable} onMouseDown={onSelect}
      onDragEnd={(e) => onMove(rd(e.target.x() / CELL), rd(e.target.y() / CELL))}>
      <Circle radius={R} stroke={sel ? '#ffffff' : '#0e1118'} strokeWidth={sel ? 4 : 3} {...fill} />
      {!img && <Text text={t.label} width={CELL} x={-CELL / 2} y={-6} align="center" fontSize={12} fontStyle="bold" fill="#0e1118" listening={false} />}
    </Group>
  );
}

export default function MapEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useStore('rol.maps');
  const sheets = useStore('rol.sheets').items;
  const m = store.items.find((x) => x.id === id);
  const box = useRef(null), stage = useRef(null), cur = useRef(null), pan = useRef(null), erasing = useRef(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tool, setTool] = useState('rect');
  const [rc, setRc] = useState(ROOM_COLORS[0]);
  const [draft, setDraft] = useState(null);
  const [poly, setPoly] = useState(null);
  const [sel, setSel] = useState(null);
  const [share, setShare] = useState(false);
  const [imageUrlOpen, setImageUrlOpen] = useState(false);
  const [exportError, setExportError] = useState(false);
  const bgImg = useImg(m?.bg);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!m]);

  if (!m) return <div className="page"><p>Mapa no encontrado.</p><Link className="btn" to="/maps">Volver a mapas</Link></div>;

  cur.current = m;
  const set = (p) => { cur.current = { ...cur.current, ...p }; store.save(cur.current); };
  const pt = () => {
    const st = stage.current, p = st.getPointerPosition(), k = st.scaleX();
    return { x: (p.x - st.x()) / k, y: (p.y - st.y()) / k };
  };
  const gp = () => { const p = pt(); return [Math.round(p.x / CELL), Math.round(p.y / CELL)]; };
  const addRoom = (t, d) => set({ rooms: [...cur.current.rooms, { id: uid(), t, c: rc, d }] });
  const closePoly = () => { if (poly && poly.pts.length >= 3) addRoom('p', poly.pts.flat()); setPoly(null); };

  const eraseAt = () => {
    const st = stage.current, p = st.getPointerPosition();
    if (!p) return;
    for (const [dx, dy] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) {
      let n = st.getIntersection({ x: p.x + dx, y: p.y + dy });
      while (n && !n.attrs.ek) n = n.getParent();
      if (n && n.attrs.ek) { const k = n.attrs.ek, eid = n.attrs.eid; set({ [k]: cur.current[k].filter((x) => x.id !== eid) }); }
    }
  };

  const down = (e) => {
    if (e.evt.button !== 0) { pan.current = { x: e.evt.clientX, y: e.evt.clientY }; return; }
    if (tool === 'select') { if (!e.target.getParent()?.attrs?.tk) setSel(null); return; }
    if (tool === 'erase') { erasing.current = true; eraseAt(); return; }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'wall') { const g = gp(); setDraft({ kind: tool, x0: g[0], y0: g[1], x1: g[0], y1: g[1] }); return; }
    if (tool === 'poly') {
      const g = gp();
      if (!poly) setPoly({ pts: [g], cur: g });
      else if (poly.pts.length >= 3 && g[0] === poly.pts[0][0] && g[1] === poly.pts[0][1]) closePoly();
      else {
        const l = poly.pts[poly.pts.length - 1];
        if (l[0] !== g[0] || l[1] !== g[1]) setPoly({ pts: [...poly.pts, g], cur: g });
      }
    }
  };
  const move = (e) => {
    if (pan.current) {
      const st = stage.current;
      st.position({ x: st.x() + e.evt.clientX - pan.current.x, y: st.y() + e.evt.clientY - pan.current.y });
      pan.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (erasing.current) { eraseAt(); return; }
    if (draft) { const g = gp(); setDraft({ ...draft, x1: g[0], y1: g[1] }); }
    if (poly) setPoly({ ...poly, cur: gp() });
  };
  const up = () => {
    pan.current = null; erasing.current = false;
    if (!draft) return;
    const { kind, x0, y0, x1, y1 } = draft;
    setDraft(null);
    if (x0 === x1 && y0 === y1) return;
    if (kind === 'wall') set({ walls: [...cur.current.walls, { id: uid(), p: [x0, y0, x1, y1] }] });
    else if (kind === 'rect') addRoom('r', [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)]);
    else addRoom('e', [(x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2]);
  };
  const click = () => {
    if (tool !== 'marker') return;
    const p = pt(), label = window.prompt('Nombre o inicial del marcador');
    if (!label) return;
    set({ tokens: [...cur.current.tokens, { id: uid(), x: rd(p.x / CELL), y: rd(p.y / CELL), label: label.slice(0, 12), color: COLORS[cur.current.tokens.length % COLORS.length] }] });
  };
  const key = (e) => {
    if (e.key === 'Escape') setPoly(null);
    if (e.key === 'Enter') closePoly();
  };
  const wheel = (e) => {
    e.evt.preventDefault();
    const st = stage.current, old = st.scaleX(), p = st.getPointerPosition();
    const k = Math.max(0.25, Math.min(3, e.evt.deltaY < 0 ? old * 1.1 : old / 1.1));
    const w = { x: (p.x - st.x()) / old, y: (p.y - st.y()) / old };
    st.scale({ x: k, y: k });
    st.position({ x: p.x - w.x * k, y: p.y - w.y * k });
  };
  const drop = (e) => {
    e.preventDefault();
    const sh = sheets.find((x) => x.id === e.dataTransfer.getData('text/sheet'));
    if (!sh) return;
    const st = stage.current, r = box.current.getBoundingClientRect(), k = st.scaleX();
    const x = (e.clientX - r.left - st.x()) / k / CELL, y = (e.clientY - r.top - st.y()) / k / CELL;
    const t = { id: uid(), x: rd(x), y: rd(y), label: (sh.name || '?').slice(0, 3), color: COLORS[cur.current.tokens.length % COLORS.length], sheetId: sh.id };
    set({ tokens: [...cur.current.tokens, t] });
    setSel(t.id);
  };
  const png = () => {
    let data;
    try {
      data = stage.current.toDataURL({ pixelRatio: 2 });
    } catch {
      setExportError(true);
      return;
    }
    const a = document.createElement('a');
    a.href = data;
    a.download = (m.name || 'mapa') + '.png';
    a.click();
  };
  const dropMap = () => { if (window.confirm(`¿Borrar el mapa "${m.name}"? No se puede deshacer.`)) { store.remove(m.id); nav('/maps'); } };
  const selTok = m.tokens.find((t) => t.id === sel);
  const selSheet = selTok && sheets.find((s) => s.id === selTok.sheetId);

  const lines = [];
  for (let i = 0; i <= COLS; i++) lines.push([i * CELL, 0, i * CELL, ROWS * CELL]);
  for (let j = 0; j <= ROWS; j++) lines.push([0, j * CELL, COLS * CELL, j * CELL]);
  const rooms = m.rooms.map(norm);

  return (
    <div className="editor">
      <header className="editor-bar">
        <Link className="btn ghost" to="/maps">Volver</Link>
        <input className="title-input" aria-label="Nombre del mapa" value={m.name} onChange={(e) => set({ name: e.target.value })} />
        <button className="btn" onClick={() => setImageUrlOpen(true)}>{m.bg ? 'Cambiar fondo' : 'Imagen de fondo'}</button>
        {m.bg && <button className="btn ghost" onClick={() => set({ bg: '' })}>Quitar fondo</button>}
        <button className="btn" onClick={png}>Exportar PNG</button>
        <button className="btn primary" onClick={() => setShare(true)}>Compartir mapa</button>
        <button className="btn danger" onClick={dropMap}>Borrar</button>
      </header>
      <div className="editor-body">
        <div className="tools" role="toolbar" aria-label="Herramientas">
          {TOOLS.map(([k, label]) => (
            <button key={k} className={'tool' + (tool === k ? ' on' : '')} aria-pressed={tool === k}
              onClick={() => { setTool(k); setPoly(null); }}>{label}</button>
          ))}
          <div className="swatches" aria-label="Color de sala">
            {ROOM_COLORS.map((c) => <button key={c} className={'sw' + (rc === c ? ' on' : '')} style={{ background: c }} aria-label={'Color ' + c} onClick={() => setRc(c)} />)}
          </div>
          <p className="muted" style={{ fontSize: '.8rem' }}>{HELP[tool]}</p>
        </div>
        <div className={'canvas t-' + tool} ref={box} tabIndex={0} onKeyDown={key}
          onDragOver={(e) => e.preventDefault()} onDrop={drop}>
          <Stage ref={stage} width={size.w} height={size.h}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onClick={click}
            onDblClick={() => tool === 'poly' && closePoly()} onWheel={wheel} onContextMenu={(e) => e.evt.preventDefault()}>
            <Layer listening={false}>
              <Rect x={0} y={0} width={COLS * CELL} height={ROWS * CELL} fill="#0e1118" />
              {bgImg && <KImage image={bgImg} x={0} y={0} width={COLS * CELL} height={(COLS * CELL * bgImg.height) / bgImg.width} />}
              {lines.map((p, i) => <Line key={i} points={p} stroke="#202635" strokeWidth={1} />)}
            </Layer>
            <Layer>
              {rooms.map((r) => <Room key={'b' + r.id} r={r} />)}
              {rooms.map((r) => <Room key={'f' + r.id} r={r} fill />)}
              {m.walls.map((w) => (
                <Line key={w.id} points={w.p.map((v) => v * CELL)} stroke="#dfe3ee" strokeWidth={6} lineCap="round"
                  hitStrokeWidth={16} ek="walls" eid={w.id} />
              ))}
              {draft && draft.kind === 'rect' && (
                <Rect x={Math.min(draft.x0, draft.x1) * CELL} y={Math.min(draft.y0, draft.y1) * CELL}
                  width={Math.abs(draft.x1 - draft.x0) * CELL} height={Math.abs(draft.y1 - draft.y0) * CELL}
                  fill="rgba(139,108,255,.25)" stroke="#8b6cff" dash={[6, 4]} listening={false} />
              )}
              {draft && draft.kind === 'ellipse' && (
                <Ellipse x={((draft.x0 + draft.x1) / 2) * CELL} y={((draft.y0 + draft.y1) / 2) * CELL}
                  radiusX={(Math.abs(draft.x1 - draft.x0) / 2) * CELL} radiusY={(Math.abs(draft.y1 - draft.y0) / 2) * CELL}
                  fill="rgba(139,108,255,.25)" stroke="#8b6cff" dash={[6, 4]} listening={false} />
              )}
              {draft && draft.kind === 'wall' && (
                <Line points={[draft.x0 * CELL, draft.y0 * CELL, draft.x1 * CELL, draft.y1 * CELL]} stroke="#8b6cff" strokeWidth={6} dash={[6, 4]} listening={false} />
              )}
              {poly && (
                <Line points={[...poly.pts.flat(), ...poly.cur].map((v) => v * CELL)} stroke="#8b6cff" strokeWidth={3} dash={[6, 4]}
                  fill="rgba(139,108,255,.2)" closed listening={false} />
              )}
              {m.tokens.map((t) => (
                <Token key={t.id} t={t} sheet={sheets.find((s) => s.id === t.sheetId)} sel={t.id === sel}
                  draggable={tool === 'select'} onSelect={() => setSel(t.id)}
                  onMove={(x, y) => set({ tokens: cur.current.tokens.map((o) => (o.id === t.id ? { ...o, x, y } : o)) })} />
              ))}
            </Layer>
          </Stage>
        </div>
        <aside className="drawer" aria-label="Fichas de personajes">
          <h3>Fichas</h3>
          {sheets.length === 0 && <p className="muted">Crea fichas en la sección Fichas y arrástralas aquí al mapa.</p>}
          {sheets.map((s) => (
            <div key={s.id} className="dsheet" draggable onDragStart={(e) => e.dataTransfer.setData('text/sheet', s.id)}>
              <details>
                <summary>{s.img ? <img className="av" src={s.img} alt="" /> : <span className="av" />}{s.name}</summary>
                <div className="dstats">
                  <span>{s.clearance}</span><span>{s.clone || 'sin clon'}</span>
                  {Object.entries(s.stats).map(([k, v]) => <span key={k}>{k}: {v}</span>)}
                  <span>Traición: {s.treason}</span><span>Moxie: {s.moxie}</span>
                </div>
              </details>
            </div>
          ))}
          {selTok && (
            <section className="seltok">
              <strong>{selSheet ? selSheet.name : selTok.label}</strong>
              {selSheet && <Link className="btn" to={'/sheets/' + selSheet.id}>Abrir ficha</Link>}
              <button className="btn danger" onClick={() => { set({ tokens: m.tokens.filter((t) => t.id !== selTok.id) }); setSel(null); }}>Quitar del mapa</button>
            </section>
          )}
        </aside>
      </div>
      {share && (
        <Modal title="Compartir mapa" onClose={() => setShare(false)}>
          <CodeBox code={encode('map', m.bg && !m.bg.startsWith('https://') ? { ...m, bg: '' } : m)}
            hint={m.bg && !m.bg.startsWith('https://')
              ? 'La imagen guardada antiguamente dentro del mapa se omite. Añade una URL HTTPS pública para compartirla. Las fichas se enlazan por su identificador.'
              : 'Las imágenes se comparten mediante su URL. Las fichas del mapa se enlazan por su identificador: quien no tenga esa ficha las verá como marcadores.'} />
        </Modal>
      )}
      {imageUrlOpen && <ImageUrlDialog title="Imagen de fondo" onClose={() => setImageUrlOpen(false)} onAccept={(bg) => set({ bg })} initialValue={m.bg?.startsWith('https://') ? m.bg : ''} />}
      {exportError && (
        <Modal title="No se puede exportar el mapa" onClose={() => setExportError(false)}>
          <p>La imagen de fondo no permite exportar el mapa. El servidor puede haber cambiado sus permisos CORS desde que se validó la URL.</p>
          <button className="btn" onClick={() => setExportError(false)}>Entendido</button>
        </Modal>
      )}
    </div>
  );
}
