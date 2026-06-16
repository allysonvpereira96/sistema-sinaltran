import xlsx from "xlsx";
import { argv } from "node:process";

const file = argv[2];
if (!file) {
  console.error("Usage: node scripts/read-xlsx.mjs <file.xlsx>");
  process.exit(1);
}

const wb = xlsx.readFile(file);
for (const sheetName of wb.SheetNames) {
  console.log("\n===== SHEET:", sheetName, "=====");
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
  console.log(`Rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log("Columns:", Object.keys(rows[0]));
    console.log("\nFirst 5 rows:");
    rows.slice(0, 5).forEach((r, i) => console.log(`[${i}]`, JSON.stringify(r, null, 2)));
    if (rows.length > 5) {
      console.log(`\nLast 2 rows:`);
      rows.slice(-2).forEach((r, i) => console.log(`[${rows.length - 2 + i}]`, JSON.stringify(r, null, 2)));
    }
  }
}
