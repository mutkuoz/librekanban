import type { ImportBoard } from './types';

/** Serialize rows to CSV, quoting fields that contain commas/quotes/newlines. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/** Parse CSV text into rows of fields (handles quotes, escaped quotes, newlines). */
export function parseCsvRows(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const TITLE_KEYS = ['title', 'name', 'summary', 'task', 'task title'];
const DESC_KEYS = ['description', 'desc', 'details', 'notes'];
const COLUMN_KEYS = ['column', 'status', 'category', 'list', 'swimlane', 'state'];

/**
 * Generic CSV → board. Works for Kanboard's task CSV export (which has a
 * "Column" header) and arbitrary CSVs: title from a title-like column (or the
 * first column), optional description, and columns grouped by a status-like
 * column.
 */
export function parseCsv(text: string, name = 'Imported board'): ImportBoard {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { name, columns: [], cards: [] };

  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  const findIdx = (keys: string[]) => {
    for (const k of keys) {
      const j = headers.indexOf(k);
      if (j >= 0) return j;
    }
    return -1;
  };
  const titleIdx = findIdx(TITLE_KEYS);
  const descIdx = findIdx(DESC_KEYS);
  const colIdx = findIdx(COLUMN_KEYS);
  const tIdx = titleIdx >= 0 ? titleIdx : 0;

  const cards: ImportBoard['cards'] = [];
  const columnSet = new Set<string>();
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    const title = (cells[tIdx] ?? '').trim();
    if (!title) continue;
    const columnName = (colIdx >= 0 ? (cells[colIdx] ?? '').trim() : '') || 'Imported';
    columnSet.add(columnName);
    const description = descIdx >= 0 ? (cells[descIdx] ?? '').trim() : '';
    cards.push({
      title: title.slice(0, 500),
      description: description || undefined,
      columnName,
    });
  }
  return { name, columns: [...columnSet], cards };
}
