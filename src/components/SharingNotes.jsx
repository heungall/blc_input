import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'blc_sharing_notes';

export default function SharingNotes({ names, onNext, onBack }) {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return {};
  });
  const [saveVisible, setSaveVisible] = useState(false);

  const saveToLocal = useCallback((data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaveVisible(true);
    setTimeout(() => setSaveVisible(false), 1500);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveToLocal(notes);
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, saveToLocal]);

  const updateNote = (name, value) => {
    setNotes((prev) => ({ ...prev, [name]: value }));
  };

  const getFormattedNotes = () => {
    return names
      .filter((name) => notes[name]?.trim())
      .map((name) => `${name}- ${notes[name].trim()}`)
      .join('\n');
  };

  const handleNext = () => {
    saveToLocal(notes);
    onNext(getFormattedNotes());
  };

  return (
    <div>
      <div className="card">
        <h2>나눔 기록</h2>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
          각 참석자의 나눔 내용을 입력하세요. 빈 칸은 자동으로 생략됩니다.
        </p>
        {names.map((name) => (
          <div className="sharing-item" key={name}>
            <label>{name}</label>
            <textarea
              placeholder="나눔 내용을 입력하세요..."
              value={notes[name] || ''}
              onChange={(e) => updateNote(name, e.target.value)}
              rows={2}
            />
          </div>
        ))}
        <div className={`save-indicator ${saveVisible ? 'visible' : ''}`}>
          자동 저장됨
        </div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleNext}>
          다음 단계로
        </button>
        <button className="btn btn-outline" onClick={onBack}>
          이전으로
        </button>
      </div>
    </div>
  );
}
