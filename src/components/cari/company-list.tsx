'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyTRY } from '@/lib/format';
import type { Company } from '@/hooks/use-cari';

interface CompanyListProps {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onAddCompany: () => void;
  loading: boolean;
}

export function CompanyList({
  companies,
  selectedCompanyId,
  onSelectCompany,
  onAddCompany,
  loading,
}: CompanyListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  const filteredCompanies = useMemo(() => {
    let result = companies;
    if (hideZeroBalances) {
      result = result.filter(c => Math.abs(c.balance || 0) > 0.01);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.tax_no?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [companies, searchQuery, hideZeroBalances]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Başlık ve Arama */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Firma Rehberi</h2>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <input 
              type="checkbox" 
              className="rounded border-gray-300"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
            />
            Sıfır Bakiyeleri Gizle
          </label>
        </div>
        <Input
          placeholder="Firma adı, VKN, telefon veya e-posta ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Firma Listesi */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Firmalar yükleniyor...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {companies.length === 0
              ? 'Henüz firma eklenmemiş'
              : 'Arama sonucu bulunamadı'}
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedCompanyId === company.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectCompany(company.id)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm flex-1 break-words">
                    {company.name}
                  </h3>
                  <Badge
                    variant={company.balance < 0 ? 'destructive' : company.balance > 0 ? 'default' : 'secondary'}
                    className={`flex-shrink-0 ${company.balance > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                  >
                    {company.balance > 0 ? 'Bize Borçlu' : company.balance < 0 ? 'Biz Borçluyuz' : 'Bakiye Yok'}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrencyTRY(Math.abs(company.balance))}
                </div>
                {company.tax_no && (
                  <div className="text-xs text-gray-600">
                    VKN: {company.tax_no}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Firma Ekle Butonu */}
      <Button
        onClick={onAddCompany}
        className="w-full"
        disabled={loading}
      >
        + Firma Ekle
      </Button>
    </div>
  );
}
