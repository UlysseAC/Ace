import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

const LABELS = { mission: 'Missions', produit: 'Produits', penalite: 'Pénalités' };

export default function Banker() {
  const [numero, setNumero] = useState('');
  const [joueur, setJoueur] = useState(null);
  const [items, setItems] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [modeLocal, setModeLocal] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/banquier/items').then(setItems).catch(() => {});
    api('/banquier/mode-local').then((d) => setModeLocal(d.actif)).catch(() => {});
  }, []);

  async function chercherJoueur(e) {
    e?.preventDefault();
    setErreur(''); setMessage('');
    try {
      setJoueur(await api(`/banquier/joueur/${numero}`));
    } catch (err) {
      setJoueur(null);
      setErreur(err.message);
    }
  }

  async function toggleModeLocal() {
    const actif = !modeLocal;
    const res = await api('/banquier/mode-local', { method: 'POST', body: { actif } });
    setModeLocal(res.actif);
  }

  async function valider(item) {
    setErreur(''); setMessage('');
    try {
      await api(`/banquier/${joueur.id}/valider`, {
        method: 'POST',
        body: { itemId: item.id, manuel: modeLocal }
      });
      const j = await api(`/banquier/joueur/${joueur.id}`);
      setJoueur(j);
      setMessage(`"${item.nom}" validé pour le joueur #${joueur.id} (${item.montant > 0 ? '+' : ''}${item.montant} CHF).`);
    } catch (err) {
      setErreur(err.message);
    }
  }

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const groups = { mission: [], produit: [], penalite: [] };
    for (const it of items) {
      if (!q || it.nom.toLowerCase().includes(q)) groups[it.type]?.push(it);
    }
    return groups;
  }, [items, recherche]);

  function exportCsv() {
    window.open('/api/banquier/export.csv', '_blank');
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>💰 Interface Banquier</h1>
        <div className="row">
          <button className={`btn ${modeLocal ? 'btn-danger' : ''}`} onClick={toggleModeLocal}>
            {modeLocal ? '⚠️ Mode Local ACTIF — désactiver' : 'Activer Mode Local (urgence)'}
          </button>
          <Link className="btn" to="/">🏠 Accueil</Link>
        </div>
      </div>
      <div className="content">
        {modeLocal && (
          <div className="error-msg">
            Mode Local actif : le scan des cartes physiques est bloqué. Validez les chèques papier manuellement ci-dessous.
          </div>
        )}

        <form className="card" onSubmit={chercherJoueur}>
          <div className="field">
            <label>Numéro du joueur</label>
            <div className="row">
              <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="Ex: 12" />
              <button className="btn btn-primary" type="submit">Chercher</button>
              <button type="button" className="btn" onClick={exportCsv}>Export CSV de secours</button>
            </div>
          </div>
        </form>

        {erreur && <div className="error-msg">{erreur}</div>}
        {message && <div className="success-msg">{message}</div>}

        {joueur && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Joueur #{joueur.id} — {joueur.nom}</h2>
            <div className="balance">{joueur.solde_banque} CHF</div>
            <p className="muted">Achats : {joueur.total_achats} CHF · Pénalités reçues : {joueur.nb_penalites}</p>
          </div>
        )}

        {joueur && (
          <>
            <div className="field">
              <input placeholder="Rechercher une mission / un produit / une pénalité..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            {Object.entries(filtres).map(([type, list]) => list.length > 0 && (
              <div className="card" key={type}>
                <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{LABELS[type]}</h2>
                <div className="btn-grid">
                  {list.map((it) => (
                    <button key={it.id} className="btn btn-lg" onClick={() => valider(it)}>
                      {it.nom}<br /><small>{it.montant > 0 ? '+' : ''}{it.montant} CHF</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
