import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const REGION_ID = 'qr-scanner-region';

export default function Scanner({ onResult }) {
  const scannerRef = useRef(null);
  const [manuel, setManuel] = useState('');
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => onResult(decodedText),
        () => {}
      )
      .catch(() => setCameraError("Impossible d'accéder à la caméra. Utilise la saisie manuelle ci-dessous."));

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div id={REGION_ID} style={{ width: '100%', maxWidth: 360, margin: '0 auto', borderRadius: 12, overflow: 'hidden' }} />
      {cameraError && <div className="error-msg">{cameraError}</div>}
      <div className="field" style={{ marginTop: 16 }}>
        <label>Ou saisis le code manuellement</label>
        <div className="row">
          <input value={manuel} onChange={(e) => setManuel(e.target.value)} placeholder="Code du QR" />
          <button className="btn btn-primary" onClick={() => manuel && onResult(manuel)}>Valider</button>
        </div>
      </div>
    </div>
  );
}
