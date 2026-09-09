import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const TYPES = [['mission', 'Missions'], ['produit', 'Produits'], ['penalite', 'Pénalités']];

export default function ItemsTab({ role }) {
  const [items, setItems] = useState([]);
  const [nouveau, setNouveau] = useState({ type: 'mission', nom: '', montant: '' });
  const [erreur, setErreur] = useState('');

  function reload() {
    api('/items').then(setItems).catch((e) => setErreur(e.message));
  }
  useEffect(reload, []);

  async function creer(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api('/items', { method: 'POST', role, body: { ...nouveau, montant: Number(nouveau.montant) } });
      setNouveau({ type: nouveau.type, nom: '', montant: '' });
      reload();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function maj(it, champ, valeur) {
    await api(`/items/${it.id}`, { method: 'PATCH', role, body: { [champ]: valeur } });
    reload();
  }

  async function retirer(id) {
    if (!confirm('Retirer cet item ?')) return;
    await api(`/items/${id}`, { method: 'DELETE', role });
    reload();
  }

  return (
    <div>
      {erreur && <div className="error-msg">{erreur}</div>}
      <form className="card" onSubmit={creer}>
        <h2 style={{ marginTop: 0 }}>Ajouter mission / produit / pénalité</h2>
        <div className="row">
          <select value={nouveau.type} onChange={(e) => setNouveau({ ...nouveau, type: e.target.value })} style={{ maxWidth: 180 }}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input placeholder="Nom" value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} />
          <input placeholder="Montant (+/-)" type="number" value={nouveau.montant} onChange={(e) => setNouveau({ ...nouveau, montant: e.target.value })} style={{ maxWidth: 160 }} />
          <button className="btn btn-primary" type="submit">Ajouter</button>
        </div>
      </form>

      {TYPES.map(([type, label]) => (
        <div className="card" key={type}>
          <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{label}</h2>
          <table>
            <thead><tr><th>Nom</th><th>Montant</th><th></th></tr></thead>
            <tbody>
              {items.filter((i) => i.type === type).map((it) => (
                <tr key={it.id}>
                  <td><input defaultValue={it.nom} onBlur={(e) => e.target.value !== it.nom && maj(it, 'nom', e.target.value)} /></td>
                  <td><input type="number" defaultValue={it.montant} style={{ maxWidth: 120 }} onBlur={(e) => Number(e.target.value) !== it.montant && maj(it, 'montant', Number(e.target.value))} /></td>
                  <td><button className="btn btn-danger" onClick={() => retirer(it.id)}>Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
