'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';

export interface InvoiceBranding {
  logo_path?: string;
  color?: string;
  note?: string;
  footer?: string;
  show_logo: boolean;
  template: string;
}

export function useInvoiceBranding() {
  const [loading, setLoading] = useState(false);

  const getBranding = useCallback(async () => {
    return callBackend<InvoiceBranding>('get_invoice_branding', {});
  }, []);

  const setBranding = useCallback(
    async (data: {
      logo_path?: string;
      color?: string;
      note?: string;
      footer?: string;
      show_logo?: boolean;
      template?: string;
    }) => {
      setLoading(true);
      try {
        return await callBackend<InvoiceBranding>('set_invoice_branding', data);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const renderInvoiceHtml = useCallback(
    async (params: {
      title: string;
      invoice_no: string;
      date: string;
      company_name: string;
      items: { name: string; quantity: number; unit_price: number; total?: number }[];
      subtotal: number;
      vat_amount: number;
      total: number;
    }) => {
      return callBackend<string>('render_branded_invoice_html', params);
    },
    []
  );

  return { loading, getBranding, setBranding, renderInvoiceHtml };
}
