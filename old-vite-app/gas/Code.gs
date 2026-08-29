// ============================================
// 1. Spreadsheet Menu Setup (onOpen)
// ============================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('LMS Menu')
      .addItem('Go to Student Sheet', 'selectStudentSheet')
      .addItem('選択した申請を承認する (ID発行＆メール送信)', 'approveSelectedRequest')
      .addItem('システム初期化 (※全データ消去)', 'initializeSystem')
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
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var targetSheet = null;
    
    // 生徒ID_名前 の形式か、名前のみの形式で部分一致検索
    for (var i = 0; i < sheets.length; i++) {
      var sheetName = sheets[i].getName();
      if (sheetName.indexOf("👤 ") === 0 && sheetName.indexOf(name) !== -1) {
        targetSheet = sheets[i];
        break;
      }
    }
    
    if (targetSheet) {
      ss.setActiveSheet(targetSheet);
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
  if (range.getColumn() !== 8 || range.getRow() <= 1) return; // 列8 = 回答本文 (A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8)
  
  var sheet = range.getSheet();
  if (sheet.getName() !== "❓ 質問箱") return;
  
  var row = range.getRow();
  var answerText = range.getValue().toString().trim();
  
  // 回答本文が空でなく、かつ「未回答」という初期文字列以外が入力された場合に「回答済」とする
  if (answerText !== "" && answerText !== "未回答") {
    sheet.getRange(row, 7).setValue("回答済"); // 列7 = ステータス
    sheet.getRange(row, 9).setValue(new Date().toLocaleString("ja-JP")); // 列9 = 回答日時
  } else {
    sheet.getRange(row, 7).setValue("未回答");
    sheet.getRange(row, 9).clearContent();
  }
}

// ============================================
// 3. User Authentication Gatekeeper
// ============================================
function authenticateUser(ss, studentId) {
  if (!studentId) {
    return { success: false, message: "生徒IDが指定されていません。" };
  }
  
  try {
    var accountSheet = ss.getSheetByName("⚙️ アカウント設定");
    if (!accountSheet) {
      return { success: false, message: "アカウント設定シートが見つかりません。システム初期化を行ってください。" };
    }
    
    var rows = accountSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === studentId.toString().trim()) {
        var status = rows[i][3] ? rows[i][3].toString().trim() : "有効";
        if (status === "無効") {
          return { success: false, message: "この生徒IDは無効化されています。" };
        }
        return {
          success: true,
          studentName: rows[i][1].toString().trim(),
          email: rows[i][2].toString().trim()
        };
      }
    }
  } catch (err) {
    return { success: false, message: "認証中にデータベースエラーが発生しました: " + err.toString() };
  }
  
  return { success: false, message: "無効な生徒IDです。" };
}

// ============================================
// 4. Read notification email dynamically (Admin & Student)
// ============================================
function getNotificationEmails(ss, studentId, studentEmail) {
  var adminEmail = "ktgiyey@gmail.com";
  
  try {
    var configSheet = ss.getSheetByName("⚙️ システム設定");
    if (configSheet) {
      var rows = configSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === "管理者メールアドレス") {
          var val = rows[i][1].toString().trim();
          if (val !== "") adminEmail = val;
        }
      }
    }
  } catch (err) {
    Logger.log("Error reading general config: " + err.toString());
  }

  var recipientList = [adminEmail];
  
  // 生徒の登録メールアドレスを追加
  if (studentEmail && studentEmail.toString().trim() !== "") {
    recipientList.push(studentEmail.toString().trim());
  } else if (studentId) {
    var auth = authenticateUser(ss, studentId);
    if (auth.success && auth.email) {
      recipientList.push(auth.email);
    }
  }
  
  return recipientList.join(",");
}

