import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../../api/socket.js';
import { api } from '../../api/client.js';

function fillPhrase(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
}

const COULEUR_LABEL = { rouge: 'Rouge', vert: 'Vert', don: 'Don' };

export default function Display() {
  const [classement, setClassement] = useState([]);
  const [habitantsParadis, setHabitantsParadis] = useState(0);
  const [config, setConfig] = useState({});
  const [history, setHistory] = useState([]); // dernières phrases affichées sous le classement
  const [current, setCurrent] = useState(null); // événement en cours d'animation
  const [phase, setPhase] = useState('idle'); // idle | spinning | result
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const carteControleFiscalRef = useRef(null);

  useEffect(() => {
    api('/config').then(setConfig).catch(() => {});
    api('/cartes').then((cartes) => {
      carteControleFiscalRef.current = cartes.find((c) => c.code === 'controle_fiscal') ?? null;
    }).catch(() => {});

    const socket = getSocket();
    const onClassement = (data) => {
      setClassement(data.classement);
      setHabitantsParadis(data.habitantsParadis);
    };
    const onControleFiscal = (payload) => {
      queueRef.current.push(payload);
      processQueue();
    };
    socket.on('classement', onClassement);
    socket.on('controle-fiscal', onControleFiscal);
    return () => {
      socket.off('classement', onClassement);
      socket.off('controle-fiscal', onControleFiscal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function processQueue() {
    if (processingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    processingRef.current = true;
    setCurrent(next);
    setPhase('spinning');

    setTimeout(() => {
      setPhase('result');
      const phrase = fillPhrase(carteControleFiscalRef.current?.phrase_ecran, {
        attaquant: next.attaquant?.nom,
        vise: next.vise?.nom,
        de: next.de?.nom
      });
      const resultLine = `${phrase} → ${COULEUR_LABEL[next.face.type]} ${next.face.pourcentage}% (${next.montantReel} CHF)`;

      setTimeout(() => {
        setHistory((h) => [resultLine, ...h].slice(0, 2));
        setPhase('idle');
        setCurrent(null);
        processingRef.current = false;
        processQueue();
      }, 2000);
    }, 2200);
  }

  const phraseHabitants = fillPhrase(config.phrase_habitants_paradis, { n: habitantsParadis });

  return (
    <div className="app-shell wide">
      <div className="top-bar">
        <h1>📺 Écran d'affichage</h1>
      </div>
      <div className="content" style={{ maxWidth: 1100 }}>
        {phase !== 'idle' && current && (
          <div className="card center" style={{ padding: 36 }}>
            <p style={{ fontSize: '1.2rem', marginBottom: 20 }}>
              Le joueur <strong>{current.attaquant?.nom}</strong> utilise Contrôle fiscal avec le dé{' '}
              <strong>{current.de?.nom}</strong> sur le joueur <strong>{current.vise?.nom}</strong>
            </p>
            <div className={`dice-face ${phase === 'spinning' ? 'spinning' : current.face.type}`}>
              {phase === 'spinning' ? '🎲' : current.face.pourcentage + '%'}
            </div>
            {phase === 'result' && (
              <p style={{ marginTop: 18 }}>
                <span className={`tag tag-${current.face.type}`}>{COULEUR_LABEL[current.face.type]}</span>{' '}
                — {current.montantReel} CHF
              </p>
            )}
          </div>
        )}

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: 2, minWidth: 320 }}>
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Classement</h2>
            {classement.map((j, i) => (
              <div className="classement-row" key={j.id}>
                <span><span className="classement-rank">#{i + 1}</span>{j.nom}</span>
                <strong style={{ color: 'var(--gold)' }}>{j.solde_banque} CHF</strong>
              </div>
            ))}
            {classement.length === 0 && <p className="muted">Aucun joueur à afficher pour le moment.</p>}
          </div>
          <div className="card" style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ marginTop: 0, color: 'var(--gold)' }}>Infos</h2>
            <p>{phraseHabitants}</p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="card">
            {history.map((line, i) => (
              <p key={i} className={i === 0 ? '' : 'muted'} style={{ margin: '6px 0' }}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
