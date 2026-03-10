// ============================================================
// 판교 해링턴 플레이스 실내놀이터 체크인 시스템
// Google Apps Script 백엔드
// ============================================================
// 사용법:
// 1. Google Sheets에서 [확장 프로그램] > [Apps Script] 클릭
// 2. 이 코드를 전체 복사하여 붙여넣기
// 3. ADMIN_PIN을 원하는 4자리 숫자로 변경
// 4. initSheet() 함수를 한 번 실행하여 시트 초기화
// 5. [배포] > [새 배포] > 유형: 웹 앱
//    - 실행 주체: 본인
//    - 액세스 권한: 모든 사용자
// 6. 배포된 URL을 index.html과 admin.html의 API_URL에 입력
// ============================================================

const SPREADSHEET_ID = '1azsu1dtd4WlAgevkoVnh1Z95byh4Uzlfqf9KX3Q86Wk';
const SHEET_NAME = '체크인';
const ADMIN_PIN = '0000'; // ← 원하는 4자리 PIN으로 변경하세요

// ===================== 요청 핸들러 =====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'checkin';

    switch (action) {
      case 'checkin':
        return handleCheckin(data);
      case 'delete':
        return handleDelete(data);
      case 'update':
        return handleUpdate(data);
      default:
        return jsonResponse({ success: false, error: 'Invalid action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'verifyPin':
        return jsonResponse({ success: e.parameter.pin === ADMIN_PIN });
      case 'getData':
        return handleGetData(e.parameter.date);
      default:
        return jsonResponse({ error: 'Invalid action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ===================== 체크인 처리 =====================

function handleCheckin(data) {
  const sheet = getSheet();
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
  const timeStr = Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm:ss');
  const id = Utilities.getUuid();

  sheet.appendRow([
    id,                        // A: ID
    timeStr,                   // B: 시간
    dateStr,                   // C: 날짜
    String(data.dong),         // D: 동
    String(data.ho),           // E: 호
    data.name,                 // F: 이름
    data.phone,                // G: 전화번호
    Number(data.guardians),    // H: 보호자 수
    Number(data.children),     // I: 아동 수
    data.session,              // J: 회차
    data.sessionTime,          // K: 회차 시간
    data.paid ? 'Y' : 'N',    // L: 결제 확인
    data.dayType               // M: 요일 구분
  ]);

  return jsonResponse({ success: true, id: id });
}

// ===================== 데이터 조회 =====================

function handleGetData(date) {
  const sheet = getSheet();
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  if (!date) {
    date = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, data: [] });

  const filtered = [];
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][2];
    const dateValue = (rowDate instanceof Date)
      ? Utilities.formatDate(rowDate, 'Asia/Seoul', 'yyyy-MM-dd')
      : String(rowDate);

    if (dateValue === date) {
      filtered.push({
        id: data[i][0],
        time: data[i][1],
        date: dateValue,
        dong: String(data[i][3]),
        ho: String(data[i][4]),
        name: data[i][5],
        phone: String(data[i][6]),
        guardians: Number(data[i][7]),
        children: Number(data[i][8]),
        session: String(data[i][9]),
        sessionTime: data[i][10],
        paid: data[i][11],
        dayType: data[i][12]
      });
    }
  }

  return jsonResponse({ success: true, data: filtered });
}

// ===================== 삭제 처리 =====================

function handleDelete(data) {
  if (data.pin !== ADMIN_PIN) {
    return jsonResponse({ success: false, error: 'Unauthorized' });
  }

  const sheet = getSheet();
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  const allData = sheet.getDataRange().getValues();

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: 'Entry not found' });
}

// ===================== 수정 처리 =====================

function handleUpdate(data) {
  if (data.pin !== ADMIN_PIN) {
    return jsonResponse({ success: false, error: 'Unauthorized' });
  }

  const sheet = getSheet();
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  const allData = sheet.getDataRange().getValues();
  const u = data.updates;

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.id) {
      const row = i + 1;
      if (u.dong !== undefined) sheet.getRange(row, 4).setValue(String(u.dong));
      if (u.ho !== undefined) sheet.getRange(row, 5).setValue(String(u.ho));
      if (u.name !== undefined) sheet.getRange(row, 6).setValue(u.name);
      if (u.phone !== undefined) sheet.getRange(row, 7).setValue(u.phone);
      if (u.guardians !== undefined) sheet.getRange(row, 8).setValue(Number(u.guardians));
      if (u.children !== undefined) sheet.getRange(row, 9).setValue(Number(u.children));
      if (u.session !== undefined) sheet.getRange(row, 10).setValue(u.session);
      if (u.sessionTime !== undefined) sheet.getRange(row, 11).setValue(u.sessionTime);
      if (u.paid !== undefined) sheet.getRange(row, 12).setValue(u.paid);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: 'Entry not found' });
}

// ===================== 유틸리티 =====================

function getSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================== 초기 설정 =====================
// Apps Script 에디터에서 이 함수를 선택하고 ▶ 실행 버튼 클릭 (최초 1회)

function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 헤더 설정
  const headers = [
    'ID', '시간', '날짜', '동', '호', '이름', '전화번호',
    '보호자수', '아동수', '회차', '회차시간', '결제확인', '요일구분'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  // 헤더 스타일
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4A9FE5');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');

  // 열 너비 자동 조정
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log('시트 초기화 완료: ' + SHEET_NAME);
}
