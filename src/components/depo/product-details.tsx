'use client';

import { Product } from '@/hooks/use-depo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyTRY } from '@/lib/format';

interface ProductDetailsProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onAddMovement: () => void;
  loading: boolean;
}

export function ProductDetails({
  product,
  onEdit,
  onDelete,
  onAddMovement,
  loading,
}: ProductDetailsProps) {
  const isCritical = product.current_stock <= product.min_stock;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
        </div>
        {isCritical && <Badge variant="destructive">Kritik Stok</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {product.category && (
          <div>
            <p className="text-xs text-muted-foreground">Kategori</p>
            <p className="font-semibold">{product.category}</p>
          </div>
        )}
        {product.unit && (
          <div>
            <p className="text-xs text-muted-foreground">Birim</p>
            <p className="font-semibold">{product.unit}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Alış Fiyatı</p>
          <p className="font-semibold">{formatCurrencyTRY(product.purchase_price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Minimum Stok</p>
          <p className="font-semibold">{product.min_stock}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mevcut Stok</p>
          <p className={`font-semibold ${isCritical ? 'text-destructive' : ''}`}>
            {product.current_stock}
          </p>
        </div>
        {product.supplier && (
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs text-muted-foreground">Tedarikçi</p>
            <p className="font-semibold">{product.supplier}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onEdit} variant="outline" disabled={loading}>
          Düzenle
        </Button>
        <Button onClick={onDelete} variant="destructive" disabled={loading}>
          Sil
        </Button>
        <Button onClick={onAddMovement} disabled={loading}>
          Stok Hareketi Ekle
        </Button>
      </div>
    </div>
  );
}
