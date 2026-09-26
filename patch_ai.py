import os

p = r"D:\madenapp\src-tauri\src\ai.rs"
with open(p, "r", encoding="utf-8") as f:
    text = f.read()

old = """        receivable,
        payable,
        stock_value,
        pending_tax
    ))
}"""

new = """        receivable,
        payable,
        stock_value,
        pending_tax
    );

    let rehber_context = "Önemli Mevzuat Bilgileri (Bilgi Bankası):\\n- Vergi Usul Kanunu: Fatura mal tesliminden itibaren en geç 7 gün içinde kesilmelidir. Vergi ziyaı cezası genelde 1 kat, kaçakçılıkta 3 kattır.\\n- İş Kanunu: Haftalık çalışma süresi 45 saattir. Fazla mesai %50 zamlı ödenir. 1 yıl dolduğunda kıdem tazminatı ve 14 gün yıllık izin hak edilir.\\n- Muhasebe Kodları: 120 Alıcılar, 320 Satıcılar, 600 Yurtiçi Satışlar.\\n";

    Ok(format!("{}\\n\\n{}", res, rehber_context))
}"""

text = text.replace(old, new)
text = text.replace('Ok(format!(', 'let res = format!(')

with open(p, "w", encoding="utf-8") as f:
    f.write(text)

print("Done")
