import { useState, useCallback } from 'react';
import './App.css';
import NameInput from './components/NameInput';
import Lottery from './components/Lottery';
import SharingNotes from './components/SharingNotes';
import FormSubmit from './components/FormSubmit';

const STEPS = ['이름 입력', '역할 추첨', '나눔 기록', '폼 제출'];

function App() {
  const [step, setStep] = useState(0);
  const [names, setNames] = useState([]);
  const [results, setResults] = useState(null);
  const [sharingText, setSharingText] = useState('');

  const handleLotteryResult = useCallback((result, goNext) => {
    setResults(result);
    if (goNext) {
      setStep(2);
    }
  }, []);

  const handleReShuffle = useCallback(() => {
    setResults(null);
  }, []);

  const handleSkipLottery = () => {
    setStep(2);
  };

  const handleSharingNext = (text) => {
    setSharingText(text);
    setStep(3);
  };

  const handleRestart = () => {
    setStep(0);
    setNames([]);
    setResults(null);
    setSharingText('');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>오늘의 섬김</h1>
        <p>셀 역할 추첨 &amp; 리더 일지</p>
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
            onSkip={handleSkipLottery}
          />
        )}

        {step === 1 && (
          <Lottery
            names={names}
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

export default App;
