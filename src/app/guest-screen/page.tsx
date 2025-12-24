'use client';

import { useEffect, useState } from 'react';
import { GiftData } from '@/types';
import { Utils } from '@/lib/utils';

export default function GuestScreen() {
  const [data, setData] = useState<{
    eventName: string;
    theme: string;
    gifts: GiftData[];
  } | null>(null);

  useEffect(() => {
    // 轮询读取 localStorage
    const interval = setInterval(() => {
      const stored = localStorage.getItem('guest_screen_data');
      if (stored) {
        setData(JSON.parse(stored));
      }
    }, 1000);

    // 监听 postMessage
    window.addEventListener('message', (e) => {
      if (e.data.type === 'guest_screen_update') {
        setData(e.data.data);
      }
    });

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center fade-in">
          <h1 className="text-2xl font-bold mb-4 themed-header">等待主屏数据...</h1>
          <p className="text-gray-600">请确保主屏已打开并录入数据</p>
        </div>
      </div>
    );
  }

  // 应用主题
  const themeClass = data.theme === 'theme-festive' ? 'theme-festive' : 'theme-solemn';

  return (
    <div className={`min-h-screen ${themeClass} bg-gray-50`}>
      {/* 控制栏 */}
      <div className="fixed top-4 right-4 flex gap-2 no-print z-50">
        <button
          onClick={() => document.documentElement.requestFullscreen()}
          className="themed-button-secondary border px-3 py-1 rounded text-sm"
        >
          全屏
        </button>
      </div>

      <div className="p-8">
        {/* 标题 */}
        <h1 className="text-4xl font-bold text-center mb-8 themed-header font-kaiti">
          {data.eventName}
        </h1>

        {/* 礼簿框架 - 使用 gift-book-frame 样式 */}
        <div className="gift-book-frame max-w-6xl mx-auto">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-1 mb-4 pb-2 border-b-2 themed-border text-center font-bold text-lg">
            <div className="col-span-4">姓名</div>
            <div className="col-span-3">类型</div>
            <div className="col-span-5">金额</div>
          </div>

          {/* 数据行 - 3行垂直布局：姓名、类型、大写金额 */}
          <div className="gift-book-grid">
            {/* 第1行：姓名（竖排） */}
            <div className="gift-book-row">
              {Array.from({ length: 12 }).map((_, idx) => {
                const gift = data.gifts[idx];
                const isLatest = idx === data.gifts.length - 1;
                return (
                  <div
                    key={idx}
                    className={`book-cell name-cell ${isLatest ? 'bg-yellow-100 animate-pulse' : ''}`}
                  >
                    {gift ? (
                      <div className="name">
                        {gift.name.length === 2
                          ? `${gift.name[0]}　${gift.name[1]}`
                          : gift.name}
                      </div>
                    ) : (
                      <span className="text-gray-200">+</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 第2行：类型（竖排） */}
            <div className="gift-book-row">
              {Array.from({ length: 12 }).map((_, idx) => {
                const gift = data.gifts[idx];
                const isLatest = idx === data.gifts.length - 1;
                return (
                  <div
                    key={idx}
                    className={`book-cell type-cell ${isLatest ? 'bg-yellow-100 animate-pulse' : ''}`}
                  >
                    {gift ? gift.type : <span className="text-gray-200">+</span>}
                  </div>
                );
              })}
            </div>

            {/* 第3行：大写金额（竖排） */}
            <div className="gift-book-row">
              {Array.from({ length: 12 }).map((_, idx) => {
                const gift = data.gifts[idx];
                const isLatest = idx === data.gifts.length - 1;
                return (
                  <div
                    key={idx}
                    className={`book-cell amount-cell ${isLatest ? 'bg-yellow-100 animate-pulse' : ''}`}
                  >
                    {gift ? (
                      <div className="amount-chinese">
                        {Utils.amountToChinese(gift.amount)}
                      </div>
                    ) : <span className="text-gray-200">+</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部统计 */}
        <div className="text-center mt-6 text-gray-600 text-lg">
          <span className="font-bold themed-text">总计 {data.gifts.length} 人</span> |{' '}
          <span className="font-bold themed-text">
            总金额 ¥{data.gifts.reduce((sum, g) => sum + g.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
