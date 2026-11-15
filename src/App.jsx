import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Sheets from './pages/Sheets.jsx';
import SheetEditor from './pages/SheetEditor.jsx';
import Maps from './pages/Maps.jsx';
import MapEditor from './pages/MapEditor.jsx';

export default function App() {
  return (
    <HashRouter>
      <div className="shell">
        <nav className="side">
          <div className="brand">Rolapp<small>Companion de Paranoia</small></div>
          <NavLink to="/sheets">Fichas</NavLink>
          <NavLink to="/maps">Mapas</NavLink>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/sheets" replace />} />
            <Route path="/sheets" element={<Sheets />} />
            <Route path="/sheets/:id" element={<SheetEditor />} />
            <Route path="/maps" element={<Maps />} />
            <Route path="/maps/:id" element={<MapEditor />} />
            <Route path="*" element={<Navigate to="/sheets" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
