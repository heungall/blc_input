import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'blc_saved_members';

export default function NameInput({ names, setNames, onNext, onSkip }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addName = () => {
    const trimmed = input.trim();
    if (trimmed && !names.includes(trimmed)) {
      setNames([...names, trimmed]);
      setInput('');
      inputRef.current?.focus();
    }
  };

  const removeName = (name) => {
    setNames(names.filter((n) => n !== name));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addName();
    }
  };

  const loadSaved = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNames(parsed);
        }
      } catch { /* ignore */ }
    }
  };

  const saveMembers = () => {
    if (names.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
    }
  };

  const hasSaved = !!localStorage.getItem(STORAGE_KEY);

  return (
    <div>
      <div className="card">
        <h2>참석자 이름 입력</h2>
        <div className="name-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="이름을 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={addName}>추가</button>
        </div>
        <div className="names-list">
          {names.map((name) => (
            <span className="name-tag" key={name}>
              {name}
              <button onClick={() => removeName(name)}>&times;</button>
            </span>
          ))}
        </div>
        {names.length > 0 && (
          <p className="names-count">총 {names.length}명</p>
        )}
      </div>

      <div className="btn-group">
        {hasSaved && names.length === 0 && (
          <button className="btn btn-outline" onClick={loadSaved}>
            저장된 멤버 불러오기
          </button>
        )}
        {names.length > 0 && (
          <button className="btn btn-outline" onClick={saveMembers}>
            멤버 목록 저장
          </button>
        )}
        <button
          className="btn btn-primary"
          disabled={names.length < 4}
          onClick={onNext}
        >
          추첨 시작 ({names.length < 4 ? `최소 4명 필요` : `${names.length}명`})
        </button>
        <button
          className="btn btn-secondary"
          disabled={names.length === 0}
          onClick={onSkip}
        >
          추첨 없이 넘어가기
        </button>
      </div>
    </div>
  );
}
