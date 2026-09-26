'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Loader2 } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weathercode: number;
}

// WMO Weather interpretation codes
function getWeatherDetails(code: number) {
  if (code === 0) return { label: 'Güneşli', icon: Sun };
  if (code === 1 || code === 2) return { label: 'Parçalı Bulutlu', icon: Cloud };
  if (code === 3) return { label: 'Bulutlu', icon: Cloud };
  if (code === 45 || code === 48) return { label: 'Sisli', icon: CloudFog };
  if (code >= 51 && code <= 55) return { label: 'Çisenti', icon: CloudDrizzle };
  if (code >= 61 && code <= 65) return { label: 'Yağmurlu', icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: 'Karlı', icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: 'Sağanak Yağış', icon: CloudRain };
  if (code >= 95 && code <= 99) return { label: 'Fırtına', icon: CloudLightning };
  return { label: 'Bulutlu', icon: Cloud }; // Default fallback
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setTime(new Date()), 60000);
    
    // IP tabanlı otomatik konum bulma ve hava durumu çekme
    async function fetchWeather() {
      try {
        // 1. Kullanıcının IP adresinden tahmini konumunu bul
        let lat = 41.0082; // Varsayılan: İstanbul
        let lon = 28.9784;
        
        try {
          const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.latitude && geoData.longitude) {
              lat = parseFloat(geoData.latitude);
              lon = parseFloat(geoData.longitude);
            }
          }
        } catch (geoErr) {
          console.warn("Konum alınamadı, varsayılan (İstanbul) kullanılıyor:", geoErr);
        }

        // 2. Bulunan konuma göre hava durumunu çek
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          if (weatherData.current_weather) {
            setWeather(weatherData.current_weather);
          }
        }
      } catch (err) {
        console.error("Hava durumu alınamadı", err);
      }
    }

    fetchWeather();

    return () => clearInterval(timer);
  }, []);

  const details = weather ? getWeatherDetails(weather.weathercode) : null;
  const Icon = details?.icon || Cloud;

  return (
    <div className="hidden lg:flex items-center gap-4 bg-white border border-zinc-100 shadow-sm rounded-full px-5 py-2.5">
      <div className="text-sm font-bold text-zinc-900 tracking-tight">
        {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="w-px h-8 bg-zinc-200"></div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
            {time.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'long' })}
          </span>
          <span className="text-[13px] font-bold text-zinc-800 leading-tight flex items-center gap-1">
            {details ? (
              <>
                {details.label} <span className="text-zinc-500 font-medium ml-1">{Math.round(weather!.temperature)}°C</span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-zinc-400">Yükleniyor <Loader2 className="w-3 h-3 animate-spin" /></span>
            )}
          </span>
        </div>
        {details ? (
          <Icon className="w-6 h-6 text-zinc-600" strokeWidth={1.5} />
        ) : (
          <Cloud className="w-6 h-6 text-zinc-300" strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}
