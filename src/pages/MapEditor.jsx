import { useRef, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Line, Group, Circle, Text } from 'react-konva';
import { Modal, CodeBox } from '../components.jsx';
import { useStore, uid } from '../lib/storage.js';
import { encode } from '../lib/codec.js';

const CELL = 48, COLS = 48, ROWS = 32;
const COLORS = ['#e5484d', '#f59f3b', '#e8c547', '#4cc38a', '#3e8bff', '#8b6cff'];
const TOOLS = [
  ['select', 'Seleccionar', 'Mueve fichas'],
  ['pan', 'Mover vista', 'Arrastra el mapa'],
  ['room', 'Sala', 'Arrastra para dibujar suelo'],
  ['wall', 'Pared', 'Arrastra para trazar una pared'],
  ['token', 'Ficha', 'Haz clic para colocar'],
  ['erase', 'Borrar', 'Haz clic en un elemento'],
];

export default function MapEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useStore('rol.maps');
  const m = store.items.find((x) => x.id === id);
  const box = useRef(null), stage = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tool, setTool] = useState('room');
  const [draft, setDraft] = useState(null);
  const [share, setShare] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!m]);

  if (!m) return <div className="page"><p>Mapa no encontrado.</p><Link className="btn" to="/maps">Volver a mapas</Link></div>;

  const set = (p) => store.save({ ...m, ...p });
  const pt = () => {
    const st = stage.current, p = st.getPointerPosition(), k = st.scaleX();
    return { x: (p.x - st.x()) / k, y: (p.y - st.y()) / k };
  };
  const grid = () => { const p = pt(); return { x: Math.round(p.x / CELL), y: Math.round(p.y / CELL) }; };

  const down = () => {
    if (tool === 'room' || tool === 'wall') { const g = grid(); setDraft({ kind: tool, x0: g.x, y0: g.y, x1: g.x, y1: g.y }); }
  };
  const move = () => { if (draft) { const g = grid(); setDraft({ ...draft, x1: g.x, y1: g.y }); } };
  const up = () => {
    if (!draft) return;
    const { kind, x0, y0, x1, y1 } = draft;
    setDraft(null);
    if (x0 === x1 && y0 === y1) return;
    if (kind === 'room') set({ rooms: [...m.rooms, { id: uid(), x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }] });
    else set({ walls: [...m.walls, { id: uid(), p: [x0, y0, x1, y1] }] });
  };
  const click = () => {
    if (tool !== 'token') return;
    const p = pt();
    const label = window.prompt('Nombre o inicial de la ficha');
    if (!label) return;
    set({ tokens: [...m.tokens, { id: uid(), x: Math.floor(p.x / CELL) + 0.5, y: Math.floor(p.y / CELL) + 0.5, label: label.slice(0, 12), color: COLORS[m.tokens.length % COLORS.length] }] });
  };
  const wheel = (e) => {
    e.evt.preventDefault();
    const st = stage.current, old = st.scaleX(), p = st.getPointerPosition();
    const k = Math.max(0.25, Math.min(3, e.evt.deltaY < 0 ? old * 1.1 : old / 1.1));
    const w = { x: (p.x - st.x()) / old, y: (p.y - st.y()) / old };
    st.scale({ x: k, y: k });
    st.position({ x: p.x - w.x * k, y: p.y - w.y * k });
  };
  const del = (key, eid) => { if (tool === 'erase') set({ [key]: m[key].filter((x) => x.id !== eid) }); };
  const png = () => {
    const a = document.createElement('a');
    a.href = stage.current.toDataURL({ pixelRatio: 2 });
    a.download = (m.name || 'mapa') + '.png';
    a.click();
  };
  const drop = () => { if (window.confirm(`¿Borrar el mapa "${m.name}"? No se puede deshacer.`)) { store.remove(m.id); nav('/maps'); } };

  const lines = [];
  for (let i = 0; i <= COLS; i++) lines.push([i * CELL, 0, i * CELL, ROWS * CELL]);
  for (let j = 0; j <= ROWS; j++) lines.push([0, j * CELL, COLS * CELL, j * CELL]);

  return (
    <div className="editor">
      <header className="editor-bar">
        <Link className="btn ghost" to="/maps">Volver</Link>
        <input className="title-input" aria-label="Nombre del mapa" value={m.name} onChange={(e) => set({ name: e.target.value })} />
        <button className="btn" onClick={png}>Exportar PNG</button>
        <button className="btn primary" onClick={() => setShare(true)}>Compartir mapa</button>
        <button className="btn danger" onClick={drop}>Borrar</button>
      </header>
      <div className="editor-body">
        <div className="tools" role="toolbar" aria-label="Herramientas">
          {TOOLS.map(([k, label, tip]) => (
            <button key={k} className={'tool' + (tool === k ? ' on' : '')} title={tip} aria-pressed={tool === k} onClick={() => setTool(k)}>{label}</button>
          ))}
        </div>
        <div className={'canvas t-' + tool} ref={box}>
          <Stage ref={stage} width={size.w} height={size.h} draggable={tool === 'pan'}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onClick={click} onWheel={wheel}>
            <Layer listening={false}>
              <Rect x={0} y={0} width={COLS * CELL} height={ROWS * CELL} fill="#0e1118" />
              {lines.map((p, i) => <Line key={i} points={p} stroke="#202635" strokeWidth={1} />)}
            </Layer>
            <Layer>
              {m.rooms.map((r) => (
                <Rect key={r.id} x={r.x * CELL} y={r.y * CELL} width={r.w * CELL} height={r.h * CELL}
                  fill="#2a3144" stroke="#3a4360" strokeWidth={1} onClick={() => del('rooms', r.id)} />
              ))}
              {m.walls.map((w) => (
                <Line key={w.id} points={w.p.map((v) => v * CELL)} stroke="#dfe3ee" strokeWidth={6} lineCap="round"
                  hitStrokeWidth={16} onClick={() => del('walls', w.id)} />
              ))}
              {draft && draft.kind === 'room' && (
                <Rect x={Math.min(draft.x0, draft.x1) * CELL} y={Math.min(draft.y0, draft.y1) * CELL}
                  width={Math.abs(draft.x1 - draft.x0) * CELL} height={Math.abs(draft.y1 - draft.y0) * CELL}
                  fill="rgba(139,108,255,.25)" stroke="#8b6cff" dash={[6, 4]} listening={false} />
              )}
              {draft && draft.kind === 'wall' && (
                <Line points={[draft.x0 * CELL, draft.y0 * CELL, draft.x1 * CELL, draft.y1 * CELL]} stroke="#8b6cff" strokeWidth={6} dash={[6, 4]} listening={false} />
              )}
              {m.tokens.map((t) => (
                <Group key={t.id} x={t.x * CELL} y={t.y * CELL} draggable={tool === 'select'}
                  onClick={() => del('tokens', t.id)}
                  onDragEnd={(e) => {
                    const nx = Math.floor(e.target.x() / CELL) + 0.5, ny = Math.floor(e.target.y() / CELL) + 0.5;
                    e.target.position({ x: nx * CELL, y: ny * CELL });
                    set({ tokens: m.tokens.map((o) => (o.id === t.id ? { ...o, x: nx, y: ny } : o)) });
                  }}>
                  <Circle radius={CELL * 0.4} fill={t.color} stroke="#0e1118" strokeWidth={3} />
                  <Text text={t.label} width={CELL} x={-CELL / 2} y={-6} align="center" fontSize={12} fontStyle="bold" fill="#0e1118" listening={false} />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
      {share && (
        <Modal title="Compartir mapa" onClose={() => setShare(false)}>
          <CodeBox code={encode('map', m)} hint="Envía este código por chat. Quien lo importe recibirá el mapa tal como está ahora." />
        </Modal>
      )}
    </div>
  );
}
