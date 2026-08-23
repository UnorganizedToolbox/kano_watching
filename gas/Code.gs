// ============================================
// 1. Spreadsheet Menu Setup (onOpen)
// ============================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('LMS Menu')
      .addItem('Go to Student Sheet', 'selectStudentSheet')
      .addToUi();
}

// 生徒名を入力して、該当シートへ瞬時にジャンプするマクロ
function selectStudentSheet() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Go to Student Sheet', 'Enter student name:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    var name = response.getResponseText().trim();
    if (!name) {
      ui.alert('Error', 'Name is empty.', ui.ButtonSet.OK);
      return;
    }
    
    var sheetName = "👤 " + name;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      ss.setActiveSheet(sheet);
    } else {
      ui.alert('Error', 'Sheet for ' + name + ' not found.', ui.ButtonSet.OK);
    }
  }
}

// ============================================
// 2. Auto status update trigger when Tutor edits answers
// ============================================
function onEdit(e) {
  var range = e.range;
  
  // 編集されたのがG列（回答本文）で、かつ2行目以降である場合のみシート確認などの重い処理を実行する
  if (range.getColumn() !== 7 || range.getRow() <= 1) return;
  
  var sheet = range.getSheet();
  if (sheet.getName() !== "❓ 質問箱") return;
  
  var row = range.getRow();
  var answerText = range.getValue().toString().trim();
  
  // 回答本文が空でなく、かつ「未回答」という初期文字列以外が入力された場合に「回答済」とする
  if (answerText !== "" && answerText !== "未回答") {
    sheet.getRange(row, 6).setValue("回答済");
    sheet.getRange(row, 8).setValue(new Date().toLocaleString("ja-JP")); // 回答日時
  } else {
    sheet.getRange(row, 6).setValue("未回答");
    sheet.getRange(row, 8).clearContent();
  }
}

// ============================================
// 3. Helper to register/update student email dynamically in sheet
// ============================================
function registerStudentEmail(ss, studentName, email) {
  if (!studentName) return;
  if (email === undefined) return;
  
  try {
    var studentSheet = ss.getSheetByName("⚙️ 生徒メール設定");
    if (!studentSheet) {
      studentSheet = ss.insertSheet("⚙️ 生徒メール設定");
      studentSheet.appendRow(["生徒名", "通知先メールアドレス", "更新日時"]);
      studentSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#fee2e2");
    }
    
    var rows = studentSheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === studentName) {
        foundIndex = i + 1; // 1-based index
        break;
      }
    }
    
    var nowStr = new Date().toLocaleString("ja-JP");
    if (foundIndex !== -1) {
      if (rows[foundIndex - 1][1] !== email) {
        studentSheet.getRange(foundIndex, 2).setValue(email);
        studentSheet.getRange(foundIndex, 3).setValue(nowStr);
      }
    } else {
      studentSheet.appendRow([studentName, email, nowStr]);
    }
  } catch (err) {
    Logger.log("Error registering student email: " + err.toString());
  }
}

// ============================================
// 4. Helper to read notification email dynamically
// ============================================
function getNotificationEmail(ss, data) {
  var defaultEmail = "ktgiyey@gmail.com";
  var studentName = data.studentName;
  var emailFromPayload = data.email;
  
  if (studentName && emailFromPayload !== undefined && emailFromPayload.toString().trim() !== "") {
    registerStudentEmail(ss, studentName, emailFromPayload);
    return emailFromPayload.toString().trim();
  }
  
  if (studentName && emailFromPayload !== undefined) {
    registerStudentEmail(ss, studentName, emailFromPayload);
  }

  try {
    var configSheet = ss.getSheetByName("⚙️ 基本設定");
    if (configSheet) {
      var rows = configSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === "通知先メールアドレス") {
          var val = rows[i][1].toString().trim();
          if (val !== "") {
            defaultEmail = val;
          }
        }
      }
    }
  } catch (err) {
    Logger.log("Error reading general config: " + err.toString());
  }

  if (studentName) {
    try {
      var studentSheet = ss.getSheetByName("⚙️ 生徒メール設定");
      if (studentSheet) {
        var rows = studentSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] === studentName) {
            var val = rows[i][1].toString().trim();
            if (val !== "") {
              return val;
            }
          }
        }
      }
    } catch (err) {
      Logger.log("Error reading student config: " + err.toString());
    }
  }
  
  return defaultEmail;
}

