import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const FIELDS = [
  ['nb_joueurs_affiches', 'Nombre de joueurs affichés au classement', 'number'],
  ['duree_paradis_fiscal_minutes', 'Durée du paradis fiscal (minutes)', 'number'],
  ['limite_retrait_croupier', 'Limite de retrait autorisée au croupier', 'number'],
  ['boutons_rapides_croupier', 'Boutons rapides du croupier (séparés par des virgules)', 'list'],
  ['veinard_bonus_pct', 'Le Veinard — bonus sur gain (%)', 'number'],
  ['veinard_reduction_pct', 'Le Veinard — réduction sur perte (%)', 'number'],
  ['solde_depart', 'Solde de départ des nouveaux joueurs', 'number'],
  ['phrase_habitants_paradis', "Phrase \"habitants du paradis fiscal\" (variable {n})", 'text'],
  ['regles_du_jeu', 'Règles du jeu (affichées dans la banque automatisée)', 'textarea'],
  ['code_admin_sortie', "Code admin de sortie de la banque automatisée", 'text']
];

export default function ConfigTab({ role }) {
  const [config, setConfig] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/config').then((c) => {
      if (c.boutons_rapides_croupier) {
        try { c.boutons_rapides_croupier = JSON.parse(c.boutons_rapides_croupier).join(', '); } catch { /* garde tel quel */ }
      }
      setConfig(c);
    });
  }, []);

  function set(cle, valeur) {
    setSaved(false);
    setConfig((c) => ({ ...c, [cle]: valeur }));
  }

  async function enregistrer() {
    const body = { ...config };
    if (body.boutons_rapides_croupier) {
      body.boutons_rapides_croupier = JSON.stringify(
        body.boutons_rapides_croupier.split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v))
      );
    }
    await api('/config', { method: 'PATCH', role, body });
    setSaved(true);
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Configuration globale</h2>
      {FIELDS.map(([cle, label, type]) => (
        <div className="field" key={cle}>
          <label>{label}</label>
          {type === 'textarea' && <textarea rows={4} value={config[cle] ?? ''} onChange={(e) => set(cle, e.target.value)} />}
          {(type === 'text' || type === 'list') && <input value={config[cle] ?? ''} onChange={(e) => set(cle, type === 'list' ? e.target.value : e.target.value)} />}
          {type === 'number' && <input type="number" value={config[cle] ?? ''} onChange={(e) => set(cle, e.target.value)} />}
        </div>
      ))}
      <button className="btn btn-primary" onClick={enregistrer}>Enregistrer</button>
      {saved && <span className="success-msg" style={{ marginLeft: 10 }}>Enregistré !</span>}
    </div>
  );
}
