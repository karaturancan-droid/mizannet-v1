const fs = require('fs');
let code = fs.readFileSync('src/components/ayarlar/network-section.tsx', 'utf8');

if (!code.includes('import { invoke }')) {
    code = code.replace('import { useToast } from "@/components/ui/toast";', 'import { useToast } from "@/components/ui/toast";\nimport { invoke } from "@tauri-apps/api/core";');
}

code = code.replace(
    'const [localIp, setLocalIp] = useState("192.168.1.55"); // Mock local IP',
    'const [localIp, setLocalIp] = useState("");'
);

if (code.includes('// Mock local IP')) {
    code = code.replace('// Mock local IP', '');
}

if (!code.includes('invoke("get_local_ip")')) {
    code = code.replace(
        'if (settings.server_ip) {',
        `if (settings.server_ip) {
      setServerIp(settings.server_ip);
    }
    invoke("get_local_ip").then((ip) => setLocalIp(ip as string)).catch(console.error);
    if (false) {`
    );
}

// Remove mock scan
code = code.replace(
    'setDiscoveredDevices([\n        { name: "Kasa-PC (Ana Makine)", ip: "192.168.1.55:3030", paired: false },\n        { name: "Muhasebe-Laptop", ip: "192.168.1.120:3030", paired: false }\n      ]);',
    'setDiscoveredDevices([]);'
);

fs.writeFileSync('src/components/ayarlar/network-section.tsx', code);
console.log('Fixed network section mocks');
