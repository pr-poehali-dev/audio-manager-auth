import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AUTH_API = 'https://functions.poehali.dev/4140a91a-0ec4-4d8e-a07a-10297d945a93';
const HEADPHONES_API = 'https://functions.poehali.dev/c96442ee-07b8-4e62-bbbc-3d180f1fda54';

export default function Index() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [registerData, setRegisterData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });
  
  const [headphones, setHeadphones] = useState<any[]>([]);
  const [activeHeadphone, setActiveHeadphone] = useState<any>(null);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [batteryHistory, setBatteryHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      setUserId(parseInt(savedUserId));
      loadUserData(parseInt(savedUserId));
    }

    const hash = window.location.hash;
    if (hash.includes('code=')) {
      const code = new URLSearchParams(hash.substring(1)).get('code');
      if (code) {
        handleYandexCallback(code);
      }
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadHeadphones();
    }
  }, [userId]);

  useEffect(() => {
    if (activeHeadphone) {
      loadUsageHistory(activeHeadphone.id);
      loadBatteryHistory(activeHeadphone.id);
      detectBatteryLevel();
    }
  }, [activeHeadphone]);

  const detectBatteryLevel = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        const level = Math.round(battery.level * 100);
        setBatteryLevel(level);
        
        if (activeHeadphone) {
          await fetch(HEADPHONES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_battery_log',
              headphone_id: activeHeadphone.id,
              battery_level: level
            })
          });
        }
      } catch (error) {
        console.log('Battery API not available');
        setBatteryLevel(85);
      }
    } else {
      setBatteryLevel(85);
    }
  };

  const handleYandexLogin = () => {
    const clientId = 'YOUR_YANDEX_CLIENT_ID';
    const redirectUri = window.location.origin;
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const handleYandexCallback = async (code: string) => {
    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'yandex_callback', code })
      });
      
      const data = await response.json();
      if (data.user_id) {
        setUserId(data.user_id);
        localStorage.setItem('userId', data.user_id.toString());
        setUserData(data);
        window.history.replaceState({}, document.title, '/');
        toast.success('Успешный вход через Яндекс!');
      }
    } catch (error) {
      toast.error('Ошибка авторизации через Яндекс');
    }
  };

  const handleRegister = async () => {
    if (!registerData.first_name || !registerData.phone) {
      toast.error('Заполните имя и телефон');
      return;
    }

    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...registerData })
      });
      
      const data = await response.json();
      if (data.user_id) {
        setUserId(data.user_id);
        localStorage.setItem('userId', data.user_id.toString());
        setShowRegister(false);
        toast.success('Регистрация успешна!');
      }
    } catch (error) {
      toast.error('Ошибка регистрации');
    }
  };

  const loadUserData = async (id: number) => {
    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user', user_id: id })
      });
      
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user data');
    }
  };

  const loadHeadphones = async () => {
    try {
      const response = await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user_headphones', user_id: userId })
      });
      
      const data = await response.json();
      setHeadphones(data.headphones || []);
      const active = data.headphones?.find((h: any) => h.is_active);
      if (active) {
        setActiveHeadphone(active);
      }
    } catch (error) {
      console.error('Failed to load headphones');
    }
  };

  const connectBluetoothDevice = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth API недоступен в этом браузере');
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      const response = await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_headphone',
          user_id: userId,
          device_name: device.name || 'Неизвестное устройство',
          device_id: device.id
        })
      });

      const data = await response.json();
      if (data.headphone_id) {
        toast.success(`${device.name} подключён!`);
        loadHeadphones();
        setShowAddDevice(false);
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast.info('Подключение отменено');
      } else {
        toast.error('Ошибка подключения Bluetooth');
      }
    }
  };

  const updateEqSettings = async (settings: any) => {
    if (!activeHeadphone) return;

    try {
      await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_eq_settings',
          headphone_id: activeHeadphone.id,
          ...settings
        })
      });
    } catch (error) {
      console.error('Failed to update settings');
    }
  };

  const resetEqualizer = () => {
    if (activeHeadphone) {
      updateEqSettings({ eq_bass: 50, eq_mid: 50, eq_treble: 50 });
      setActiveHeadphone({ ...activeHeadphone, eq_bass: 50, eq_mid: 50, eq_treble: 50 });
      toast.success('Эквалайзер сброшен');
    }
  };

  const setSoundMode = async (mode: string) => {
    if (!activeHeadphone) return;
    await updateEqSettings({ sound_mode: mode });
    setActiveHeadphone({ ...activeHeadphone, sound_mode: mode });
    toast.success(`Режим: ${mode}`);
  };

  const deleteHeadphone = async (id: number) => {
    try {
      await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_headphone', headphone_id: id })
      });
      
      toast.success('Наушники удалены');
      loadHeadphones();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const loadUsageHistory = async (headphoneId: number) => {
    try {
      const response = await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_usage_history', headphone_id: headphoneId })
      });
      
      const data = await response.json();
      setUsageHistory(data.history || []);
    } catch (error) {
      console.error('Failed to load usage history');
    }
  };

  const loadBatteryHistory = async (headphoneId: number) => {
    try {
      const response = await fetch(HEADPHONES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_battery_history', headphone_id: headphoneId })
      });
      
      const data = await response.json();
      setBatteryHistory(data.history || []);
    } catch (error) {
      console.error('Failed to load battery history');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUserId(null);
    setUserData(null);
    setHeadphones([]);
    setActiveHeadphone(null);
    toast.success('Вы вышли из аккаунта');
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', user_id: userId })
      });
      
      handleLogout();
      toast.success('Аккаунт удалён');
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Ошибка удаления аккаунта');
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
        <Card className="w-full max-w-md p-8 space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="Headphones" size={40} className="text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">AudioControl</h1>
            <p className="text-muted-foreground">Управление вашими наушниками</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleYandexLogin}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Icon name="CircleUserRound" className="mr-2" size={20} />
              Войти через Яндекс
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <Button
              onClick={() => setShowRegister(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Зарегистрироваться
            </Button>
          </div>
        </Card>

        <Dialog open={showRegister} onOpenChange={setShowRegister}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Регистрация</DialogTitle>
              <DialogDescription>Заполните данные для создания аккаунта</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Имя *</Label>
                <Input
                  value={registerData.first_name}
                  onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                  placeholder="Иван"
                />
              </div>
              <div>
                <Label>Фамилия</Label>
                <Input
                  value={registerData.last_name}
                  onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                  placeholder="Иванов"
                />
              </div>
              <div>
                <Label>Телефон *</Label>
                <Input
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  placeholder="+7 999 123 45 67"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="example@mail.ru"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRegister} className="w-full">
                Зарегистрироваться
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center justify-between mb-8 pt-4">
          <h1 className="text-2xl font-bold">AudioControl</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowAddDevice(true)}>
            <Icon name="Plus" size={24} />
          </Button>
        </div>

        {!activeHeadphone && (
          <Card className="p-8 text-center space-y-4 mb-6">
            <Icon name="HeadphonesOff" size={48} className="mx-auto text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Нет активных наушников</p>
            <Button onClick={() => setShowAddDevice(true)}>
              <Icon name="Plus" className="mr-2" size={20} />
              Подключить наушники
            </Button>
          </Card>
        )}

        <Tabs defaultValue="control" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="control">
              <Icon name="Sliders" size={20} />
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Icon name="Headphones" size={20} />
            </TabsTrigger>
            <TabsTrigger value="history">
              <Icon name="Clock" size={20} />
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Icon name="User" size={20} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            {activeHeadphone && (
              <>
                <Card className="p-6">
                  <div className="text-center space-y-4 mb-6">
                    <div className="flex justify-center">
                      <div className="relative w-32 h-32">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-bold">{batteryLevel}%</span>
                        </div>
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-secondary" />
                          <circle
                            cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - batteryLevel / 100)}`}
                            className="text-primary transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{activeHeadphone.device_name}</h2>
                      <p className="text-sm text-muted-foreground">Заряд батареи</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Эквалайзер</h2>
                    <Button variant="ghost" size="sm" onClick={resetEqualizer}>
                      <Icon name="RotateCcw" size={16} className="mr-1" />
                      Сброс
                    </Button>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Низкие</span>
                        <span className="text-primary font-medium">{activeHeadphone.eq_bass}%</span>
                      </div>
                      <Slider
                        value={[activeHeadphone.eq_bass]}
                        onValueChange={(val) => {
                          setActiveHeadphone({ ...activeHeadphone, eq_bass: val[0] });
                          updateEqSettings({ eq_bass: val[0] });
                        }}
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Средние</span>
                        <span className="text-primary font-medium">{activeHeadphone.eq_mid}%</span>
                      </div>
                      <Slider
                        value={[activeHeadphone.eq_mid]}
                        onValueChange={(val) => {
                          setActiveHeadphone({ ...activeHeadphone, eq_mid: val[0] });
                          updateEqSettings({ eq_mid: val[0] });
                        }}
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Высокие</span>
                        <span className="text-primary font-medium">{activeHeadphone.eq_treble}%</span>
                      </div>
                      <Slider
                        value={[activeHeadphone.eq_treble]}
                        onValueChange={(val) => {
                          setActiveHeadphone({ ...activeHeadphone, eq_treble: val[0] });
                          updateEqSettings({ eq_treble: val[0] });
                        }}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Режимы звука</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Обычный', value: 'normal' },
                      { name: 'Басы', value: 'bass' },
                      { name: 'Вокал', value: 'vocal' },
                      { name: 'Кино', value: 'cinema' }
                    ].map((mode) => (
                      <Button
                        key={mode.value}
                        variant={activeHeadphone.sound_mode === mode.value ? 'default' : 'outline'}
                        className="h-16"
                        onClick={() => setSoundMode(mode.value)}
                      >
                        {mode.name}
                      </Button>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Мои наушники</h2>
              <div className="space-y-3">
                {headphones.map((h) => (
                  <div
                    key={h.id}
                    className={`p-4 rounded-lg border ${h.is_active ? 'border-primary bg-primary/10' : 'border-border'} transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon name="Headphones" size={24} className={h.is_active ? 'text-primary' : 'text-muted-foreground'} />
                        <div>
                          <div className="font-medium">{h.device_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(h.last_connected).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHeadphone(h.id)}
                      >
                        <Icon name="Trash2" size={18} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {headphones.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Наушники не подключены</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {activeHeadphone && (
              <>
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">История заряда</h2>
                  <div className="space-y-2">
                    {batteryHistory.slice(0, 10).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-secondary/30 rounded">
                        <span>{new Date(item.recorded_at).toLocaleString('ru-RU')}</span>
                        <span className="font-medium">{item.battery_level}%</span>
                      </div>
                    ))}
                    {batteryHistory.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">История пуста</p>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">История использования</h2>
                  <div className="space-y-2">
                    {usageHistory.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-secondary/30 rounded">
                        <span>{new Date(item.date).toLocaleDateString('ru-RU')}</span>
                        <span className="font-medium">{item.duration_minutes} мин</span>
                      </div>
                    ))}
                    {usageHistory.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">История пуста</p>
                    )}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="User" size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{userData?.first_name} {userData?.last_name}</h2>
                  <p className="text-sm text-muted-foreground">{userData?.phone || userData?.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="Bell" size={20} className="mr-2" />
                  Уведомления
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="Info" size={20} className="mr-2" />
                  О приложении
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                  <Icon name="LogOut" size={20} className="mr-2" />
                  Выйти
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Icon name="Trash2" size={20} className="mr-2" />
                  Удалить аккаунт
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Подключить наушники</DialogTitle>
              <DialogDescription>Выберите устройство Bluetooth для подключения</DialogDescription>
            </DialogHeader>
            <Button onClick={connectBluetoothDevice} className="w-full">
              <Icon name="Bluetooth" className="mr-2" size={20} />
              Поиск Bluetooth устройств
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить аккаунт?</DialogTitle>
              <DialogDescription>
                Все данные будут удалены безвозвратно. Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Отмена
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
