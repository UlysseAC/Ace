import { Routes, Route, Link } from 'react-router-dom';
import Display from './pages/Display/Display.jsx';
import Player from './pages/Player/Player.jsx';
import Croupier from './pages/Croupier/Croupier.jsx';
import Banker from './pages/Banker/Banker.jsx';
import Editor from './pages/Editor/Editor.jsx';

function Home() {
  return (
    <div className="content">
      <div className="center" style={{ marginTop: 60 }}>
        <h1 style={{ color: 'var(--gold)', fontSize: '2rem', letterSpacing: '0.08em' }}>🎰 CASINO RP</h1>
        <p className="muted">Choisis l'interface de cet appareil</p>
      </div>
      <div className="role-grid">
        <Link className="role-card" to="/affichage">📺 Écran d'affichage</Link>
        <Link className="role-card" to="/joueur">🏦 Banque automatisée</Link>
        <Link className="role-card" to="/croupier">🃏 Croupier</Link>
        <Link className="role-card" to="/banquier">💰 Banquier</Link>
        <Link className="role-card" to="/editeur">🛠️ Éditeur</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/affichage" element={<Display />} />
      <Route path="/joueur/*" element={<Player />} />
      <Route path="/croupier" element={<Croupier />} />
      <Route path="/banquier" element={<Banker />} />
      <Route path="/editeur/*" element={<Editor />} />
    </Routes>
  );
}
