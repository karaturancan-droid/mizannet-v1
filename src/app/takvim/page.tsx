'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Bell, AlertCircle } from 'lucide-react';
import { useBildirimler, type Notification } from '@/hooks/use-bildirimler';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function TakvimPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { notifications, loadNotifications, updateNotificationDate } = useBildirimler();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  useEffect(() => {
    loadNotifications({ status: 'aktif' }).catch(() => {});
  }, [loadNotifications]);

  // Group notifications by date
  const notificationsByDate = notifications.reduce((acc, notif) => {
    if (notif.due_date) {
      const dateKey = notif.due_date.split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(notif);
    }
    return acc;
  }, {} as Record<string, Notification[]>);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Takvim
          </h1>
          <p className="text-gray-600">Önemli tarihleri ve olayları takip edin</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {MONTHS[month]} {year}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Bugün
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground mb-2">
            {DAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              let dateStr = '';
              let hasEvent = false;
              if (day !== null) {
                // format YYYY-MM-DD
                const dDate = new Date(year, month, day);
                // Adjust for local timezone offset when getting ISO string
                const tzOffset = dDate.getTimezoneOffset() * 60000;
                dateStr = (new Date(dDate.getTime() - tzOffset)).toISOString().split('T')[0];
                hasEvent = !!notificationsByDate[dateStr];
              }

              return (
                <div
                  key={idx}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (day !== null) {
                      e.currentTarget.classList.add('bg-muted/50');
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-muted/50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-muted/50');
                    if (day !== null) {
                      const notifId = e.dataTransfer.getData('text/plain');
                      if (notifId) {
                        const targetDate = new Date(year, month, day);
                        const tzOffset = targetDate.getTimezoneOffset() * 60000;
                        const dateStr = (new Date(targetDate.getTime() - tzOffset)).toISOString().split('T')[0];
                        updateNotificationDate(notifId, dateStr);
                      }
                    }
                  }}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-md text-sm transition-colors
                    ${day === null ? 'invisible' : 'cursor-pointer hover:bg-muted border'}
                    ${day !== null && isToday(day) ? 'bg-primary text-primary-foreground font-bold border-primary' : 'bg-card'}
                  `}
                >
                  {day}
                  {hasEvent && day !== null && (
                    <div className="absolute bottom-1 flex flex-wrap justify-center gap-0.5 px-1 w-full">
                      {notificationsByDate[dateStr].slice(0, 3).map((n) => (
                        <div 
                          key={n.id} 
                          draggable 
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', n.id);
                            e.stopPropagation();
                          }}
                          className="h-1.5 w-1.5 rounded-full bg-red-500 cursor-grab active:cursor-grabbing"
                          title={n.title}
                        />
                      ))}
                      {notificationsByDate[dateStr].length > 3 && (
                        <span className="text-[8px] leading-none text-muted-foreground">+{notificationsByDate[dateStr].length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yaklaşan Olaylar</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Henüz yaklaşan bir olay bulunmuyor.
              </p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {notifications
                  .filter((n) => n.status === 'aktif' && n.due_date)
                  .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                  .map((notif) => (
                      <div 
                        key={notif.id} 
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', notif.id)}
                        className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0 cursor-grab active:cursor-grabbing hover:bg-muted/30 p-1 rounded transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{notif.module}</Badge>
                            {notif.due_date && format(new Date(notif.due_date), 'dd MMMM yyyy', { locale: tr })}
                          </p>
                        </div>
                        {notif.days_left !== undefined && (
                          <Badge variant={notif.days_left <= 3 ? 'destructive' : 'secondary'} className="text-xs">
                            {notif.days_left < 0 ? 'Geçti' : notif.days_left === 0 ? 'Bugün' : `${notif.days_left} gün`}
                          </Badge>
                        )}
                      </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bugün</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
