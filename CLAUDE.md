# 개발 Phase

## Phase 1 — 기반 구축
- [x] Google Sheet 구조 설계 및 생성 (셀_리더, 멤버 시트) — scripts/Code.gs initSheets()
- [x] Apps Script 작성 (멤버 조회 / 추가 / 비활성화 API) — scripts/Code.gs
- [x] Google OAuth 로그인 구현 — @react-oauth/google, src/components/Login.jsx
- [x] 소속 셀 자동 매핑 — loginWithToken() → Apps Script doPost(action=login)

## Phase 2 — 핵심 입력 화면
- [x] 출결 체크 화면 (멤버 목록 불러오기 + 출석/결석 토글) — Attendance.jsx
- [x] 결석 사유 빠른 선택 버튼 (회사/개인사정/여행/직접입력)
- [x] 역할 추첨 (기존 코드 재활용) — Lottery.jsx
- [x] 나눔 & 기도제목 입력 화면 (멤버별 칸 + 한번에 입력) — SharingPrayers.jsx
- [x] 임시 저장 (localStorage)

## Phase 3 — 시트 직접 저장
- [x] 구글 폼 제거 → 시트 직접 저장으로 변경 (submitRecord)
- [x] DB 시트 구조 설계 (제출기록 + 출결 시트 추가)
- [x] 제출 완료 확인 화면 — Submit.jsx
- [x] 이번 주 제출 기록 수정 기능 — WeeklySummary.jsx
- [x] 출결만 바로 저장 기능

## Phase 4 — 대시보드 (목사님)
- [x] 셀별 / 전체 주간 출석률 — Dashboard.jsx (출석 현황 탭)
- [x] 멤버별 최근 N주 출석 패턴 (출석 패턴 탭)
- [x] 결석 사유 분류 차트 (결석 사유 탭)
- [x] 연속 결석 멤버 알림 (연속 결석 탭)
- [x] 멤버 상황 요약 (멤버 상황 탭)
- [x] 새신자 현황 (새신자 탭)
- [x] 교회 설정 — 표어/연도 (설정 탭)
- [x] PC/Mac 반응형 레이아웃 (960px, 2열 그리드)

## Phase 5 — 추가 기능
- [x] 랜딩 페이지 (셀 리더/새신자/관리자 선택)
- [x] 새신자 방문자 카드 (시트 직접 저장, 인증 불필요)
- [x] 멤버 관리 (추가/비활성화/셀 이동, admin 전체 셀 관리)
- [x] 도움말 (헤더 ? 버튼, 아코디언 FAQ)
- [x] 교회 표어 (랜딩 페이지 표시, admin 수정)
- [x] 보안 리뷰 (멀티에이전트 — FAIL 3건 수정 완료)
- [x] Vercel 배포 완료 — https://blc-input.vercel.app

## Phase 6 — 남은 작업 (백로그)
- [ ] 모바일 UX 세부 점검
- [ ] 기도제목 이월 (지난주 기도제목 불러오기)
- [ ] 제출 히스토리 (이전 제출 기록 조회)
- [ ] 카카오톡 공유 (역할 배정 결과)
- [ ] 푸시 알림 (모임 전 리더에게 알림)

---

# 요구사항 정의서
## 오늘의 섬김 — 셀 리더 일지 자동화

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 오늘의 섬김 (셀 역할 추첨 + 셀 리더 일지 자동화) |
| 작성일 | 2026년 3월 25일 |
| 대상 독자 | 개발자 |
| 문서 버전 | v1.2 |

---

## 1. 프로젝트 개요

교회 소그룹(셀) 리더가 매주 반복하는 작업을 최소화한다.
Google 계정으로 로그인 → 내 셀 멤버 확인 → 역할 추첨 → 나눔/결석 기록 → 폼 자동 제출까지 하나의 흐름으로 처리한다.

---

## 2. 사용자

| 구분 | 설명 |
|------|------|
| 관리자 | 목사님 / 간사님 — Google Sheet에서 셀 및 초기 멤버 등록 |
| 셀 리더 | 5명 — Google 계정으로 로그인, 자기 셀만 접근 가능 |
| 사용 환경 | 모바일 브라우저 (iOS / Android) |

