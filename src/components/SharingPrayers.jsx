import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'blc_sharing_prayers';

/**
 * 붙여넣은 텍스트에서 멤버 이름 기준으로 내용을 파싱
 * 지원 형식:
 *   "주원 기도제목"
 *   "지현 : 기도제목"
 *   "주원- 기도제목"
 *   "지현 기도제목1, 기도제목2"
 *   여러 줄 혼합
 *
 * @param {string} text - 붙여넣은 텍스트
 * @param {string[]} names - 알려진 멤버 이름 목록
 * @returns {{ [name]: string }} 이름 → 내용 매핑
 */
function parseBulkText(text, names) {
  const result = {};
  if (!text.trim() || names.length === 0) return result;

  // 이름을 긴 순서로 정렬 (부분 매칭 방지: "김지현" 이 "김지" 보다 먼저 매칭)
  const sortedNames = [...names].sort((a, b) => b.length - a.length);

  // 이름 패턴: 이름 뒤에 구분자(: - 공백 탭 등)
  // [SECURE] 이름은 이미 sanitize된 멤버 목록에서 옴 — regex injection 위험 없음
  const namePattern = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${namePattern})\\s*[:\\-\\s]\\s*`, 'g');

  // 각 이름의 위치를 찾아서 그 사이의 텍스트를 추출
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      name: match[1],
      contentStart: match.index + match[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].contentStart;
    const end = i + 1 < matches.length ? matches[i + 1].contentStart - (text.substring(matches[i + 1].contentStart).length - text.substring(matches[i + 1].contentStart).length) : text.length;

    // 다음 매칭의 원래 시작 위치 (이름 포함)까지
    const nextMatchOrigStart = i + 1 < matches.length
      ? text.lastIndexOf(matches[i + 1].name, matches[i + 1].contentStart)
      : text.length;

    const content = text.substring(start, nextMatchOrigStart).trim();
    if (content) {
      result[matches[i].name] = content;
    }
  }

  return result;
}

export default function SharingPrayers({ attendees, onNext, onBack, onBackToSummary }) {
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
  const [bulkField, setBulkField] = useState(null); // 'sharing' | 'prayer' | null
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);

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

  // 한번에 입력 미리보기
  const handleBulkPreview = () => {
    const parsed = parseBulkText(bulkText, attendees);
    setBulkPreview(parsed);
  };

  // 한번에 입력 적용
  const handleBulkApply = () => {
    if (!bulkPreview || !bulkField) return;
    setData(prev => {
      const next = { ...prev };
      Object.entries(bulkPreview).forEach(([name, content]) => {
        next[name] = { ...next[name], [bulkField]: content };
      });
      return next;
    });
    setBulkField(null);
    setBulkText('');
    setBulkPreview(null);
  };

  const handleBulkClose = () => {
    setBulkField(null);
    setBulkText('');
    setBulkPreview(null);
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

        <div className="bulk-buttons">
          <button
            className="bulk-btn"
            onClick={() => { setBulkField('sharing'); setBulkText(''); setBulkPreview(null); }}
          >
            나눔 한번에 입력
          </button>
          <button
            className="bulk-btn"
            onClick={() => { setBulkField('prayer'); setBulkText(''); setBulkPreview(null); }}
          >
            기도제목 한번에 입력
          </button>
        </div>

        {bulkField && (
          <div className="bulk-input-area">
            <div className="bulk-input-header">
              <h3>{bulkField === 'sharing' ? '나눔' : '기도제목'} 한번에 입력</h3>
              <button className="bulk-close" onClick={handleBulkClose}>&times;</button>
            </div>
            <p className="card-desc">
              카톡 등에서 복사한 내용을 그대로 붙여넣으세요. 멤버 이름을 자동으로 인식합니다.
            </p>
            <textarea
              className="bulk-textarea"
              placeholder={"예시:\n주원 기도제목 내용\n지현 : 기도제목 내용\n철수- 기도제목 내용"}
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkPreview(null); }}
              rows={5}
            />
            <button
              className="btn btn-secondary bulk-parse-btn"
              onClick={handleBulkPreview}
              disabled={!bulkText.trim()}
            >
              인식하기
            </button>

            {bulkPreview && (
              <div className="bulk-preview">
                <h4>인식 결과</h4>
                {Object.keys(bulkPreview).length === 0 ? (
                  <p className="bulk-no-match">
                    매칭된 멤버가 없습니다. 출석 멤버 이름({attendees.join(', ')})이 포함되어 있는지 확인하세요.
                  </p>
                ) : (
                  <>
                    {Object.entries(bulkPreview).map(([name, content]) => (
                      <div className="bulk-preview-item" key={name}>
                        <span className="bulk-preview-name">{name}</span>
                        <span className="bulk-preview-content">{content}</span>
                      </div>
                    ))}
                    {attendees.filter(n => !bulkPreview[n]).length > 0 && (
                      <p className="bulk-unmatched">
                        미인식: {attendees.filter(n => !bulkPreview[n]).join(', ')}
                      </p>
                    )}
                    <button className="btn btn-primary bulk-apply-btn" onClick={handleBulkApply}>
                      적용하기
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
        {onBackToSummary && (
          <button className="btn btn-outline" onClick={onBackToSummary}>
            요약으로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
