'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Scale, FileText, FileQuestion, Gavel, Search, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NavItem {
  id: string;
  title: string;
  icon: any;
  items?: { id: string; title: string; content?: string }[];
}

export function KnowledgeBase() {
  const [activeCategory, setActiveCategory] = useState('vuk');
  const [activeSubItem, setActiveSubItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Placeholder veri, arka plandan PDF içerikleri çekilecek
  const [vukData, setVukData] = useState<any[]>([]);
  const [tekduzenData, setTekduzenData] = useState<any[]>([]);
  const [isKanunuData, setIsKanunuData] = useState<any[]>([]);

  useEffect(() => {
    // Statik JSON verilerini yükle (PDF'lerden çevrilmiş)
    fetch('/data/vuk.json').then(res => res.ok ? res.json() : []).then(setVukData).catch(() => {});
    fetch('/data/tekduzen.json').then(res => res.ok ? res.json() : []).then(setTekduzenData).catch(() => {});
    fetch('/data/is_kanunu.json').then(res => res.ok ? res.json() : []).then(setIsKanunuData).catch(() => {});
  }, []);

  const NAVIGATION: NavItem[] = [
    {
      id: 'vuk',
      title: 'Vergi Usul Kanunu (213)',
      icon: Scale,
    },
    {
      id: 'tekduzen',
      title: 'Tekdüzen Hesap Planı',
      icon: BookOpen,
    },
    {
      id: 'is_kanunu',
      title: '4857 Sayılı İş Kanunu',
      icon: Gavel,
    },
    {
      id: 'kilavuz',
      title: 'Kullanım Kılavuzu',
      icon: FileQuestion,
    },
    {
      id: 'sozlesme',
      title: 'Kullanıcı Sözleşmesi',
      icon: FileText,
    }
  ];

  // Aktif veriyi belirle
  let currentContent = [];
  if (activeCategory === 'vuk') currentContent = vukData;
  else if (activeCategory === 'tekduzen') currentContent = tekduzenData;
  else if (activeCategory === 'is_kanunu') currentContent = isKanunuData;

  // Arama filtresi
  const filteredContent = currentContent.filter(item => 
    !searchTerm || 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      {/* Sol Menü - Fihrist */}
      <Card className="w-64 shrink-0 flex flex-col overflow-hidden bg-[var(--sidebar-background)] border-r border-white/10 text-white">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-bold text-lg text-white">Mevzuat & Bilgi</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {NAVIGATION.map((nav) => {
              const Icon = nav.icon;
              const isActive = activeCategory === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => { setActiveCategory(nav.id); setActiveSubItem(null); setSearchTerm(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-left flex-1">{nav.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Sağ Taraf - İçerik */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            {NAVIGATION.find(n => n.id === activeCategory)?.title}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search"
              placeholder="Madde, başlık veya içerik ara..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {filteredContent.length > 0 ? (
              filteredContent.map((item, i) => (
                <div key={i} id={`item-${i}`} className="scroll-mt-6 border-b pb-6 last:border-0">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">{item.title}</h3>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                {searchTerm ? (
                  <p>Aramanızla eşleşen bir madde bulunamadı.</p>
                ) : activeCategory === 'kilavuz' ? (
                  <div className="text-left space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                        <BookOpen className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">MizanNet Hızlı Başlangıç Kılavuzu</h3>
                        <p className="text-gray-500">Yapay Zeka Destekli Yeni Nesil Muhasebe Asistanınız</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">1</span>
                          Yapay Zeka ile Fatura Okuma
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">MizanNet, karmaşık faturalarınızı saniyeler içinde okur ve kategorize eder.</p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          <li>Ana menüden <strong>Veri Aktarımı</strong> seçeneğine tıklayın.</li>
                          <li>Taranmış fatura (PDF) veya Fotoğraf seçin.</li>
                          <li>"Yapay Zeka ile Analiz Et" butonuna basarak işlemin bitmesini bekleyin.</li>
                        </ul>
                      </div>
                      
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">2</span>
                          WhatsApp Entegrasyonu
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">Faturaları ve dekontları doğrudan WhatsApp üzerinden MizanNet'e gönderin.</p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          <li><strong>Ayarlar &gt; WhatsApp</strong> ekranından QR kodu okutun.</li>
                          <li>Müşterilerden gelen belgeler otomatik olarak <strong>Onay Bekleyenler</strong> ekranına düşer.</li>
                          <li>Tek tıkla deftere kaydedin.</li>
                        </ul>
                      </div>
                      
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">3</span>
                          Excel Otomatik Eşleştirme
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">Banka ekstreleri veya cari listelerinizi içeri aktarırken saatler harcamayın.</p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          <li>Herhangi bir formatta Excel yükleyin.</li>
                          <li>Sistem, sütun başlıklarını yapay zeka ile otomatik tanır.</li>
                          <li>Eksik veriler (Örn: Vergi No) otomatik tamamlanır.</li>
                        </ul>
                      </div>
                      
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">4</span>
                          Telegram Asistan
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">Mobil durumdayken stok veya cari sorgulamak çok kolay.</p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          <li>MizanNet botuna Telegram üzerinden "/bakiye" veya sesli mesaj gönderin.</li>
                          <li>Yapay zeka sesinizi veya metninizi anlayıp anında yanıt verir.</li>
                          <li>Onayınız olmadan kimse veri çekemez (Beyaz Liste onaylıdır).</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : activeCategory === 'sozlesme' ? (
                   <div className="text-left space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800">MizanNet Kullanıcı Sözleşmesi</h3>
                    <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                      <p><strong>1. Taraflar:</strong> İşbu Sözleşme, MizanNet yazılımını ("Yazılım") kullanan kişi veya kurum ("Kullanıcı") ile yazılımın geliştiricisi arasında akdedilmiştir.</p>
                      <p><strong>2. Lisans ve Kullanım:</strong> Yazılım, kullanıcıya yerel (offline) ortamda kendi bilgisayarında veri tutması amacıyla lisanslanmıştır. Kullanıcı, uygulamanın şifreleme ve veritabanı dosyalarını 3. şahıslara satamaz veya kopyalayamaz.</p>
                      <p><strong>3. Veri Güvenliği:</strong> MizanNet, tüm verileri doğrudan kullanıcının bilgisayarında (C:\Users\... dizininde) SQLite formatında AES-256 algoritmasıyla şifrelenmiş olarak saklar. Veri kaybı veya donanım arızalarından doğacak sorumluluk kullanıcıya aittir. Düzenli yedekleme yapılması tavsiye edilir.</p>
                      <p><strong>4. Yapay Zeka (AI) Kullanımı:</strong> Uygulama içindeki akıllı asistan, OpenAI veya Local LLM modellerini kullanarak finansal verilerinizi sadece sizin verdiğiniz sınırlar içerisinde yorumlar. Bulut modeller kullanıldığında veriler geçici olarak API'lere iletilebilir, bu durum kullanıcının sorumluluğundadır.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" />
                    <p>Kanun metinleri yükleniyor veya işleniyor...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
