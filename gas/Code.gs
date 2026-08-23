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
    
    var sheetName = "\uD83D\uDC64 " + name; // "👤 " + name
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
  var sheet = range.getSheet();
  
  // 「❓ 質問箱」シートのG列（回答本文）が編集された場合
  if (sheet.getName() === "\u2753 \u8CEA\u554F\u7BB1" && range.getColumn() === 7 && range.getRow() > 1) {
    var row = range.getRow();
    var answerText = range.getValue().toString().trim();
    
    // 回答本文が空でなく、かつ「未回答」という初期文字列以外が入力された場合に「回答済」とする
    if (answerText !== "" && answerText !== "\u672A\u56DE\u7B54") { // "未回答"
      sheet.getRange(row, 6).setValue("\u56DE\u7B54\u6E08"); // "回答済"
      sheet.getRange(row, 8).setValue(new Date().toLocaleString("ja-JP")); // 回答日時
    } else {
      sheet.getRange(row, 6).setValue("\u672A\u56DE\u7B54"); // "未回答"
      sheet.getRange(row, 8).clearContent();
    }
  }
}

// ============================================
// 3. Helper to register/update student email dynamically in sheet
// ============================================
function registerStudentEmail(ss, studentName, email) {
  if (!studentName) return;
  if (email === undefined) return;
  
  try {
    var studentSheet = ss.getSheetByName("\u2699\uFE0F \u751F\u5F92\u30E1\u30FC\u30EB\u8C2D\u5B9A"); // "⚙️ 生徒メール設定"
    if (!studentSheet) {
      studentSheet = ss.insertSheet("\u2699\uFE0F \u751F\u5F92\u30E1\u30FC\u30EB\u8C2D\u5B9A", 6);
      studentSheet.appendRow(["\u751F\u5F92\u540D", "\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u30A2\u30C5\u30EC\u30B9", "\u66F4\u65B0\u65E5\u6642"]); // ["生徒名", "通知先メールアドレス", "更新日時"]
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
      // 値が変わっている場合のみ更新
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
  
  // 1. リクエスト内に生徒名とメールアドレスが両方存在すれば、自動的に登録シートを更新
  if (studentName && emailFromPayload !== undefined && emailFromPayload.toString().trim() !== "") {
    registerStudentEmail(ss, studentName, emailFromPayload);
    return emailFromPayload.toString().trim();
  }
  
  // 空送信などの場合もシート状態を保証
  if (studentName && emailFromPayload !== undefined) {
    registerStudentEmail(ss, studentName, emailFromPayload);
  }

  // 2. 「⚙️ 基本設定」から共通のデフォルト通知先アドレスを取得
  try {
    var configSheet = ss.getSheetByName("\u2699\uFE0F \u57FA\u672C\u8C2D\u5B9A"); // "⚙️ 基本設定"
    if (configSheet) {
      var rows = configSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === "\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u30A2\u30C5\u30EC\u30B9") { // "通知先メールアドレス"
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

  // 3. 「⚙️ 生徒メール設定」から、今回の生徒に設定されたアドレスを優先取得
  if (studentName) {
    try {
      var studentSheet = ss.getSheetByName("\u2699\uFE0F \u751F\u5F92\u30E1\u30FC\u30EB\u8C2D\u5B9A"); // "⚙️ 生徒メール設定"
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
    
    // 生徒名に紐付けられたメールアドレスを動的取得 ＆ 自動登録
    var myEmail = getNotificationEmail(ss, data); 
    
    // --------------------------------------------
    // A. Register Student Email (register_student_email)
    // --------------------------------------------
    if (data.action === "register_student_email") {
      // getNotificationEmail内で登録・更新自体は行われるため、成功ステータスのみ返却
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
      
      // 既存の自動入力による誤判定を防ぐため、G列(回答本文)とH列(回答日時)には明示的に空文字 "" を入れて追記します
      var questionSheet = ss.getSheetByName("\u2753 \u8CEA\u554F\u7BB1"); // "❓ 質問箱"
      questionSheet.appendRow([data.timestamp, data.studentName, data.title, data.text, imageUrl, "\u672A\u56DE\u7B54", "", ""]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "question" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // C. Get Question List (get_questions)
    // --------------------------------------------
    if (data.action === "get_questions") {
      var questionSheet = ss.getSheetByName("\u2753 \u8CEA\u554F\u7BB1"); // "❓ 質問箱"
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
      
      // Newest questions first
      studentQuestions.reverse();
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", questions: studentQuestions }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // D. Pomodoro Timer Log (pomodoro_log)
    // --------------------------------------------
    if (data.action === "pomodoro_log") {
      var pomoSheet = ss.getSheetByName("\u23F1\uFE0F \u81EA\u7FD2\u30FB\u30DD\u30E2\u30C9\u30FC\u30ED\u30ED\u30B0"); // "⏱️ 自習・ポモドーロログ"
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
      var pomoSheet = ss.getSheetByName("\u23F1\uFE0F \u81EA\u7FD2\u30FB\u30DD\u30E2\u30C9\u30FC\u30ED\u30ED\u30B0"); // "⏱️ 自習・ポモドーロログ"
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
      
      var bugSheet = ss.getSheetByName("\uD83D\uDEA8 \u4E0D\u5177\u5408\u5831\u544A\u4E00\u89A7"); // "🚨 不具合報告一覧"
      bugSheet.appendRow([data.timestamp, data.studentName, data.questionId, data.issueType, data.description, data.questionText]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "report" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // F. Import Textbook Mapping (import_textbook_mapping)
    // --------------------------------------------
    if (data.action === "import_textbook_mapping") {
      var mappingSheet = ss.getSheetByName("\uD83D\uDCD6 \u6559\u6750\u30DE\u30C3\u30D4\u30F3\u30B0"); // "📖 教材マッピング"
      if (!mappingSheet) {
        mappingSheet = ss.insertSheet("\uD83D\uDCD6 \u6559\u6750\u30DE\u30C3\u30D4\u30F3\u30B0", 4);
      }
      
      mappingSheet.clear();
      mappingSheet.appendRow(["\u30DA\u30FC\u30B8", "\u5358\u5143\u540D", "\u30C6\u30FC\u30DE\u540D", "\u96E3\u6613\u5EA6", "\u554F\u984C\u6570"]); // ["ページ", "単元名", "テーマ名", "難易度", "問題数"]
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
    
    var studentSheetName = "\uD83D\uDC64 " + (data.studentName || "Guest"); // "👤 " + name
    var studentSheet = ss.getSheetByName(studentSheetName);
    if (!studentSheet) {
      var sheetsCount = ss.getSheets().length;
      studentSheet = ss.insertSheet(studentSheetName, sheetsCount);
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
  var summarySheet = ss.getSheetByName("\uD83D\uDCCA \u7DCF\u5408\u30B5\u30DE\u30EA\u30FC"); // "📊 総合サマリー"
  if (!summarySheet) {
    summarySheet = ss.insertSheet("\uD83D\uDCCA \u7DCF\u5408\u30B5\u30DE\u30EA\u30FC", 0);
    summarySheet.appendRow(["生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
    summarySheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // 2. Bug Report Sheet
  var bugSheet = ss.getSheetByName("\uD83D\uDEA8 \u4E0D\u5177\u5408\u5831\u544A\u4E00\u89A7"); // "🚨 不具合報告一覧"
  if (!bugSheet) {
    bugSheet = ss.insertSheet("\uD83D\uDEA8 \u4E0D\u5177\u5408\u5831\u544A\u4E00\u89A7", 1);
    bugSheet.appendRow(["日時", "生徒名", "問題ID", "不具合種類", "詳細内容", "問題テキスト"]);
    bugSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#fee2e2");
  }

  // 3. Question Box Sheet
  var questionSheet = ss.getSheetByName("\u2753 \u8CEA\u554F\u7BB1"); // "❓ 質問箱"
  if (!questionSheet) {
    questionSheet = ss.insertSheet("\u2753 \u8CEA\u554F\u7BB1", 2);
    questionSheet.appendRow(["日時", "生徒名", "タイトル", "質問本文", "画像リンク", "ステータス", "回答本文", "回答日時"]);
    questionSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#fef3c7");
  } else {
    // Add columns G & H header if they do not exist
    if (questionSheet.getLastColumn() < 8) {
      questionSheet.getRange("G1").setValue("\u56DE\u7B54\u672C\u6587"); // "回答本文"
      questionSheet.getRange("H1").setValue("\u56DE\u7B54\u65E5\u6642"); // "回答日時"
      questionSheet.getRange("G1:H1").setFontWeight("bold").setBackground("#fef3c7");
    }
  }

  // 4. Pomodoro Log Sheet
  var pomoSheet = ss.getSheetByName("\u23F1\uFE0F \u81EA\u7FD2\u30FB\u30DD\u30E2\u30C9\u30FC\u30ED\u30ED\u30B0"); // "⏱️ 自習・ポモドーロログ"
  if (!pomoSheet) {
    pomoSheet = ss.insertSheet("\u23F1\uFE0F \u81EA\u7FD2\u30FB\u30DD\u30E2\u30C9\u30FC\u30ED\u30ED\u30B0", 3);
    pomoSheet.appendRow(["日時", "生徒名", "教科", "イベント", "経過時間(秒)", "アラーム後放置時間(秒)", "学習内容/メモ"]);
    pomoSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#e0f2fe");
  } else {
    if (pomoSheet.getLastColumn() < 7) {
      pomoSheet.getRange("F1").setValue("アラーム後放置時間(\u79D2)"); // "アラーム後放置時間(秒)"
      pomoSheet.getRange("G1").setValue("\u5B66\u7FD2\u5185\u5B89/\u30E1\u30E2"); // "学習内容/メモ"
      pomoSheet.getRange("F1:G1").setFontWeight("bold").setBackground("#e0f2fe");
    }
  }

  // 5. Textbook Mapping Sheet
  var mappingSheet = ss.getSheetByName("\uD83D\uDCD6 \u6559\u6750\u30DE\u30C3\u30D4\u30F3\u30B0"); // "📖 教材マッピング"
  if (!mappingSheet) {
    mappingSheet = ss.insertSheet("\uD83D\uDCD6 \u6559\u6750\u30DE\u30C3\u30D4\u30F3\u30B0", 4);
    mappingSheet.appendRow(["\u30DA\u30FC\u30B8", "\u5358\u5143\u540D", "\u30C6\u30FC\u30DE\u540D", "\u96E3\u6613\u5EA6", "\u554F\u984C\u6570"]); // ["ページ", "単元名", "テーマ名", "難易度", "問題数"]
    mappingSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#dcfce7");
  }

  // 6. Config Sheet (⚙️ 基本設定)
  var configSheet = ss.getSheetByName("\u2699\uFE0F \u57FA\u672C\u8C2D\u5B9A"); // "⚙️ 基本設定"
  if (!configSheet) {
    configSheet = ss.insertSheet("\u2699\uFE0F \u57FA\u672C\u8C2D\u5B9A", 5);
    configSheet.appendRow(["\u8C2D\u5B9A\u9805\u76EE", "\u8C2D\u5B9A\u5024", "\u8AAC\u660E"]); // ["設定項目", "設定値", "説明"]
    configSheet.appendRow([
      "\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u30A2\u30C5\u30EC\u30B9", // "通知先メールアドレス"
      "ktgiyey@gmail.com",
      "\u30C6\u30B9\u30C8\u7D50\u679C\u3084\u8CEA\u554F\u306E\u901A\u77E5\u5148\u003B\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3067\u8207\u6570\u6307\u5B9A\u53EF\u80FD\u3002" // "テスト結果や質問の通知先。カンマ区切りで複数指定可能。"
    ]);
    configSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f1f5f9");
    configSheet.getRange("A1:C2").setBorder(true, true, true, true, true, true);
  }

  // 7. Student-Specific Email Config Sheet (⚙️ 生徒メール設定)
  var studentSheet = ss.getSheetByName("\u2699\uFE0F \u751F\u5F92\u30E1\u30FC\u30EB\u8C2D\u5B9A"); // "⚙️ 生徒メール設定"
  if (!studentSheet) {
    studentSheet = ss.insertSheet("\u2699\uFE0F \u751F\u5F92\u30E1\u30FC\u30EB\u8C2D\u5B9A", 6);
    studentSheet.appendRow(["\u751F\u5F92\u540D", "\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u30A2\u30C5\u30EC\u30B9", "\u66F4\u65B0\u65E5\u6642"]); // ["生徒名", "通知先メールアドレス", "更新日時"]
    studentSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#fee2e2");
  }
}

// ============================================
// 7. Update Summary Sheet Formulas
// ============================================
function updateSummarySheet(ss) {
  var summarySheet = ss.getSheetByName("\uD83D\uDCCA \u7DCF\u5408\u30B5\u30DE\u30EA\u30FC"); // "📊 総合サマリー"
  if (!summarySheet) return;
  
  summarySheet.clear();
  summarySheet.appendRow(["生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
  summarySheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e2e8f0");
  
  var sheets = ss.getSheets();
  var studentNames = [];
  
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName();
    if (sheetName.indexOf("\uD83D\uDC64 ") === 0) { // "👤 "
      studentNames.push(sheetName.replace("\uD83D\uDC64 ", ""));
    }
  }
  
  if (studentNames.length > 0) {
    var formulas = [];
    for (var k = 0; k < studentNames.length; k++) {
      var name = studentNames[k];
      var rowNum = k + 2; 
      
      formulas.push([
        name,
        "=COUNTA('\uD83D\uDC64 " + name + "'!A:A) - 1",
        "=IFERROR(SUM('\uD83D\uDC64 " + name + "'!C:C) / SUM('\uD83D\uDC64 " + name + "'!D:D), 0)",
        "=IFERROR(INDEX('\uD83D\uDC64 " + name + "'!A:A, B" + rowNum + " + 1), \"-\")"
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
