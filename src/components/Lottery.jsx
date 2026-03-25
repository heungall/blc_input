import { useState, useEffect } from 'react';

const ROLES_BY_COUNT = {
  4: ['첫기도', '끝기도', '기도정리', '질문자'],
  5: ['첫기도', '끝기도', '기도정리', '질문자', '사진사'],
  6: ['첫기도', '끝기도', '기도정리', '질문자', '사진사', '인도'],
};

function getRoles(count) {
  if (count <= 4) return ROLES_BY_COUNT[4];
  if (count <= 6) return ROLES_BY_COUNT[count];
  const base = ROLES_BY_COUNT[6];
  const extras = Array(count - 6).fill('통과');
  return [...base, ...extras];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Lottery({ names, initialResults, onResult, onReShuffle }) {
  const hasInitial = initialResults && initialResults.length > 0;
  const [phase, setPhase] = useState(hasInitial ? 'done' : 'shuffling');
  const [shuffleDisplay, setShuffleDisplay] = useState('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(hasInitial ? initialResults : []);
  const [visibleCount, setVisibleCount] = useState(hasInitial ? initialResults.length : 0);

  useEffect(() => {
    if (phase !== 'shuffling') return;

    const duration = 2000;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct * 100);
      setShuffleDisplay(names[Math.floor(Math.random() * names.length)]);

      if (pct >= 1) {
        clearInterval(interval);
        const roles = getRoles(names.length);
        const shuffled = shuffle(names);
        const result = shuffled.map((name, i) => ({
          name,
          role: roles[i],
        }));
        setResults(result);
        setPhase('done');
        onResult(result);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [phase, names, onResult]);

  useEffect(() => {
    if (phase !== 'done') return;
    if (visibleCount >= results.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 200);
    return () => clearTimeout(timer);
  }, [phase, visibleCount, results.length]);

  const handleReShuffle = () => {
    setPhase('shuffling');
    setProgress(0);
    setResults([]);
    setVisibleCount(0);
    onReShuffle();
  };

  if (phase === 'shuffling') {
    return (
      <div className="shuffle-container">
        <div className="shuffle-display">{shuffleDisplay}</div>
        <p style={{ marginBottom: 12, color: 'var(--text-light)', fontSize: 14 }}>
          추첨 중...
        </p>
        <div className="shuffle-progress">
          <div
            className="shuffle-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>추첨 결과</h2>
        <div className="result-cards">
          {results.slice(0, visibleCount).map(({ name, role }) => (
            <div className="result-card" key={name}>
              <span className={`role ${role === '통과' ? 'pass' : ''}`}>
                {role}
              </span>
              <span className="name">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {visibleCount >= results.length && (
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => onResult(results, true)}>
            다음 단계로
          </button>
          <button className="btn btn-secondary" onClick={handleReShuffle}>
            다시 추첨
          </button>
        </div>
      )}
    </div>
  );
}
