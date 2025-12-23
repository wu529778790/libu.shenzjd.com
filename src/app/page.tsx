'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CryptoService } from '@/lib/crypto';

export default function Home() {
  const router = useRouter();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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
      // 有会话，直接进入主界面
      router.replace('/main');
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

  if (showPasswordInput) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 fade-in">
          <h1 className="text-3xl font-bold mb-2 text-center themed-header">
            电子礼簿系统
          </h1>
          <p className="text-gray-600 text-center mb-6">
            请输入密码继续
          </p>

          {selectedEvent && (
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
              <div className="font-bold text-gray-700">{selectedEvent.name}</div>
              <div className="text-gray-600 mt-1">
                {selectedEvent.startDateTime} ~ {selectedEvent.endDateTime}
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full themed-button-primary p-3 rounded-lg font-bold"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            {events.length > 1 && (
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择其他事项
                </label>
                <select
                  value={selectedEvent?.id || ''}
                  onChange={(e) => {
                    const event = events.find(ev => ev.id === e.target.value);
                    setSelectedEvent(event);
                  }}
                  className="w-full px-4 py-2 border rounded-lg"
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
      <div className="text-center fade-in">
        <h1 className="text-4xl font-bold mb-4 themed-header">电子礼簿系统</h1>
        <p className="text-gray-600">正在初始化...</p>
        <div className="mt-8 text-sm text-gray-500">
          <p>正在检查存储状态...</p>
        </div>
      </div>
    </div>
  );
}
