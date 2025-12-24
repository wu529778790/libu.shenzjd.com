'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CryptoService } from '@/lib/crypto';

export default function Home() {
  const router = useRouter();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentSessionEvent, setCurrentSessionEvent] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否有事件存在
    const storedEvents = JSON.parse(localStorage.getItem('giftlist_events') || '[]');
    setEvents(storedEvents);

    // 检查当前会话
    const session = sessionStorage.getItem('currentEvent');
    if (session) {
      // 有会话 → 显示选择界面，让用户决定
      const { event: currentEvent } = JSON.parse(session);
      setShowSessionChoice(true);
      setCurrentSessionEvent(currentEvent);
      return;
    }

    // 没有会话但有事件，需要密码
    if (storedEvents.length > 0) {
      // 默认选择第一个事件
      setSelectedEvent(storedEvents[0]);
      setShowPasswordInput(true);
    } else {
      // 没有事件，去创建
      router.replace('/setup');
    }
  }, [router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !password) return;

    setLoading(true);

    try {
      // 验证密码
      const hash = CryptoService.hash(password);
      if (hash !== selectedEvent.passwordHash) {
        alert('密码错误！');
        setLoading(false);
        return;
      }

      // 保存会话
      sessionStorage.setItem(
        'currentEvent',
        JSON.stringify({
          event: selectedEvent,
          password: password,
          timestamp: Date.now(),
        })
      );

      // 进入主界面
      router.replace('/main');
    } catch (err) {
      console.error(err);
      alert('登录失败: ' + err);
    } finally {
      setLoading(false);
    }
  };

  // 处理继续使用当前会话
  const handleContinueSession = () => {
    router.push('/main');
  };

  // 处理切换到其他事件
  const handleSwitchFromSession = () => {
    sessionStorage.removeItem('currentEvent');
    setShowSessionChoice(false);
    // 重新初始化，会进入密码输入流程
    const storedEvents = JSON.parse(localStorage.getItem('giftlist_events') || '[]');
    if (storedEvents.length > 0) {
      setSelectedEvent(storedEvents[0]);
      setShowPasswordInput(true);
    }
  };

  // 处理切换到特定事件
  const handleSwitchToSpecificEvent = (targetEvent: any) => {
    setSelectedEvent(targetEvent);
    setShowPasswordInput(true);
    setShowSessionChoice(false);
  };

  // 处理创建新事件
  const handleCreateNewEvent = () => {
    router.push('/setup');
  };

  // 会话选择界面
  if (showSessionChoice) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md card p-8 fade-in">
          <h1 className="text-3xl font-bold mb-2 text-center themed-header">
            电子礼簿系统
          </h1>
          <p className="text-gray-600 text-center mb-6">
            检测到当前会话
          </p>

          {/* 当前会话信息 */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-bold text-blue-900 mb-1 text-sm">当前登录：</div>
            <div className="text-sm text-blue-800 font-semibold">{currentSessionEvent?.name}</div>
            <div className="text-xs text-blue-600 mt-1">
              {currentSessionEvent && (() => {
                const formatEventTime = (dt: string) => {
                  const date = new Date(dt);
                  const pad = (num: number) => num.toString().padStart(2, '0');
                  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                };
                return `${formatEventTime(currentSessionEvent.startDateTime)} ~ ${formatEventTime(currentSessionEvent.endDateTime)}`;
              })()}
            </div>
          </div>

          {/* 选择操作 */}
          <div className="space-y-3">
            <button
              onClick={handleContinueSession}
              className="w-full themed-button-primary p-3 rounded-lg font-bold hover-lift"
            >
              继续使用当前事件
            </button>

            <button
              onClick={handleSwitchFromSession}
              className="w-full themed-button-secondary p-3 rounded-lg font-bold hover-lift"
            >
              切换到其他事件
            </button>

            {events.length > 1 && (
              <div className="pt-3 border-t themed-border">
                <p className="text-sm text-gray-600 mb-2">快速切换：</p>
                <div className="space-y-2">
                  {events.map((ev: any) => (
                    ev.id !== currentSessionEvent?.id && (
                      <button
                        key={ev.id}
                        onClick={() => handleSwitchToSpecificEvent(ev)}
                        className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                      >
                        {ev.name}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateNewEvent}
              className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              创建新事件
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 密码输入界面
  if (showPasswordInput) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md card p-8 fade-in">
          <h1 className="text-3xl font-bold mb-2 text-center themed-header">
            电子礼簿系统
          </h1>
          <p className="text-gray-600 text-center mb-6">
            请输入密码继续
          </p>

          {selectedEvent && (
            <div className="mb-4 p-3 card text-sm">
              <div className="font-bold text-gray-700">{selectedEvent.name}</div>
              <div className="text-gray-600 mt-1">
                {(() => {
                  const formatEventTime = (dt: string) => {
                    const date = new Date(dt);
                    const pad = (num: number) => num.toString().padStart(2, '0');
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                  };
                  return `${formatEventTime(selectedEvent.startDateTime)} ~ ${formatEventTime(selectedEvent.endDateTime)}`;
                })()}
              </div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                管理密码
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="themed-ring"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full themed-button-primary p-3 rounded-lg font-bold hover-lift"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            {events.length > 1 && (
              <div className="pt-4 border-t themed-border">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择其他事项
                </label>
                <select
                  value={selectedEvent?.id || ''}
                  onChange={(e) => {
                    const event = events.find(ev => ev.id === e.target.value);
                    setSelectedEvent(event);
                  }}
                  className="themed-ring"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center fade-in-slow">
        <h1 className="text-4xl font-bold mb-4 themed-header">电子礼簿系统</h1>
        <p className="text-gray-600">正在初始化...</p>
        <div className="mt-8 text-sm text-gray-500">
          <p>正在检查存储状态...</p>
        </div>
      </div>
    </div>
  );
}
