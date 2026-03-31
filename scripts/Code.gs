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
const SHEET_NEWCOMERS   = '새신자';

// ─── 진입점 ────────────────────────────────────────────────────────────────

/**
 * GET — 읽기 전용 (인증 없음, 이메일만 파라미터)
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

    // [SECURE] 새신자 등록은 인증 없이 허용 (공개 폼 대체)
    if (data.action === 'newcomer') {
      return respond(saveNewcomer(data));
    }

    // [SECURE] 그 외 모든 POST 요청에 ID 토큰 인증 필수
    const verified = verifyIdToken(data.idToken);
    if (!verified) return respond({ error: '인증에 실패했습니다.' });

    const email  = verified.email;
    const action = data.action;

    if (action === 'login') {
      var cellInfo = getCell(email);
      if (cellInfo.error) return respond(cellInfo);
      var loginMembers = getMembers(cellInfo.cellId);
      // 로그인 시 이번 주 기존 제출 데이터도 함께 반환
      var weekly = getWeeklySubmission(cellInfo.cellId);
      return respond({
        cellId:      cellInfo.cellId,
        cellName:    cellInfo.cellName,
        leaderEmail: cellInfo.leaderEmail,
        role:        cellInfo.role,
        members:     loginMembers.members,
        weeklyData:  weekly
      });
    }

    if (action === 'addMember') {
      // [SECURE] 입력값 검증
      var name   = sanitizeName(data.name);
      var cellId = sanitizeCellId(data.cellId);
      if (!name || !cellId) return respond({ error: '유효하지 않은 입력값입니다.' });
      // [SECURE] 본인 셀만 멤버 추가 가능 — 다른 셀 변조 방지
      var callerCell = getCell(email);
      if (callerCell.error || callerCell.cellId !== cellId) return respond({ error: '본인 셀만 수정할 수 있습니다.' });
      return respond(addMember(cellId, name));
    }

    if (action === 'deactivateMember') {
      var name   = sanitizeName(data.name);
      var cellId = sanitizeCellId(data.cellId);
      if (!name || !cellId) return respond({ error: '유효하지 않은 입력값입니다.' });
      // [SECURE] 본인 셀만 멤버 비활성화 가능 — 다른 셀 변조 방지
      var callerCell = getCell(email);
      if (callerCell.error || callerCell.cellId !== cellId) return respond({ error: '본인 셀만 수정할 수 있습니다.' });
      return respond(deactivateMember(cellId, name));
    }

    if (action === 'submit') {
      return respond(submitRecord(email, data));
    }

    if (action === 'dashboard') {
      // [SECURE] admin 권한 확인 후 대시보드 데이터 반환
      return respond(getDashboardData(email));
    }

    return respond({ error: '알 수 없는 요청입니다.' });
  } catch (err) {
    // [SECURE] 내부 오류 노출 금지
    Logger.log('doPost error: ' + err.message);
    return respond({ error: '서버 오류가 발생했습니다.' });
  }
}

// ─── 인증 ──────────────────────────────────────────────────────────────────

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

// ─── 주간 날짜 유틸 ─────────────────────────────────────────────────────────

/**
 * 해당 날짜가 속한 주의 월요일 날짜를 반환 (KST 기준)
 */
function getWeekMonday(date) {
  var d = new Date(date.getTime());
  var day = d.getDay(); // 0=일, 1=월, ..., 6=토
  var diff = day === 0 ? -6 : 1 - day; // 일요일이면 전주 월요일
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 두 날짜가 같은 주(월~일)에 속하는지 확인
 */
function isSameWeek(date1, date2) {
  var m1 = getWeekMonday(date1);
  var m2 = getWeekMonday(date2);
  return m1.getTime() === m2.getTime();
}

// ─── 비즈니스 로직 ──────────────────────────────────────────────────────────

function getCell(email) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LEADER);
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][2].toString().toLowerCase().trim() === email) {
      return {
        cellId:      rows[i][0],
        cellName:    rows[i][1],
        leaderEmail: rows[i][2],
        role:        rows[i][3] || 'leader', // [SECURE] role 컬럼 (index 3), 기본값 leader
      };
    }
  }
  return { error: '등록되지 않은 계정입니다. 관리자에게 문의하세요.' };
}

function getMembers(cellId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_MEMBERS);
  var rows  = sheet.getDataRange().getValues();

  var members = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === cellId && rows[i][2] === true) {
      members.push(rows[i][1]);
    }
  }
  return { members: members };
}

