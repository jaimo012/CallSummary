# 📞 CallSummary (AI 통화 자동 요약 봇)

![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)

**CallSummary**는 구글 드라이브에 업로드된 통화 녹음 파일을 AI가 자동으로 듣고 분석하여, 구글 스프레드시트에 요약 내용을 기록하고 슬랙(Slack)으로 알림을 보내주는 완벽한 비서 자동화 시스템입니다.

---

## ✨ 핵심 기능 (Key Features)

1. **최신 AI 모델 적용**: 빠르고 정확한 `gemini-2.5-flash` 모델을 사용하여 통화 내용을 텍스트로 분석합니다.
2. **과거 이력 연동 (Context-Aware)**: 스프레드시트에 기록된 대상의 과거 통화 이력을 최대 10건까지 참조하여 맥락에 맞는 요약을 제공합니다.
3. **자동화된 알림 (Slack Block Kit)**: 통화 목적, 요약, 일정, 향후 계획, 답장 문자 초안까지 깔끔하게 포맷팅된 슬랙 메시지로 즉시 받아볼 수 있습니다.
4. **안정적인 에러 처리**: 구글 드라이브의 오디오 MIME 타입 오류를 자동 보정하며, API 호출 실패 시 최대 3회까지 재시도(Retry)하는 강력한 로직이 포함되어 있습니다.

---

## 🧠 AI 프롬프트 엔지니어링 (Prompt Engineering)

이 시스템의 가장 큰 핵심은 상황에 따라 AI의 뇌(Prompt)를 교체하여 맞춤형 결과를 뽑아내는 **이원화된 프롬프트 시스템**입니다. (`Config.gs`에서 관리)

### 💼 1. 업무/기타 통합 프롬프트 (BUSINESS)
영업 리드의 완벽한 'AI 영업 비서' 역할을 수행하도록 설계되었습니다.
* **도메인 지식 (Domain Knowledge) 주입**: 일반 AI는 이해하기 힘든 실무 용어들(M/M 단가, 3배수 추천, 킥오프, 컨틴전시 플랜, 펑크 등)을 프롬프트에 사전 학습시켜 문맥 파악의 정확도를 극대화했습니다.
* **화자 분리 (Diarization) 강제**: 1채널 통화 녹음의 특성상 "누가 누구인지" 헷갈리는 문제를 막기 위해, *'파일명에 적힌 사람이 무조건 상대방이다'*라는 절대 규칙을 부여했습니다.
* **동적 예외 처리**: 시스템이 이름을 '알수없음'으로 넘겨주더라도, AI가 대화 내용(인사말 등)을 바탕으로 스스로 이름을 추론하도록 지시합니다.

### ❤️ 2. 여자친구 전용 프롬프트 (GIRLFRIEND)
사소한 약속을 놓치지 않도록 돕는 '연애 매니저' 역할을 수행합니다.
* **배경 정보 (Context) 설정**: 두 사람의 나이, 직업, 거주지, 평소 사용하는 호칭("자기")과 존댓말 뉘앙스까지 AI에게 알려주어, 매우 자연스럽고 센스 있는 문자 초안을 작성하게 합니다.
* **모닝콜 방어 로직 (Exception Handling)**: 내용이 "일어났어?" 정도의 짧은 기상 확인 통화라면 불필요한 분석 비용을 아끼기 위해 즉시 `분석제외` 텍스트만 뱉고 종료하도록 '가드레일'을 세웠습니다.
* **시간 추정 로직 (Time Estimation)**: 대화 중에 "오늘 밥 먹자"라고만 하고 시간이 없으면, AI가 요일을 계산하여 평일은 저녁 7시(19:00), 주말은 오후 2시(14:00)로 **디폴트 일정을 자동 생성**하도록 알고리즘화 했습니다.

### ⚙️ 3. 구조화된 출력 (Structured JSON Output)
AI의 응답이 사람마다, 시간마다 달라지는 것을 막기 위해 명확한 JSON 스키마(Schema)를 제공하여, 시스템이 오류 없이 파싱(Parsing)하고 스프레드시트의 각 열에 정확히 꽂아 넣을 수 있도록 통제합니다.

---

## 🛠 시스템 아키텍처 및 동작 흐름 (Workflow)

1. **파일 업로드**: 사용자의 스마트폰 통화 녹음 파일(`.m4a` 등)이 지정된 구글 드라이브 폴더에 자동 또는 수동으로 업로드됩니다.
2. **신규 파일 감지**: 5분마다 실행되는 Apps Script 트리거가 새로운 파일을 감지하고 스프레드시트(B열)에 등록합니다.
3. **AI 분석**: 대기 중인 파일의 오디오 데이터를 추출하여 구글 Gemini API로 전송합니다.
4. **결과 저장**: 반환된 JSON 형태의 요약 데이터를 스프레드시트의 각 열(목적, 요약, 일정, 문자 초안 등)에 알맞게 업데이트합니다.
5. **메신저 알림**: 최종 정리된 리포트가 슬랙 웹훅(Webhook)을 통해 전송됩니다.

---

## ⚙️ 초기 설정 방법 (Setup Guide)

이 프로젝트를 실행하기 위해 다음 설정이 필요합니다.

### 1. 구글 스프레드시트 준비
아래 양식에 맞게 시트(기본 이름: `RAW`)의 1행(헤더)을 구성해 주세요.
* **A열**: 생성일시
* **B열**: 파일명 (스크립트가 자동 입력)
* **C열**: 통화일시
* **D열**: 상대이름
* **E열**: 전화번호
* **F열**: 유형 (업무 / 여자친구 등)
* **G열**: 주요내용 (AI 요약 결과)
* **H열**: 일정논의
* **I열**: 향후계획
* **J열**: 문자초안

### 2. API 키 및 Webhook 발급
* **Google Gemini API Key**: [Google AI Studio](https://aistudio.google.com/)에서 API 키를 발급받습니다.
* **Slack Webhook URL**: Slack 워크스페이스에서 수신 워크플로우(Incoming Webhook)를 생성하여 URL을 복사합니다.

### 3. Config.gs 환경 변수 설정
Apps Script 편집기에서 `Config.gs` 파일을 열고 상단의 `CONFIG` 객체에 본인의 정보를 입력합니다.

```javascript
const CONFIG = {
  FOLDER_ID: '여기에_구글드라이브_녹음폴더_ID_입력', 
  SPREADSHEET_ID: '여기에_스프레드시트_ID_입력', 
  SHEET_NAME: 'RAW', 
  API_KEY: '여기에_GEMINI_API_KEY_입력', 
  MODEL_NAME: 'gemini-2.5-flash',
  TIME_LIMIT_MS: 4 * 60 * 1000, 
  SLACK_WEBHOOK_URL: '여기에_SLACK_WEBHOOK_URL_입력' 
};
