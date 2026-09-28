'use client';

import { ProfileSection } from '@/components/ayarlar/profile-section';
import { BackupSection } from '@/components/ayarlar/backup-section';
import { ApiKeySection } from '@/components/ayarlar/api-key-section';
import { AiProviderSection } from '@/components/ayarlar/ai-provider-section';
import { DataLocationSection } from '@/components/ayarlar/data-location-section';
import { WhatsAppSection } from '@/components/ayarlar/whatsapp-section';
import { LicenseSection } from '@/components/ayarlar/license-section';
import { WebAccountSection } from '@/components/ayarlar/web-account-section';
import { InvoiceBrandingSection } from '@/components/ayarlar/invoice-branding-section';
import { NetworkSection } from '@/components/ayarlar/network-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AyarlarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-gray-600">Uygulama ayarlarını yönetin</p>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto p-1 mb-8">
          <TabsTrigger value="profil" className="py-2">Profil</TabsTrigger>
          <TabsTrigger value="lisans" className="py-2">Lisans</TabsTrigger>
          <TabsTrigger value="web" className="py-2">Web Hesabı</TabsTrigger>
          <TabsTrigger value="marka" className="py-2">Fatura Markası</TabsTrigger>
          <TabsTrigger value="yedekleme" className="py-2">Yedekleme</TabsTrigger>
          <TabsTrigger value="veri" className="py-2">Veri Konumu</TabsTrigger>
          <TabsTrigger value="ag" className="py-2">Ağ (LAN)</TabsTrigger>
          <TabsTrigger value="api" className="py-2">Yapay Zeka</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="space-y-4">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="lisans" className="space-y-4">
          <LicenseSection />
        </TabsContent>

        <TabsContent value="web" className="space-y-4">
          <WebAccountSection />
        </TabsContent>

        <TabsContent value="marka" className="space-y-4">
          <InvoiceBrandingSection />
        </TabsContent>

        <TabsContent value="yedekleme" className="space-y-4">
          <BackupSection />
        </TabsContent>

        <TabsContent value="veri" className="space-y-4">
          <DataLocationSection />
        </TabsContent>

        <TabsContent value="ag" className="space-y-4">
          <NetworkSection />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <AiProviderSection />
          <ApiKeySection />
        </TabsContent>

      </Tabs>
    </div>
  );
}
