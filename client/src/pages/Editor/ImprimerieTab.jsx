import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const DEFAULTS = {
  nomX: 20, nomY: 200, nomSize: 18,
  montantX: 20, montantY: 170, montantSize: 18,
  qrX: 20, qrY: 20, qrSize: 100
};

export default function ImprimerieTab({ role }) {
  const [template, setTemplate] = useState(null);
  const [coords, setCoords] = useState(DEFAULTS);
  const [fichier, setFichier] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionId, setMissionId] = useState('');
  const [quantite, setQuantite] = useState(10);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/cheques/template', { role }).then((t) => {
      if (t) {
        setTemplate(t);
        setCoords({
          nomX: t.nom.x, nomY: t.nom.y, nomSize: t.nom.size,
          montantX: t.montant.x, montantY: t.montant.y, montantSize: t.montant.size,
          qrX: t.qr.x, qrY: t.qr.y, qrSize: t.qr.size
        });
      }
    }).catch(() => {});
    api('/items?type=mission').then(setMissions).catch(() => {});
  }, []);

  async function enregistrerTemplate(e) {
    e.preventDefault();
    setErreur(''); setMessage('');
    try {
      const form = new FormData();
      if (fichier) form.append('image', fichier);
      for (const [k, v] of Object.entries(coords)) form.append(k, v);
      const t = await api('/cheques/template', { method: 'POST', role, isForm: true, body: form });
      setTemplate(t);
      setMessage('Modèle de chèque enregistré.');
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function generer(e) {
    e.preventDefault();
    setErreur(''); setMessage('');
    try {
      const blob = await api('/cheques/generer', { method: 'POST', role, body: { itemId: Number(missionId), quantite: Number(quantite) } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cheques-${missionId}.pdf`;
      a.click();
      setMessage(`${quantite} chèques générés.`);
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div>
      {erreur && <div className="error-msg">{erreur}</div>}
      {message && <div className="success-msg">{message}</div>}

      <form className="card" onSubmit={enregistrerTemplate}>
        <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Modèle de chèque</h2>
        <p className="muted">Coordonnées en points PDF, origine en bas à gauche de l'image. Le nom et le montant de la mission sélectionnée seront placés à ces positions fixes.</p>
        <div className="field">
          <label>Image du chèque vierge (PNG/JPEG)</label>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setFichier(e.target.files[0])} />
        </div>
        {template?.imagePath && (
          <img src={`/uploads/cheques/${template.imagePath.split('/').pop()}`} alt="modèle" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 14 }} />
        )}
        <div className="row">
          <div className="field"><label>Nom X</label><input type="number" value={coords.nomX} onChange={(e) => setCoords({ ...coords, nomX: e.target.value })} /></div>
          <div className="field"><label>Nom Y</label><input type="number" value={coords.nomY} onChange={(e) => setCoords({ ...coords, nomY: e.target.value })} /></div>
          <div className="field"><label>Taille texte</label><input type="number" value={coords.nomSize} onChange={(e) => setCoords({ ...coords, nomSize: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Montant X</label><input type="number" value={coords.montantX} onChange={(e) => setCoords({ ...coords, montantX: e.target.value })} /></div>
          <div className="field"><label>Montant Y</label><input type="number" value={coords.montantY} onChange={(e) => setCoords({ ...coords, montantY: e.target.value })} /></div>
          <div className="field"><label>Taille texte</label><input type="number" value={coords.montantSize} onChange={(e) => setCoords({ ...coords, montantSize: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field"><label>QR X</label><input type="number" value={coords.qrX} onChange={(e) => setCoords({ ...coords, qrX: e.target.value })} /></div>
          <div className="field"><label>QR Y</label><input type="number" value={coords.qrY} onChange={(e) => setCoords({ ...coords, qrY: e.target.value })} /></div>
          <div className="field"><label>Taille QR</label><input type="number" value={coords.qrSize} onChange={(e) => setCoords({ ...coords, qrSize: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" type="submit">Enregistrer le modèle</button>
      </form>

      <form className="card" onSubmit={generer}>
        <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Générer des chèques</h2>
        <div className="row">
          <select value={missionId} onChange={(e) => setMissionId(e.target.value)} required>
            <option value="">— Choisir une mission —</option>
            {missions.map((m) => <option key={m.id} value={m.id}>{m.nom} ({m.montant} CHF)</option>)}
          </select>
          <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} style={{ maxWidth: 120 }} />
          <button className="btn btn-primary" type="submit">Générer le PDF</button>
        </div>
      </form>
    </div>
  );
}
