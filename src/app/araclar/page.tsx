'use client';

import { useState } from 'react';
import { useAraclar } from '@/hooks/use-araclar';
import { VehicleList } from '@/components/araclar/vehicle-list';
import { VehicleForm } from '@/components/araclar/vehicle-form';
import { VehicleDetails } from '@/components/araclar/vehicle-details';
import { ExpenseForm } from '@/components/araclar/expense-form';
import { TireForm } from '@/components/araclar/tire-form';
import { VehicleExpensesTab } from '@/components/araclar/vehicle-expenses-tab';
import { VehicleTiresTab } from '@/components/araclar/vehicle-tires-tab';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';

export default function AraclarPage() {
  const {
    vehicles,
    selectedVehicleId,
    vehicleExpenses,
    vehicleExpenseSummary,
    tires,
    loading,
    error,
    selectVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    createVehicleExpense,
    createTire,
  } = useAraclar();

  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [tireFormOpen, setTireFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'aktif' | 'yaklasan-muayene' | 'yaklasan-sigorta'>('all');

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const gunKala = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  const aktifSayisi = vehicles.filter((v) => v.status === 'aktif').length;
  const yaklasanMuayene = vehicles.filter((v) => {
    const gun = gunKala(v.inspection_due_date);
    return gun !== null && gun <= 30 && gun >= 0;
  }).length;
  const yaklasanSigorta = vehicles.filter((v) => {
    const gun = gunKala(v.insurance_due_date);
    return gun !== null && gun <= 30 && gun >= 0;
  }).length;

  const filteredVehicles = vehicles.filter((v) => {
    if (filterType === 'all') return true;
    if (filterType === 'aktif') return v.status === 'aktif';
    if (filterType === 'yaklasan-muayene') {
      const gun = gunKala(v.inspection_due_date);
      return gun !== null && gun <= 30 && gun >= 0;
    }
    if (filterType === 'yaklasan-sigorta') {
      const gun = gunKala(v.insurance_due_date);
      return gun !== null && gun <= 30 && gun >= 0;
    }
    return true;
  });

  const handleAddVehicle = () => {
    setEditingVehicle(false);
    setVehicleFormOpen(true);
  };

  const handleEditVehicle = () => {
    setEditingVehicle(true);
    setVehicleFormOpen(true);
  };

  const handleVehicleSubmit = async (data: any) => {
    if (editingVehicle && selectedVehicleId) {
      await updateVehicle(selectedVehicleId, data);
    } else {
      await createVehicle(data);
    }
  };

  const handleDeleteVehicle = async () => {
    if (selectedVehicleId && confirm('Bu aracı silmek istediğinizden emin misiniz?')) {
      await deleteVehicle(selectedVehicleId);
    }
  };

  const handleExpenseSubmit = async (data: any) => {
    if (selectedVehicleId) {
      await createVehicleExpense({
        vehicle_id: selectedVehicleId,
        ...data,
      });
    }
  };

  const handleTireSubmit = async (data: any) => {
    if (selectedVehicleId) {
      await createTire({
        vehicle_id: selectedVehicleId,
        ...data,
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Araç Yönetimi</h1>
      </div>

      <StatCardRow>
        <StatCard 
          label="Toplam Araç" 
          value={vehicles.length} 
          onClick={() => setFilterType('all')}
          isActive={filterType === 'all'}
        />
        <StatCard 
          label="Aktif" 
          value={aktifSayisi} 
          variant="success" 
          onClick={() => setFilterType('aktif')}
          isActive={filterType === 'aktif'}
        />
        <StatCard 
          label="Yaklaşan Muayene" 
          value={yaklasanMuayene} 
          variant={yaklasanMuayene > 0 ? 'warning' : 'default'} 
          onClick={() => setFilterType('yaklasan-muayene')}
          isActive={filterType === 'yaklasan-muayene'}
        />
        <StatCard 
          label="Yaklaşan Sigorta" 
          value={yaklasanSigorta} 
          variant={yaklasanSigorta > 0 ? 'warning' : 'default'} 
          onClick={() => setFilterType('yaklasan-sigorta')}
          isActive={filterType === 'yaklasan-sigorta'}
        />
      </StatCardRow>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Sol Panel - Araç Listesi */}
        <Card className="lg:col-span-1 flex flex-col p-4">
          <VehicleList
            vehicles={filteredVehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={selectVehicle}
            onAddVehicle={handleAddVehicle}
            loading={loading}
          />
        </Card>

        {/* Sağ Panel - Araç Detayları */}
        <Card className="lg:col-span-2 flex flex-col p-4 overflow-hidden">
          {selectedVehicle ? (
            <div className="flex flex-col h-full gap-4 overflow-hidden">
              <VehicleDetails
                vehicle={selectedVehicle}
                onEdit={handleEditVehicle}
                onDelete={handleDeleteVehicle}
                onAddExpense={() => setExpenseFormOpen(true)}
                onAddTire={() => setTireFormOpen(true)}
                loading={loading}
              />

              <Tabs defaultValue="expenses" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expenses">Masraflar</TabsTrigger>
                  <TabsTrigger value="tires">Lastikler</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="flex-1 overflow-y-auto">
                  <VehicleExpensesTab
                    expenses={vehicleExpenses}
                    summary={vehicleExpenseSummary}
                    loading={loading}
                  />
                </TabsContent>

                <TabsContent value="tires" className="flex-1 overflow-y-auto">
                  <VehicleTiresTab tires={tires} loading={loading} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sol taraftan bir araç seçerek detaylarını inceleyin
            </div>
          )}
        </Card>
      </div>

      {/* Formlar */}
      <VehicleForm
        open={vehicleFormOpen}
        onOpenChange={setVehicleFormOpen}
        onSubmit={handleVehicleSubmit}
        initialData={editingVehicle ? selectedVehicle : undefined}
        loading={loading}
      />

      {selectedVehicleId && (
        <>
          <ExpenseForm
            open={expenseFormOpen}
            onOpenChange={setExpenseFormOpen}
            onSubmit={handleExpenseSubmit}
            loading={loading}
          />

          <TireForm
            open={tireFormOpen}
            onOpenChange={setTireFormOpen}
            onSubmit={handleTireSubmit}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
