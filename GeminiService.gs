/**
 * GeminiService.gs
 * Google AI Studio API와 통신합니다. (안정성 강화: 재시도 로직 + MIME Type 보정)
 */

const GeminiService = {
  /**
   * [핵심] 파일 확장자에 따른 정확한 MIME Type 반환
   * 구글 드라이브는 종종 m4a를 audio/x-m4a 등으로 주는데, API는 이를 거부할 수 있음.
   */
  getCorrectMimeType: function(filename, originalMimeType) {
    const lowerName = filename.toLowerCase();
    
    // 문서에 명시된 지원 포맷으로 강제 매핑
    if (lowerName.endsWith(".m4a")) return "audio/m4a";
    if (lowerName.endsWith(".mp3")) return "audio/mp3";
    if (lowerName.endsWith(".wav")) return "audio/wav";
    if (lowerName.endsWith(".aac")) return "audio/aac";
    if (lowerName.endsWith(".flac")) return "audio/flac";
    if (lowerName.endsWith(".mp4")) return "audio/mp4";
    
    // 매핑되지 않는 경우 원본 사용
    return originalMimeType || "audio/m4a"; 
  },

  callGemini: function(audioBlob, promptText, filename, history, targetName) {
    if (!CONFIG.API_KEY) {
      throw new Error("API KEY가 설정되지 않았습니다. 스크립트 속성을 확인하세요.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL_NAME}:generateContent?key=${CONFIG.API_KEY}`;
    
    // 프롬프트 내 변수 치환
    const finalPrompt = promptText
      .replace("{FILENAME}", filename)
      .replace("{TARGET_NAME}", targetName || "알수없음")
      .replace("{HISTORY}", history);

    // 오디오 데이터를 Base64로 인코딩
    const audioBase64 = Utilities.base64Encode(audioBlob.getBytes());
    
    // [수정] 정확한 MIME Type 설정
    const mimeType = this.getCorrectMimeType(filename, audioBlob.getContentType());
    console.log(`[Gemini Request] File: ${filename}, MimeType: ${mimeType}, Model: ${CONFIG.MODEL_NAME}`);

    const payload = {
      contents: [{
        parts: [
          { text: finalPrompt },
          { inline_data: { mime_type: mimeType, data: audioBase64 } }
        ]
      }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // [재시도 로직]
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          const waitTime = attempt * 2000;
          console.warn(`[Gemini API] 재시도 ${attempt}/${MAX_RETRIES} - ${waitTime}ms 대기`);
          Utilities.sleep(waitTime);
        }

        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();

        // 200 OK가 아니면 에러 처리
        if (responseCode !== 200) {
          throw new Error(`HTTP Error ${responseCode}: ${responseText}`);
        }

        const resData = JSON.parse(responseText);
        
        if (resData.error) {
          throw new Error(`API Error: ${resData.error.message}`);
        }
        
        if (resData.candidates && resData.candidates[0] && resData.candidates[0].content) {
            const text = resData.candidates[0].content.parts[0].text;
            if (text.includes("분석제외")) return "분석제외";
            return cleanJsonString(text);
        } else {
            throw new Error("유효한 응답 데이터가 없습니다.");
        }

      } catch (e) {
        console.error(`Gemini API 시도 ${attempt} 실패:`, e.message);
        lastError = e;
        
        // 400번대(Bad Request)는 재시도해도 실패하므로 중단
        // 단, 429(Too Many Requests)는 재시도 필요
        if (e.message.includes("HTTP Error 4") && !e.message.includes("429")) {
          console.error("재시도 불가능한 오류(4xx)입니다.");
          break;
        }
      }
    }

    throw lastError || new Error("Gemini API 호출 최종 실패");
  }
};
