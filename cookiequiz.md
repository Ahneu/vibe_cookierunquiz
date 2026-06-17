# CookieQuiz - 쿠키 이름 맞추기 게임

## 프로젝트 개요

쿠키런 쿠키 캐릭터의 이미지를 보고 이름을 맞추는 웹 기반 퀴즈 게임.

---

## 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (프레임워크 없이 순수 JS)
- **스타일**: CSS Variables + Flexbox/Grid
- **데이터**: JSON 파일 (쿠키 목록 + 이미지 경로)
- **이미지 수집**: Python 크롤러 (쿠키런 위키 기반)
- **백엔드**: Firebase Firestore (서버리스, 무료 티어) - 결과 저장 및 상위 % 계산
- **배포**: Frontend → GitHub Pages / Backend → Firebase

---

## 게임 방식

### 기본 플로우
1. 메인 화면 → 게임 설정 선택 → 퀴즈 진행 → 결과 화면

### 퀴즈 방식
- 쿠키 이미지 1장 표시
- 주관식 텍스트 입력 (입력창 + 제출 버튼, Enter 키 제출 가능)
- 총 문제 수: 10 / 20 / 30 / 50 / 100 선택
- 정답 처리: 모든 공백 무시하여 비교 (예: "용감한 쿠키", "용감한쿠키" → 정답 / "용감한" → 오답)

### 점수 시스템
- 정답 1개당 10점
- 결과 화면: 맞춘 개수 / 전체 + 총점 표시
- 게임 종료 후 상위 몇 %인지 표시 (localStorage 기반)

### 난이도 (등장 쿠키 프로젝트 범위, 타이머는 난이도 무관 동일)
- 쉬움: 쿠키런 클래식만
- 보통: 쿠키런 클래식 + 쿠키런 킹덤
- 어려움: 쿠키런 클래식 + 쿠키런 킹덤 + 쿠키런 오븐브레이크

---

## 화면 구성

### 1. 메인 화면 (`index.html`)
- 게임 타이틀 (로고 이미지 + 텍스트 좌우 배치)
- 닉네임 입력 (필수)
- [문제 수 선택] 10 / 20 / 30 / 50 / 100
- [난이도 선택] 쉬움 / 보통 / 어려움 (등장 쿠키 프로젝트 범위)
- [게임 시작] / [리더보드] 버튼

### 2. 퀴즈 화면
- 상단: 진행도 (문제 번호/전체), 현재 점수, 정답 수, 타이머
- 중앙: 쿠키 이미지 (키보드 오픈 시 동적 축소)
- 하단: 텍스트 입력창 + [제출] 버튼 (Enter 키로도 제출)
- 정답/오답 시 즉시 시각적 피드백 (입력창 색상 변경 + 점수 표시)

### 3. 결과 화면
- 정답 개수 / 전체 문제 수 + 총점
- 상위 몇 % 표시 (localStorage 기반)
- 틀린 문제 목록 (이미지 + 정답)
- [다시 하기] / [메인으로] 버튼

### 4. 리더보드 화면
- 난이도별 필터 (쉬움 / 보통 / 어려움)
- 점수 기준 상위 20명 순위표 (Firebase Firestore 기반, 전역 공유)

---

## 파일 구조

```
CookieQuiz/
├── index.html
├── style.css
├── script.js
├── firebase.js             # Firebase 연동 (결과 저장, 상위 % 조회)
├── data/
│   └── cookies.json        # 쿠키 데이터 (이름, 이미지 경로, 프로젝트)
├── images/
│   └── cookies/            # 크롤링으로 수집한 쿠키 이미지
├── crawler/
│   ├── crawl.py            # 쿠키런 위키 이미지 크롤러
│   └── requirements.txt
└── cookiequiz.md
```

---

## 데이터 구조 (`cookies.json`)

```json
{
  "cookies": [
    {
      "id": 1,
      "name": "용감한 쿠키",
      "image": "images/cookies/brave_cookie.png",
      "project": "오리지널"
    }
  ]
}
```

### project 값 (난이도 필터링 기준)
- `"클래식"` → 쉬움 이상 (항상 포함)
- `"킹덤"` → 보통 이상
- `"오븐브레이크"` → 어려움만

---

## 구현 순서

### Phase 0 - 데이터 수집
- [x] 쿠키런 위키 크롤러 작성 (Python)
- [x] 쿠키 이미지 다운로드 및 정리
- [x] cookies.json 데이터 구성 (이름, 이미지 경로, project 태그)

### Phase 1 - 기본 골격
- [x] HTML 구조 작성 (메인/퀴즈/결과/리더보드 화면)
- [x] CSS 기본 레이아웃 및 스타일
- [x] Firebase 프로젝트 생성 및 Firestore 연동

### Phase 2 - 게임 로직
- [x] 난이도별 쿠키 풀 필터링 (project 기준)
- [x] 문제 수에 맞게 랜덤 출제 (10/20/30/50/100)
- [x] 텍스트 입력 정답 비교 로직 (공백 전부 제거 후 비교)
- [x] 점수 시스템 (정답 1개 = 10점)
- [x] 정답/오답 피드백 UI (입력창 색상 + 점수 표시)

