"use client";

import { useState } from "react";
import { useAyarlar } from "@/hooks/use-ayarlar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Pickaxe, ShoppingBag, Briefcase, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { setSetting } = useAyarlar();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Profil State
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [taxNo, setTaxNo] = useState("");
  
  // Sektör State
  const [industry, setIndustry] = useState<string>("hafriyat_maden");

  const handleNext = () => {
    if (step === 1 && !companyName) return; // Şirket adı zorunlu
    setStep(2);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      if (companyName) await setSetting("company_name", companyName);
      if (contactPerson) await setSetting("contact_person", contactPerson);
      if (taxNo) await setSetting("tax_no", taxNo);
      await setSetting("industry_type", industry);
      await setSetting("setup_complete", "true");
      
      onComplete();
    } catch (error) {
      console.error("Kurulum kaydedilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-4xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col md:flex-row">
        
        {/* Sol Menü (Steps) */}
        <div className="bg-muted p-8 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border">
          <div className="mb-8">
            <Building2 className="h-10 w-10 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Hoş Geldiniz</h2>
            <p className="text-sm text-muted-foreground mt-2">MizanNet'i işletmenize göre yapılandıralım.</p>
          </div>
          
          <div className="space-y-6">
            <div className={`flex items-center gap-3 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                1
              </div>
              <span className="font-medium">Firma Bilgileri</span>
            </div>
            
            <div className={`flex items-center gap-3 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                2
              </div>
              <span className="font-medium">Sektör Seçimi</span>
            </div>
          </div>
        </div>

        {/* Sağ İçerik */}
        <div className="p-8 md:w-2/3 bg-card">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">İşletme Profiliniz</h3>
                <p className="text-sm text-muted-foreground">Faturalarda ve raporlarda görünecek temel bilgileriniz.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Şirket/Firma Adı <span className="text-red-500">*</span></Label>
                  <Input 
                    id="companyName" 
                     
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Yetkili Adı Soyadı</Label>
                  <Input 
                    id="contactPerson" 
                     
                    value={contactPerson} 
                    onChange={e => setContactPerson(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxNo">Vergi Kimlik No / TCKN</Label>
                  <Input 
                    id="taxNo" 
                     
                    value={taxNo} 
                    onChange={e => setTaxNo(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!companyName} className="gap-2">
                  Devam Et <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Sektörünüzü Seçin</h3>
                <p className="text-sm text-muted-foreground">Menüleri ve özellikleri işinize en uygun şekilde ayarlayacağız.</p>
              </div>
              
              <div className="grid gap-4">
                {/* Seçenek 1: Hafriyat ve Madencilik */}
                <div 
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${industry === 'hafriyat_maden' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setIndustry('hafriyat_maden')}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${industry === 'hafriyat_maden' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Pickaxe className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Hafriyat ve Madencilik</h4>
                      <p className="text-xs text-muted-foreground mt-1">Araç filosu, şantiye takibi, ağır vasıta yönetimi ve yakıt takibi aktif olur.</p>
                    </div>
                  </div>
                  {industry === 'hafriyat_maden' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </div>

                {/* Seçenek 2: Perakende */}
                <div 
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${industry === 'perakende' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setIndustry('perakende')}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${industry === 'perakende' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Perakende ve E-Ticaret</h4>
                      <p className="text-xs text-muted-foreground mt-1">Stok, depo, fatura ve müşteri carileri ön plana çıkar.</p>
                    </div>
                  </div>
                  {industry === 'perakende' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </div>

                {/* Seçenek 3: Hizmet */}
                <div 
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${industry === 'hizmet' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setIndustry('hizmet')}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${industry === 'hizmet' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Hizmet ve Danışmanlık</h4>
                      <p className="text-xs text-muted-foreground mt-1">Depo ve araç modülleri gizlenir, sadece finansal tablolar kalır.</p>
                    </div>
                  </div>
                  {industry === 'hizmet' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Geri
                </Button>
                <Button onClick={handleComplete} disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kurulumu Tamamla
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
