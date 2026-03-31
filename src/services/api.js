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
 * 시트에 직접 저장
 * @param {string} idToken
 * @param {string} cellId
 * @param {{ attendees: string[], absences: {name,reason}[], sharing: {name,content}[], prayers: {name,content}[], notes?: string }} record
 */
export async function submitRecord(idToken, cellId, record) {
  return postAction({ action: 'submit', idToken, cellId, ...record });
}

/**
 * 대시보드 데이터 조회 (목사님용)
 * @param {string} idToken — Google ID 토큰
 * @returns {{ cells, members, attendance, submissions } | { error }}
 */
export async function fetchDashboard(idToken) {
  return postAction({ action: 'dashboard', idToken });
}

/**
 * 멤버 셀 이동 (admin 전용)
 */
export async function moveMember(idToken, name, fromCellId, toCellId) {
  return postAction({ action: 'moveMember', idToken, name, fromCellId, toCellId });
}

/**
 * 새신자/방문자 카드 제출 (인증 불필요)
 */
export async function submitNewcomer(data) {
  return postAction({ action: 'newcomer', ...data });
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────

async function postAction(body) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL 환경변수가 설정되지 않았습니다.');
  }

  // [SECURE] text/plain 사용 — application/json은 CORS preflight를 유발하고
  // Apps Script는 OPTIONS 요청을 지원하지 않음
  const res = await fetch(SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(body),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`서버 오류: ${res.status}`);
  }

  return res.json();
}