function addMember(cellId, name) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_MEMBERS);
  sheet.appendRow([cellId, name, true]);
  return { success: true };
}

function deactivateMember(cellId, name) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_MEMBERS);
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === cellId && rows[i][1] === name) {
      // [SECURE] 삭제 대신 비활성화 처리 — 기록 보존
      sheet.getRange(i + 1, 3).setValue(false);
      return { success: true };
    }
  }
  return { error: '멤버를 찾을 수 없습니다.' };
}

/**
 * 이번 주(월~일) 해당 셀의 제출 기록 조회
 * @returns {Object|null} raw_data JSON 또는 null
 */
function getWeeklySubmission(cellId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  var rows  = sheet.getDataRange().getValues();
  var now   = new Date();

  // 최신 행부터 역순 탐색 (최근 제출을 빠르게 찾기 위해)
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] !== cellId) continue;

    var rowDate = new Date(rows[i][0]);
    if (isSameWeek(rowDate, now)) {
      // raw_data 컬럼 (10번째, index 9)
      var rawStr = rows[i][9];
      if (rawStr) {
        try {
          return JSON.parse(rawStr);
        } catch (e) {
          Logger.log('raw_data parse error row ' + (i + 1) + ': ' + e.message);
        }
      }
      return null;
    }

    // 이번 주보다 이전 데이터면 더 볼 필요 없음
    if (rowDate < getWeekMonday(now)) break;
  }
  return null;
}

/**
 * 시트에 직접 저장 — 이번 주 기존 기록이 있으면 업데이트
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
  var cellId = sanitizeCellId(data.cellId);
  if (!cellId) return { error: '유효하지 않은 셀 ID입니다.' };

  // [SECURE] 본인 셀만 제출 가능 — 다른 셀 데이터 변조 방지
  var cellInfo = getCell(email);
  if (cellInfo.error) return cellInfo;
  if (cellInfo.cellId !== cellId) return { error: '본인 셀만 제출할 수 있습니다.' };

  var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  var now  = new Date();
  var date = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
  var attendees = data.attendees || [];
  var absences  = data.absences  || [];
  var sharing   = data.sharing   || [];
  var prayers   = data.prayers   || [];

  var attendeeNames = attendees.join(', ');
  var absenceText   = absences.map(function(a) { return a.name + ' - ' + a.reason; }).join('\n');
  var sharingText   = sharing.map(function(s) { return s.name + ' - ' + s.content; }).join('\n');
  var prayerText    = prayers.map(function(p) { return p.name + ' - ' + p.content; }).join('\n');

  // raw_data: 프론트에서 복원 가능한 원본 JSON
  var rawData = JSON.stringify({
    attendees: attendees,
    absences:  absences,
    sharing:   sharing,
    prayers:   prayers,
    notes:     data.notes || ''
  });

  var rowValues = [
    date, cellId, cellInfo.cellName, email,
    attendeeNames, absenceText, sharingText, prayerText,
    data.notes || '', rawData
  ];

  // ── [시트: 제출기록] — 이번 주 기존 행 찾아서 업데이트 or 새 행 추가 ──
  var subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  var subRows  = subSheet.getDataRange().getValues();
  var existingRow = -1;

  for (var i = subRows.length - 1; i >= 1; i--) {
    if (subRows[i][1] !== cellId) continue;
    var rowDate = new Date(subRows[i][0]);
    if (isSameWeek(rowDate, now)) {
      existingRow = i + 1; // 시트 행 번호 (1-based)
      break;
    }
    if (rowDate < getWeekMonday(now)) break;
  }

  if (existingRow > 0) {
    // 기존 행 업데이트
    subSheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    // 새 행 추가
    subSheet.appendRow(rowValues);
  }

  // ── [시트: 출결] — 이번 주 기존 기록 삭제 후 새로 삽입 ──
  var attSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  var attRows  = attSheet.getDataRange().getValues();

  // 역순으로 이번 주 해당 셀 출결 행 삭제
  for (var j = attRows.length - 1; j >= 1; j--) {
    if (attRows[j][1] !== cellId) continue;
    var attDate = new Date(attRows[j][0]);
    if (isSameWeek(attDate, now)) {
      attSheet.deleteRow(j + 1);
    } else if (attDate < getWeekMonday(now)) {
      break;
    }
  }

  // 새 출결 기록 삽입
  attendees.forEach(function(name) {
    attSheet.appendRow([date, cellId, name, '출석', '']);
  });

  absences.forEach(function(a) {
    attSheet.appendRow([date, cellId, a.name, '결석', a.reason]);
  });

  var isUpdate = existingRow > 0;
  return { success: true, date: date, updated: isUpdate };
}

// ─── 대시보드 (admin 전용) ──────────────────────────────────────────────────

/**
 * admin 권한 확인 후 전체 대시보드 데이터 반환
 * @param {string} email — 인증된 사용자 이메일
 * @returns {Object} cells, members, attendance, submissions 또는 에러
 */
