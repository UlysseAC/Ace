import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, getToken } from '../../api/client.js';

export default function CartesTab({ role }) {
  const [cartes, setCartes] = useState([]);
  const [erreur, setErreur] = useState('');
  const [nouvelle, setNouvelle] = useState({ code: '', nom: '', description: '', montant: '', phrase_ecran: '' });
  const [qrByCode, setQrByCode] = useState({});

  function reload() {
    api('/cartes').then(setCartes).catch((e) => setErreur(e.message));
  }
  useEffect(reload, []);

  async function maj(c, champ, valeur) {
    await api(`/cartes/${c.code}`, { method: 'PATCH', role, body: { [champ]: valeur } });
    reload();
  }

  async function uploadImage(code, file) {
    const form = new FormData();
    form.append('image', file);
    await api(`/cartes/${code}/image`, { method: 'POST', role, isForm: true, body: form });
    reload();
  }

  async function creer(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api('/cartes', { method: 'POST', role, body: { ...nouvelle, montant: nouvelle.montant ? Number(nouvelle.montant) : null } });
      setNouvelle({ code: '', nom: '', description: '', montant: '', phrase_ecran: '' });
      reload();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function genererQr(code) {
    const quantite = Number(prompt('Combien de QR codes physiques générer pour cette carte ?', '10'));
    if (!quantite) return;
    const { hashes } = await api(`/cartes/${code}/qrcodes`, { method: 'POST', role, body: { quantite } });
    const images = await Promise.all(hashes.map((h) => QRCode.toDataURL(h, { margin: 1, width: 160 })));
    setQrByCode((s) => ({ ...s, [code]: images }));
  }

  return (
    <div>
      {erreur && <div className="error-msg">{erreur}</div>}

      <form className="card" onSubmit={creer}>
        <h2 style={{ marginTop: 0 }}>Ajouter une nouvelle carte</h2>
        <div className="row">
          <input placeholder="code (unique, ex: joker)" value={nouvelle.code} onChange={(e) => setNouvelle({ ...nouvelle, code: e.target.value })} />
          <input placeholder="Nom affiché" value={nouvelle.nom} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} />
          <input placeholder="Montant (optionnel)" type="number" value={nouvelle.montant} onChange={(e) => setNouvelle({ ...nouvelle, montant: e.target.value })} style={{ maxWidth: 140 }} />
        </div>
        <div className="field"><label>Description (visible par le joueur)</label><textarea value={nouvelle.description} onChange={(e) => setNouvelle({ ...nouvelle, description: e.target.value })} /></div>
        <div className="field"><label>Phrase écran (variables : {'{joueur}'}, {'{montant}'}, {'{attaquant}'}, {'{vise}'}, {'{de}'})</label><input value={nouvelle.phrase_ecran} onChange={(e) => setNouvelle({ ...nouvelle, phrase_ecran: e.target.value })} /></div>
        <button className="btn btn-primary" type="submit">Créer la carte</button>
      </form>

      {cartes.map((c) => (
        <div className="card" key={c.code}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {c.image_path && <img src={`/uploads/cartes/${c.image_path.split('/').pop()}`} alt={c.nom} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8 }} />}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>{c.nom} <span className="muted">({c.code})</span></h2>
              <div className="field"><label>Nom</label><input defaultValue={c.nom} onBlur={(e) => e.target.value !== c.nom && maj(c, 'nom', e.target.value)} /></div>
              <div className="field"><label>Description</label><textarea defaultValue={c.description} onBlur={(e) => e.target.value !== c.description && maj(c, 'description', e.target.value)} /></div>
              {c.code === 'bonus' && (
                <div className="field"><label>Montant du crédit fixe</label><input type="number" defaultValue={c.montant} onBlur={(e) => Number(e.target.value) !== c.montant && maj(c, 'montant', Number(e.target.value))} /></div>
              )}
              <div className="field"><label>Phrase écran</label><input defaultValue={c.phrase_ecran} onBlur={(e) => e.target.value !== c.phrase_ecran && maj(c, 'phrase_ecran', e.target.value)} /></div>
              <div className="row">
                <label className="btn">
                  Insérer une image
                  <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && uploadImage(c.code, e.target.files[0])} />
                </label>
                <button className="btn" onClick={() => genererQr(c.code)}>Générer des QR codes physiques</button>
              </div>
              {qrByCode[c.code] && (
                <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  {qrByCode[c.code].map((src, i) => <img key={i} src={src} alt="qr" width={80} height={80} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
