'use client';

import { ProfileSection } from '@/components/ayarlar/profile-section';
import { BackupSection } from '@/components/ayarlar/backup-section';
import { ApiKeySection } from '@/components/ayarlar/api-key-section';
import { AiProviderSection } from '@/components/ayarlar/ai-provider-section';
import { DataLocationSection } from '@/components/ayarlar/data-location-section';
import { WhatsAppSection } from '@/components/ayarlar/whatsapp-section';
import { LicenseSection } from '@/components/ayarlar/license-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AyarlarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-gray-600">Uygulama ayarlarını yönetin</p>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="lisans">Lisans</TabsTrigger>
          <TabsTrigger value="yedekleme">Yedekleme</TabsTrigger>
          <TabsTrigger value="veri">Veri Konumu</TabsTrigger>
          <TabsTrigger value="api">Yapay Zeka</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="space-y-4">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="lisans" className="space-y-4">
          <LicenseSection />
        </TabsContent>

        <TabsContent value="yedekleme" className="space-y-4">
          <BackupSection />
        </TabsContent>

        <TabsContent value="veri" className="space-y-4">
          <DataLocationSection />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <AiProviderSection />
          <ApiKeySection />
        </TabsContent>

      </Tabs>
    </div>
  );
}