function getDashboardData(email) {
  // [SECURE] admin 권한 확인 — 셀_리더 시트에서 role 검증
  var cellInfo = getCell(email);
  if (cellInfo.error) return { error: '등록되지 않은 계정입니다.' };
  if (cellInfo.role !== 'admin') {
    // [SECURE] 권한 없는 접근 시도 로깅 — 내부 정보 노출 금지
    Logger.log('Unauthorized dashboard access attempt: ' + email);
    return { error: '대시보드 접근 권한이 없습니다.' };
  }

  return {
    cells:       getAllCells(),
    members:     getAllMembers(),
    attendance:  getAllAttendance(),
    submissions: getAllSubmissions(),
    newcomers:   getAllNewcomers()
  };
}

/**
 * 모든 셀 정보 조회
 * @returns {Array} [{ cellId, cellName }]
 */
function getAllCells() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LEADER);
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  // [SECURE] leaderEmail 미포함 — PII 노출 방지
  for (var i = 1; i < rows.length; i++) {
    result.push({
      cellId:   rows[i][0],
      cellName: rows[i][1]
    });
  }
  return result;
}

/**
 * 모든 멤버 조회 (active 여부 포함)
 * @returns {Array} [{ cellId, name, active }]
 */
function getAllMembers() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_MEMBERS);
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  // 셀 없는 멤버는 admin(목사님) 셀로 매핑
  var adminCellId = getAdminCellId();

  for (var i = 1; i < rows.length; i++) {
    var cellId = rows[i][0] || adminCellId;
    result.push({
      cellId: cellId,
      name:   rows[i][1],
      active: rows[i][2] === true
    });
  }
  return result;
}

/**
 * admin role을 가진 셀의 cellId 반환
 */
function getAdminCellId() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LEADER);
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][3] === 'admin') return rows[i][0];
  }
  return 'cell_00'; // fallback
}

/**
 * 전체 출결 기록 조회
 * @returns {Array} [{ date, cellId, memberName, status, absenceReason }]
 */
function getAllAttendance() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var dateVal = rows[i][0];
    var dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, 'Asia/Seoul', 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal);
    }

    result.push({
      date:          dateStr,
      cellId:        rows[i][1],
      memberName:    rows[i][2],
      status:        rows[i][3],
      absenceReason: rows[i][4] || ''
    });
  }
  return result;
}

/**
 * 전체 제출 기록 조회 (sharing, prayers 텍스트만)
 * @returns {Array} [{ date, cellId, cellName, sharing, prayers }]
 */
function getAllSubmissions() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var dateVal = rows[i][0];
    var dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, 'Asia/Seoul', 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal);
    }

    result.push({
      date:     dateStr,
      cellId:   rows[i][1],
      cellName: rows[i][2],
      sharing:  rows[i][6] || '',
      prayers:  rows[i][7] || ''
    });
  }
  return result;
}

/**
 * 전체 새신자 기록 조회
 * @returns {Array} [{ date, name, phone, address, visitReason, visitChannel, faith, prevChurch, afterPlan }]
 */
function getAllNewcomers() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NEWCOMERS);
  if (!sheet) return [];
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  // [SECURE] phone 미포함 — PII 최소 노출
  for (var i = 1; i < rows.length; i++) {
    result.push({
      date:         String(rows[i][0] || ''),
      name:         String(rows[i][1] || ''),
      visitReason:  String(rows[i][4] || ''),
      visitChannel: String(rows[i][5] || ''),
      faith:        String(rows[i][6] || ''),
      afterPlan:    String(rows[i][9] || '')
    });
  }
  return result;
}

// ─── 새신자 등록 ────────────────────────────────────────────────────────────

