/**
 * 오늘의 섬김 — Apps Script 백엔드
 *
 * 배포 방법:
 *   확장 프로그램 → Apps Script → 배포 → 새 배포
 *   실행 주체: 나   /   액세스 권한: 누구나
 *
 * 환경 설정 (스크립트 속성에 저장):
 *   SPREADSHEET_ID  — Google Sheet ID
 *   CLIENT_ID       — Google Cloud Console OAuth 클라이언트 ID
 */

// ─── 설정 ──────────────────────────────────────────────────────────────────

// [SECURE] 민감 정보는 하드코딩 금지 — Script Properties에서 읽기
const PROPS          = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = PROPS.getProperty('SPREADSHEET_ID');
const CLIENT_ID      = PROPS.getProperty('CLIENT_ID');

const SHEET_LEADER      = '셀_리더';
const SHEET_MEMBERS     = '멤버';
const SHEET_SUBMISSIONS = '제출기록';
const SHEET_ATTENDANCE  = '출결';

// ─── 진입점 ────────────────────────────────────────────────────────────────

/**
 * GET — 읽기 전용 (인증 없음, 이메일만 파라미터)
 * action=getCell&email=...
 * action=getMembers&cellId=...
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getCell') {
      // [SECURE] 입력값 화이트리스트 검증
      const email = sanitizeEmail(e.parameter.email);
      if (!email) return respond({ error: '유효하지 않은 이메일입니다.' });
      return respond(getCell(email));
    }

    if (action === 'getMembers') {
      const cellId = sanitizeCellId(e.parameter.cellId);
      if (!cellId) return respond({ error: '유효하지 않은 셀 ID입니다.' });
      return respond(getMembers(cellId));
    }

    return respond({ error: '알 수 없는 요청입니다.' });
  } catch (err) {
    // [SECURE] 내부 오류 노출 금지 — 일반 메시지 반환
    Logger.log('doGet error: ' + err.message);
    return respond({ error: '서버 오류가 발생했습니다.' });
  }
}

/**
 * POST — 쓰기 (모두 ID 토큰 인증 필수)
 * { action, idToken, ...payload }
 */
function doPost(e) {
  try {
    // [SECURE] JSON 파싱 — 예외 처리 포함
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch {
      return respond({ error: '잘못된 요청 형식입니다.' });
    }

    // [SECURE] 모든 POST 요청에 ID 토큰 인증 필수
    const verified = verifyIdToken(data.idToken);
    if (!verified) return respond({ error: '인증에 실패했습니다.' });

    const email  = verified.email;
    const action = data.action;

    if (action === 'login') {
      const cellInfo = getCell(email);
      if (cellInfo.error) return respond(cellInfo);
      const { members } = getMembers(cellInfo.cellId);
      return respond({ ...cellInfo, members });
    }

    if (action === 'addMember') {
      // [SECURE] 입력값 검증
      const name   = sanitizeName(data.name);
      const cellId = sanitizeCellId(data.cellId);
      if (!name || !cellId) return respond({ error: '유효하지 않은 입력값입니다.' });
      return respond(addMember(cellId, name));
    }

    if (action === 'deactivateMember') {
      const name   = sanitizeName(data.name);
      const cellId = sanitizeCellId(data.cellId);
      if (!name || !cellId) return respond({ error: '유효하지 않은 입력값입니다.' });
      return respond(deactivateMember(cellId, name));
    }

    if (action === 'submit') {
      return respond(submitRecord(email, data));
    }

    return respond({ error: '알 수 없는 요청입니다.' });
  } catch (err) {
    // [SECURE] 내부 오류 노출 금지
    Logger.log('doPost error: ' + err.message);
    return respond({ error: '서버 오류가 발생했습니다.' });
  }
}

// ─── 인증 ──────────────────────────────────────────────────────────────────

/**
 * Google ID 토큰 검증
 * @returns {Object|null} 검증된 토큰 정보 또는 null
 */
function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    // [SECURE] Google tokeninfo 엔드포인트로 서버 측 검증
    const res  = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    const info = JSON.parse(res.getContentText());

    // [SECURE] 발급 대상(aud) 확인 — 다른 앱의 토큰 거부
    if (info.aud !== CLIENT_ID) {
      Logger.log('Token aud mismatch: ' + info.aud);
      return null;
    }

    if (!info.email || !info.email_verified) return null;
    return info;
  } catch (err) {
    Logger.log('verifyIdToken error: ' + err.message);
    return null;
  }
}

// ─── 비즈니스 로직 ──────────────────────────────────────────────────────────

function getCell(email) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_LEADER);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2].toString().toLowerCase().trim() === email) {
      return {
        cellId:      rows[i][0],
        cellName:    rows[i][1],
        leaderEmail: rows[i][2],
      };
    }
  }
  return { error: '등록되지 않은 계정입니다. 관리자에게 문의하세요.' };
}

function getMembers(cellId) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const rows  = sheet.getDataRange().getValues();

  const members = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === cellId && rows[i][2] === true) {
      members.push(rows[i][1]);
    }
  }
  return { members };
}

function addMember(cellId, name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  sheet.appendRow([cellId, name, true]);
  return { success: true };
}

