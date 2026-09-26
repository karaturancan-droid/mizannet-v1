'use client';

import { useState } from 'react';
import { useDepo } from '@/hooks/use-depo';
import { ProductList } from '@/components/depo/product-list';
import { ProductForm } from '@/components/depo/product-form';
import { StockMovements } from '@/components/depo/stock-movements';
import { StockSummaryCards } from '@/components/depo/stock-summary';
import { StockMovementForm } from '@/components/depo/stock-movement-form';
import { ProductDetails } from '@/components/depo/product-details';
import { Card } from '@/components/ui/card';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';
import { formatCurrencyTRY } from '@/lib/format';

export default function DepoPage() {
  const {
    products,
    selectedProductId,
    stockMovements,
    stockSummary,
    loading,
    error,
    selectProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    createStockMovement,
  } = useDepo();

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [stockMovementFormOpen, setStockMovementFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const kritikStokSayisi = products.filter((p) => p.current_stock <= p.min_stock).length;
  const stokDegeri = products.reduce((sum, p) => sum + p.current_stock * p.purchase_price, 0);

  const handleAddProduct = () => {
    setEditingProduct(false);
    setProductFormOpen(true);
  };

  const handleEditProduct = () => {
    setEditingProduct(true);
    setProductFormOpen(true);
  };

  const handleProductSubmit = async (data: any) => {
    if (editingProduct && selectedProductId) {
      await updateProduct(selectedProductId, data);
    } else {
      await createProduct(data);
    }
  };

  const handleDeleteProduct = async () => {
    if (selectedProductId && confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      await deleteProduct(selectedProductId);
    }
  };

  const handleStockMovementSubmit = async (data: any) => {
    if (selectedProductId) {
      await createStockMovement({
        product_id: selectedProductId,
        ...data,
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Depo / Stok Yönetimi</h1>
      </div>

      <StatCardRow>
        <StatCard label="Toplam Ürün" value={products.length} />
        <StatCard label="Kritik Stok" value={kritikStokSayisi} variant={kritikStokSayisi > 0 ? 'danger' : 'default'} />
        <StatCard label="Stok Değeri" value={formatCurrencyTRY(stokDegeri)} />
      </StatCardRow>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Sol Panel - Ürün Listesi */}
        <Card className="lg:col-span-1 flex flex-col p-4">
          <ProductList
            products={products}
            selectedProductId={selectedProductId}
            onSelectProduct={selectProduct}
            onAddProduct={handleAddProduct}
            loading={loading}
          />
        </Card>

        {/* Sağ Panel - Ürün Detayları */}
        <Card className="lg:col-span-2 flex flex-col p-4 overflow-hidden">
          {selectedProduct ? (
            <div className="flex flex-col h-full gap-4 overflow-hidden">
              <ProductDetails
                product={selectedProduct}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onAddMovement={() => setStockMovementFormOpen(true)}
                loading={loading}
              />

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Stok Hareketleri</h3>
                    <StockMovements movements={stockMovements} loading={loading} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Stok Özeti</h3>
                    <StockSummaryCards summary={stockSummary} loading={loading} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sol taraftan bir ürün seçerek stok hareketlerini inceleyin
            </div>
          )}
        </Card>
      </div>

      {/* Formlar */}
      <ProductForm
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        onSubmit={handleProductSubmit}
        initialData={editingProduct ? selectedProduct : undefined}
        loading={loading}
      />

      {selectedProductId && (
        <StockMovementForm
          open={stockMovementFormOpen}
          onOpenChange={setStockMovementFormOpen}
          onSubmit={handleStockMovementSubmit}
          loading={loading}
        />
      )}
    </div>
  );
}
