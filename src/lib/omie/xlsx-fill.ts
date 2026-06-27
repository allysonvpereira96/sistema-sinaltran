// ============================================================================
// Preenchimento cirúrgico de planilhas .xlsx (sem reescrever o arquivo todo).
//   Trata o .xlsx como zip (JSZip) e substitui apenas as linhas indicadas no
//   XML da aba, preservando cabeçalhos, abas de config e validações que o
//   importador do Omie espera. Necessário porque os templates têm milhares de
//   linhas pré-formatadas (ExcelJS é lento/trava ao reescrever tudo).
// ============================================================================
import JSZip from "jszip";

export type CellValue = string | number;
export type RowsMap = Record<number, Record<string, CellValue>>;

const esc = (s: CellValue) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "AC" → índice numérico (para ordenar células na linha). */
function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Monta o XML de uma <row> com as células informadas (número ou texto). */
function buildRow(rowNum: string, cols: Record<string, CellValue>): string {
  const cells = Object.entries(cols)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .sort((a, b) => colIndex(a[0]) - colIndex(b[0]))
    .map(([col, v]) => {
      const ref = `${col}${rowNum}`;
      if (typeof v === "number" && Number.isFinite(v))
        return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    })
    .join("");
  return `<row r="${rowNum}">${cells}</row>`;
}

/** Preenche um template .xlsx substituindo as linhas indicadas em `rows`. */
export async function fillXlsx(
  templateBuffer: Buffer,
  sheetName: string,
  rows: RowsMap,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const wbXml = await zip.file("xl/workbook.xml")!.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");

  const sheetTag = [...wbXml.matchAll(/<sheet\b[^>]*\/>/g)]
    .map((m) => m[0])
    .find((t) =>
      new RegExp(`name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(t),
    );
  if (!sheetTag) throw new Error(`Aba não encontrada: ${sheetName}`);
  const rid = /r:id="([^"]+)"/.exec(sheetTag)![1];
  const target = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(relsXml)![1];
  const sheetPath = "xl/" + target.replace(/^\/?xl\//, "");

  let xml = await zip.file(sheetPath)!.async("string");
  for (const [rowNum, cols] of Object.entries(rows)) {
    const rowXml = buildRow(rowNum, cols);
    const reFull = new RegExp(`<row r="${rowNum}"[^>]*>[\\s\\S]*?</row>`);
    const reSelf = new RegExp(`<row r="${rowNum}"[^>]*/>`);
    if (reFull.test(xml)) xml = xml.replace(reFull, rowXml);
    else if (reSelf.test(xml)) xml = xml.replace(reSelf, rowXml);
    else xml = xml.replace("</sheetData>", rowXml + "</sheetData>");
  }
  zip.file(sheetPath, xml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