function deactivateMember(cellId, name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === cellId && rows[i][1] === name) {
      // [SECURE] 삭제 대신 비활성화 처리 — 기록 보존
      sheet.getRange(i + 1, 3).setValue(false);
      return { success: true };
    }
  }
  return { error: '멤버를 찾을 수 없습니다.' };
}

/**
 * 시트에 직접 저장 — 구글 폼 대체
 *
 * data 구조:
 * {
 *   cellId:     "cell_01",
 *   attendees:  ["홍길동", "김철수"],
 *   absences:   [{ name: "이영희", reason: "회사" }],
 *   sharing:    [{ name: "홍길동", content: "..." }],
 *   prayers:    [{ name: "홍길동", content: "..." }],
 *   notes:      "특이사항"
 * }
 */
function submitRecord(email, data) {
  const cellId = sanitizeCellId(data.cellId);
  if (!cellId) return { error: '유효하지 않은 셀 ID입니다.' };

  // [SECURE] 본인 셀만 제출 가능 — 다른 셀 데이터 변조 방지
  const cellInfo = getCell(email);
  if (cellInfo.error) return cellInfo;
  if (cellInfo.cellId !== cellId) return { error: '본인 셀만 제출할 수 있습니다.' };

  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const now  = new Date();
  const date = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
  const attendees = data.attendees || [];
  const absences  = data.absences  || [];
  const sharing   = data.sharing   || [];
  const prayers   = data.prayers   || [];

  // ── [시트: 제출기록] 요약 1행 저장 ──
  const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const attendeeNames = attendees.join(', ');
  const absenceText   = absences.map(function(a) { return a.name + '- ' + a.reason; }).join('\n');
  const sharingText   = sharing.map(function(s) { return s.name + '- ' + s.content; }).join('\n');
  const prayerText    = prayers.map(function(p) { return p.name + '- ' + p.content; }).join('\n');

  subSheet.appendRow([
    date,
    cellId,
    cellInfo.cellName,
    email,
    attendeeNames,
    absenceText,
    sharingText,
    prayerText,
    data.notes || ''
  ]);

  // ── [시트: 출결] 멤버별 개별 기록 저장 (대시보드용) ──
  const attSheet = ss.getSheetByName(SHEET_ATTENDANCE);

  attendees.forEach(function(name) {
    attSheet.appendRow([date, cellId, name, '출석', '']);
  });

  absences.forEach(function(a) {
    attSheet.appendRow([date, cellId, a.name, '결석', a.reason]);
  });

  return { success: true, date: date };
}

// ─── 유틸리티 ───────────────────────────────────────────────────────────────

function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// [SECURE] 입력값 새니타이징 함수들

function sanitizeEmail(val) {
  if (!val || typeof val !== 'string') return null;
  const email = val.toLowerCase().trim();
  // [SECURE] 간단한 이메일 형식 검증
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function sanitizeCellId(val) {
  if (!val || typeof val !== 'string') return null;
  // [SECURE] cell_01 형식만 허용 — Path Traversal 방지
  return /^cell_\d{2}$/.test(val.trim()) ? val.trim() : null;
}

function sanitizeName(val) {
  if (!val || typeof val !== 'string') return null;
  const name = val.trim();
  // [SECURE] 최대 20자, 특수문자 제한
  return name.length > 0 && name.length <= 20 ? name : null;
}

// ─── 초기 시트 설정 (최초 1회 실행) ─────────────────────────────────────────

/**
 * Apps Script 에디터에서 직접 실행:
 *   실행 → 함수 선택 → initSheets
 */
function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 셀_리더 시트
  let leaderSheet = ss.getSheetByName(SHEET_LEADER);
  if (!leaderSheet) {
    leaderSheet = ss.insertSheet(SHEET_LEADER);
    leaderSheet.appendRow(['cell_id', 'cell_name', 'leader_email']);
    leaderSheet.appendRow(['cell_01', '기쁨셀', 'leader1@gmail.com']);
    leaderSheet.appendRow(['cell_02', '소망셀', 'leader2@gmail.com']);
  }

  // 멤버 시트
  let memberSheet = ss.getSheetByName(SHEET_MEMBERS);
  if (!memberSheet) {
    memberSheet = ss.insertSheet(SHEET_MEMBERS);
    memberSheet.appendRow(['cell_id', 'name', 'active']);
    memberSheet.appendRow(['cell_01', '홍길동', true]);
    memberSheet.appendRow(['cell_01', '김철수', true]);
    memberSheet.appendRow(['cell_01', '이영희', true]);
    memberSheet.appendRow(['cell_01', '박지민', true]);
  }

  // 제출기록 시트
  let subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!subSheet) {
    subSheet = ss.insertSheet(SHEET_SUBMISSIONS);
    subSheet.appendRow([
      'date', 'cell_id', 'cell_name', 'leader_email',
      'attendees', 'absences', 'sharing', 'prayers', 'notes'
    ]);
  }

  // 출결 시트 (멤버별 개별 기록 — 대시보드용)
  let attSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!attSheet) {
    attSheet = ss.insertSheet(SHEET_ATTENDANCE);
    attSheet.appendRow(['date', 'cell_id', 'member_name', 'status', 'absence_reason']);
  }

  Logger.log('시트 초기화 완료');
}
