"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CeoDashboard } from "@/components/raporlar/ceo-dashboard";
import { MaliMusavirRaporu } from "@/components/raporlar/mali-musavir";
import { ExcelView } from "@/components/dashboard/excel-view";
import { StockSummaryCards } from "@/components/depo/stock-summary";
import { Calculator, FileText, PieChart } from "lucide-react";
import { useDepo } from "@/hooks/use-depo";

export default function RaporlarPage() {
  const { stockSummary, loading } = useDepo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Raporlar & Analiz</h1>
        <p className="text-gray-600">İşletmenizin finansal durumunu analiz edin ve raporlayın.</p>
      </div>

      <Tabs defaultValue="ai-cfo" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ai-cfo" className="flex items-center gap-2">
            <span className="text-purple-600 font-bold">✧</span> Yapay Zeka (AI) Yönetici Özeti
          </TabsTrigger>
          <TabsTrigger value="mali-musavir" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Mali Müşavir (Z Raporu)
          </TabsTrigger>
          <TabsTrigger value="cari-ekstre" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Cari Ekstre
          </TabsTrigger>
          <TabsTrigger value="stok" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Stok & Envanter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-cfo">
          <CeoDashboard />
        </TabsContent>

        <TabsContent value="mali-musavir">
          <MaliMusavirRaporu />
        </TabsContent>

        <TabsContent value="cari-ekstre">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <ExcelView />
          </div>
        </TabsContent>

        <TabsContent value="stok">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <StockSummaryCards summary={stockSummary} loading={loading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