// ============================================
// 5. Data Router (doPost)
// ============================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    ensureStaticSheets(ss);
    
    var myEmail = getNotificationEmail(ss, data); 
    
    // --------------------------------------------
    // A. Register Student Email (register_student_email)
    // --------------------------------------------
    if (data.action === "register_student_email") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------
    // B. Question Box (question_to_tutor)
    // --------------------------------------------
    if (data.action === "question_to_tutor") {
      var attachments = [];
      var imageUrl = "";
      
      if (data.imageBase64) {
        try {
          var parts = data.imageBase64.split(",");
          var contentType = parts[0].split(":")[1].split(";")[0];
          var rawBase64 = parts[1];
          var decoded = Utilities.base64Decode(rawBase64);
          var blob = Utilities.newBlob(decoded, contentType, "question_" + Date.now() + ".jpg");
          
          attachments.push(blob);
          imageUrl = "Attached in Email";
        } catch (imageErr) {
          Logger.log("Image saving failed: " + imageErr.toString());
          imageUrl = "Error: " + imageErr.toString();
        }
      }

      var subject = "[Question Box] " + data.studentName + " sent a question";
      var body = "Question Box Details:\n" +
                 "-----------------------------------------\n" +
                 "Student: " + data.studentName + "\n" +
                 "Time: " + data.timestamp + "\n" +
                 "Title: " + data.title + "\n" +
                 "-----------------------------------------\n" +
                 "Content:\n" + data.text + "\n" +
                 (attachments.length > 0 ? "-----------------------------------------\nImage attached directly to this email.\n" : "");
      
      MailApp.sendEmail({
        to: myEmail,
        subject: subject,
        body: body,
        attachments: attachments
      });
      
      var questionSheet = ss.getSheetByName("❓ 質問箱");
      questionSheet.appendRow([data.timestamp, data.studentName, data.title, data.text, imageUrl, "未回答", "", ""]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "question" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // C. Get Question List (get_questions)
    // --------------------------------------------
    if (data.action === "get_questions") {
      var questionSheet = ss.getSheetByName("❓ 質問箱");
      if (!questionSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", questions: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rows = questionSheet.getDataRange().getValues();
      var studentQuestions = [];
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (row[1] === data.studentName) {
          studentQuestions.push({
            timestamp: row[0],
            title: row[2],
            text: row[3],
            imageUrl: row[4],
            status: row[5] || "未回答",
            answerText: row[6] || "",
            answerTimestamp: row[7] || ""
          });
        }
      }
      
      studentQuestions.reverse();
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", questions: studentQuestions }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // D. Pomodoro Timer Log (pomodoro_log)
    // --------------------------------------------
    if (data.action === "pomodoro_log") {
      var pomoSheet = ss.getSheetByName("⏱️ 自習・ポモドーロログ");
      pomoSheet.appendRow([
        data.timestamp,
        data.studentName,
        data.subject,
        data.event,
        data.elapsedSeconds,
        data.lagSeconds || 0,
        data.memo || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "pomodoro" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // D2. Get Pomodoro Logs (get_pomodoro_logs)
    // --------------------------------------------
    if (data.action === "get_pomodoro_logs") {
      var pomoSheet = ss.getSheetByName("⏱️ 自習・ポモドーロログ");
      if (!pomoSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rows = pomoSheet.getDataRange().getValues();
      var studentLogs = [];
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (row[1] === data.studentName) {
          studentLogs.push({
            timestamp: row[0],
            subject: row[2],
            event: row[3],
            elapsedSeconds: row[4],
            lagSeconds: row[5] || 0,
            memo: row[6] || ""
          });
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: studentLogs }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // E. Issue Report (report_issue)
    // --------------------------------------------
    if (data.action === "report_issue") {
      var subject = "[Bug Report] " + data.studentName + " reported an issue";
      var body = "Bug Report Details:\n" +
                 "-----------------------------------------\n" +
                 "Student: " + data.studentName + "\n" +
                 "Time: " + data.timestamp + "\n" +
                 "Question ID: " + data.questionId + "\n" +
                 "Type: " + (data.issueType === "math_garbled" ? "Math formula garbled" : "Wrong question text") + "\n" +
                 "Detail: " + data.description + "\n" +
                 "-----------------------------------------\n" +
                 "Question Text:\n" + data.questionText;
      MailApp.sendEmail(myEmail, subject, body);
      
      var bugSheet = ss.getSheetByName("🚨 不具合報告一覧");
      bugSheet.appendRow([data.timestamp, data.studentName, data.questionId, data.issueType, data.description, data.questionText]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "report" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // F. Import Textbook Mapping (import_textbook_mapping)
    // --------------------------------------------
    if (data.action === "import_textbook_mapping") {
      var mappingSheet = ss.getSheetByName("📖 教材マッピング");
      if (!mappingSheet) {
        mappingSheet = ss.insertSheet("📖 教材マッピング");
      }
      
      mappingSheet.clear();
      mappingSheet.appendRow(["ページ", "単元名", "テーマ名", "難易度", "問題数"]);
      mappingSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#dcfce7");
      
      var list = data.mappings || [];
      var rowsToWrite = [];
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        rowsToWrite.push([
          item.page,
          item.unit,
          item.topic,
          item.difficulty,
          item.question_count
        ]);
      }
      
      if (rowsToWrite.length > 0) {
        mappingSheet.getRange(2, 1, rowsToWrite.length, 5).setValues(rowsToWrite);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rowsToWrite.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // G. Normal Exam Result Log
    // --------------------------------------------
    var subject = "[Math Diagnosis] " + (data.studentName || "Guest") + " completed exam";
    var body = "Report Details\n" +
               "=========================================\n" +
               "Student: " + data.studentName + "\n" +
               "Subject: " + data.subjectName + "\n" +
               "Score: " + data.score + " / " + data.maxScore + "\n" +
               "Time: " + data.duration + "\n" +
               "=========================================\n\n" +
               "AI Diagnosis:\n" + data.weaknesses + "\n\n" +
               "Recommendation:\n" + data.recommendation;
    MailApp.sendEmail(myEmail, subject, body);
    
    var studentSheetName = "👤 " + (data.studentName || "Guest");
    var studentSheet = ss.getSheetByName(studentSheetName);
    if (!studentSheet) {
      studentSheet = ss.insertSheet(studentSheetName);
      studentSheet.appendRow(["実施日時", "単元・科目名", "獲得得点", "満点", "所要時間", "AI診断", "復習プラン"]);
    }
    studentSheet.appendRow([data.timestamp, data.subjectName, data.score, data.maxScore, data.duration, data.weaknesses, data.recommendation]);
    
    updateSummarySheet(ss);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "log" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// 6. Ensure Static Sheets Existence
// ============================================
function ensureStaticSheets(ss) {
  // 1. Summary Sheet
  var summarySheet = ss.getSheetByName("📊 総合サマリー");
  if (!summarySheet) {
    summarySheet = ss.insertSheet("📊 総合サマリー");
    summarySheet.appendRow(["生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
    summarySheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // 2. Bug Report Sheet
  var bugSheet = ss.getSheetByName("🚨 不具合報告一覧");
  if (!bugSheet) {
    bugSheet = ss.insertSheet("🚨 不具合報告一覧");
    bugSheet.appendRow(["日時", "生徒名", "問題ID", "不具合種類", "詳細内容", "問題テキスト"]);
    bugSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#fee2e2");
  }

  // 3. Question Box Sheet
  var questionSheet = ss.getSheetByName("❓ 質問箱");
  if (!questionSheet) {
    questionSheet = ss.insertSheet("❓ 質問箱");
    questionSheet.appendRow(["日時", "生徒名", "タイトル", "質問本文", "画像リンク", "ステータス", "回答本文", "回答日時"]);
    questionSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#fef3c7");
  } else {
    if (questionSheet.getLastColumn() < 8) {
      questionSheet.getRange("G1").setValue("回答本文");
      questionSheet.getRange("H1").setValue("回答日時");
      questionSheet.getRange("G1:H1").setFontWeight("bold").setBackground("#fef3c7");
    }
  }

  // 4. Pomodoro Log Sheet
  var pomoSheet = ss.getSheetByName("⏱️ 自習・ポモドーロログ");
  if (!pomoSheet) {
    pomoSheet = ss.insertSheet("⏱️ 自習・ポモドーロログ");
    pomoSheet.appendRow(["日時", "生徒名", "教科", "イベント", "経過時間(秒)", "アラーム後放置時間(秒)", "学習内容/メモ"]);
    pomoSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#e0f2fe");
  } else {
    if (pomoSheet.getLastColumn() < 7) {
      pomoSheet.getRange("F1").setValue("アラーム後放置時間(秒)");
      pomoSheet.getRange("G1").setValue("学習内容/メモ");
      pomoSheet.getRange("F1:G1").setFontWeight("bold").setBackground("#e0f2fe");
    }
  }

  // 5. Textbook Mapping Sheet
  var mappingSheet = ss.getSheetByName("📖 教材マッピング");
  if (!mappingSheet) {
    mappingSheet = ss.insertSheet("📖 教材マッピング");
    mappingSheet.appendRow(["ページ", "単元名", "テーマ名", "難易度", "問題数"]);
    mappingSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#dcfce7");
  }

  // 6. Config Sheet (⚙️ 基本設定)
  var configSheet = ss.getSheetByName("⚙️ 基本設定");
  if (!configSheet) {
    configSheet = ss.insertSheet("⚙️ 基本設定");
    configSheet.appendRow(["設定項目", "設定値", "説明"]);
    configSheet.appendRow([
      "通知先メールアドレス",
      "ktgiyey@gmail.com",
      "テスト結果や質問の通知先。カンマ区切りで複数指定可能。"
    ]);
    configSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f1f5f9");
    configSheet.getRange("A1:C2").setBorder(true, true, true, true, true, true);
  }

  // 7. Student-Specific Email Config Sheet (⚙️ 生徒メール設定)
  var studentSheet = ss.getSheetByName("⚙️ 生徒メール設定");
  if (!studentSheet) {
    studentSheet = ss.insertSheet("⚙️ 生徒メール設定");
    studentSheet.appendRow(["生徒名", "通知先メールアドレス", "更新日時"]);
    studentSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#fee2e2");
  }
}

// ============================================
// 7. Update Summary Sheet Formulas
// ============================================
function updateSummarySheet(ss) {
  var summarySheet = ss.getSheetByName("📊 総合サマリー");
  if (!summarySheet) return;
  
  summarySheet.clear();
  summarySheet.appendRow(["生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
  summarySheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e2e8f0");
  
  var sheets = ss.getSheets();
  var studentNames = [];
  
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName();
    if (sheetName.indexOf("👤 ") === 0) {
      studentNames.push(sheetName.replace("👤 ", ""));
    }
  }
  
  if (studentNames.length > 0) {
    var formulas = [];
    for (var k = 0; k < studentNames.length; k++) {
      var name = studentNames[k];
      var rowNum = k + 2; 
      
      formulas.push([
        name,
        "=COUNTA('👤 " + name + "'!A:A) - 1",
        "=IFERROR(SUM('👤 " + name + "'!C:C) / SUM('👤 " + name + "'!D:D), 0)",
        "=IFERROR(INDEX('👤 " + name + "'!A:A, B" + rowNum + " + 1), \"-\")"
      ]);
    }
    
    var range = summarySheet.getRange(2, 1, studentNames.length, 4);
    range.setValues(formulas);
    summarySheet.getRange(2, 3, studentNames.length, 1).setNumberFormat("0%");
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Running successfully.")
    .setMimeType(ContentService.MimeType.TEXT);
}
function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
