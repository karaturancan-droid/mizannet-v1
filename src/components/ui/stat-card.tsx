import { ReactNode } from 'react';

type StatCardVariant = 'default' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: ReactNode;
  variant?: StatCardVariant;
  onClick?: () => void;
  isActive?: boolean;
}

const variantClasses: Record<StatCardVariant, string> = {
  default: 'bg-muted/60 text-foreground',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

export function StatCard({ label, value, variant = 'default', onClick, isActive }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-lg px-4 py-3 ${variantClasses[variant]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export function StatCardRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}
