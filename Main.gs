/**
 * Main.gs
 * 전체 로직 흐름: 파일 스캔 -> (5초 대기) -> AI 분석 -> 시트/슬랙 업데이트
 */

function runAnalysisBot() {
  const startTime = new Date().getTime();

  // 1. 신규 파일 등록 및 5초 대기 (시트 함수 계산 시간 확보)
  processNewFilesChunk();

  // 2. 분석 대상(함수값이 계산된 상태) 가져오기
  const pendingRows = SheetService.getPendingRows();
  console.log(`분석 대기: ${pendingRows.length}건`);

  // 3. 순차 분석
  for (const row of pendingRows) {
    // 4분 실행 제한 체크 (트리거 타임아웃 방지)
    if (new Date().getTime() - startTime > CONFIG.TIME_LIMIT_MS) {
      console.log("시간 제한(4분) 도달. 종료. 다음 트리거에서 이어서 실행됩니다.");
      break;
    }

    try {
      analyzeSingleRow(row);
      // 데이터 안정성을 위해 매 건마다 저장
      SpreadsheetApp.flush(); 
    } catch (e) {
      console.error(`Row ${row.rowIndex} Error:`, e);
    }
  }
}

/**
 * 신규 파일을 시트에 등록하고 함수 계산을 기다립니다.
 */
function processNewFilesChunk() {
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFiles();
  const existingNames = new Set(SheetService.getExistingFilenames());
  
  const newFiles = [];
  while (files.hasNext()) {
    const file = files.next();
    if (!existingNames.has(file.getName())) {
      newFiles.push(file);
    }
  }

  // 신규 파일이 있는 경우에만 실행
  if (newFiles.length > 0) {
    SheetService.addNewFilesAndFlush(newFiles);
  }
}

/**
 * 개별 행(파일)을 분석하고 결과를 저장/알림 보냅니다.
 */
function analyzeSingleRow(row) {
  console.log(`분석 시작: ${row.fileName} (유형: ${row.callType})`);

  // 오디오 파일 가져오기
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFilesByName(row.fileName);
  if (!files.hasNext()) return;
  const audioBlob = files.next().getBlob();

  // 과거 이력 가져오기
  const history = row.phoneNumber ? SheetService.getHistoryLog(row.phoneNumber) : "이력 없음";

  // 프롬프트 선택 (여자친구 vs 업무/기타)
  const prompt = (row.callType === "여자친구") ? PROMPTS.GIRLFRIEND : PROMPTS.BUSINESS;

  // AI 분석 실행
  const result = GeminiService.callGemini(audioBlob, prompt, row.fileName, history, row.targetName);

  // 시트 업데이트 (이름/유형 보정 포함)
  SheetService.updateAnalysisResult(row.rowIndex, result, row);
  
  // Slack 알림 전송 (보기 좋은 Block Kit 적용)
  SlackService.sendNotification(row, result);
}

/**
 * 초기 설정: 5분 단위 트리거 생성
 */
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('runAnalysisBot').timeBased().everyMinutes(5).create();
  console.log("5분 자동 실행 트리거가 설정되었습니다.");
}
