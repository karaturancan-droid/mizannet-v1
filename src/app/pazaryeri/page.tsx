"use client";

import { Store, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PazaryeriPage() {
  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-6xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-zinc-900">
            <Store className="h-8 w-8 text-orange-500" />
            Pazaryeri Entegrasyonu
          </h1>
          <p className="text-muted-foreground mt-2">
            Trendyol, Hepsiburada, N11 ve Amazon mağazalarınızdan gelen siparişleri tek ekranda yönetin.
          </p>
        </div>
        <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
          <RefreshCw className="h-4 w-4" /> Siparişleri Senkronize Et
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="font-semibold text-zinc-500">Yeni Siparişler</CardDescription>
            <ShoppingCart className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">0</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Bekleyen kargo yok</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="font-semibold text-zinc-500">Bugünkü Ciro</CardDescription>
            <TrendingUp className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">0,00 ₺</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Tüm mağazalar</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 shadow-sm border-zinc-200/60">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">Mağaza Bağlantısı Yok</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-4">
            Siparişlerinizi ve stoklarınızı otomatik çekmek için API bilgilerinizle mağazalarınızı bağlayın.
          </p>
          <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
            Yeni Mağaza Bağla
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
