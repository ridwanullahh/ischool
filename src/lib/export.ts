export interface CsvColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function toCsv(rows: any[], columns: CsvColumn[]): string {
  const header = columns.map(c => escapeCsvField(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(col => {
      let val = row[col.key];
      if (col.format) val = col.format(val);
      if (val === null || val === undefined) val = '';
      return escapeCsvField(String(val));
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
