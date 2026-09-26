import hashlib
import io

with io.open('D:/madenapp/vip_kodlar.txt', 'r', encoding='utf-16') as f:
    codes = [line.strip() for line in f if line.strip()]

hashes = [hashlib.sha256(c.encode('utf-8')).hexdigest() for c in codes]

rust_code = "const VIP_HASHES: [&str; " + str(len(hashes)) + "] = [\n"
for h in hashes:
    rust_code += f'    "{h}",\n'
rust_code += "];"

with open('D:/madenapp/vip_hashes.rs', 'w', encoding='utf-8') as f:
    f.write(rust_code)