/**
 * 새신자/방문자 카드 저장 (인증 불필요)
 *
 * data 구조:
 * {
 *   name, phone, address, visitReason, visitChannel,
 *   faith, prevChurch, heresyCheck, afterPlan, agree
 * }
 */
function saveNewcomer(data) {
  // [SECURE] 필수 입력값 검증
  var name = (data.name || '').trim();
  var phone = (data.phone || '').trim();
  var agree = (data.agree || '').trim();

  if (!name || name.length > 50) return { error: '이름을 확인해주세요.' };
  if (!phone || phone.length > 20) return { error: '연락처를 확인해주세요.' };
  if (agree !== '동의') return { error: '개인정보 수집에 동의해주세요.' };

  // [SECURE] HTML 특수문자 차단 — Stored XSS 방지
  var fields = [name, phone, data.address, data.visitReason, data.visitChannel,
                data.faith, data.prevChurch, data.heresyCheck, data.afterPlan];
  for (var k = 0; k < fields.length; k++) {
    if (fields[k] && /[<>"']/.test(fields[k])) {
      return { error: '특수문자(<, >, ", \')는 사용할 수 없습니다.' };
    }
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NEWCOMERS);
  var now   = new Date();
  var date  = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');

  sheet.appendRow([
    date,
    name,
    phone,
    (data.address || '').trim(),
    (data.visitReason || '').trim(),
    (data.visitChannel || '').trim(),
    (data.faith || '').trim(),
    (data.prevChurch || '').trim(),
    (data.heresyCheck || '').trim(),
    (data.afterPlan || '').trim(),
    agree
  ]);

  return { success: true };
}

// ─── 유틸리티 ───────────────────────────────────────────────────────────────

function respond(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// [SECURE] 입력값 새니타이징 함수들

function sanitizeEmail(val) {
  if (!val || typeof val !== 'string') return null;
  var email = val.toLowerCase().trim();
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
  var name = val.trim();
  // [SECURE] 최대 20자 + HTML 특수문자 차단 — Stored XSS 방지
  if (name.length === 0 || name.length > 20) return null;
  if (/[<>"'&]/.test(name)) return null;
  return name;
}

// ─── 초기 시트 설정 (최초 1회 실행) ─────────────────────────────────────────

function initSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 셀_리더 시트 (role 컬럼 포함)
  var leaderSheet = ss.getSheetByName(SHEET_LEADER);
  if (!leaderSheet) {
    leaderSheet = ss.insertSheet(SHEET_LEADER);
    leaderSheet.appendRow(['cell_id', 'cell_name', 'leader_email', 'role']);
    leaderSheet.appendRow(['cell_01', '기쁨셀', 'leader1@gmail.com', 'leader']);
    leaderSheet.appendRow(['cell_02', '소망셀', 'leader2@gmail.com', 'leader']);
  }

  // 멤버 시트
  var memberSheet = ss.getSheetByName(SHEET_MEMBERS);
  if (!memberSheet) {
    memberSheet = ss.insertSheet(SHEET_MEMBERS);
    memberSheet.appendRow(['cell_id', 'name', 'active']);
    memberSheet.appendRow(['cell_01', '홍길동', true]);
    memberSheet.appendRow(['cell_01', '김철수', true]);
    memberSheet.appendRow(['cell_01', '이영희', true]);
    memberSheet.appendRow(['cell_01', '박지민', true]);
  }

  // 제출기록 시트 (raw_data 컬럼 추가)
  var subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!subSheet) {
    subSheet = ss.insertSheet(SHEET_SUBMISSIONS);
    subSheet.appendRow([
      'date', 'cell_id', 'cell_name', 'leader_email',
      'attendees', 'absences', 'sharing', 'prayers', 'notes', 'raw_data'
    ]);
  }

  // 출결 시트
  var attSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!attSheet) {
    attSheet = ss.insertSheet(SHEET_ATTENDANCE);
    attSheet.appendRow(['date', 'cell_id', 'member_name', 'status', 'absence_reason']);
  }

  // 새신자 시트
  var ncSheet = ss.getSheetByName(SHEET_NEWCOMERS);
  if (!ncSheet) {
    ncSheet = ss.insertSheet(SHEET_NEWCOMERS);
    ncSheet.appendRow([
      'date', 'name', 'phone', 'address',
      'visit_reason', 'visit_channel', 'faith',
      'prev_church', 'heresy_check', 'after_plan', 'agree'
    ]);
  }

  Logger.log('시트 초기화 완료');
}
