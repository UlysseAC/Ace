import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setToken, getToken } from '../../api/client.js';
import JoueursTab from './JoueursTab.jsx';
import ItemsTab from './ItemsTab.jsx';
import CartesTab from './CartesTab.jsx';
import DesTab from './DesTab.jsx';
import ConfigTab from './ConfigTab.jsx';
import ImprimerieTab from './ImprimerieTab.jsx';

const ROLE = 'editeur';
const TABS = [
  ['joueurs', '👤 Joueurs'],
  ['items', '📋 Missions / Produits / Pénalités'],
  ['cartes', '🎴 Cartes'],
  ['des', '🎲 Dés'],
  ['config', '⚙️ Configuration'],
  ['imprimerie', '🖨️ Imprimerie']
];

export default function Editor() {
  const [connecte, setConnecte] = useState(false);
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [tab, setTab] = useState('joueurs');

  useEffect(() => {
    const token = getToken(ROLE);
    if (token) {
      api('/joueurs', { role: ROLE }).then(() => setConnecte(true)).catch(() => setToken(ROLE, null));
    }
  }, []);

  async function login(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { token } = await api('/auth/editeur/login', { method: 'POST', body: { identifiant, code } });
      setToken(ROLE, token);
      setConnecte(true);
    } catch (err) {
      setErreur(err.message);
    }
  }

  function logout() {
    setToken(ROLE, null);
    setConnecte(false);
  }

  if (!connecte) {
    return (
      <div className="app-shell">
        <div className="top-bar">
          <h1>🛠️ Interface Éditeur</h1>
          <Link className="btn" to="/">🏠 Accueil</Link>
        </div>
        <div className="content">
          <form className="card" onSubmit={login}>
            <h2 style={{ marginTop: 0 }}>Connexion éditeur</h2>
            {erreur && <div className="error-msg">{erreur}</div>}
            <div className="field"><label>Identifiant</label><input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} /></div>
            <div className="field"><label>Code</label><input type="password" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <button className="btn btn-primary btn-block" type="submit">Se connecter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell wide">
      <div className="top-bar">
        <h1>🛠️ Interface Éditeur</h1>
        <div className="row">
          <button className="btn" onClick={logout}>Se déconnecter</button>
          <Link className="btn" to="/">🏠 Accueil</Link>
        </div>
      </div>
      <div className="content" style={{ maxWidth: 1100 }}>
        <div className="row" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map(([key, label]) => (
            <button key={key} className={`btn ${tab === key ? 'btn-primary' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        {tab === 'joueurs' && <JoueursTab role={ROLE} />}
        {tab === 'items' && <ItemsTab role={ROLE} />}
        {tab === 'cartes' && <CartesTab role={ROLE} />}
        {tab === 'des' && <DesTab role={ROLE} />}
        {tab === 'config' && <ConfigTab role={ROLE} />}
        {tab === 'imprimerie' && <ImprimerieTab role={ROLE} />}
      </div>
    </div>
  );
}
