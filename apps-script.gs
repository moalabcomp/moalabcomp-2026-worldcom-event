const SHEET_ID = "1flAKg2YjWZLcRIRtrHpar82YfrOv-emcabfKbIcdPiM";
const SHEET_NAME = "시트1";

function doGet() {
  return respond({ ok: true, rows: listRows() });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (payload.action === "append") {
      appendEntry(payload.entry || {});
      return respond({ ok: true, rows: listRows() });
    }
    if (payload.action === "list") {
      return respond({ ok: true, rows: listRows() });
    }
    return respond({ ok: false, error: "Unknown action" });
  } catch (error) {
    return respond({ ok: false, error: error.message });
  }
}

function appendEntry(entry) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    ensureHeader(sheet);
    const korea = Number(entry.korea || entry.koreaScore || 0);
    const czech = Number(entry.czech || entry.czechScore || 0);
    sheet.appendRow([
      new Date(),
      String(entry.name || "").trim(),
      korea,
      czech,
      String(entry.choice || "").toUpperCase(),
      korea + czech,
      String(entry.userAgent || ""),
      String(entry.id || Utilities.getUuid()),
    ]);
  } finally {
    lock.releaseLock();
  }
}

function listRows() {
  const sheet = getSheet();
  ensureHeader(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet
    .getRange(2, 1, lastRow - 1, 8)
    .getValues()
    .filter((row) => row[1])
    .reverse()
    .map((row) => ({
      createdAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      name: String(row[1]),
      korea: Number(row[2]),
      czech: Number(row[3]),
      choice: String(row[4]),
      totalScore: Number(row[5]),
      id: String(row[7]),
    }));
}

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function ensureHeader(sheet) {
  const headers = ["timestamp", "name", "koreaScore", "czechScore", "choice", "totalScore", "userAgent", "id"];
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (current.join("") !== headers.join("")) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
