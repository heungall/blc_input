# BLC 홍대교회 — 개발 히스토리

## 2026-03-26 세션 1

### 완료된 작업

1. **Vite + React 프로젝트 초기 생성**
2. **GitHub 연동** — `https://github.com/heungall/blc_input.git`
3. **Vercel 배포** — `https://blc-input.vercel.app`
4. **Phase 1: Google OAuth + Apps Script 백엔드 구축**
   - Google OAuth 로그인, 셀 자동 매핑, 멤버 CRUD API
   - CORS 해결 (Content-Type: text/plain)

---

## 2026-03-31 세션 2

### 완료된 작업

#### Phase 2 — 핵심 입력 화면
- **Attendance**: 멤버 출석/결석 토글 + 결석 사유 빠른 선택 (회사/개인사정/여행/직접입력)
- **Lottery**: 역할 추첨 (4~7+명 규칙, 셔플 애니메이션)
- **SharingPrayers**: 나눔 + 기도제목 분리 입력 + localStorage 자동 저장
- **한번에 입력**: 카톡 복붙 → 멤버 이름 자동 인식 (뒤 두 글자 별명도 지원)
- **Submit**: 미리보기 + 특이사항 + 시트 직접 저장

#### Phase 3 — 시트 직접 저장
- 구글 폼 제거 → Google Sheet 직접 저장 (submitRecord)
- DB 시트: 제출기록 + 출결 (멤버별 개별 기록)
- 같은 주 재접속 시 기존 데이터 자동 복원 + 수정 모드
- WeeklySummary: 요약 화면 → 부분 수정 가능
- 출결만 바로 저장 기능

#### Phase 4 — 대시보드 (목사님)
- 멀티에이전트 개발 (백엔드/UI/보안/통합)
- 6개 탭: 출석 현황, 출석 패턴, 결석 사유, 연속 결석, 멤버 상황, 새신자
- PC/Mac 반응형 (960px, 2열 그리드)
- admin role 기반 권한 체크
- 보안 리뷰 3건 수정 (셀 소유권 검증, PII 제거, XSS 방지)

#### 추가 기능
- **랜딩 페이지**: 셀 리더 / 새신자 / 관리자 3가지 선택
- **새신자 방문자 카드**: 구글 폼 대체 → 시트 직접 저장 (인증 불필요)
- **멤버 관리**: 추가/비활성화/셀 이동 (admin 전체 셀 관리 가능)
- **교회 표어**: 설정 시트 → admin이 대시보드에서 수정 → 랜딩 페이지에 표시
- **도움말**: 헤더 ? 버튼 → 셀 리더/새신자/관리자 가이드 (아코디언 FAQ)
- **제목 변경**: 오늘의 섬김 → BLC 홍대교회

### 프로젝트 구조

```
blc_input/
├── scripts/Code.gs                 # Apps Script 백엔드 (약 790줄)
├── src/
│   ├── main.jsx                    # 엔트리 (GoogleOAuthProvider)
│   ├── App.jsx                     # 메인 앱 (랜딩/로그인/스텝/대시보드 라우팅)
│   ├── App.css                     # 전체 스타일
│   ├── index.css                   # 글로벌 CSS 변수
│   ├── context/AuthContext.jsx     # 인증 상태 관리 (role 포함)
│   ├── services/api.js             # Apps Script API 호출 레이어
│   └── components/
│       ├── LandingPage.jsx         # 첫 화면 (3가지 선택 + 표어)
│       ├── Login.jsx               # Google OAuth 로그인
│       ├── Attendance.jsx          # 출결 체크
│       ├── Lottery.jsx             # 역할 추첨
│       ├── SharingPrayers.jsx      # 나눔 & 기도제목 (한번에 입력 포함)
│       ├── Submit.jsx              # 제출 미리보기 + 저장
│       ├── WeeklySummary.jsx       # 이번 주 요약 + 부분 수정
│       ├── MemberManage.jsx        # 멤버 관리 (admin: 전체 셀)
│       ├── Dashboard.jsx           # 대시보드 (6탭 + 설정)
│       ├── Dashboard.css           # 대시보드 전용 스타일
│       ├── NewMemberForm.jsx       # 새신자 방문자 카드
│       └── Help.jsx                # 도움말 FAQ
├── vite.config.js
└── package.json
```

### Google Sheet 시트 구조

| 시트 | 용도 |
|------|------|
| 셀_리더 | cell_id, cell_name, leader_email, role |
| 멤버 | cell_id, name, active |
| 제출기록 | date, cell_id, ..., raw_data |
| 출결 | date, cell_id, member_name, status, absence_reason |
| 새신자 | date, name, phone, address, ... |
| 설정 | key, value (motto, year 등) |

### Apps Script 배포 참고
- 코드 업데이트 후: **배포 → 배포 관리 → 연필 아이콘 → 새 버전 → 배포** (URL 유지)
- "새 배포"를 누르면 URL이 바뀌므로 주의
- Vercel 환경변수에 VITE_APPS_SCRIPT_URL, VITE_GOOGLE_CLIENT_ID 설정 필요
