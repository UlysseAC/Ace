import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

function AmountPad({ title, boutons, onValidate, validateLabel, extraInfo, disabled }) {
  const [stack, setStack] = useState([]);
  const [manuel, setManuel] = useState('');
  const total = stack.reduce((a, b) => a + b, 0) + (Number(manuel) || 0);

  function ajouter(valeur) {
    setStack((s) => [...s, valeur]);
  }
  function annuler() {
    setStack((s) => s.slice(0, -1));
  }
  function reset() {
    setStack([]);
    setManuel('');
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{title}</h2>
      {extraInfo}
      <div className="btn-grid" style={{ marginBottom: 14 }}>
        {boutons.map((v) => (
          <button key={v} className="btn" onClick={() => ajouter(v)} disabled={disabled}>+{v}</button>
        ))}
      </div>
      <div className="field">
        <label>Saisie manuelle (s'ajoute au total)</label>
        <input type="number" value={manuel} onChange={(e) => setManuel(e.target.value)} disabled={disabled} />
      </div>
      <div className="center" style={{ margin: '18px 0' }}>
        <div className="balance">{total} CHF</div>
      </div>
      <div className="row">
        <button className="btn" onClick={reset} disabled={disabled}>Reset</button>
        <button className="btn" onClick={annuler} disabled={disabled || stack.length === 0}>Annuler dernier</button>
        <div className="spacer" />
        <button
          className="btn btn-primary btn-lg"
          disabled={disabled || total <= 0}
          onClick={() => { onValidate(total); reset(); }}
        >
          {validateLabel}
        </button>
      </div>
    </div>
  );
}

export default function Croupier() {
  const [numero, setNumero] = useState('');
  const [joueur, setJoueur] = useState(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [boutons, setBoutons] = useState([]);
  const [limite, setLimite] = useState(0);

  useEffect(() => {
    api('/croupier/boutons-rapides').then((d) => {
      setBoutons(d.boutons);
      setLimite(d.limite);
    }).catch(() => {});
  }, []);

  async function chercherJoueur(e) {
    e?.preventDefault();
    setErreur('');
    setMessage('');
    try {
      const j = await api(`/croupier/joueur/${numero}`);
      setJoueur(j);
    } catch (err) {
      setJoueur(null);
      setErreur(err.message);
    }
  }

  async function retirer(montant) {
    setErreur(''); setMessage('');
    try {
      const { joueur: j } = await api(`/croupier/${joueur.id}/debit`, { method: 'POST', body: { montant } });
      setJoueur(j);
      setMessage(`${montant} CHF débités — remettre l'équivalent en jetons au joueur.`);
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function crediter(montantRendu) {
    setErreur(''); setMessage('');
    try {
      const res = await api(`/croupier/${joueur.id}/credit`, { method: 'POST', body: { montantRendu } });
      setJoueur(res.joueur);
      let msg = `${montantRendu} CHF de jetons récupérés et crédités.`;
      if (res.veinardApplique) {
        msg += res.veinardApplique.type === 'bonus_gain'
          ? ` 🍀 Le Veinard était actif : +${res.veinardApplique.valeur} CHF de bonus (crédit final : ${res.montantCredite} CHF).`
          : ` 🍀 Le Veinard était actif : perte réduite de ${res.veinardApplique.valeur} CHF (crédit final : ${res.montantCredite} CHF).`;
      }
      setMessage(msg);
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>🃏 Interface Croupier</h1>
        <Link className="btn" to="/">🏠 Accueil</Link>
      </div>
      <div className="content">
        <form className="card" onSubmit={chercherJoueur}>
          <div className="field">
            <label>Numéro du joueur</label>
            <div className="row">
              <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="Ex: 12" />
              <button className="btn btn-primary" type="submit">Chercher</button>
            </div>
          </div>
        </form>

        {erreur && <div className="error-msg">{erreur}</div>}
        {message && <div className="success-msg">{message}</div>}

        {joueur && (
          <>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Joueur #{joueur.id} — {joueur.nom}</h2>
              <div className="balance">{joueur.solde_banque} CHF</div>
              {joueur.jetons_dus > 0 && (
                <p className="muted">Jetons actuellement en jeu (non rendus) : {joueur.jetons_dus} CHF</p>
              )}
              {joueur.veinard_actif === 1 && <p className="tag tag-vert">🍀 Le Veinard est actif pour ce joueur</p>}
            </div>

            <AmountPad
              title={`Retirer (limite : ${limite} CHF)`}
              boutons={boutons}
              validateLabel="Valider le retrait"
              onValidate={retirer}
            />

            <AmountPad
              title="Créditer (jetons rendus par le joueur)"
              boutons={boutons}
              validateLabel="Valider le crédit"
              onValidate={crediter}
            />
          </>
        )}
      </div>
    </div>
  );
}
