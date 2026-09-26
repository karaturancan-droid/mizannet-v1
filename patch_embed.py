import os

def patch_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, "r", encoding="utf-8") as f: content = f.read()
    if old in content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content.replace(old, new))
        print(f"Patched {path}")

# whatsapp/page.tsx
w_path = r"D:\madenapp\src\app\whatsapp\page.tsx"
patch_file(w_path, "export default function WhatsAppPage() {", "export default function WhatsAppPage({ isEmbedded = false }: { isEmbedded?: boolean }) {")

w_header_old = """  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp İşletme</h1>
          <p className="text-muted-foreground mt-1">
            WhatsApp üzerinden müşterilerinize otomatik mesajlar gönderin.
          </p>
        </div>
      </div>"""

w_header_new = """  return (
    <div className={isEmbedded ? "space-y-6" : "space-y-6 max-w-5xl"}>
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp İşletme</h1>
            <p className="text-muted-foreground mt-1">
              WhatsApp üzerinden müşterilerinize otomatik mesajlar gönderin.
            </p>
          </div>
        </div>
      )}"""
patch_file(w_path, w_header_old, w_header_new)

# telegram/page.tsx
t_path = r"D:\madenapp\src\app\telegram\page.tsx"
patch_file(t_path, "export default function TelegramPage() {", "export default function TelegramPage({ isEmbedded = false }: { isEmbedded?: boolean }) {")

t_header_old = """  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telegram Botu</h1>
          <p className="text-muted-foreground mt-1">
            Fatura okuma ve veri aktarımı için Telegram botunuzu yönetin.
          </p>
        </div>
      </div>"""

t_header_new = """  return (
    <div className={isEmbedded ? "space-y-6" : "space-y-6"}>
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Telegram Botu</h1>
            <p className="text-muted-foreground mt-1">
              Fatura okuma ve veri aktarımı için Telegram botunuzu yönetin.
            </p>
          </div>
        </div>
      )}"""
patch_file(t_path, t_header_old, t_header_new)
