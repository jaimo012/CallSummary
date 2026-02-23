/**
 * Utils.gs
 * 공통적으로 사용되는 헬퍼 함수들입니다.
 */

/**
 * 날짜를 YYYY-MM-DD HH:mm:ss 형식의 문자열로 변환
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

/**
 * AI 응답에서 Markdown 코드 블록을 제거하고 순수 JSON 문자열만 추출
 */
function cleanJsonString(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}