---

## 3. 시스템 아키텍처

```
[Google Sheet]                [Apps Script]               [React 앱]
- 셀 목록                      - 웹 앱으로 배포              - Google OAuth 로그인
- 멤버 목록 (셀별)    ←——API——→ - 멤버 CRUD                 - 내 셀 멤버 조회
- 제출 기록 (자동 저장)          - 폼 제출 대행               - 역할 추첨
                                - 로그인 계정으로             - 나눔/결석 입력
                                  셀 자동 매핑               - 일지 자동 제출
```

### Google Sheet 구조

**[시트1] 셀\_리더**

| 컬럼 | 설명 | 예시 |
|------|------|------|
| cell\_id | 셀 고유 ID | cell\_01 |
| cell\_name | 셀 이름 | 기쁨셀 |
| leader\_email | 리더 Google 계정 | leader@gmail.com |

**[시트2] 멤버**

| 컬럼 | 설명 | 예시 |
|------|------|------|
| cell\_id | 소속 셀 ID | cell\_01 |
| name | 멤버 이름 | 홍길동 |
| active | 활성 여부 | TRUE / FALSE |

> 멤버 탈퇴 시 삭제가 아닌 `active = FALSE` 처리 → 기록 보존

---

## 4. 앱 화면 흐름 (Flow)

```
[로그인]
    Google 계정으로 로그인
    → Apps Script가 이메일로 소속 셀 자동 매핑
    → 내 셀 멤버 목록 불러오기

    ↓

[1단계] 출결 체크
    - 저장된 멤버 목록에서 출석 / 결석 선택
    - 결석 시 사유 빠른 선택 또는 직접 입력
      예: [회사] [개인사정] [여행] [직접입력]
    - 멤버 추가 / 삭제 가능 (Sheet에 반영)

    ↓

[2단계-A] 역할 추첨 → 결과 확인
[2단계-B] 추첨 없이 넘어가기

    ↓

[3단계] 나눔 & 기도제목 입력 (모임 중 실시간)
    - 출석 멤버별 나눔 내용 + 기도제목 입력 칸
    - 임시 저장 → 나중에 돌아와서 수정 가능

    ↓

[4단계] 셀 리더 일지 제출
    - 버튼 1회 클릭
    - Apps Script → 구글 폼 자동 제출
    - 제출 성공 시 완료 화면 표시
```

---

## 5. 기능 요구사항

### 5-1. 인증

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-01 | Google OAuth 로그인 | Google 계정으로 로그인 | 필수 |
| F-02 | 셀 자동 매핑 | 로그인 이메일로 소속 셀 자동 조회 | 필수 |
| F-03 | 미등록 계정 처리 | Sheet에 없는 계정 로그인 시 안내 메시지 표시 | 필수 |

---

### 5-2. 멤버 관리

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-04 | 멤버 목록 조회 | Apps Script API로 내 셀 멤버 불러오기 | 필수 |
| F-05 | 멤버 추가 | 앱에서 이름 입력 → Sheet에 즉시 반영 | 필수 |
| F-06 | 멤버 비활성화 | 삭제 대신 active=FALSE 처리 | 필수 |

---

### 5-3. 출결 체크

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-07 | 출석/결석 토글 | 멤버별 출석 여부 선택 | 필수 |
| F-08 | 결석 사유 빠른 선택 | 회사 / 개인사정 / 여행 / 직접입력 버튼 제공 | 필수 |
| F-09 | 결석 사유 직접 입력 | 텍스트 입력 가능 | 필수 |

---

### 5-4. 역할 추첨

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-10 | 역할 자동 배정 | 출석 인원 수에 따라 역할 자동 결정 | 필수 |
| F-11 | 셔플 애니메이션 | 추첨 시 2초간 이름 섞이는 효과 | 선택 |
| F-12 | 결과 카드 표시 | 역할별 이름 카드 순차 표시 | 필수 |
| F-13 | 다시 추첨 | 결과 초기화 후 재추첨 | 필수 |
| F-14 | 추첨 없이 넘어가기 | 추첨 생략하고 나눔 입력 단계로 이동 | 필수 |

