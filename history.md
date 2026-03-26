# 오늘의 섬김 — 개발 히스토리

## 2026-03-26 세션 1

### 완료된 작업

1. **Vite + React 프로젝트 초기 생성**
   - `npm create vite` 로 React 템플릿 생성
   - 기본 컴포넌트 구조 셋업

2. **GitHub 연동**
   - 리모트: `https://github.com/heungall/blc_input.git`
   - main 브랜치에 초기 커밋 + 푸시 완료

3. **GitHub Actions 배포 워크플로우 생성**
   - `.github/workflows/deploy.yml` 작성 (GitHub Pages용)
   - 이후 Vercel 배포로 방향 전환 → `vite.config.js`의 `base`를 `/`로 변경

4. **Phase 1 코드 pull (리모트에서 받아옴)**
   - Google OAuth 로그인: `src/components/Login.jsx`
   - 인증 컨텍스트: `src/context/AuthContext.jsx`
   - API 서비스: `src/services/api.js` (Apps Script 호출 레이어)
   - Apps Script 백엔드: `scripts/Code.gs`
   - 환경변수 예시: `.env.example`

5. **환경 설정**
   - `.env` 파일 생성 (gitignore에 추가됨)
     - `VITE_GOOGLE_CLIENT_ID` — Google OAuth 클라이언트 ID 설정 완료
     - `VITE_APPS_SCRIPT_URL` — Apps Script 웹 앱 URL 설정 완료
   - `@react-oauth/google` 패키지 설치

6. **Apps Script 배포 완료**
   - Google Sheet 생성 + `initSheets()` 실행 (셀_리더, 멤버 시트 초기화)
   - 스크립트 속성 설정 (SPREADSHEET_ID, CLIENT_ID)
   - 웹 앱 배포 (실행 주체: 나 / 액세스: 누구나)

### 현재 상태 (중단 지점)

- **로컬 테스트 시 OAuth 401 오류 발생**
  - 원인: Google Cloud Console에서 승인된 JavaScript 출처 미등록
  - 해결 방법: Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 → 승인된 JavaScript 출처에 추가:
    - `http://localhost:5173`
    - `http://localhost`
  - 승인된 리디렉션 URI에도 추가: `http://localhost:5173`
  - Vercel 배포 시 Vercel 도메인도 추가 필요

### 다음 작업 (Phase 2)

CLAUDE.md 기준으로 남은 작업:

- [ ] 출결 체크 화면 (멤버 목록 불러오기 + 출석/결석 토글)
- [ ] 결석 사유 빠른 선택 버튼
- [ ] 역할 추첨 (기존 코드 재활용)
- [ ] 나눔 & 기도제목 입력 화면 (멤버별 칸)
- [ ] 임시 저장 (localStorage)

### 프로젝트 구조

```
blc_input/
├── .github/workflows/deploy.yml   # GitHub Pages 배포 (현재 미사용, Vercel 전환)
├── .env.example                    # 환경변수 템플릿
├── .env                            # 실제 환경변수 (gitignore)
├── scripts/Code.gs                 # Apps Script 백엔드
├── src/
│   ├── main.jsx                    # 엔트리 (GoogleOAuthProvider 래핑)
│   ├── App.jsx                     # 메인 앱 (스텝 관리)
│   ├── App.css                     # 스타일
│   ├── context/AuthContext.jsx     # 인증 상태 관리
│   ├── services/api.js             # Apps Script API 호출
│   └── components/
│       ├── Login.jsx               # Google 로그인 화면
│       ├── NameInput.jsx           # 이름 입력 (Step 0)
│       ├── Lottery.jsx             # 역할 추첨 (Step 1)
│       ├── SharingNotes.jsx        # 나눔 기록 (Step 2)
│       └── FormSubmit.jsx          # 폼 제출 (Step 3)
├── vite.config.js                  # Vite 설정 (base: '/')
└── package.json
```

### 참고 사항

- Vercel 배포 예정 — GitHub Pages 워크플로우는 나중에 제거해도 됨
- Apps Script "액세스: 누구나" 설정은 안전함 — 코드 내에서 ID 토큰 검증 + 이메일 매핑으로 인증 처리
- `.env` 파일은 gitignore에 포함 — Vercel 배포 시 Vercel 환경변수로 별도 설정 필요
