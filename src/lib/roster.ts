/** Accepts pasted text or a .txt/.csv export: one name per line (first column for CSV). */
export function parseNames(text: string): string[] {
  const names = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.split(/[,;\t]/)[0].replace(/^["'\s\d.)\-–]+|["'\s]+$/g, '').trim())
    .filter((n) => n.length > 0 && n.length <= 40 && !/^(?:الاسم|اسم الطالب|الأسماء|name|names|student)$/i.test(n))
  return names.filter((n, i) => names.indexOf(n) === i).slice(0, 60)
}
