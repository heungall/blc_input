import { useAuth } from '../context/AuthContext';

export default function WeeklySummary({ weeklyData, onEditAttendance, onEditSharing, onEditAll }) {
  const { user } = useAuth();
  const { attendees = [], absences = [], sharing = [], prayers = [], notes = '' } = weeklyData;

  const attendeeNames = attendees.join(', ');
  const absenceText = absences.map(a => `${a.name} - ${a.reason}`).join('\n');
  const sharingText = sharing.map(s => `${s.name} - ${s.content}`).join('\n');
  const prayerText = prayers.map(p => `${p.name} - ${p.content}`).join('\n');

  return (
    <div>
      <div className="card summary-header">
        <div className="summary-check">&#10003;</div>
        <h2>이번 주 일지 제출 완료</h2>
        <p className="card-desc">아래 내용을 확인하고, 수정이 필요하면 해당 항목을 눌러주세요.</p>
      </div>

      <div className="card summary-section" onClick={onEditAttendance}>
        <div className="summary-section-header">
          <h3>출결</h3>
          <span className="summary-edit-hint">수정</span>
        </div>
        <div className="form-preview">
          <div className="label">출석 ({attendees.length}명)</div>
          <div className="value">{attendeeNames || '(없음)'}</div>
        </div>
        {absences.length > 0 && (
          <div className="form-preview">
            <div className="label">결석 ({absences.length}명)</div>
            <div className="value">{absenceText}</div>
          </div>
        )}
      </div>

      <div className="card summary-section" onClick={onEditSharing}>
        <div className="summary-section-header">
          <h3>나눔 & 기도제목</h3>
          <span className="summary-edit-hint">수정</span>
        </div>
        {sharing.length > 0 && (
          <div className="form-preview">
            <div className="label">나눔</div>
            <div className="value">{sharingText}</div>
          </div>
        )}
        {prayers.length > 0 && (
          <div className="form-preview">
            <div className="label">기도제목</div>
            <div className="value">{prayerText}</div>
          </div>
        )}
        {sharing.length === 0 && prayers.length === 0 && (
          <p className="card-desc">입력된 내용이 없습니다.</p>
        )}
      </div>

      {notes && (
        <div className="card">
          <h3 className="summary-section-title">특이사항</h3>
          <div className="form-preview">
            <div className="value">{notes}</div>
          </div>
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-outline" onClick={onEditAll}>
          전체 다시 작성
        </button>
      </div>
    </div>
  );
}
