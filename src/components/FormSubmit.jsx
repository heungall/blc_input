import { useState } from 'react';

const FORM_BASE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfuPP24je4Axo8M8Z5XuqfwgoMasNdTmcnojGv0mSovpnq6rA/viewform';

const ENTRY_ATTENDANCE = 'entry.1173823960';
const ENTRY_SHARING = 'entry.924151839';

export default function FormSubmit({ names, sharingText, onBack, onRestart }) {
  const [showToast, setShowToast] = useState(false);

  const attendanceValue = names.join(', ');

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set(ENTRY_ATTENDANCE, attendanceValue);
    if (sharingText) {
      params.set(ENTRY_SHARING, sharingText);
    }
    return `${FORM_BASE_URL}?${params.toString()}`;
  };

  const formUrl = buildUrl();

  const openForm = () => {
    window.open(formUrl, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = formUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div>
      <div className="card">
        <h2>셀 리더 일지 열기</h2>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
          아래 내용이 구글 폼에 자동으로 채워집니다. 나머지 항목은 폼에서 직접 입력해주세요.
        </p>

        <div className="form-preview">
          <div className="label">1. 오늘 출석한 셀 멤버</div>
          <div className="value">{attendanceValue}</div>
        </div>

        {sharingText && (
          <div className="form-preview">
            <div className="label">3. 셀 모임 나눔 기록</div>
            <div className="value">{sharingText}</div>
          </div>
        )}
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={openForm}>
          구글 폼 열기
        </button>
        <button className="btn btn-secondary" onClick={copyLink}>
          링크 복사
        </button>
        <button className="btn btn-outline" onClick={onBack}>
          이전으로
        </button>
        <button
          className="btn btn-outline"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={onRestart}
        >
          처음으로
        </button>
      </div>

      {showToast && <div className="copy-toast">링크가 복사되었습니다!</div>}
    </div>
  );
}
