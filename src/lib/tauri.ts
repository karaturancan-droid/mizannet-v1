/**
 * Tauri backend komutlarını çağırmak için ince, tip güvenli bir sarmalayıcı.
 * Uygulama tarayıcıda (örn. `next dev` ile önizleme) çalıştırılıyorsa Tauri
 * ortamı bulunmadığından DEMO veri döndürülür (bkz. src/lib/demo-data.ts);
 * masaüstü derlemesinde bu katman hiç devreye girmez.
 */

import {
  DEMO_BRANCHES, DEMO_COMPANIES, DEMO_LEDGER, DEMO_PRODUCTS, DEMO_VEHICLES,
  DEMO_VEHICLE_EXPENSES, DEMO_WORKERS, DEMO_PAYROLLS, DEMO_LEAVES, DEMO_TAXES,
  DEMO_DOCUMENTS, DEMO_NOTIFICATIONS, DEMO_SETTINGS, DEMO_CHAT_SESSIONS,
} from './demo-data';

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

/* ---------- Demo (tarayıcı) modu ---------- */

function demoResponse<T>(cmd: string, args?: Record<string, unknown>): T {
  const a = args ?? {};
  switch (cmd) {
    case 'list_branches': return DEMO_BRANCHES as T;
    case 'list_companies': return DEMO_COMPANIES as T;
    case 'list_ledger_entries': return (DEMO_LEDGER[a.company_id as string] ?? []) as T;
    case 'get_ledger_summary': {
      const entries = (DEMO_LEDGER[a.company_id as string] ?? []) as { debit: number; credit: number }[];
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      return { total_debit: totalDebit, total_credit: totalCredit, net: totalDebit - totalCredit } as T;
    }
    case 'list_products': return DEMO_PRODUCTS as T;
    case 'list_stock_movements': {
      if (!a.product_id) return [] as T;
      return [
        { id: 'm1', product_id: a.product_id, type: 'giriş', quantity: 500, date: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), note: 'Ocak çıkışı', created_at: new Date().toISOString() },
        { id: 'm2', product_id: a.product_id, type: 'çıkış', quantity: 250, date: new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10), note: 'ABC Ticaret sevki', created_at: new Date().toISOString() },
        { id: 'm3', product_id: a.product_id, type: 'çıkış', quantity: 180, date: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), note: 'Şantiye 2', created_at: new Date().toISOString() },
      ] as T;
    }
    case 'get_stock_summary': {
      const critical = DEMO_PRODUCTS.filter(p => p.current_stock <= p.min_stock);
      const total = DEMO_PRODUCTS.reduce((s, p) => s + p.current_stock * p.purchase_price, 0);
      return { total_stock_value: total, critical_products: critical } as T;
    }
    case 'list_vehicles': return DEMO_VEHICLES as T;
    case 'list_vehicle_expenses': return DEMO_VEHICLE_EXPENSES.filter(e => e.vehicle_id === a.vehicle_id) as T;
    case 'get_vehicle_expense_summary': {
      const list = DEMO_VEHICLE_EXPENSES.filter(e => e.vehicle_id === a.vehicle_id);
      const byType = new Map<string, number>();
      list.forEach(e => byType.set(e.type, (byType.get(e.type) ?? 0) + e.amount));
      return {
        by_type: [...byType.entries()].map(([type, total]) => ({ type, total })),
        grand_total: list.reduce((s, e) => s + e.amount, 0),
      } as T;
    }
    case 'list_tires': return [
      { id: 'tr1', vehicle_id: a.vehicle_id, position: 'ön-sol', dot_code: 'DOT 4523', tread_depth: 8.5, change_date: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), created_at: new Date().toISOString() },
      { id: 'tr2', vehicle_id: a.vehicle_id, position: 'ön-sağ', dot_code: 'DOT 4524', tread_depth: 8.1, change_date: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), created_at: new Date().toISOString() },
    ] as T;
    case 'list_workers': return DEMO_WORKERS as T;
    case 'list_payrolls': return DEMO_PAYROLLS.filter(p => p.worker_id === a.worker_id) as T;
    case 'list_leaves': return DEMO_LEAVES.filter(l => l.worker_id === a.worker_id) as T;
    case 'list_overtimes': return [
      { id: 'ot1', worker_id: a.worker_id, date: new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10), hours: 6, rate: 350, created_at: new Date().toISOString() },
    ] as T;
    case 'get_worker_advances': return [] as T;
    case 'list_tax_items': return DEMO_TAXES as T;
    case 'list_documents': return DEMO_DOCUMENTS as T;
    case 'list_expiring_documents': return DEMO_DOCUMENTS.filter(d => d.expiry_date) as T;
    case 'list_notifications': {
      let list = DEMO_NOTIFICATIONS;
      if (a.module) list = list.filter(n => n.module === a.module);
      if (a.status) list = list.filter(n => n.status === a.status);
      return list as T;
    }
    case 'get_setting': return (DEMO_SETTINGS[a.key as string] ?? null) as T;
    case 'get_chat_sessions': return DEMO_CHAT_SESSIONS as T;
    case 'create_chat_session': return { id: 's-new', title: (a.title as string) ?? 'Yeni sohbet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as T;
    case 'asistan_get_history': return { messages: [] } as T;
    case 'get_license_status': return { state: 'licensed', trial_started_at: null } as T;
    case 'list_recycle_bin': return [] as T;
    default:
      // Yazma komutları demo modda sessizce onaylanır.
      return null as T;
  }
}

export async function callBackend<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriEnvironment()) {
    return demoResponse<T>(cmd, args);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, toCamelCaseArgs(args));
}
