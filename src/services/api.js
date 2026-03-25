/**
 * Apps Script API 호출 레이어
 * VITE_APPS_SCRIPT_URL — 배포된 Apps Script 웹 앱 URL
 */

// [SECURE] 민감 정보는 환경변수에서 읽기 — 하드코딩 금지
const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

/**
 * ID 토큰 검증 + 소속 셀 + 멤버 목록 반환
 * @param {string} idToken — Google ID 토큰
 * @returns {{ cellId, cellName, members } | { error }}
 */
export async function loginWithToken(idToken) {
  return postAction({ action: 'login', idToken });
}

/**
 * 멤버 추가
 */
export async function addMember(idToken, cellId, name) {
  return postAction({ action: 'addMember', idToken, cellId, name });
}

/**
 * 멤버 비활성화 (삭제 대신 active=FALSE)
 */
export async function deactivateMember(idToken, cellId, name) {
  return postAction({ action: 'deactivateMember', idToken, cellId, name });
}

/**
 * 구글 폼 자동 제출
 * @param {string} idToken
 * @param {{ attendees, absences, sharing, prayers }} formData
 */
export async function submitForm(idToken, formData) {
  return postAction({ action: 'submitForm', idToken, ...formData });
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────

async function postAction(body) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL 환경변수가 설정되지 않았습니다.');
  }

  const res = await fetch(SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`서버 오류: ${res.status}`);
  }

  return res.json();
}
