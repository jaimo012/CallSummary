# 📞 CallSummary (AI 통화 자동 요약 봇)

![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)

**CallSummary**는 구글 드라이브에 업로드된 통화 녹음 파일을 AI가 자동으로 듣고 분석하여, 구글 스프레드시트에 요약 내용을 기록하고 슬랙(Slack)으로 알림을 보내주는 완벽한 비서 자동화 시스템입니다.

---

## ✨ 핵심 기능 (Key Features)

1. **최신 AI 모델 적용**: 빠르고 정확한 `gemini-2.5-flash` 모델을 사용하여 통화 내용을 텍스트로 분석합니다.
2. **맞춤형 페르소나 분석**:
   - 💼 **업무 모드**: 고객사 및 파트너사와의 통화에서 계약, 일정, M/M(맨먼스), 요구사항 등을 정밀하게 추출합니다.
   - ❤️ **여자친구 모드**: 일상적인 대화 속에서 지나가듯 말한 데이트 약속, 시간, 장소, 감정선 등을 꼼꼼히 캐치합니다.
   - 💤 **분석 제외**: 단순 모닝콜이나 부재중 전화는 AI가 스스로 판단하여 분석을 제외합니다.
3. **과거 이력 연동 (Context-Aware)**: 스프레드시트에 기록된 대상의 과거 통화 이력을 최대 10건까지 참조하여 맥락에 맞는 요약을 제공합니다.
4. **자동화된 알림 (Slack Block Kit)**: 통화 목적, 요약, 일정, 향후 계획, 답장 문자 초안까지 깔끔하게 포맷팅된 슬랙 메시지로 즉시 받아볼 수 있습니다.
5. **안정적인 에러 처리**: 구글 드라이브의 오디오 MIME 타입 오류를 자동 보정하며, API 호출 실패 시 최대 3회까지 재시도(Retry)하는 강력한 로직이 포함되어 있습니다.

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
