import { useState } from 'react';
import { submitNewcomer } from '../services/api';

const VISIT_REASONS = [
  '다닐 교회를 찾는 중',
  '서울 or 홍대지역 방문 중 예배드리기 위해',
  '탐방',
];

const VISIT_CHANNELS = [
  '지인 추천',
  'SNS',
  '인터넷 검색',
];

const FAITH_OPTIONS = [
  '처음 or 경험 없음',
  '전에 교회 다녀본 경험',
  '계속 신앙생활 해왔음',
];

const AFTER_OPTIONS = [
  '바로 떠나야 합니다',
  '간단한 교회 소개',
  '이어지는 모임 참여',
];

export default function NewMemberForm({ onBack }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    visitReason: '',
    visitReasonOther: '',
    visitChannel: '',
    visitChannelOther: '',
    faith: '',
    prevChurch: '',
    heresyCheck: '',
    afterPlan: '',
    agree: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid = form.name.trim() && form.phone.trim() && form.agree === '동의';

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    try {
      const res = await submitNewcomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        visitReason: form.visitReason === '__other__' ? form.visitReasonOther : form.visitReason,
        visitChannel: form.visitChannel === '__other__' ? form.visitChannelOther : form.visitChannel,
        faith: form.faith,
        prevChurch: form.prevChurch.trim(),
        heresyCheck: form.heresyCheck,
        afterPlan: form.afterPlan,
        agree: form.agree,
      });
      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true });
      }
    } catch (err) {
      // [SECURE] 내부 오류 노출 금지
      console.error('submit error:', err);
      setResult({ error: '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="app">
        <div className="content">
          <div className="card submit-success">
            <div className="success-icon">&#10003;</div>
            <h2>제출 완료!</h2>
            <p className="card-desc">방문자 카드가 제출되었습니다. 감사합니다!</p>
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={onBack}>
              처음으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-main">
          <h1>방문자 카드</h1>
          <p>새 멤버 / 방문자 작성</p>
        </div>
        <button className="logout-btn" onClick={onBack} title="뒤로">
          &#10005;
        </button>
      </header>

      <div className="content">
        <div className="card">
          <h2>기본 정보</h2>

          <div className="nm-field">
            <label className="nm-label">이름 <span className="nm-required">*</span></label>
            <input
              type="text"
              className="nm-input"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div className="nm-field">
            <label className="nm-label">휴대폰 번호 <span className="nm-required">*</span></label>
            <input
              type="tel"
              inputMode="numeric"
              className="nm-input"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>

          <div className="nm-field">
            <label className="nm-label">주소</label>
            <input
              type="text"
              className="nm-input"
              placeholder="거주 지역을 입력하세요"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <h2>방문 정보</h2>

          <div className="nm-field">
            <label className="nm-label">방문 동기</label>
            <div className="nm-radio-group">
              {VISIT_REASONS.map(r => (
                <label key={r} className={`nm-radio ${form.visitReason === r ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="visitReason"
                    checked={form.visitReason === r}
                    onChange={() => update('visitReason', r)}
                  />
                  {r}
                </label>
              ))}
              <label className={`nm-radio ${form.visitReason === '__other__' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="visitReason"
                  checked={form.visitReason === '__other__'}
                  onChange={() => update('visitReason', '__other__')}
                />
                기타
              </label>
            </div>
            {form.visitReason === '__other__' && (
              <input
                type="text"
                className="nm-input nm-other-input"
                placeholder="직접 입력"
                value={form.visitReasonOther}
                onChange={(e) => update('visitReasonOther', e.target.value)}
              />
            )}
          </div>

          <div className="nm-field">
            <label className="nm-label">방문 경로</label>
            <div className="nm-radio-group">
              {VISIT_CHANNELS.map(r => (
                <label key={r} className={`nm-radio ${form.visitChannel === r ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="visitChannel"
                    checked={form.visitChannel === r}
                    onChange={() => update('visitChannel', r)}
                  />
                  {r}
                </label>
              ))}
              <label className={`nm-radio ${form.visitChannel === '__other__' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="visitChannel"
                  checked={form.visitChannel === '__other__'}
                  onChange={() => update('visitChannel', '__other__')}
                />
                기타
              </label>
            </div>
            {form.visitChannel === '__other__' && (
              <input
                type="text"
                className="nm-input nm-other-input"
                placeholder="직접 입력"
                value={form.visitChannelOther}
                onChange={(e) => update('visitChannelOther', e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="card">
          <h2>신앙 생활</h2>

          <div className="nm-field">
            <label className="nm-label">신앙 생활 경험</label>
            <div className="nm-radio-group">
              {FAITH_OPTIONS.map(r => (
                <label key={r} className={`nm-radio ${form.faith === r ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="faith"
                    checked={form.faith === r}
                    onChange={() => update('faith', r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          {form.faith && form.faith !== '처음 or 경험 없음' && (
            <div className="nm-field">
              <label className="nm-label">이전 교회 / 담당 목사님 성함</label>
              <input
                type="text"
                className="nm-input"
                placeholder="교회명 / 목사님 성함"
                value={form.prevChurch}
                onChange={(e) => update('prevChurch', e.target.value)}
              />
            </div>
          )}

          {form.faith && form.faith !== '처음 or 경험 없음' && (
            <div className="nm-field">
              <label className="nm-label">이단 관련 단체에 소속되어 있거나 활동한 적이 없습니다</label>
              <div className="nm-radio-group">
                <label className={`nm-radio ${form.heresyCheck === '예' ? 'selected' : ''}`}>
                  <input type="radio" name="heresy" checked={form.heresyCheck === '예'} onChange={() => update('heresyCheck', '예')} />
                  예
                </label>
                <label className={`nm-radio ${form.heresyCheck === '아니오' ? 'selected' : ''}`}>
                  <input type="radio" name="heresy" checked={form.heresyCheck === '아니오'} onChange={() => update('heresyCheck', '아니오')} />
                  아니오
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>예배 이후</h2>

          <div className="nm-field">
            <label className="nm-label">예배 이후 일정</label>
            <div className="nm-radio-group">
              {AFTER_OPTIONS.map(r => (
                <label key={r} className={`nm-radio ${form.afterPlan === r ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="afterPlan"
                    checked={form.afterPlan === r}
                    onChange={() => update('afterPlan', r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>개인정보 수집 동의 <span className="nm-required">*</span></h2>
          <p className="card-desc">
            작성하신 개인정보는 교회 내부 목적으로만 사용됩니다.
          </p>
          <div className="nm-radio-group">
            <label className={`nm-radio ${form.agree === '동의' ? 'selected' : ''}`}>
              <input type="radio" name="agree" checked={form.agree === '동의'} onChange={() => update('agree', '동의')} />
              동의
            </label>
            <label className={`nm-radio ${form.agree === '동의하지 않음' ? 'selected' : ''}`}>
              <input type="radio" name="agree" checked={form.agree === '동의하지 않음'} onChange={() => update('agree', '동의하지 않음')} />
              동의하지 않음
            </label>
          </div>
        </div>

        {result?.error && (
          <div className="submit-error">{result.error}</div>
        )}

        <div className="btn-group">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
          <button className="btn btn-outline" onClick={onBack} disabled={submitting}>
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
}
