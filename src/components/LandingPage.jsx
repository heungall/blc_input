import { useState, useEffect } from 'react';
import { getSettings } from '../services/api';

export default function LandingPage({ onSelect }) {
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem('blc_settings') || '{}'); }
    catch { return {}; }
  })();
  const [motto, setMotto] = useState(cached.motto || '');
  const [year, setYear] = useState(cached.year || '');

  useEffect(() => {
    getSettings().then(s => {
      if (s.motto) setMotto(s.motto);
      if (s.year) setYear(s.year);
      localStorage.setItem('blc_settings', JSON.stringify(s));
    }).catch(() => {});
  }, []);

  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 className="landing-title">BLC 홍대교회</h1>

        {motto && (
          <div className="landing-motto">
            {year && <span className="landing-motto-year">{year}</span>}
            <p className="landing-motto-text">{motto}</p>
          </div>
        )}

        <div className="landing-options">
          <button className="landing-btn leader" onClick={() => onSelect('leader')}>
            <span className="landing-btn-icon">&#128221;</span>
            <div className="landing-btn-text">
              <div className="landing-btn-title">셀 리더</div>
              <div className="landing-btn-desc">출결 체크 / 나눔 기록 / 일지 제출</div>
            </div>
          </button>

          <button className="landing-btn newmember" onClick={() => onSelect('newmember')}>
            <span className="landing-btn-icon">&#128075;</span>
            <div className="landing-btn-text">
              <div className="landing-btn-title">새신자 / 방문자</div>
              <div className="landing-btn-desc">방문자 카드 작성</div>
            </div>
          </button>

          <button className="landing-btn admin" onClick={() => onSelect('admin')}>
            <span className="landing-btn-icon">&#128202;</span>
            <div className="landing-btn-text">
              <div className="landing-btn-title">관리자</div>
              <div className="landing-btn-desc">대시보드 / 출석 현황</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
