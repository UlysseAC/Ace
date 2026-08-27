import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, getToken } from '../../api/client.js';
import Scanner from './Scanner.jsx';

const ROLE = 'joueur';

function Menu({ onNavigate, onLogout }) {
  return (
    <div className="role-grid">
      <button className="role-card" onClick={() => onNavigate('regles')}>📜 Règles du jeu</button>
      <button className="role-card" onClick={() => onNavigate('deck')}>🎴 Mon deck</button>
      <button className="role-card" onClick={() => onNavigate('compte')}>👤 Mon compte</button>
      <button className="role-card" onClick={() => onNavigate('scan')}>📷 Scanner</button>
      <button className="role-card" onClick={() => onNavigate('historique')}>🕑 Historique</button>
      <button className="role-card" onClick={onLogout}>🚪 Se déconnecter</button>
    </div>
  );
}

function RetourBtn({ onClick, label = '← Retour au menu' }) {
  return <button className="btn" style={{ marginTop: 16 }} onClick={onClick}>{label}</button>;
}

export default function Player() {
  const navigate = useNavigate();
  const [joueur, setJoueur] = useState(null);
  const [view, setView] = useState('login');
  const [erreur, setErreur] = useState('');
  const [config, setConfig] = useState({});

  // login form
  const [id, setId] = useState('');
  const [code, setCode] = useState('');

  // deck
  const [deck, setDeck] = useState([]);
  const [carteSel, setCarteSel] = useState(null);
  const [activationMsg, setActivationMsg] = useState('');

  // contrôle fiscal
  const [joueursListe, setJoueursListe] = useState([]);
  const [desListe, setDesListe] = useState([]);
  const [viseId, setViseId] = useState(null);
  const [deId, setDeId] = useState(null);
  const [pickMode, setPickMode] = useState(null); // 'joueur' | 'de' | null
  const [rollPhase, setRollPhase] = useState(null); // null | 'spinning' | 'result'
  const [rollResult, setRollResult] = useState(null);

  // historique
  const [historique, setHistorique] = useState(null);

  // admin exit
  const [adminCode, setAdminCode] = useState('');

  useEffect(() => {
    api('/config').then(setConfig).catch(() => {});
    const token = getToken(ROLE);
    if (token) {
      api('/joueurs/me', { role: ROLE }).then((j) => { setJoueur(j); setView('menu'); }).catch(() => setToken(ROLE, null));
    }
  }, []);

  async function login(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { token, joueur } = await api('/auth/joueur/login', { method: 'POST', body: { id, code } });
      setToken(ROLE, token);
      setJoueur(joueur);
      setView('menu');
    } catch (err) {
      setErreur(err.message);
    }
  }

  function logout() {
    setToken(ROLE, null);
    setJoueur(null);
    setView('login');
  }

  function goto(v) {
    setErreur('');
    setActivationMsg('');
    setView(v);
    if (v === 'deck') api('/deck', { role: ROLE }).then(setDeck).catch((e) => setErreur(e.message));
    if (v === 'historique') api('/joueurs/me/historique', { role: ROLE }).then(setHistorique).catch((e) => setErreur(e.message));
    if (v === 'compte') api('/joueurs/me', { role: ROLE }).then(setJoueur).catch(() => {});
  }

  async function onScanResult(hash) {
    setErreur('');
    try {
      const res = await api('/scan', { method: 'POST', role: ROLE, body: { hash } });
      setActivationMsg(
        res.type === 'item'
          ? `Mission "${res.item.nom}" créditée : +${res.result.montantRecu ?? res.result.joueur?.solde_banque} CHF${res.result.mereTheresa ? ' (bonus Mère Thérésa appliqué !)' : ''}`
          : `Carte "${res.carte.nom}" ajoutée à ton deck !`
      );
      setView('scan-result');
    } catch (err) {
      setErreur(err.message);
    }
  }

  function ouvrirCarte(c) {
    setCarteSel(c);
    setView('deck-detail');
  }

  async function activerCarte() {
    setErreur('');
    try {
      const res = await api(`/deck/${carteSel.id}/activer`, { method: 'POST', role: ROLE });
      if (res.requiresRoll) {
        const [liste, des] = await Promise.all([
          api('/joueurs/liste'),
          api('/des')
        ]);
        setJoueursListe(liste.filter((j) => j.id !== joueur.id));
        setDesListe(des);
        setViseId(null);
        setDeId(null);
        setView('controle-fiscal');
      } else {
        setActivationMsg(res.phrase || 'Carte activée !');
        setView('deck-activated');
      }
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function tirerDe() {
    setRollPhase('spinning');
    setView('controle-fiscal-roll');
    try {
      const res = await api(`/deck/${carteSel.id}/controle-fiscal/tirer`, {
        method: 'POST', role: ROLE, body: { viseId, deId }
      });
      setTimeout(() => {
        setRollResult(res);
        setRollPhase('result');
        setJoueur(res.attaquant.id === joueur.id ? res.attaquant : res.vise);
      }, 1800);
    } catch (err) {
      setErreur(err.message);
      setView('deck');
    }
  }

  async function sortirAdmin(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { ok } = await api('/auth/admin-exit', { method: 'POST', body: { code: adminCode } });
      if (ok) navigate('/');
      else setErreur('Code admin incorrect');
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>🏦 Banque automatisée{joueur ? ` — #${joueur.id} ${joueur.nom}` : ''}</h1>
        {view !== 'admin-exit' && <button className="btn" onClick={() => setView('admin-exit')}>Sortie admin</button>}
      </div>
      <div className="content">
        {erreur && <div className="error-msg">{erreur}</div>}

        {view === 'login' && (
          <form className="card" onSubmit={login}>
            <h2 style={{ marginTop: 0 }}>Connexion</h2>
            <div className="field"><label>Numéro de joueur</label><input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" /></div>
            <div className="field"><label>Code</label><input type="password" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <button className="btn btn-primary btn-block" type="submit">Se connecter</button>
          </form>
        )}

        {view === 'menu' && joueur && <Menu onNavigate={goto} onLogout={logout} />}

        {view === 'regles' && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Règles du jeu</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{config.regles_du_jeu}</p>
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'compte' && joueur && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Mon compte</h2>
            <div className="balance">{joueur.solde_banque} CHF</div>
            <table style={{ marginTop: 16 }}>
              <tbody>
                <tr><td>Total missions</td><td>{joueur.total_missions} CHF</td></tr>
                <tr><td>Total gagné au jeu</td><td>{joueur.total_jeu} CHF</td></tr>
                <tr><td>Total achats boutique</td><td>{joueur.total_achats} CHF</td></tr>
                <tr><td>Pénalités reçues</td><td>{joueur.nb_penalites}</td></tr>
                <tr><td>Paradis fiscal</td><td>{joueur.paradis_fiscal_actif ? `Actif jusqu'à ${new Date(joueur.paradis_fiscal_fin).toLocaleTimeString()}` : 'Inactif'}</td></tr>
              </tbody>
            </table>
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'scan' && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Scanner un QR code</h2>
            <Scanner onResult={onScanResult} />
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'scan-result' && (
          <div className="card center">
            <p className="success-msg">{activationMsg}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => goto('scan')}>Scanner à nouveau</button>
              <button className="btn" onClick={() => goto('menu')}>Retour au menu</button>
            </div>
          </div>
        )}

        {view === 'deck' && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Mon deck</h2>
            {deck.length === 0 && <p className="muted">Aucune carte pour le moment.</p>}
            <div className="btn-grid">
              {deck.map((c) => (
                <button key={c.id} className="btn btn-lg" onClick={() => ouvrirCarte(c)}>{c.nom}</button>
              ))}
            </div>
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'deck-detail' && carteSel && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{carteSel.nom}</h2>
            <p>{carteSel.description}</p>
            <div className="row">
              <button className="btn btn-primary" onClick={activerCarte}>Activer</button>
              <button className="btn" onClick={() => goto('deck')}>Retour</button>
            </div>
          </div>
        )}

        {view === 'deck-activated' && (
          <div className="card center">
            <p className="success-msg">{activationMsg}</p>
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'controle-fiscal' && (
          <div className="card center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: 'var(--gold)' }}>Contrôle fiscal</h2>
              <p>Dé choisi : <strong>{desListe.find((d) => d.id === deId)?.nom ?? '—'}</strong></p>
              <p>Joueur visé : <strong>{viseId ? `#${viseId} ${joueursListe.find((j) => j.id === viseId)?.nom}` : '—'}</strong></p>
            </div>

            {pickMode === 'joueur' && (
              <div className="btn-grid">
                {joueursListe.map((j) => (
                  <button key={j.id} className="btn" onClick={() => { setViseId(j.id); setPickMode(null); }}>#{j.id} {j.nom}</button>
                ))}
              </div>
            )}
            {pickMode === 'de' && (
              <div className="btn-grid">
                {desListe.map((d) => (
                  <button key={d.id} className="btn" onClick={() => { setDeId(d.id); setPickMode(null); }}>{d.nom}</button>
                ))}
              </div>
            )}

            {!pickMode && (
              <div style={{ marginTop: 30 }}>
                <button className="btn btn-primary btn-lg btn-block" disabled={!viseId || !deId} onClick={tirerDe} style={{ padding: 30, fontSize: '1.6rem' }}>
                  TIRER
                </button>
                <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
                  <button className="btn" onClick={() => setPickMode('joueur')}>Changer de joueur</button>
                  <button className="btn" onClick={() => setPickMode('de')}>Changer de dé</button>
                </div>
                <RetourBtn onClick={() => goto('deck')} />
              </div>
            )}
          </div>
        )}

        {view === 'controle-fiscal-roll' && (
          <div className="card center" style={{ padding: 36 }}>
            <div className={`dice-face ${rollPhase === 'spinning' ? 'spinning' : rollResult?.face.type}`}>
              {rollPhase === 'spinning' ? '🎲' : rollResult.face.pourcentage + '%'}
            </div>
            {rollPhase === 'result' && (
              <>
                <p style={{ marginTop: 18 }}>
                  Résultat : <span className={`tag tag-${rollResult.face.type}`}>{rollResult.face.type}</span> — {rollResult.montantReel} CHF
                </p>
                <RetourBtn onClick={() => goto('menu')} />
              </>
            )}
          </div>
        )}

        {view === 'historique' && historique && (
          <div className="card">
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Historique</h2>
            {historique.transactions.length === 0 && historique.controlesFiscaux.length === 0 && (
              <p className="muted">Aucun historique pour le moment.</p>
            )}
            {historique.controlesFiscaux.length > 0 && (
              <>
                <h3>Contrôles fiscaux</h3>
                {historique.controlesFiscaux.map((h) => (
                  <p key={h.id}>
                    {h.attaquant_id === joueur.id ? `Tu as visé le joueur #${h.vise_id}` : `Le joueur #${h.attaquant_id} t'a visé`}
                    {' '}— {h.face_type} {h.face_pourcentage}% ({h.montant_reel} CHF)
                  </p>
                ))}
              </>
            )}
            {historique.transactions.length > 0 && (
              <>
                <h3>Missions / pénalités / achats</h3>
                {historique.transactions.map((t) => (
                  <p key={t.id}>{t.type} : {t.montant > 0 ? '+' : ''}{t.montant} CHF</p>
                ))}
              </>
            )}
            <RetourBtn onClick={() => goto('menu')} />
          </div>
        )}

        {view === 'admin-exit' && (
          <form className="card" onSubmit={sortirAdmin}>
            <h2 style={{ marginTop: 0 }}>Code admin</h2>
            <div className="field"><input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} /></div>
            <div className="row">
              <button className="btn btn-primary" type="submit">Valider</button>
              <button className="btn" type="button" onClick={() => goto(joueur ? 'menu' : 'login')}>Annuler</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
