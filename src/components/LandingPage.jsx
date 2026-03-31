export default function LandingPage({ onSelect }) {
  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="landing-icon">&#9968;</div>
        <h1 className="landing-title">오늘의 섬김</h1>
        <p className="landing-subtitle">홍대청년교회</p>

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
