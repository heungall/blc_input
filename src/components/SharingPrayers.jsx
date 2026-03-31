import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'blc_sharing_prayers';

export default function SharingPrayers({ attendees, onNext, onBack }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return {};
  });
  const [saveVisible, setSaveVisible] = useState(false);

  const saveToLocal = useCallback((d) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    setSaveVisible(true);
    setTimeout(() => setSaveVisible(false), 1500);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => saveToLocal(data), 1000);
    return () => clearTimeout(timer);
  }, [data, saveToLocal]);

  const update = (name, field, value) => {
    setData(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value }
    }));
  };

  const handleNext = () => {
    saveToLocal(data);

    const sharing = attendees
      .filter(n => data[n]?.sharing?.trim())
      .map(n => ({ name: n, content: data[n].sharing.trim() }));

    const prayers = attendees
      .filter(n => data[n]?.prayer?.trim())
      .map(n => ({ name: n, content: data[n].prayer.trim() }));

    onNext({ sharing, prayers });
  };

  return (
    <div>
      <div className="card">
        <h2>나눔 & 기도제목</h2>
        <p className="card-desc">
          각 멤버의 나눔 내용과 기도제목을 입력하세요. 빈 칸은 자동 생략됩니다.
        </p>

        {attendees.map(name => (
          <div className="sharing-member" key={name}>
            <div className="sharing-member-name">{name}</div>
            <div className="sharing-item">
              <label>나눔</label>
              <textarea
                placeholder="나눔 내용..."
                value={data[name]?.sharing || ''}
                onChange={(e) => update(name, 'sharing', e.target.value)}
                rows={2}
              />
            </div>
            <div className="sharing-item">
              <label>기도제목</label>
              <textarea
                placeholder="기도제목..."
                value={data[name]?.prayer || ''}
                onChange={(e) => update(name, 'prayer', e.target.value)}
                rows={2}
              />
            </div>
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
