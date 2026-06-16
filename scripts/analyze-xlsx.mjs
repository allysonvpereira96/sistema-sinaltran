import xlsx from "xlsx";

const file = "C:/Users/allyv/Downloads/Cadastro Clientes e Fornecedores Sinaltran.xlsx";
const wb = xlsx.readFile(file);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });

// pular header
const data = rows.slice(1);

// contar tipos
const tipoCount = {};
const tipoSamples = {};
for (const r of data) {
  const tipo = r["Clientes e Fornecedores"] || "(vazio)";
  tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
  if (!tipoSamples[tipo]) tipoSamples[tipo] = [];
  if (tipoSamples[tipo].length < 3) tipoSamples[tipo].push(r["__EMPTY_1"]);
}
console.log("\n=== Tipos (Tags) ===");
const sorted = Object.entries(tipoCount).sort((a, b) => b[1] - a[1]);
for (const [tipo, count] of sorted) {
  console.log(`${count.toString().padStart(5)}  ${tipo}`);
}

console.log("\n=== Sample por tipo ===");
for (const [tipo, samples] of Object.entries(tipoSamples)) {
  console.log(`\n[${tipo}]`);
  for (const s of samples) console.log("  -", s);
}

// quantos com CNPJ válido
const cnpjOk = data.filter(r => r["__EMPTY"] && r["__EMPTY"] !== "N/D" && r["__EMPTY"].length >= 14).length;
const semCnpj = data.filter(r => !r["__EMPTY"] || r["__EMPTY"] === "N/D").length;
console.log(`\n=== CNPJ ===\nCom CNPJ: ${cnpjOk}\nSem CNPJ (N/D): ${semCnpj}\nTotal: ${data.length}`);

// estados
const estadoCount = {};
for (const r of data) {
  const uf = r["__EMPTY_6"] || "(vazio)";
  estadoCount[uf] = (estadoCount[uf] || 0) + 1;
}
console.log("\n=== Estados ===");
for (const [uf, c] of Object.entries(estadoCount).sort((a, b) => b[1] - a[1])) {
  console.log(`${c.toString().padStart(5)}  ${uf}`);
}

// CPF (11 digits) vs CNPJ (14 digits)
let cpfCount = 0, cnpjCount = 0;
for (const r of data) {
  const doc = (r["__EMPTY"] || "").replace(/\D/g, "");
  if (doc.length === 11) cpfCount++;
  else if (doc.length === 14) cnpjCount++;
}
console.log(`\n=== Documento ===\nCPF (11 dig): ${cpfCount}\nCNPJ (14 dig): ${cnpjCount}`);
