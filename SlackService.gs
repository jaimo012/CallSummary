/**
 * SlackService.gs
 * 분석 결과를 슬랙으로 전송합니다. (Block Kit 사용)
 */

const SlackService = {
  sendNotification: function(rowData, analysisResult) {
    if (!CONFIG.SLACK_WEBHOOK_URL) {
      console.log("Slack Webhook URL이 설정되지 않아 알림을 건너뜁니다.");
      return;
    }

    try {
      let messagePayload = {};
      
      // 1. 분석 제외 알림
      if (analysisResult === "분석제외") {
        messagePayload = {
          "text": `💤 [분석 제외] ${rowData.fileName}`,
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `*💤 분석 제외 (모닝콜/부재중)*\n파일명: ${rowData.fileName}`
              }
            }
          ]
        };
      } 
      // 2. 정상 분석 완료 알림
      else {
        const data = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
        
        const isGirlfriend = (data.final_type === "여자친구");
        const emoji = isGirlfriend ? "❤️" : "💼";
        const targetName = data.inferred_name || rowData.targetName;
        
        const blocks = [
          {
            "type": "header",
            "text": { "type": "plain_text", "text": `${emoji} 통화 분석 완료: ${targetName}`, "emoji": true }
          },
          {
            "type": "section",
            "fields": [
              { "type": "mrkdwn", "text": `*👤 상대방:*\n${targetName}` },
              { "type": "mrkdwn", "text": `*🏷️ 유형:*\n${data.final_type}` }
            ]
          },
          {
            "type": "section",
            "text": { "type": "mrkdwn", "text": `*🎯 통화 목적:*\n${data.call_purpose || "내용 없음"}` }
          }
        ];

        // [일정 논의 섹션]
        if (Array.isArray(data.schedule_discussion) && data.schedule_discussion.length > 0) {
          const scheduleText = data.schedule_discussion.map(item => {
            return `🗓️ *${item.date}*\n   📍 장소: ${item.location}\n   📝 내용: ${item.content}`;
          }).join("\n\n");

          blocks.push({ "type": "divider" });
          blocks.push({
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*📅 일정 및 약속 체크*\n${scheduleText}`
            }
          });
        } 
        else if (typeof data.schedule_discussion === 'string' && data.schedule_discussion.length > 5) {
          blocks.push({ "type": "divider" });
          blocks.push({
            "type": "section",
            "text": { "type": "mrkdwn", "text": `*📅 일정 논의*\n${data.schedule_discussion}` }
          });
        }

        // [주요 내용 섹션] (글자 수 제한 2500자)
        blocks.push({ "type": "divider" });
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*📝 요약 내용:*\n${(data.main_content || "").substring(0, 2500)}${(data.main_content?.length > 2500) ? "..." : ""}`
          }
        });

        // [★ 추가됨] 향후 계획 섹션
        if (data.future_plans && data.future_plans.length > 5) {
          blocks.push({ "type": "divider" });
          blocks.push({
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*🚀 향후 계획:*\n${data.future_plans}`
            }
          });
        }

        // [문자 초안 섹션]
        if (data.msg_draft && data.msg_draft.length > 5) {
          blocks.push({
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*💬 문자 초안:*\n>>> ${data.msg_draft}`
            }
          });
        }

        // 하단 메타데이터
        blocks.push({
          "type": "context",
          "elements": [{ "type": "mrkdwn", "text": `파일명: ${rowData.fileName}` }]
        });

        messagePayload = { "text": `${emoji} 분석 완료: ${targetName}`, "blocks": blocks };
      }

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(messagePayload)
      };

      UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
      console.log(`Slack 알림 전송 완료: ${rowData.fileName}`);

    } catch (e) {
      console.error("Slack 전송 실패:", e);
    }
  }
};
