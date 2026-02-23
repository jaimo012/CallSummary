/**
 * SheetService.gs
 * 구글 시트와의 입출력 및 데이터 처리를 담당합니다.
 */

const SheetService = {
  getSheet: function() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    return ss.getSheetByName(CONFIG.SHEET_NAME);
  },

  /**
   * 시트에 이미 등록된 파일명 목록을 가져옵니다 (중복 방지).
   */
  getExistingFilenames: function() {
    const sheet = this.getSheet();
    // B열 전체를 읽되, 데이터가 있는 곳까지만 읽어서 성능 최적화
    // 함수가 들어있는 행 때문에 getLastRow가 깊을 수 있으므로 넉넉히 읽습니다.
    const lastRow = sheet.getLastRow(); 
    if (lastRow < 2) return [];
    
    // FILENAME 컬럼에서 데이터 가져오기
    return sheet.getRange(2, COLUMNS.FILENAME + 1, lastRow - 1, 1).getValues().map(r => r[0]).filter(n => n);
  },

  /**
   * [중요 수정] 신규 파일을 B열이 비어있는 첫 번째 위치에 추가합니다.
   * C~F열에 함수가 미리 채워져 있어도, B열 빈칸을 정확히 찾아냅니다.
   */
  addNewFilesAndFlush: function(fileList) {
    if (fileList.length === 0) return;

    const sheet = this.getSheet();
    
    // 1. B열(파일명) 데이터를 모두 가져옵니다.
    // 시트 전체 행(MaxRows)을 기준으로 B열만 스캔합니다.
    const maxRows = sheet.getMaxRows();
    const bColumnValues = sheet.getRange(1, COLUMNS.FILENAME + 1, maxRows, 1).getValues();
    
    // 2. 위에서부터 훑으며 B열이 비어있는 첫 번째 행(Row Index)을 찾습니다.
    let insertRowIndex = -1;
    for (let i = 0; i < bColumnValues.length; i++) {
      if (bColumnValues[i][0] === "") {
        insertRowIndex = i + 1; // 배열 인덱스는 0부터, 엑셀 행은 1부터 시작하므로 +1
        break;
      }
    }

    // 만약 빈 행을 못 찾았다면(꽉 찼다면), 맨 마지막에 추가합니다.
    if (insertRowIndex === -1) {
      insertRowIndex = maxRows + 1;
    }

    // 3. 찾은 위치에 데이터 입력 (A열:생성일시, B열:파일명)
    const newRows = fileList.map(file => [
      formatDate(file.getDateCreated()), 
      file.getName()
    ]);

    // insertRowIndex 위치부터 A, B열(2개 열)에 덮어씁니다.
    sheet.getRange(insertRowIndex, 1, newRows.length, 2).setValues(newRows);
    
    console.log(`${newRows.length}개의 신규 파일 추가 (Row: ${insertRowIndex}). 시트 함수 계산 대기 중(5초)...`);
    SpreadsheetApp.flush(); 
    Utilities.sleep(5000);  
  },

  /**
   * 분석할 대상(파일명은 있고 주요내용은 비어있는 행)을 가져옵니다.
   */
  getPendingRows: function() {
    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow(); // 함수가 있는 곳까지 읽어도 상관없음 (필터링하므로)
    if (lastRow < 2) return [];

    // A열(0) ~ J열(9) 까지 총 10개 열 읽기
    const range = sheet.getRange(2, 1, lastRow - 1, 10);
    const values = range.getValues();
    const pendingRows = [];
    
    values.forEach((row, index) => {
      const fileName = row[COLUMNS.FILENAME];
      const mainContent = row[COLUMNS.CONTENT];
      
      // 파일명은 존재하나, 분석 결과(CONTENT)가 비어있는 경우 대상 선정
      // (함수만 있고 파일명이 없는 빈 행은 여기서 자동으로 걸러집니다)
      if (fileName && fileName !== "" && mainContent === "") {
        pendingRows.push({
          rowIndex: index + 2, 
          fileName: fileName,
          targetName: row[COLUMNS.TARGET_NAME], 
          phoneNumber: String(row[COLUMNS.PHONE]).trim(), 
          callType: row[COLUMNS.TYPE] 
        });
      }
    });
    return pendingRows;
  },

  /**
   * 특정 전화번호의 과거 이력 10건 조회
   */
  getHistoryLog: function(targetPhoneNumber) {
    if (!targetPhoneNumber) return "과거 이력 없음";

    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return "과거 이력 없음";

    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const cleanNum = String(targetPhoneNumber).replace(/[-\s]/g, "");
    
    const history = data.filter(row => {
      const p = String(row[COLUMNS.PHONE]).replace(/[-\s]/g, "");
      const content = String(row[COLUMNS.CONTENT]);

      return p.includes(cleanNum) && 
             content !== "" && 
             !content.includes("분석제외");
    });

    history.sort((a, b) => {
        const dateA = a[COLUMNS.CALL_DATE] ? new Date(a[COLUMNS.CALL_DATE]) : new Date(a[COLUMNS.DATE]);
        const dateB = b[COLUMNS.CALL_DATE] ? new Date(b[COLUMNS.CALL_DATE]) : new Date(b[COLUMNS.DATE]);
        return dateB - dateA;
    });

    const formattedLog = history.slice(0, 10).map(row => {
      const rawDate = row[COLUMNS.CALL_DATE] || row[COLUMNS.DATE];
      const date = formatDate(new Date(rawDate));
      const content = row[COLUMNS.CONTENT].substring(0, 100).replace(/\n/g, " ") + "..."; 
      const schedule = row[COLUMNS.SCHEDULE] ? row[COLUMNS.SCHEDULE].toString().replace(/\n/g, " ") : "없음";
      
      return `- [${date}] ${content} / 일정: ${schedule}`;
    });

    return formattedLog.length > 0 ? formattedLog.join("\n") : "과거 이력 없음";
  },

  /**
   * AI 분석 결과를 시트에 업데이트합니다.
   */
  updateAnalysisResult: function(rowIndex, resultJson, originalRowData) {
    const sheet = this.getSheet();
    
    if (resultJson === "분석제외") {
       sheet.getRange(rowIndex, COLUMNS.CONTENT + 1).setValue("분석제외 (모닝콜 등)");
       return;
    }

    try {
      const data = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;

      if (originalRowData.targetName === "알수없음" && data.inferred_name && data.inferred_name !== "신원미상") {
          sheet.getRange(rowIndex, COLUMNS.TARGET_NAME + 1).setValue(data.inferred_name);
      }

      if (data.final_type && data.final_type !== originalRowData.callType) {
        sheet.getRange(rowIndex, COLUMNS.TYPE + 1).setValue(data.final_type);
      }

      const combinedContent = `[목적: ${data.call_purpose || ""}]\n\n${data.main_content || ""}`;
      
      let scheduleStr = "";
      if (Array.isArray(data.schedule_discussion) && data.schedule_discussion.length > 0) {
        scheduleStr = data.schedule_discussion.map(s => `[${s.date}] ${s.location} - ${s.content}`).join("\n");
      } else if (typeof data.schedule_discussion === 'string') {
        scheduleStr = data.schedule_discussion;
      }

      sheet.getRange(rowIndex, COLUMNS.CONTENT + 1).setValue(combinedContent);
      sheet.getRange(rowIndex, COLUMNS.SCHEDULE + 1).setValue(scheduleStr);
      sheet.getRange(rowIndex, COLUMNS.FUTURE + 1).setValue(data.future_plans || "");
      sheet.getRange(rowIndex, COLUMNS.DRAFT + 1).setValue(data.msg_draft || "");

    } catch (e) {
      console.error(`Row ${rowIndex} Update Error:`, e);
      sheet.getRange(rowIndex, COLUMNS.CONTENT + 1).setValue("Error: " + e.message);
    }
  }
};