// ============================================
// 5. Data Router (doPost)
// ============================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --------------------------------------------
    // A. Request Registration (利用申請) - 認証バイパス
    // --------------------------------------------
    if (data.action === "request_registration") {
      var requestSheet = ss.getSheetByName("⚙️ 承認待ちリスト");
      if (!requestSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "承認待ちリストシートがありません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var nowStr = new Date().toLocaleString("ja-JP");
      requestSheet.appendRow([nowStr, data.studentName, data.email, "承認待ち", ""]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "利用申請を受理しました。" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // B. Login Student (ログイン認証) - 認証バイパス
    // --------------------------------------------
    if (data.action === "login_student") {
      var accountSheet = ss.getSheetByName("⚙️ アカウント設定");
      if (!accountSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "アカウント設定シートがありません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rows = accountSheet.getDataRange().getValues();
      var foundUser = null;
      var inputId = (data.studentId || "").toString().trim();
      var inputPass = (data.password || "").toString().trim();
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0].toString().trim() === inputId) {
          foundUser = {
            id: rows[i][0],
            name: rows[i][1],
            email: rows[i][2],
            status: rows[i][3] ? rows[i][3].toString().trim() : "有効",
            password: rows[i][5] ? rows[i][5].toString().trim() : ""
          };
          break;
        }
      }
      
      if (!foundUser) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "生徒IDが見つかりません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (foundUser.status === "無効") {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "この生徒IDは無効化されています。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (foundUser.password !== inputPass) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "パスワードが一致しません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        studentName: foundUser.name,
        email: foundUser.email
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------
    // B2. 一時テストアカウント（Admin / Test）の作成 - 認証バイパス
    // --------------------------------------------
    if (data.action === "create_temp_test_admin_accounts") {
      var configSheet = ss.getSheetByName("⚙️ アカウント設定");
      if (!configSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "アカウント設定シートがありません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rows = configSheet.getDataRange().getValues();
      var testExists = false;
      var adminExists = false;
      var testId = "std_test";
      var adminId = "std_admin";
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === testId) testExists = true;
        if (rows[i][0] === adminId) adminExists = true;
      }
      
      var nowStr = new Date().toLocaleString("ja-JP");
      
      if (!testExists) {
        configSheet.appendRow([testId, "Test", "ktgiyey@gmail.com", "有効", nowStr, "12345"]);
      }
      if (!adminExists) {
        configSheet.appendRow([adminId, "Admin", "ktgiyey@gmail.com", "有効", nowStr, "12345"]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        testId: testId,
        adminId: adminId,
        password: "12345"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------
    // 以降のアクションはすべて「生徒ID」による認証を必須とする
    // --------------------------------------------
    var userAuth = authenticateUser(ss, data.studentId);
    if (!userAuth.success) {
      return ContentService.createTextOutput(JSON.stringify({ status: "unauthorized", message: userAuth.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // データペイロードの生徒名・メールを認証済みデータで強制上書き（改ざん防止）
    data.studentName = userAuth.studentName;
    data.email = userAuth.email;
    
    var emailList = getNotificationEmails(ss, data.studentId, data.email);

    // --------------------------------------------
    // B3. Test / Admin のテストデータとログの完全消去 (管理者機能)
    // --------------------------------------------
    if (data.action === "delete_test_admin_logs") {
      // Admin 権限チェック (ログイン名が Admin であること)
      if (userAuth.studentName !== "Admin") {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "この操作を実行する権限がありません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var targetNames = ["test", "admin"];
      var sheets = ss.getSheets();
      
      for (var s = 0; s < sheets.length; s++) {
        var sheet = sheets[s];
        var sheetName = sheet.getName();
        
        // 1. 生徒個別の詳細シートの削除 (👤 std_test_Test や 👤 std_admin_Admin など)
        var isTargetSheet = false;
        targetNames.forEach(function(tName) {
          if (sheetName.toLowerCase().indexOf(tName) !== -1) {
            isTargetSheet = true;
          }
        });
        
        if (isTargetSheet && sheetName.indexOf("👤") === 0) {
          ss.deleteSheet(sheet);
          continue;
        }
        
        // 2. その他のログシート内の行削除と行詰め
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) continue;
        
        var values = sheet.getDataRange().getValues();
        // 下から逆順ループで行削除
        for (var r = lastRow; r >= 2; r--) {
          var rowData = values[r - 1];
          var shouldDelete = false;
          
          for (var c = 0; c < rowData.length; c++) {
            var valStr = String(rowData[c]).toLowerCase();
            if (valStr === "test" || valStr === "admin" || valStr === "std_test" || valStr === "std_admin") {
              shouldDelete = true;
              break;
            }
          }
          
          if (shouldDelete) {
            sheet.deleteRow(r);
          }
        }
      }
      
      // 総合サマリー数式を再構成
      updateSummarySheet(ss);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "テストデータを削除し行詰めを完了しました。" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------
    // B4. Change Password (パスワード変更)
    // --------------------------------------------
    if (data.action === "change_password") {
      var accountSheet = ss.getSheetByName("⚙️ アカウント設定");
      if (!accountSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "アカウント設定シートがありません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rows = accountSheet.getDataRange().getValues();
      var userRowIndex = -1;
      var currentStoredPass = "";
      
      var targetId = data.studentId.toString().trim();
      var currentInputPass = (data.currentPassword || "").toString().trim();
      var newInputPass = (data.newPassword || "").toString().trim();
      
      if (!currentInputPass || !newInputPass) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "現在のパスワードと新しいパスワードを両方入力してください。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0].toString().trim() === targetId) {
          userRowIndex = i + 1; // 1-indexed
          currentStoredPass = rows[i][5] ? rows[i][5].toString().trim() : "";
          break;
        }
      }
      
      if (userRowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "対象のアカウントが見つかりません。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (currentStoredPass !== currentInputPass) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "現在のパスワードが間違っています。" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // Update password cell (F column = index 6)
      accountSheet.getRange(userRowIndex, 6).setValue(newInputPass);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "パスワードを更新しました。" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------
    // C. Question Box (question_to_tutor)
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

      var subject = "[質問箱] " + data.studentName + " さんから質問が届きました";
      var body = "個別指導 数学質問箱:\n" +
                 "-----------------------------------------\n" +
                 "生徒名: " + data.studentName + " (ID: " + data.studentId + ")\n" +
                 "送信日時: " + data.timestamp + "\n" +
                 "タイトル: " + data.title + "\n" +
                 "-----------------------------------------\n" +
                 "質問内容:\n" + data.text + "\n\n" +
                 (attachments.length > 0 ? "※画像がメールに添付されています。\n" : "") +
                 "-----------------------------------------\n" +
                 "回答は、スプレッドシートの「❓ 質問箱」シートに入力してください。";
      
      MailApp.sendEmail({
        to: emailList,
        subject: subject,
        body: body,
        attachments: attachments
      });
      
      var questionSheet = ss.getSheetByName("❓ 質問箱");
      // 投稿日時, 生徒ID, 生徒名, タイトル, 質問本文, 画像リンク, ステータス, 回答本文, 回答日時
      questionSheet.appendRow([data.timestamp, data.studentId, data.studentName, data.title, data.text, imageUrl, "未回答", "", ""]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "question" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // D. Get Question List (get_questions)
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
        if (row[1].toString().trim() === data.studentId.toString().trim()) {
          studentQuestions.push({
            timestamp: row[0],
            title: row[3],
            text: row[4],
            imageUrl: row[5],
            status: row[6] || "未回答",
            answerText: row[7] || "",
            answerTimestamp: row[8] || ""
          });
        }
      }
      
      studentQuestions.reverse();
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", questions: studentQuestions }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // E. Pomodoro Timer Log (pomodoro_log)
    // --------------------------------------------
    if (data.action === "pomodoro_log") {
      var pomoSheet = ss.getSheetByName("⏱️ 自習・ポモドーロログ");
      pomoSheet.appendRow([
        data.timestamp,
        data.studentId,
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
    // F. Get Pomodoro Logs (get_pomodoro_logs)
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
        if (row[1].toString().trim() === data.studentId.toString().trim()) {
          studentLogs.push({
            timestamp: row[0],
            subject: row[3],
            event: row[4],
            elapsedSeconds: row[5],
            lagSeconds: row[6] || 0,
            memo: row[7] || ""
          });
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: studentLogs }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // G. Issue Report (report_issue)
    // --------------------------------------------
    if (data.action === "report_issue") {
      var subject = "[不具合報告] " + data.studentName + " さんから報告";
      var body = "数学診断アプリ 不具合報告:\n" +
                 "-----------------------------------------\n" +
                 "生徒名: " + data.studentName + " (ID: " + data.studentId + ")\n" +
                 "報告日時: " + data.timestamp + "\n" +
                 "問題ID: " + data.questionId + "\n" +
                 "不具合種類: " + data.issueType + "\n" +
                 "詳細内容: " + data.description + "\n" +
                 "-----------------------------------------\n" +
                 "問題テキスト:\n" + data.questionText;
      
      MailApp.sendEmail(emailList, subject, body);
      
      var bugSheet = ss.getSheetByName("🚨 不具合報告一覧");
      bugSheet.appendRow([data.timestamp, data.studentId, data.studentName, data.questionId, data.issueType, data.description, data.questionText]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "report" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // --------------------------------------------
    // H. Import Textbook Mapping (import_textbook_mapping)
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
    // I. Normal Exam Result Log (submit_exam_result)
    // --------------------------------------------
    if (data.action === "submit_exam_result") {
      var subject = "[実力診断結果] " + data.studentName + " さんがテストを完了しました";
      var body = "数学実力診断レポート\n" +
                 "=========================================\n" +
                 "生徒名: " + data.studentName + " (ID: " + data.studentId + ")\n" +
                 "教科名: " + data.subjectName + "\n" +
                 "獲得得点: " + data.score + " / " + data.maxScore + "\n" +
                 "所要時間: " + data.duration + "\n" +
                 "=========================================\n\n" +
                 "AI分析結果:\n" + data.weaknesses + "\n\n" +
                 "おすすめの復習プラン:\n" + data.recommendation;
                 
      MailApp.sendEmail(emailList, subject, body);
      
      // 生徒個別シート名： 👤 [生徒ID]_[生徒名]
      var studentSheetName = "👤 " + data.studentId + "_" + data.studentName;
      var studentSheet = ss.getSheetByName(studentSheetName);
      if (!studentSheet) {
        studentSheet = ss.insertSheet(studentSheetName);
        studentSheet.appendRow(["実施日時", "単元・科目名", "獲得得点", "満点", "所要時間", "AI診断", "復習プラン"]);
        studentSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#fed7aa");
      }
      studentSheet.appendRow([data.timestamp, data.subjectName, data.score, data.maxScore, data.duration, data.weaknesses, data.recommendation]);
      
      updateSummarySheet(ss);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "log" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "指定されたアクションが存在しません。" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// 6. System Setup (All Clean and Rebuild)
// ============================================
function initializeSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var resp = ui.alert("⚠️ 警告 ⚠️", "スプレッドシートの完全初期化を実行します。既存のすべてのデータ、生徒ログ、質問箱、ポモドーロ履歴は完全に消去されます。本当によろしいですか？", ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  
  var doubleCheck = ui.alert("⚠️ 最終確認 ⚠️", "本当にデータを削除しますね？この操作は取り消せません。", ui.ButtonSet.YES_NO);
  if (doubleCheck !== ui.Button.YES) return;
  
  // 1枚ダミーシートを作って残りのシートを全削除
  var dummy = ss.insertSheet("SYSTEM_SETUP_TEMP");
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() !== "SYSTEM_SETUP_TEMP") {
      try {
        ss.deleteSheet(sheets[i]);
      } catch(e) {
        Logger.log("Delete failed: " + e.toString());
      }
    }
  }
  
  // 新しいシート構成を生成
  // 1. Summary Sheet
  var summarySheet = ss.insertSheet("📊 総合サマリー");
  summarySheet.appendRow(["生徒ID", "生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
  summarySheet.getRange("A1:E1").setFontWeight("bold").setBackground("#e2e8f0");
  
  // 2. Config Sheet (⚙️ システム設定)
  var configSheet = ss.insertSheet("⚙️ システム設定");
  configSheet.appendRow(["設定項目", "設定値", "説明"]);
  configSheet.appendRow(["管理者メールアドレス", "ktgiyey@gmail.com", "テスト結果や質問の通知先"]);
  configSheet.appendRow(["共用Gemini APIキー", "YOUR_SHARED_GEMINI_API_KEY", "生徒に自動提供する共用のAPIキー"]);
  configSheet.appendRow(["手順説明PDFのURL", "YOUR_DRIVE_PDF_URL", "承認メールに記載するAPIキー作成手順PDFのGoogleドライブURL"]);
  configSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f1f5f9");
  configSheet.getRange("A1:C4").setBorder(true, true, true, true, true, true);
  
  // 3. Account Sheet (⚙️ アカウント設定)
  var accountSheet = ss.insertSheet("⚙️ アカウント設定");
  accountSheet.appendRow(["生徒ID", "生徒名", "生徒メールアドレス", "アカウント状態", "登録日", "初期パスワード"]);
  accountSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#fee2e2");
  
  // 4. Request List Sheet (⚙️ 承認待ちリスト)
  var requestSheet = ss.insertSheet("⚙️ 承認待ちリスト");
  requestSheet.appendRow(["申請日時", "生徒名", "生徒メールアドレス", "ステータス", "発行ID"]);
  requestSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#dbeafe");
  
  // 5. Question Box Sheet (❓ 質問箱)
  var questionSheet = ss.insertSheet("❓ 質問箱");
  questionSheet.appendRow(["日時", "生徒ID", "生徒名", "タイトル", "質問本文", "画像リンク", "ステータス", "回答本文", "回答日時"]);
  questionSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#fef3c7");

  // 6. Pomodoro Log Sheet (⏱️ 自習・ポモドーロログ)
  var pomoSheet = ss.insertSheet("⏱️ 自習・ポモドーロログ");
  pomoSheet.appendRow(["日時", "生徒ID", "生徒名", "教科", "イベント", "経過時間(秒)", "アラーム後放置時間(秒)", "学習内容/メモ"]);
  pomoSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#e0f2fe");

  // 7. Bug Report Sheet (🚨 不具合報告一覧)
  var bugSheet = ss.insertSheet("🚨 不具合報告一覧");
  bugSheet.appendRow(["日時", "生徒ID", "生徒名", "問題ID", "不具合種類", "詳細内容", "問題テキスト"]);
  bugSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#fee2e2");
  
  // 8. Textbook Mapping Sheet
  var mappingSheet = ss.insertSheet("📖 教材マッピング");
  mappingSheet.appendRow(["ページ", "単元名", "テーマ名", "難易度", "問題数"]);
  mappingSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#dcfce7");
  
  // ダミーシート削除
  ss.deleteSheet(dummy);
  
  ui.alert("完了", "システムのスプレッドシート構造を最適化構成で再構築しました。システム設定に必要な項目を設定してください。", ui.ButtonSet.OK);
}

// ============================================
// 7. Approve Selected Student Request
// ============================================
function approveSelectedRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getActiveSheet();
  
  if (sheet.getName() !== "⚙️ 承認待ちリスト") {
    ui.alert("エラー", "「⚙️ 承認待ちリスト」シートを開いた状態で、承認したい生徒の行のセルを選択して実行してください。", ui.ButtonSet.OK);
    return;
  }
  
  var activeCell = sheet.getActiveCell();
  var row = activeCell.getRow();
  
  if (row <= 1) {
    ui.alert("エラー", "承認する生徒の行を選択してください（見出し行は選択不可）。", ui.ButtonSet.OK);
    return;
  }
  
  var values = sheet.getRange(row, 1, 1, 5).getValues()[0];
  var timestamp = values[0];
  var studentName = values[1].toString().trim();
  var email = values[2].toString().trim();
  var status = values[3].toString().trim();
  
  if (!studentName || !email) {
    ui.alert("エラー", "選択された行の生徒名またはメールアドレスが空です。", ui.ButtonSet.OK);
    return;
  }
  
  if (status === "承認") {
    ui.alert("エラー", "この生徒はすでに承認されています。", ui.ButtonSet.OK);
    return;
  }
  
  var confirmResp = ui.alert("確認", "生徒「" + studentName + " (メール: " + email + ")」の利用申請を承認し、個別生徒IDを発行して案内メールを送信します。よろしいですか？", ui.ButtonSet.OK_CANCEL);
  if (confirmResp !== ui.Button.OK) return;
  
  // 生徒固有ID (推測困難なランダム8文字) の生成
  var studentId = "std_" + generateRandomId(8);
  // ログイン用の5桁の初期パスワードを生成
  var initPassword = generateRandomId(5);
  
  // ⚙️ アカウント設定シートに登録
  var accountSheet = ss.getSheetByName("⚙️ アカウント設定");
  accountSheet.appendRow([studentId, studentName, email, "有効", new Date().toLocaleString("ja-JP"), initPassword]);
  
  // ⚙️ 承認待ちリストシートのステータスと発行IDを更新
  sheet.getRange(row, 4).setValue("承認");
  sheet.getRange(row, 5).setValue(studentId);
  
  // 設定値の取得 (共有APIキーと案内PDFのURL)
  var adminEmail = "ktgiyey@gmail.com";
  var sharedApiKey = "";
  var guidePdfUrl = "";
  
  var configSheet = ss.getSheetByName("⚙️ システム設定");
  if (configSheet) {
    var configRows = configSheet.getDataRange().getValues();
    for (var i = 1; i < configRows.length; i++) {
      if (configRows[i][0] === "管理者メールアドレス" && configRows[i][1]) adminEmail = configRows[i][1].toString().trim();
      if (configRows[i][0] === "共用Gemini APIキー" && configRows[i][1]) sharedApiKey = configRows[i][1].toString().trim();
      if (configRows[i][0] === "手順説明PDFのURL" && configRows[i][1]) guidePdfUrl = configRows[i][1].toString().trim();
    }
  }
  
  // 生徒への通知メール作成と送信
  var subject = "【数学診断アプリ】利用申請が承認されました";
  var body = studentName + " 様\n\n" +
             "個別指導数学診断アプリの利用申請が承認されました！\n" +
             "アプリを起動し、ログイン画面で以下の「生徒ID」と「パスワード」を入力してログインしてください。\n\n" +
             "-----------------------------------------\n" +
             "■ ログイン用 生徒ID: " + studentId + "\n" +
             "■ 初期パスワード: " + initPassword + "\n" +
             "-----------------------------------------\n\n" +
             "※ ログイン後、セキュリティのため設定画面からパスワードを新しいものへ変更してください。\n\n" +
             "それでは、日々の学習を頑張りましょう！\n" +
             "-----------------------------------------\n" +
             "※本メールは自動送信されています。";
             
  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body
  });
  
  ui.alert("成功", "生徒「" + studentName + "」を承認し、ID (" + studentId + ") と初期パスワード (" + initPassword + ") をメール送信しました。", ui.ButtonSet.OK);
}

// ランダム英数字ID生成ヘルパー
function generateRandomId(length) {
  var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// 8. Update Summary Sheet Formulas
// ============================================
function updateSummarySheet(ss) {
  var summarySheet = ss.getSheetByName("📊 総合サマリー");
  if (!summarySheet) return;
  
  summarySheet.clear();
  summarySheet.appendRow(["生徒ID", "生徒名", "総受験回数", "平均得点率", "最新受験日時"]);
  summarySheet.getRange("A1:E1").setFontWeight("bold").setBackground("#e2e8f0");
  
  var sheets = ss.getSheets();
  var studentList = []; // Array of { id, name, sheetName }
  
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName();
    if (sheetName.indexOf("👤 ") === 0) {
      // Format: 👤 [ID]_[名前]
      var raw = sheetName.replace("👤 ", "");
      var parts = raw.split("_");
      var studentId = parts[0] || "unknown";
      var studentName = parts[1] || raw;
      
      studentList.push({
        id: studentId,
        name: studentName,
        sheetName: sheetName
      });
    }
  }
  
  if (studentList.length > 0) {
    var formulas = [];
    for (var k = 0; k < studentList.length; k++) {
      var item = studentList[k];
      var rowNum = k + 2; 
      
      formulas.push([
        item.id,
        item.name,
        "=COUNTA('" + item.sheetName + "'!A:A) - 1",
        "=IFERROR(SUM('" + item.sheetName + "'!C:C) / SUM('" + item.sheetName + "'!D:D), 0)",
        "=IFERROR(INDEX('" + item.sheetName + "'!A:A, C" + rowNum + " + 1), \"-\")"
      ]);
    }
    
    var range = summarySheet.getRange(2, 1, studentList.length, 5);
    range.setValues(formulas);
    summarySheet.getRange(2, 4, studentList.length, 1).setNumberFormat("0%");
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Running successfully.")
    .setMimeType(ContentService.MimeType.TEXT);
}
function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
