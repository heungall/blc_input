import { useState } from 'react';

const ABSENCE_REASONS = ['회사', '개인사정', '여행'];

export default function Attendance({ attendance, setAttendance, onNext, onSkipLottery, isEditing, onBackToSummary, onQuickSave }) {
  const [saving, setSaving] = useState(false);
  const members = Object.keys(attendance);
  const attendees = members.filter(n => attendance[n].present);
  const absentees = members.filter(n => !attendance[n].present);

  const togglePresence = (name) => {
    setAttendance(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        present: !prev[name].present,
        reason: !prev[name].present ? '' : prev[name].reason,
      }
    }));
  };

  const setReason = (name, reason) => {
    setAttendance(prev => ({
      ...prev,
      [name]: { ...prev[name], reason }
    }));
  };

  return (
    <div>
      <div className="card">
        <h2>출결 체크</h2>
        <p className="card-desc">
          멤버를 탭하여 출석/결석을 전환하세요. 멤버 추가/삭제는 상단 설정에서 할 수 있습니다.
        </p>

        <div className="attendance-list">
          {members.map(name => (
            <div key={name} className="attendance-item">
              <div className="attendance-row">
                <button
                  className={`attendance-toggle ${attendance[name].present ? 'present' : 'absent'}`}
                  onClick={() => togglePresence(name)}
                >
                  <span className="attendance-name">{name}</span>
                  <span className="attendance-status">
                    {attendance[name].present ? '출석' : '결석'}
                  </span>
                </button>
                {attendance[name].present && (
                  <button
                    className="attendance-absent-btn"
                    onClick={() => togglePresence(name)}
                    title="결석 처리"
                  >
                    &times;
                  </button>
                )}
              </div>

              {!attendance[name].present && (
                <div className="absence-reasons">
                  {ABSENCE_REASONS.map(r => (
                    <button
                      key={r}
                      className={`reason-btn ${attendance[name].reason === r ? 'selected' : ''}`}
                      onClick={() => setReason(name, r)}
                    >
                      {r}
                    </button>
                  ))}
                  <input
                    type="text"
                    className="reason-input"
                    placeholder="직접 입력"
                    value={ABSENCE_REASONS.includes(attendance[name].reason) ? '' : attendance[name].reason}
                    onChange={(e) => setReason(name, e.target.value)}
                    onFocus={() => {
                      if (ABSENCE_REASONS.includes(attendance[name].reason)) {
                        setReason(name, '');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="attendance-summary">
          출석 {attendees.length}명 / 결석 {absentees.length}명
        </div>
      </div>

      <div className="btn-group">
        <button
          className="btn btn-primary"
          disabled={attendees.length < 4}
          onClick={onNext}
        >
          역할 추첨 ({attendees.length < 4 ? '최소 4명 필요' : `${attendees.length}명`})
        </button>
        <button
          className="btn btn-secondary"
          disabled={attendees.length === 0}
          onClick={onSkipLottery}
        >
          추첨 없이 넘어가기
        </button>
        {onQuickSave && (
          <button
            className="btn btn-success"
            onClick={async () => {
              setSaving(true);
              await onQuickSave();
              setSaving(false);
            }}
            disabled={saving}
          >
            {saving ? '저장 중...' : '출결만 저장'}
          </button>
        )}
        {onBackToSummary && (
          <button className="btn btn-outline" onClick={onBackToSummary}>
            요약으로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
