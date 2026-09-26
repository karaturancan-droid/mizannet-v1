/**
 * Tauri backend komutlarını çağırmak için ince, tip güvenli bir sarmalayıcı.
 * Uygulama tarayıcıda (örn. `next dev` ile önizleme) çalıştırılıyorsa Tauri
 * ortamı bulunmadığından anlaşılır bir Türkçe hata fırlatılır; sayfalar bu
 * hatayı yakalayıp kullanıcıya dostça bir mesaj gösterebilir.
 */

export function isTauriEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  );
}

/**
 * Tauri v2 komut argümanlarını varsayılan olarak camelCase bekler.
 * Frontend'deki hook'lar snake_case anahtarlar kullandığından (örn. product_id),
 * gönderim öncesi anahtarları camelCase'e çeviririz (product_id -> productId).
 */
function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toCamelCaseArgs(args?: Record<string, unknown>): Record<string, unknown> {
  if (!args) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    result[toCamelCaseKey(key)] = value;
  }
  return result;
}

export async function callBackend<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriEnvironment()) {
    throw new Error("Bu özellik yalnızca masaüstü uygulamasında çalışır.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, toCamelCaseArgs(args));
}
