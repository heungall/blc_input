import { useState, useCallback } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import NameInput from './components/NameInput';
import Lottery from './components/Lottery';
import SharingNotes from './components/SharingNotes';
import FormSubmit from './components/FormSubmit';

const STEPS = ['출결 확인', '역할 추첨', '나눔 기록', '폼 제출'];

function AppContent() {
  const { user, logout } = useAuth();
  const [step, setStep]           = useState(0);
  const [names, setNames]         = useState([]);
  const [results, setResults]     = useState(null);
  const [sharingText, setSharingText] = useState('');

  // 로그인 후 멤버 목록으로 초기화
  const prevUserRef = useCallback((u) => {
    if (u && names.length === 0 && u.members.length > 0) {
      setNames(u.members);
    }
  }, [names.length]);
  prevUserRef(user);

  const handleLotteryResult = useCallback((result, goNext) => {
    setResults(result);
    if (goNext) setStep(2);
  }, []);

  const handleReShuffle = useCallback(() => {
    setResults(null);
  }, []);

  const handleSharingNext = (text) => {
    setSharingText(text);
    setStep(3);
  };

  const handleRestart = () => {
    setStep(0);
    setNames(user?.members || []);
    setResults(null);
    setSharingText('');
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
            ✕
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
          <NameInput
            names={names}
            setNames={setNames}
            onNext={() => setStep(1)}
            onSkip={() => setStep(2)}
          />
        )}

        {step === 1 && (
          <Lottery
            names={names}
            initialResults={results}
            onResult={handleLotteryResult}
            onReShuffle={handleReShuffle}
          />
        )}

        {step === 2 && (
          <SharingNotes
            names={names}
            onNext={handleSharingNext}
            onBack={() => setStep(results ? 1 : 0)}
          />
        )}

        {step === 3 && (
          <FormSubmit
            names={names}
            sharingText={sharingText}
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
