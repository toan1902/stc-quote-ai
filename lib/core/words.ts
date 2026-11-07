// Vietnamese amount in words, e.g. 57493200 → "Năm mươi bảy triệu bốn trăm chín mươi ba ngàn hai trăm đồng chẵn"
const CS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function block(x: number, full: boolean): string[] {
  const t = Math.floor(x / 100), c = Math.floor(x / 10) % 10, d = x % 10;
  const o: string[] = [];
  if (full || t) o.push(CS[t], "trăm");
  if (c === 0) { if (d && (full || t)) o.push("linh"); }
  else if (c === 1) o.push("mười");
  else o.push(CS[c], "mươi");
  if (d) {
    if (d === 1 && c > 1) o.push("mốt");
    else if (d === 5 && c > 0) o.push("lăm");
    else if (d === 4 && c > 1) o.push("tư");
    else o.push(CS[d]);
  }
  return o;
}

export function docSo(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return "Không đồng";
  const units = ["", "ngàn", "triệu", "tỷ", "ngàn tỷ"];
  const g: number[] = [];
  while (n) { g.push(n % 1000); n = Math.floor(n / 1000); }
  const out: string[] = [];
  for (let k = g.length - 1; k >= 0; k--) {
    if (g[k]) { out.push(...block(g[k], k < g.length - 1)); if (units[k]) out.push(units[k]); }
  }
  const s = out.join(" ") + " đồng chẵn";
  return s[0].toUpperCase() + s.slice(1);
}

export const vnd = (x: number) => (x < 0 ? "- " : "") + Math.abs(Math.round(x)).toLocaleString("de-DE");
export const vndComma = (x: number) => Math.round(x).toLocaleString("en-US");
