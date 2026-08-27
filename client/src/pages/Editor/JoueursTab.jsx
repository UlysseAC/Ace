import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function JoueursTab({ role }) {
  const [joueurs, setJoueurs] = useState([]);
  const [nouveau, setNouveau] = useState({ id: '', nom: '', code: '' });
  const [erreur, setErreur] = useState('');

  function reload() {
    api('/joueurs', { role }).then(setJoueurs).catch((e) => setErreur(e.message));
  }
  useEffect(reload, []);

  async function creer(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api('/joueurs', {
        method: 'POST', role,
        body: { id: nouveau.id || undefined, nom: nouveau.nom, code: nouveau.code }
      });
      setNouveau({ id: '', nom: '', code: '' });
      reload();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function maj(j, champ, valeur) {
    setErreur('');
    try {
      await api(`/joueurs/${j.id}`, { method: 'PATCH', role, body: { [champ]: valeur } });
      reload();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(id) {
    if (!confirm(`Supprimer le joueur #${id} ?`)) return;
    await api(`/joueurs/${id}`, { method: 'DELETE', role });
    reload();
  }

  return (
    <div>
      {erreur && <div className="error-msg">{erreur}</div>}
      <form className="card" onSubmit={creer}>
        <h2 style={{ marginTop: 0 }}>Ajouter un joueur</h2>
        <div className="row">
          <input placeholder="Numéro (optionnel)" value={nouveau.id} onChange={(e) => setNouveau({ ...nouveau, id: e.target.value })} style={{ maxWidth: 160 }} />
          <input placeholder="Nom" value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} />
          <input placeholder="Code" value={nouveau.code} onChange={(e) => setNouveau({ ...nouveau, code: e.target.value })} style={{ maxWidth: 160 }} />
          <button className="btn btn-primary" type="submit">Ajouter</button>
        </div>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr><th>#</th><th>Nom</th><th>Code</th><th>Solde</th><th>Missions</th><th>Jeu</th><th>Achats</th><th>Pénal.</th><th></th></tr>
          </thead>
          <tbody>
            {joueurs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td>
                <td><input defaultValue={j.nom} onBlur={(e) => e.target.value !== j.nom && maj(j, 'nom', e.target.value)} /></td>
                <td><input defaultValue={j.code} onBlur={(e) => e.target.value !== j.code && maj(j, 'code', e.target.value)} /></td>
                <td><input type="number" defaultValue={j.solde_banque} onBlur={(e) => Number(e.target.value) !== j.solde_banque && maj(j, 'solde_banque', Number(e.target.value))} style={{ maxWidth: 100 }} /></td>
                <td>{j.total_missions}</td>
                <td>{j.total_jeu}</td>
                <td>{j.total_achats}</td>
                <td>{j.nb_penalites}</td>
                <td><button className="btn btn-danger" onClick={() => supprimer(j.id)}>Suppr.</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