**역할 배정 규칙**

| 인원 | 배정 역할 |
|------|-----------|
| 4명 | 첫기도, 끝기도, 기도정리, 질문자 |
| 5명 | + 사진사 |
| 6명 | + 인도 |
| 7명 이상 | 나머지 "통과" 처리 |

---

### 5-5. 나눔 & 기도제목 입력

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-15 | 멤버별 나눔 입력 | 출석 멤버마다 나눔 내용 입력 필드 | 필수 |
| F-16 | 멤버별 기도제목 입력 | 출석 멤버마다 기도제목 입력 필드 | 필수 |
| F-17 | 임시 저장 | 입력 내용 localStorage 저장, 재진입 시 복원 | 필수 |
| F-18 | 빈칸 멤버 자동 생략 | 미입력 멤버는 폼 데이터에서 제외 | 필수 |

---

### 5-6. 구글 폼 자동 제출

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-19 | 폼 데이터 자동 조합 | 출결/나눔/기도제목을 폼 포맷으로 변환 | 필수 |
| F-20 | Apps Script 자동 제출 | 버튼 1회 클릭으로 구글 폼 제출 완료 | 필수 |
| F-21 | 제출 완료 확인 | 성공/실패 여부 표시 | 필수 |
| F-22 | 링크 복사 (fallback) | 실패 시 미리 채워진 폼 URL 복사 제공 | 권장 |

---

## 6. 구글 폼 연동 스펙

### 폼 정보

- **폼 URL:** `https://docs.google.com/forms/d/e/1FAIpQLSfuPP24je4Axo8M8Z5XuqfwgoMasNdTmcnojGv0mSovpnq6rA/viewform`
- **제출 URL:** `https://docs.google.com/forms/u/0/d/e/1FAIpQLSfuPP24je4Axo8M8Z5XuqfwgoMasNdTmcnojGv0mSovpnq6rA/formResponse`

### Entry ID 매핑

| Entry ID | 폼 항목 | 자동 입력 | 입력 값 |
|----------|---------|-----------|---------|
| `entry.1173823960` | 1. 오늘 출석한 셀 멤버 | ✅ | 출석 멤버 이름 (쉼표 구분) |
| `entry.1331869363` | 2. 오늘 결석한 멤버 + 이유 | ✅ | `이름- 사유` 형식 |
| `entry.924151839` | 3. 셀 모임 나눔 기록 | ✅ | `이름- 내용` 형식 (줄바꿈 구분) |
| `entry.25622691` | 4. 각 멤버 기도제목 | ✅ | `이름- 기도제목` 형식 (줄바꿈 구분) |
| `entry.1143238363` | 5. 특이사항 / 요청사항 | ❌ | 수동 입력 |
| `entry.1167358523` | 6. 기타 건의사항 | ❌ | 수동 입력 |

### Apps Script 구현 방향

```javascript
// doPost: 클라이언트 → Apps Script → 구글 폼 제출 대행
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const payload = {
    "entry.1173823960": data.attendees,
    "entry.1331869363": data.absences,
    "entry.924151839":  data.sharing,
    "entry.25622691":   data.prayers,
  };
  UrlFetchApp.fetch(FORM_RESPONSE_URL, {
    method: "post",
    payload: payload
  });
  return ContentService.createTextOutput("ok");
}
```

> ⚠️ 클라이언트에서 폼 직접 POST 시 CORS 차단 → Apps Script 중계 필수
> ⚠️ Apps Script 배포 시 "누구나 액세스 가능"으로 설정 필요

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 반응형 | 모바일 우선, 최대 너비 460px |
| 오프라인 | 추첨/입력은 오프라인 동작, 제출은 온라인 필요 |
| 성능 | 추첨 애니메이션 60fps 유지 |
| 보안 | Google OAuth — 본인 셀 데이터만 접근 가능 |
| 저장 | 임시 입력값은 localStorage, 멤버 데이터는 Google Sheet |

---

## 8. 제약사항