### Phase 3 - 화면 전환
- [x] 메인 → 퀴즈 전환
- [x] 문제 → 다음 문제 전환
- [x] 퀴즈 → 결과 화면 전환

### Phase 4 - 완성도
- [x] Firebase Firestore에 결과 저장 및 리더보드 조회
- [x] 반응형 디자인 (모바일 대응)
- [x] GitHub Pages 배포 (https://ahneu.github.io/vibe_cookierunquiz/)
- [ ] 매우 어려움 난이도 콘텐츠 추가 (버튼은 준비중 상태로 노출 중)
- [ ] 상위 % 계산 (Firebase 기반 전역 집계로 개선)
- [ ] 효과음 (선택)

---

## 작업 일지

### 2026-06-17
- 프로젝트 초기 계획 수립 및 cookiequiz.md 문서 작성
- 게임 스펙 확정:
  - 답변: 주관식 텍스트 입력, 공백 무시 비교, "쿠키" 생략 불가
  - 점수 없음, 맞춘 개수 카운트 (예: 15/20)
  - 결과 화면에 상위 % 표시 (Firebase Firestore 기반)
  - 문제 수 선택: 20문제 / 50문제
  - 난이도 = 등장 쿠키 프로젝트 범위 (쉬움: 클래식 / 보통: +킹덤 / 어려움: +오븐브레이크)
  - 타이머는 난이도 무관 동일
- Phase 0 완료: 크롤러 작성 (crawler/crawl.py)
  - cookies_input.csv (쿠키 등급, 쿠키 이름, 프로젝트) 읽어 위키에서 이미지 자동 다운로드
  - cookies.json 자동 생성 (name, image, project, grade 포함)
  - 중복 처리: 같은 이름이 여러 프로젝트에 있으면 우선순위 높은 쪽으로 분류 (클래식 > 킹덤 > 오븐브레이크)
  - 쿠키런 킹덤/클래식/오븐브레이크 위키 순서대로 탐색
- 데이터 정리: 352개 쿠키 확정 (클래식 90 / 킹덤 121 / 오븐브레이크 141)
  - aliases 필드로 동일 쿠키 다른 표기 정답 처리 (명랑한 쿠키양, 민트초코 쿠키, 핑크초코 쿠키 등)
- Phase 1~3 완료: 게임 본체 개발 (index.html, style.css, script.js)
  - 메인/퀴즈/결과 3화면 구성
  - 15초 타이머 (색상 변화: 초록→주황→빨강)
  - 정답 비교: 공백 전부 제거 후 비교, aliases 포함
  - 결과 화면: 틀린 문제 목록 + 상위% (localStorage 임시, Firebase 교체 예정)
  - 실행: python3 -m http.server 8000 → http://localhost:8000

### 2026-06-17 (2차)
- UI 개선
  - 로고 이미지를 타이틀 왼쪽에 배치 (가로 레이아웃)
  - 카피라이트 위치 버그 수정 (CSS body 닫힘 괄호 누락 수정)
  - 리더보드 버튼 게임 시작 버튼과 동일 너비로 변경
- 게임 스펙 변경
  - 점수 시스템 추가: 정답 1개 = 10점, 퀴즈 상단·결과 화면에 점수 표시
  - 문제 수 옵션 추가: 100문제 / 버튼 텍스트 간소화 (10문제 → 10)
  - 리더보드 필터: 문제 수 제거, 난이도 기준으로만 분류
  - 난이도 설명 문구 자연스럽게 수정
  - 알룰로스 노바 쿠키 미출시로 cookies_input.csv에서 제거
- Firebase Firestore 연동 완료 (firebase.js)
  - 게임 결과 Firestore `scores` 컬렉션에 저장
  - 리더보드: Firestore에서 난이도별 점수 조회 (클라이언트 정렬)
  - script.js를 ES Module로 전환 (type="module")
- GitHub Pages 배포
  - 저장소: github.com/Ahneu/vibe_cookierunquiz (Public)
  - URL: https://ahneu.github.io/vibe_cookierunquiz/
- 모바일 대응
  - 닉네임/정답 입력창 overflow 수정 (min-width: 0)
  - 배경 이미지 모바일 고정 해제 (background-attachment: scroll) + 배경색 fallback
  - iOS 자동완성/자동완성 연락처 비활성화 (autocorrect="off", autocapitalize="none")
  - 퀴즈 화면 position: fixed + visualViewport API 적용
    - 키보드 오픈 시 쿠키 이미지 영역 동적 축소 (--vv-height CSS 변수)
    - 스크롤로 인한 footer 노출 문제 해결
  - 모바일 카드/answer-area 패딩 축소

### 2026-06-18
- 캡틴 아이스 쿠키 이미지 리소스 교체
- 스토어 배너 추가 (03_btn_go-cookierun.png)
  - Android → Play Store, iOS → App Store로 OS 감지 후 분기
- 매우 어려움 난이도 버튼 추가 (준비중 토스트 팝업)
- 문제 수 ALL 옵션 추가 (선택 난이도 전체 쿠키 출제)
- 난이도 설명 문구 변경: "출제돼요" → "등장해요"
- 모바일 상단 여백 축소 (body padding-top: 24px → 10px)
- 모바일 키보드 오픈 시 이미지 축소 애니메이션 개선 (cubic-bezier)
