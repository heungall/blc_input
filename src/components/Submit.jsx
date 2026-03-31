import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitRecord } from '../services/api';

export default function Submit({ attendees, absences, sharing, prayers, notes: initialNotes, isEditing, onBack, onRestart, onDone }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(initialNotes || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success, date, updated } | { error }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitRecord(user.idToken, user.cellId, {
        attendees,
        absences,
        sharing,
        prayers,
        notes: notes.trim(),
      });

      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true, date: res.date, updated: res.updated });
        localStorage.removeItem('blc_sharing_prayers');
      }
    } catch (err) {
      // [SECURE] 내부 오류 노출 금지
      console.error('submit error:', err);
      setResult({ error: '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div>
        <div className="card submit-success">
          <div className="success-icon">&#10003;</div>
          <h2>{result.updated ? '수정 완료!' : '제출 완료!'}</h2>
          <p className="card-desc">
            {result.date} 셀 리더 일지가 {result.updated ? '수정' : '저장'}되었습니다.
          </p>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={onDone || onRestart}>
            확인
          </button>
        </div>
      </div>
    );
  }

  const attendeeNames = attendees.join(', ');
  const absenceText = absences
    .map(a => `${a.name} - ${a.reason}`)
    .join('\n');
  const sharingText = sharing
    .map(s => `${s.name} - ${s.content}`)
    .join('\n');
  const prayerText = prayers
    .map(p => `${p.name} - ${p.content}`)
    .join('\n');

  return (
    <div>
      <div className="card">
        <h2>{isEditing ? '수정 미리보기' : '제출 미리보기'}</h2>

        <div className="form-preview">
          <div className="label">출석 멤버</div>
          <div className="value">{attendeeNames || '(없음)'}</div>
        </div>

        {absences.length > 0 && (
          <div className="form-preview">
            <div className="label">결석 멤버 + 사유</div>
            <div className="value">{absenceText}</div>
          </div>
        )}

        {sharing.length > 0 && (
          <div className="form-preview">
            <div className="label">나눔 기록</div>
            <div className="value">{sharingText}</div>
          </div>
        )}

        {prayers.length > 0 && (
          <div className="form-preview">
            <div className="label">기도제목</div>
            <div className="value">{prayerText}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>특이사항 / 요청사항</h2>
        <textarea
          className="notes-input"
          placeholder="특이사항이나 요청사항이 있으면 입력하세요..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {result?.error && (
        <div className="submit-error">{result.error}</div>
      )}

      <div className="btn-group">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '저장 중...' : isEditing ? '수정하기' : '제출하기'}
        </button>
        <button className="btn btn-outline" onClick={onBack} disabled={submitting}>
          이전으로
        </button>
      </div>
    </div>
  );
}