- 구글 폼 공식 외부 API 없음 → Apps Script 중계 방식 사용
- 클라이언트 직접 POST → CORS 오류 → Apps Script 필수
- Google OAuth 사용 시 앱 도메인 등록 필요 (Google Cloud Console)
- Apps Script 무료 할당량: 하루 20,000회 실행 (5개 셀 기준 충분)

---

## 9. 대시보드 요구사항 (목사님)

> 목사님 인터뷰 기반 (2026.03.25)

| ID | 항목 | 설명 | 우선순위 |
|----|------|------|----------|
| D-01 | 셀별 주간 출석률 | 각 셀의 이번 주 출석률 카드 표시 | 필수 |
| D-02 | 전체 주간 출석률 | 전체 셀 합산 출석률 | 필수 |
| D-03 | 멤버별 출석 패턴 | 최근 N주 출석 이력 (N은 설정 가능) | 필수 |
| D-04 | 결석 사유 분류 | 회사 / 개인 / 기타 비율 차트 | 필수 |
| D-05 | 연속 결석 알림 | N주 이상 연속 결석 멤버 강조 표시 | 필수 |
| D-06 | 멤버 상황 파악 | 나눔/기도제목 기반 멤버별 상태 요약 | 필수 |

---

## 10. 입력 UX 개선 요구사항 (리더)

> 셀 리더 인터뷰 기반 (2026.03.25) — 현재 일지 작성에 매주 약 10분 소요

| ID | 현재 문제 | 개선 방향 |
|----|-----------|-----------|
| U-01 | 매주 같은 멤버 이름 다시 입력 | 고정 멤버 저장 → 출결 체크만 |
| U-02 | 모임 중 나눔 내용 실시간 타이핑 | 멤버별 입력 칸 → 탭으로 빠르게 이동 |
| U-03 | 결석 사유 일일이 직접 입력 | 사유 버튼 (회사 / 개인사정 / 여행 / 기타) |
| U-04 | 폼 찾아서 제출하는 과정 | 버튼 1번으로 자동 제출 |
| U-05 | 나중에 기억해서 작성 | 임시 저장 → 모임 중 바로 입력 유도 |

> 목표: 모임 종료 후 **3분 이내** 제출 완료

---

## 11. Secure Coding Guidelines (MOIS 2021)

Reference: secure-coding-kr skill. Apply to all code.

### Absolute Rules
- No hard-coded passwords, API keys, or secrets — use env vars
- No direct SQL string concat — use parameterized queries only
- No weak crypto (RC4/DES/MD5/SHA1) — use AES-256, SHA-256+
- No stack traces or DB errors exposed to users — generic messages only
- No empty catch blocks — always handle or log
- No unclosed files/DB connections — use context managers
- No debug code or test accounts in production
- No Math.random() for security — use crypto.randomBytes()

### Per Category (apply where relevant)
| Category | Key Rule |
|----------|----------|
| Input Validation | XSS: encode output (DOMPurify). Path traversal: whitelist only. Open redirect: whitelist only |
| Auth & Crypto | bcrypt/argon2 for passwords. secrets/crypto for tokens. HttpOnly+Secure on cookies |
| Error Handling | Log full error server-side. Return generic message to client |
| Resource Mgmt | Always release files, DB, sockets. Null-check before use |
| Encapsulation | Return array copies. Remove all debug code before deploy |

### Annotation Rule
Add `[SECURE]` comment on every line where a security control is applied.
```js
// [SECURE] Parameterized query - SQL Injection prevention
db.query("SELECT * FROM users WHERE id = $1", [userId]);
```

---

## 12. 향후 확장 가능 기능 (백로그)

| ID | 기능 | 설명 |
|----|------|------|
| B-01 | 기도제목 이월 | 지난주 기도제목 불러와서 수정만 하는 방식 |
| B-02 | 제출 히스토리 | 이전 제출 기록 조회 |
| B-03 | 카카오톡 공유 | 역할 배정 결과 카톡으로 공유 |
| B-04 | 관리자 대시보드 | 전체 셀 출결 현황 한눈에 보기 |
| B-05 | 푸시 알림 | 모임 전 리더에게 알림 발송 |