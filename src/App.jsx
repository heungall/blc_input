import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import WeeklySummary from './components/WeeklySummary';
import Attendance from './components/Attendance';
import Lottery from './components/Lottery';
import SharingPrayers from './components/SharingPrayers';
import Submit from './components/Submit';
import MemberManage from './components/MemberManage';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import NewMemberForm from './components/NewMemberForm';
import Help from './components/Help';
import { submitRecord, fetchDashboard } from './services/api';

const STEPS = ['출결 체크', '역할 추첨', '나눔 기록', '제출'];

// step: -1 = 요약(이번 주 기록 있을 때), 0~3 = 입력 흐름
function AppContent({ onBackToLanding }) {
  const { user, logout } = useAuth();
  const [step, setStepRaw] = useState(0);

  const setStep = (s) => {
    setStepRaw(s);
    window.scrollTo(0, 0);
  };

  const [attendance, setAttendance] = useState({});
  const [lotteryResults, setLotteryResults] = useState(null);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [memberList, setMemberList] = useState([]);
  const [sharingData, setSharingData] = useState({ sharing: [], prayers: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // 최신 제출 데이터 보관 (요약 화면 + 수정 시 기존 데이터 유지)
  const latestWeekly = useRef(null);

  // 로그인 후 멤버 목록 + 이번 주 기존 데이터로 초기화
  useEffect(() => {
    if (!user || user.members.length === 0 || initialized) return;

    const weekly = user.weeklyData;
    const init = {};

    if (weekly) {
      latestWeekly.current = weekly;

      const attendeeSet = new Set(weekly.attendees || []);
      const absenceMap = {};
      (weekly.absences || []).forEach(a => { absenceMap[a.name] = a.reason; });

      // [SECURE] 현재 활성 멤버만 포함 — 비활성화된 멤버 재출현 방지
      const allNames = new Set(user.members);
      allNames.forEach(name => {
        if (absenceMap[name] !== undefined) {
          init[name] = { present: false, reason: absenceMap[name] };
        } else if (attendeeSet.has(name)) {
          init[name] = { present: true, reason: '' };
        } else {
          init[name] = { present: true, reason: '' };
        }
      });

      restoreSharingToLocalStorage(weekly);
      setIsEditing(true);
      setStep(-1);
    } else {
      user.members.forEach(name => {
        init[name] = { present: true, reason: '' };
      });
    }

    setAttendance(init);
    setMemberList(user.members);
    setInitialized(true);
  }, [user, initialized]);

  // 멤버 관리에서 변경 시 출결 목록도 동기화
  useEffect(() => {
    if (!initialized || memberList.length === 0) return;
    setAttendance(prev => {
      const next = {};
      memberList.forEach(name => {
        next[name] = prev[name] || { present: true, reason: '' };
      });
      return next;
    });
  }, [memberList, initialized]);

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
    setIsEditing(false);
  };

  // 수정 모드에서 출결만 바로 저장
  const handleQuickSave = async () => {
    const weekly = latestWeekly.current || {};
    try {
      const res = await submitRecord(user.idToken, user.cellId, {
        attendees,
        absences,
        sharing: weekly.sharing || [],
        prayers: weekly.prayers || [],
        notes: weekly.notes || '',
      });
      if (res.error) {
        alert(res.error);
      } else {
        // 최신 데이터 업데이트
        latestWeekly.current = {
          attendees,
          absences,
          sharing: weekly.sharing || [],
          prayers: weekly.prayers || [],
          notes: weekly.notes || '',
        };
        setStep(-1);
      }
    } catch (err) {
      console.error('quickSave error:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 대시보드 열기 (admin만)
  const openDashboard = async () => {
    setShowDashboard(true);
    setDashboardData(null);
    try {
      const res = await fetchDashboard(user.idToken);
      if (res.error) {
        alert(res.error);
        setShowDashboard(false);
      } else {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('dashboard error:', err);
      alert('대시보드 데이터를 불러올 수 없습니다.');
      setShowDashboard(false);
    }
  };

  // 제출 완료 후 요약으로 돌아가기
  const handleSubmitDone = (submittedData) => {
    // 최신 데이터로 갱신
    if (submittedData) {
      latestWeekly.current = submittedData;
      restoreSharingToLocalStorage(submittedData);
    }
    setStep(-1);
    setIsEditing(true);
  };

  if (!user) return <Login />;

  return (
    <div className="app">
      <header className="header">
        <div className="header-main">
          <h1>BLC 홍대교회</h1>
          <p>{user.cellName}</p>
        </div>
        <div className="header-user">
          {user.role === 'admin' && (
            <button className="header-icon-btn" onClick={() => { openDashboard(); setShowMemberManage(false); setShowHelp(false); }} title="대시보드">
              &#9776;
            </button>
          )}
          <button className="header-icon-btn" onClick={() => { setShowMemberManage(true); setShowDashboard(false); setShowHelp(false); }} title="멤버 관리">
            &#9881;
          </button>
          <img src={user.picture} alt={user.name} className="user-avatar" />
          <button className="header-icon-btn" onClick={() => { setShowHelp(true); setShowDashboard(false); setShowMemberManage(false); }} title="도움말">
            ?
          </button>
          <button className="logout-btn" onClick={() => { logout(); onBackToLanding(); }} title="로그아웃">
            &#10005;
          </button>
        </div>
      </header>

      {!showMemberManage && !showDashboard && step >= 0 && (
        <div className="steps-indicator">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              title={label}
            />
          ))}
        </div>
      )}

      <div className="content">
        {showHelp && (
          <Help onClose={() => setShowHelp(false)} userRole={user.role} />
        )}

        {!showHelp && showDashboard && (
          <Dashboard
            data={dashboardData}
            onBack={() => setShowDashboard(false)}
          />
        )}

        {!showHelp && !showDashboard && showMemberManage && (
          <MemberManage
            members={memberList}
            setMembers={setMemberList}
            onClose={() => setShowMemberManage(false)}
          />
        )}

        {!showHelp && !showDashboard && !showMemberManage && step === -1 && (
          <WeeklySummary
            weeklyData={latestWeekly.current || user.weeklyData}
            onEditAttendance={() => setStep(0)}
            onEditSharing={() => setStep(2)}
            onEditAll={handleRestart}
          />
        )}

        {!showHelp && !showDashboard && !showMemberManage && step === 0 && (
          <Attendance
            attendance={attendance}
            setAttendance={setAttendance}
            onNext={() => setStep(1)}
            onSkipLottery={() => setStep(2)}
            isEditing={isEditing}
            onBackToSummary={isEditing ? () => setStep(-1) : null}
            onQuickSave={isEditing ? handleQuickSave : null}
          />
        )}

        {!showHelp && !showDashboard && !showMemberManage && step === 1 && (
          <Lottery
            names={attendees}
            initialResults={lotteryResults}
            onResult={handleLotteryResult}
            onReShuffle={handleReShuffle}
          />
        )}

        {!showHelp && !showDashboard && !showMemberManage && step === 2 && (
          <SharingPrayers
            attendees={attendees}
            onNext={handleSharingNext}
            onBack={() => setStep(lotteryResults ? 1 : 0)}
            onBackToSummary={isEditing ? () => setStep(-1) : null}
          />
        )}

        {!showHelp && !showDashboard && !showMemberManage && step === 3 && (
          <Submit
            attendees={attendees}
            absences={absences}
            sharing={sharingData.sharing}
            prayers={sharingData.prayers}
            notes={(latestWeekly.current || user.weeklyData)?.notes}
            isEditing={isEditing}
            onBack={() => setStep(2)}
            onRestart={handleRestart}
            onDone={handleSubmitDone}
          />
        )}
      </div>
    </div>
  );
}

// 나눔/기도제목 데이터를 localStorage에 복원
function restoreSharingToLocalStorage(weekly) {
  const restore = {};
  (weekly.sharing || []).forEach(s => {
    restore[s.name] = { ...restore[s.name], sharing: s.content };
  });
  (weekly.prayers || []).forEach(p => {
    restore[p.name] = { ...restore[p.name], prayer: p.content };
  });
  if (Object.keys(restore).length > 0) {
    localStorage.setItem('blc_sharing_prayers', JSON.stringify(restore));
  }
}

export default function App() {
  const [mode, setMode] = useState(null); // null=landing, 'leader', 'newmember', 'admin'

  if (!mode) {
    return <LandingPage onSelect={setMode} />;
  }

  if (mode === 'newmember') {
    return <NewMemberForm onBack={() => setMode(null)} />;
  }

  // 'leader' 또는 'admin' → 기존 앱 (로그인 후 role에 따라 분기)
  return (
    <AuthProvider>
      <AppContent onBackToLanding={() => setMode(null)} />
    </AuthProvider>
  );
}
