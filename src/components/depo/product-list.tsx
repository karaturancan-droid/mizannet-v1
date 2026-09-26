'use client';

import { useState, useMemo } from 'react';
import { Product } from '@/hooks/use-depo';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  onAddProduct: () => void;
  loading: boolean;
}

export function ProductList({
  products,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  loading,
}: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroStock, setHideZeroStock] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (hideZeroStock) {
      result = result.filter(p => p.current_stock > 0);
    }
    if (searchTerm.trim()) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [products, searchTerm, hideZeroStock]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <input 
              type="checkbox" 
              className="rounded border-gray-300"
              checked={hideZeroStock}
              onChange={(e) => setHideZeroStock(e.target.checked)}
            />
            Tükenmiş Ürünleri Gizle
          </label>
        </div>
        <Input
          placeholder="Ürün adı veya SKU ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
        />
        <Button onClick={onAddProduct} className="w-full" disabled={loading}>
          Ürün Ekle
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {products.length === 0 ? 'Henüz ürün eklenmemiş' : 'Arama sonucu bulunamadı'}
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isCritical = product.current_stock <= product.min_stock;
            return (
              <Card
                key={product.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedProductId === product.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                onClick={() => onSelectProduct(product.id)}
              >
                <div className="flex items-center gap-3">
                  {product.image_path ? (
                    <img 
                      src={product.image_path.startsWith('data:') ? product.image_path : `file://${product.image_path}`}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded bg-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded text-slate-400 font-bold">
                      {product.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    {product.sku && (
                      <p className="text-xs opacity-75">SKU: {product.sku}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">
                        Stok: <strong>{product.current_stock}</strong>
                      </span>
                      {isCritical && (
                        <Badge variant="destructive" className="text-xs">
                          Kritik
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
