import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchHistory } from '../services/api';

function formatDate(dateStr) {
  // "2026-03-31" → "3월 31일 (월)"
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function History({ onClose }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => {
    fetchHistory(user.idToken, 12)
      .then(res => {
        if (res.error) setError(res.error);
        else setHistory(res.history || []);
      })
      .catch(() => setError('히스토리를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [user.idToken]);

  return (
    <div>
      <div className="card">
        <div className="member-manage-header">
          <h2>제출 히스토리</h2>
          <button className="member-manage-close" onClick={onClose}>&times;</button>
        </div>
        <p className="card-desc">{user.cellName} 최근 제출 기록</p>
      </div>

      {loading && <p className="history-loading">불러오는 중...</p>}
      {error && <p className="login-error">{error}</p>}

      {!loading && !error && history.length === 0 && (
        <div className="card">
          <p className="card-desc" style={{ textAlign: 'center', padding: '20px 0' }}>
            아직 제출 기록이 없습니다.
          </p>
        </div>
      )}

      {history.map((record, idx) => {
        const isOpen = openIdx === idx;
        const attendeeCount = record.attendees?.length || 0;
        const absenceCount = record.absences?.length || 0;

        return (
          <div key={record.date} className="card history-card">
            <button
              className="history-header"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
            >
              <div className="history-date">{formatDate(record.date)}</div>
              <div className="history-summary">
                <span className="history-badge present">출석 {attendeeCount}명</span>
                {absenceCount > 0 && (
                  <span className="history-badge absent">결석 {absenceCount}명</span>
                )}
              </div>
              <span className="history-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="history-detail">
                <div className="history-section">
                  <div className="history-section-label">출석</div>
                  <div className="history-section-value">
                    {record.attendees?.join(', ') || '(없음)'}
                  </div>
                </div>

                {absenceCount > 0 && (
                  <div className="history-section">
                    <div className="history-section-label">결석</div>
                    <div className="history-section-value">
                      {record.absences.map(a => `${a.name} - ${a.reason}`).join('\n')}
                    </div>
                  </div>
                )}

                {record.sharing?.length > 0 && (
                  <div className="history-section">
                    <div className="history-section-label">나눔</div>
                    <div className="history-section-value">
                      {record.sharing.map(s => `${s.name} - ${s.content}`).join('\n')}
                    </div>
                  </div>
                )}

                {record.prayers?.length > 0 && (
                  <div className="history-section">
                    <div className="history-section-label">기도제목</div>
                    <div className="history-section-value">
                      {record.prayers.map(p => `${p.name} - ${p.content}`).join('\n')}
                    </div>
                  </div>
                )}

                {record.notes && (
                  <div className="history-section">
                    <div className="history-section-label">특이사항</div>
                    <div className="history-section-value">{record.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
