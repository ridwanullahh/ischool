export interface ImportResult {
  rows: Record<string, string>[];
  headers: string[];
  errors: string[];
}

export function parseCsv(text: string): ImportResult {
  const errors: string[] = [];
  const lines = splitCsvLines(text);
  if (lines.length < 2) {
    return { rows: [], headers: [], errors: ['CSV must have at least a header row and one data row'] };
  }

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return { rows, headers, errors };
}

export function validateImportRows(rows: Record<string, string>[], required: string[]): { valid: Record<string, string>[]; errors: string[] } {
  const valid: Record<string, string>[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const missing = required.filter(f => !row[f] || row[f].trim() === '');
    if (missing.length > 0) {
      errors.push(`Row ${i + 1}: missing required fields: ${missing.join(', ')}`);
    } else {
      valid.push(row);
    }
  });

  return { valid, errors };
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
