/**
 * IM Timesheet sync API for ลงเวลาปฎิบัติงาน
 *
 * ถ้าชีตนี้มี Web app ลงเวลาอยู่แล้ว (HtmlService) อย่าทับ doGet ทั้งไฟล์
 * ให้วาง imTimesheetJson_ ด้านล่าง แล้วใส่ 4 บรรทัดนี้ไว้ต้น doGet เดิม:
 *
 *   function doGet(e) {
 *     var action = String((e && e.parameter && e.parameter.action) || '');
 *     if (action === 'im_timesheet') {
 *       return imTimesheetJson_(e);
 *     }
 *     // ...โค้ด HtmlService เดิมต่อที่นี่...
 *
 * โปรเจกต์ใหม่ที่ยังไม่มีฟอร์ม: Deploy ไฟล์นี้ทั้งก้อนได้เลย
 *   Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Laravel .env:
 *   IM_TIMESHEET_GAS_URL=https://script.google.com/macros/s/XXXX/exec
 *   IM_TIMESHEET_GAS_TOKEN=...
 */
const TIMESHEET_SPREADSHEET_ID = '1N_JbHz1R2N0yvC2c8Em5fFNcCDPDXJc5UNpRsSBxRdk';
const TIMESHEET_TABS = ['รายงานการทำงาน', 'WorkLogs'];

function doGet(e) {
  return imTimesheetJson_(e);
}

function imTimesheetJson_(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action && action !== 'im_timesheet') {
    return json_({ ok: false, error: 'unknown action' });
  }

  const expected = PropertiesService.getScriptProperties().getProperty('IM_TIMESHEET_TOKEN') || '';
  const given = String((e && e.parameter && e.parameter.token) || '');
  if (expected && given !== expected) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const ss = SpreadsheetApp.openById(TIMESHEET_SPREADSHEET_ID);
  const sheets = {};
  TIMESHEET_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      return;
    }
    sheets[name] = sh.getDataRange().getDisplayValues();
  });

  return json_({ ok: true, sheets: sheets });
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
