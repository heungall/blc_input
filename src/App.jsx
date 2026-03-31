import { useState, useCallback, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Attendance from './components/Attendance';
import Lottery from './components/Lottery';
import SharingPrayers from './components/SharingPrayers';
import Submit from './components/Submit';

const STEPS = ['출결 체크', '역할 추첨', '나눔 기록', '제출'];

function AppContent() {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(0);

  // { [name]: { present: boolean, reason: string } }
  const [attendance, setAttendance] = useState({});
  const [lotteryResults, setLotteryResults] = useState(null);
  const [sharingData, setSharingData] = useState({ sharing: [], prayers: [] });

  // 로그인 후 멤버 목록으로 출결 초기화
  useEffect(() => {
    if (user && user.members.length > 0 && Object.keys(attendance).length === 0) {
      const init = {};
      user.members.forEach(name => {
        init[name] = { present: true, reason: '' };
      });
      setAttendance(init);
    }
  }, [user, attendance]);

  const attendees = Object.keys(attendance).filter(n => attendance[n].present);
  const absences = Object.keys(attendance)
    .filter(n => !attendance[n].present)
    .map(n => ({ name: n, reason: attendance[n].reason || '미입력' }));

  const handleLotteryResult = useCallback((result, goNext) => {
    setLotteryResults(result);
    if (goNext) setStep(2);
  }, []);

  const handleReShuffle = useCallback(() => {
    setLotteryResults(null);
  }, []);

  const handleSharingNext = ({ sharing, prayers }) => {
    setSharingData({ sharing, prayers });
    setStep(3);
  };

  const handleRestart = () => {
    setStep(0);
    const init = {};
    (user?.members || []).forEach(name => {
      init[name] = { present: true, reason: '' };
    });
    setAttendance(init);
    setLotteryResults(null);
    setSharingData({ sharing: [], prayers: [] });
  };

  if (!user) return <Login />;

  return (
    <div className="app">
      <header className="header">
        <div className="header-main">
          <h1>오늘의 섬김</h1>
          <p>{user.cellName}</p>
        </div>
        <div className="header-user">
          <img src={user.picture} alt={user.name} className="user-avatar" />
          <button className="logout-btn" onClick={logout} title="로그아웃">
            &#10005;
          </button>
        </div>
      </header>

      <div className="steps-indicator">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            title={label}
          />
        ))}
      </div>

      <div className="content">
        {step === 0 && (
          <Attendance
            attendance={attendance}
            setAttendance={setAttendance}
            onNext={() => setStep(1)}
            onSkipLottery={() => setStep(2)}
          />
        )}

        {step === 1 && (
          <Lottery
            names={attendees}
            initialResults={lotteryResults}
            onResult={handleLotteryResult}
            onReShuffle={handleReShuffle}
          />
        )}

        {step === 2 && (
          <SharingPrayers
            attendees={attendees}
            onNext={handleSharingNext}
            onBack={() => setStep(lotteryResults ? 1 : 0)}
          />
        )}

        {step === 3 && (
          <Submit
            attendees={attendees}
            absences={absences}
            sharing={sharingData.sharing}
            prayers={sharingData.prayers}
            onBack={() => setStep(2)}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
