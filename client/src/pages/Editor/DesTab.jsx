import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const TYPES = ['rouge', 'vert', 'don'];

function DeCard({ de, role, onSaved }) {
  const [faces, setFaces] = useState(de.faces);
  const [saved, setSaved] = useState(false);

  function updateFace(index, champ, valeur) {
    setSaved(false);
    setFaces((f) => f.map((face) => (face.face_index === index ? { ...face, [champ]: valeur } : face)));
  }

  async function enregistrer() {
    await api(`/des/${de.id}/faces`, { method: 'PATCH', role, body: { faces } });
    setSaved(true);
    onSaved();
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{de.nom}</h2>
      <table>
        <thead><tr><th>Face</th><th>Type</th><th>Pourcentage</th></tr></thead>
        <tbody>
          {faces.map((f) => (
            <tr key={f.face_index}>
              <td>{f.face_index}</td>
              <td>
                <select value={f.type} onChange={(e) => updateFace(f.face_index, 'type', e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td><input type="number" value={f.pourcentage} style={{ maxWidth: 100 }} onChange={(e) => updateFace(f.face_index, 'pourcentage', Number(e.target.value))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={enregistrer}>Enregistrer ce dé</button>
      {saved && <span className="success-msg" style={{ marginLeft: 10 }}>Enregistré !</span>}
    </div>
  );
}

export default function DesTab({ role }) {
  const [des, setDes] = useState([]);

  function reload() {
    api('/des').then(setDes);
  }
  useEffect(reload, []);

  return (
    <div>
      {des.map((d) => <DeCard key={d.id} de={d} role={role} onSaved={reload} />)}
    </div>
  );
}
