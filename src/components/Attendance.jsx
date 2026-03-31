import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { addMember, deactivateMember } from '../services/api';

const ABSENCE_REASONS = ['회사', '개인사정', '여행'];

export default function Attendance({ attendance, setAttendance, onNext, onSkipLottery, isEditing, onBackToSummary }) {
  const { user } = useAuth();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

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

  const handleAddMember = async () => {
    const trimmed = newName.trim();
    if (!trimmed || members.includes(trimmed)) return;

    setAdding(true);
    try {
      await addMember(user.idToken, user.cellId, trimmed);
      setAttendance(prev => ({
        ...prev,
        [trimmed]: { present: true, reason: '' }
      }));
      setNewName('');
      inputRef.current?.focus();
    } catch (err) {
      // [SECURE] 내부 오류 노출 금지
      console.error('addMember error:', err);
      alert('멤버 추가에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = async (name) => {
    if (!confirm(`${name}님을 비활성화하시겠습니까?`)) return;

    try {
      await deactivateMember(user.idToken, user.cellId, name);
      setAttendance(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      console.error('deactivateMember error:', err);
      alert('멤버 비활성화에 실패했습니다.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  return (
    <div>
      <div className="card">
        <h2>출결 체크</h2>
        <p className="card-desc">
          멤버를 탭하여 출석/결석을 전환하세요.
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

      <div className="card">
        <h2>멤버 추가</h2>
        <div className="name-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="새 멤버 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={adding}
          />
          <button onClick={handleAddMember} disabled={adding || !newName.trim()}>
            {adding ? '...' : '추가'}
          </button>
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
        {onBackToSummary && (
          <button className="btn btn-outline" onClick={onBackToSummary}>
            요약으로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
