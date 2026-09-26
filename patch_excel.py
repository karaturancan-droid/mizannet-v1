import os

def patch_file(path, old, new):
    with open(path, "r", encoding="utf-8") as f: content = f.read()
    if old in content:
        with open(path, "w", encoding="utf-8") as f: f.write(content.replace(old, new))

# 1. file_analysis.rs
fa_path = r"D:\madenapp\src-tauri\src\commands\file_analysis.rs"
with open(fa_path, "a", encoding="utf-8") as f:
    f.write("""
#[tauri::command]
pub fn parse_excel_file(
    file_data: String,
    _file_name: String,
) -> Result<Vec<std::collections::HashMap<String, String>>, String> {
    use calamine::Reader;
    let bytes = decode_base64(&file_data)?;
    let cursor = std::io::Cursor::new(bytes.to_vec());
    let mut workbook: calamine::Xlsx<_> =
        calamine::open_workbook_from_rs(cursor).map_err(|e| format!("XLSX açılamadı: {}", e))?;

    let mut result = Vec::new();
    let sheet_names = workbook.sheet_names().to_vec();
    if let Some(name) = sheet_names.first() {
        if let Ok(range) = workbook.worksheet_range(name) {
            let mut headers = Vec::new();
            for (i, row) in range.rows().enumerate() {
                if i == 0 {
                    for cell in row.iter() {
                        headers.push(cell.to_string());
                    }
                } else {
                    let mut row_map = std::collections::HashMap::new();
                    for (j, cell) in row.iter().enumerate() {
                        if let Some(header) = headers.get(j) {
                            if !header.is_empty() {
                                row_map.insert(header.clone(), cell.to_string());
                            }
                        }
                    }
                    result.push(row_map);
                }
            }
        }
    }

    Ok(result)
}
""")

# 2. lib.rs
lib_path = r"D:\madenapp\src-tauri\src\lib.rs"
patch_file(lib_path, "analyze_file, import_analyzed_data", "analyze_file, import_analyzed_data, parse_excel_file")
patch_file(lib_path, "import_analyzed_data,", "import_analyzed_data,\n            parse_excel_file,")
