import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const YANDEX_CLIENT_ID = 'YOUR_CLIENT_ID';
const REDIRECT_URI = window.location.origin;

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [eqBass, setEqBass] = useState([50]);
  const [eqMid, setEqMid] = useState([50]);
  const [eqTreble, setEqTreble] = useState([50]);

  const handleYandexLogin = () => {
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = authUrl;
  };

  const handlePhoneLogin = () => {
    if (phone.length >= 10) {
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Номер телефона</label>
              <Input
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <Button 
              onClick={handlePhoneLogin} 
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Войти
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
              onClick={handleYandexLogin}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Icon name="CircleUserRound" className="mr-2" size={20} />
              Войти через Яндекс
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Нет аккаунта? <button className="text-primary hover:underline">Зарегистрироваться</button>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center justify-between mb-8 pt-4">
          <h1 className="text-2xl font-bold">AudioControl</h1>
          <Button variant="ghost" size="icon">
            <Icon name="Settings" size={24} />
          </Button>
        </div>

        <Tabs defaultValue="control" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="control">
              <Icon name="Sliders" size={20} />
            </TabsTrigger>
            <TabsTrigger value="battery">
              <Icon name="Battery" size={20} />
            </TabsTrigger>
            <TabsTrigger value="history">
              <Icon name="Clock" size={20} />
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Icon name="User" size={20} />
            </TabsTrigger>
            <TabsTrigger value="support">
              <Icon name="HelpCircle" size={20} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Эквалайзер</h2>
                <Button variant="ghost" size="sm">
                  <Icon name="RotateCcw" size={16} className="mr-1" />
                  Сброс
                </Button>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Низкие</span>
                    <span className="text-primary font-medium">{eqBass[0]}%</span>
                  </div>
                  <Slider
                    value={eqBass}
                    onValueChange={setEqBass}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Средние</span>
                    <span className="text-primary font-medium">{eqMid[0]}%</span>
                  </div>
                  <Slider
                    value={eqMid}
                    onValueChange={setEqMid}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Высокие</span>
                    <span className="text-primary font-medium">{eqTreble[0]}%</span>
                  </div>
                  <Slider
                    value={eqTreble}
                    onValueChange={setEqTreble}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Режимы звука</h2>
              <div className="grid grid-cols-2 gap-3">
                {['Обычный', 'Басы', 'Вокал', 'Кино'].map((mode) => (
                  <Button
                    key={mode}
                    variant="outline"
                    className="h-16 hover:bg-primary/20 hover:border-primary"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="battery" className="space-y-6">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold">{batteryLevel}%</span>
                    </div>
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-secondary"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - batteryLevel / 100)}`}
                        className="text-primary transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Заряд батареи</h2>
                  <p className="text-sm text-muted-foreground">Примерно 12 часов работы</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Статистика</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Циклов зарядки</span>
                  <span className="font-medium">42</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Состояние батареи</span>
                  <span className="font-medium text-green-500">Отличное</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Последняя зарядка</span>
                  <span className="font-medium">2 часа назад</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">История использования</h2>
              <div className="space-y-4">
                {[
                  { date: 'Сегодня', time: '3ч 24мин', icon: 'Music' },
                  { date: 'Вчера', time: '5ч 12мин', icon: 'Music' },
                  { date: '28 янв', time: '2ч 45мин', icon: 'Music' },
                  { date: '27 янв', time: '4ч 03мин', icon: 'Music' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Icon name={item.icon as any} size={20} className="text-primary" />
                      </div>
                      <span className="font-medium">{item.date}</span>
                    </div>
                    <span className="text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="User" size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Пользователь</h2>
                  <p className="text-sm text-muted-foreground">{phone || '+7 999 123-45-67'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="Bell" size={20} className="mr-2" />
                  Уведомления
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="Settings" size={20} className="mr-2" />
                  Настройки
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Icon name="Info" size={20} className="mr-2" />
                  О приложении
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setIsLoggedIn(false)}
                >
                  <Icon name="LogOut" size={20} className="mr-2" />
                  Выйти
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Поддержка</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="flex items-start gap-3 text-left">
                    <Icon name="BookOpen" size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">База знаний</div>
                      <div className="text-sm text-muted-foreground">Ответы на популярные вопросы</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="flex items-start gap-3 text-left">
                    <Icon name="MessageCircle" size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Чат с поддержкой</div>
                      <div className="text-sm text-muted-foreground">Онлайн 24/7</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="flex items-start gap-3 text-left">
                    <Icon name="Mail" size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">support@audiocontrol.com</div>
                    </div>
                  </div>
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-primary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <Icon name="Lightbulb" size={20} className="text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <h3 className="font-semibold">Совет дня</h3>
                  <p className="text-sm text-muted-foreground">
                    Регулярно обновляйте прошивку наушников для лучшего качества звука и новых функций
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
