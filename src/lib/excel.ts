import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export async function exportToExcel(
  filename: string,
  sheetName: string,
  data: any[],
  columns: { header: string; key: string | ((row: any) => any) }[]
) {
  // Convert data using columns
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, any> = {};
    columns.forEach((col) => {
      const val = typeof col.key === 'function' ? col.key(row) : row[col.key];
      formattedRow[col.header] = val;
    });
    return formattedRow;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Set column widths based on header length or content
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // Use Tauri's dialog to prompt for save location
  const filePath = await save({
    filters: [
      {
        name: 'Excel Dosyası',
        extensions: ['xlsx'],
      },
    ],
    defaultPath: `${filename}.xlsx`,
  });

  if (filePath) {
    // Write using Tauri FS plugin
    await writeFile(filePath, new Uint8Array(excelBuffer));
    return true;
  }
  
  return false;
}
