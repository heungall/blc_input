import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { loginWithToken } from '../services/api';

// [SECURE] ID 토큰(JWT) 페이로드 디코딩 — 서버 검증 전 클라이언트 표시용
function decodeIdToken(token) {
  try {
    const payload = token.split('.')[1];
    // [SECURE] base64url → base64 변환 후 디코딩
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(
      json.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    ));
  } catch {
    return null;
  }
}

export default function Login() {
  const { login, setLoading, loading } = useAuth();
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    const idToken = credentialResponse.credential;

    // 클라이언트 측에서 프로필 정보 디코딩 (표시용, 보안 검증은 서버에서)
    const profile = decodeIdToken(idToken);
    if (!profile) {
      setError('토큰 파싱에 실패했습니다.');
      setLoading(false);
      return;
    }

    try {
      // Apps Script에서 토큰 검증 + 소속 셀 + 멤버 목록 조회
      const result = await loginWithToken(idToken);
      console.log('Login response:', JSON.stringify(result));
      if (result.error) {
        setError(result.error);
        return;
      }
      login(profile, result, idToken);
    } catch (err) {
      // [SECURE] 내부 오류 노출 금지
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🙏</div>
        <h1 className="login-title">오늘의 섬김</h1>
        <p className="login-subtitle">셀 리더 일지 앱</p>

        <div className="login-google-btn">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google 로그인에 실패했습니다.')}
            useOneTap
            locale="ko"
          />
        </div>

        {loading && (
          <p className="login-status">셀 정보를 불러오는 중...</p>
        )}

        {error && (
          <p className="login-error">{error}</p>
        )}

        <p className="login-notice">
          등록된 셀 리더 계정으로만 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
