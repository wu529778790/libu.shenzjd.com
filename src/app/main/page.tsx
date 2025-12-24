'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, GiftData, GiftRecord } from '@/types';
import { CryptoService } from '@/lib/crypto';
import { Utils } from '@/lib/utils';
import { GitHubService } from '@/lib/github';
import * as XLSX from 'xlsx';

export default function MainPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [password, setPassword] = useState('');
  const [gifts, setGifts] = useState<
    { record: GiftRecord; data: GiftData | null }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: '现金' as const,
    remark: '',
  });
  const [chineseAmount, setChineseAmount] = useState('');

  // GitHub 服务
  const [github, setGithub] = useState<GitHubService | null>(null);

  useEffect(() => {
    // 检查会话
    const session = sessionStorage.getItem('currentEvent');
    if (!session) {
      router.replace('/');
      return;
    }

    const { event, password } = JSON.parse(session);
    setEvent(event);
    setPassword(password);

    // 加载数据（直接使用从session获取的password，不依赖状态）
    loadData(event.id, password);

    // 检查 GitHub 配置
    const githubConfig = localStorage.getItem('giftlist_github');
    if (githubConfig) {
      try {
        const config = JSON.parse(githubConfig);
        setGithub(new GitHubService(config));
      } catch {}
    }
  }, []); // 移除 router 依赖，避免重复执行

  const loadData = async (eventId: string, pwd?: string) => {
    const records = JSON.parse(
      localStorage.getItem(`giftlist_gifts_${eventId}`) || '[]'
    );

    // 使用传入的password或当前状态
    const decryptPassword = pwd || password;

    console.log('[Main] Loading data for event:', eventId);
    console.log('[Main] Records count:', records.length);
    console.log('[Main] Using password length:', decryptPassword?.length);

    // 只解密第一页（12条）
    const PAGE_SIZE = 12;
    const decrypted = records.slice(0, PAGE_SIZE).map((r: GiftRecord) => {
      const data = CryptoService.decrypt<GiftData>(r.encryptedData, decryptPassword);
      if (!data) {
        console.error('[Main] Failed to decrypt record:', r.id);
      }
      return {
        record: r,
        data,
      };
    });

    setGifts(decrypted);
  };

  const handleAmountChange = (value: string) => {
    setFormData({ ...formData, amount: value });
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setChineseAmount(Utils.amountToChinese(num));
    } else {
      setChineseAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !password) return;

    setLoading(true);

    try {
      const giftData: GiftData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        type: formData.type,
        remark: formData.remark || undefined,
        timestamp: new Date().toISOString(),
        abolished: false,
      };

      const encrypted = CryptoService.encrypt(giftData, password);
      const record: GiftRecord = {
        id: Utils.generateId(),
        eventId: event.id,
        encryptedData: encrypted,
      };

      // 保存到 localStorage
      const key = `giftlist_gifts_${event.id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(record);
      localStorage.setItem(key, JSON.stringify(existing));

      // 同步到 GitHub（如果配置）
      if (github) {
        try {
          const allGifts = JSON.parse(localStorage.getItem(key) || '[]');
          await github.syncGifts(event.id, allGifts);
        } catch (err) {
          console.error('GitHub sync failed:', err);
        }
      }

      // 乐观更新 UI
      setGifts((prev) => [...prev, { record, data: giftData }]);

      // 重置表单
      setFormData({ name: '', amount: '', type: '现金', remark: '' });
      setChineseAmount('');

      // 聚焦
      const nameInput = document.getElementById('name-input') as HTMLInputElement;
      nameInput?.focus();

      // 同步副屏
      syncGuestScreen(giftData);
    } catch (err) {
      console.error(err);
      alert('录入失败: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const syncGuestScreen = (newGift?: GiftData) => {
    const allGifts = gifts
      .filter((g) => g.data && !g.data.abolished)
      .map((g) => g.data!);

    if (newGift) allGifts.push(newGift);

    const data = {
      eventName: event?.name,
      theme:
        event?.theme === 'festive' ? 'theme-festive' : 'theme-solemn',
      gifts: allGifts.slice(-12),
    };

    localStorage.setItem('guest_screen_data', JSON.stringify(data));
  };

  // 分页
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(gifts.length / ITEMS_PER_PAGE) || 1;
  const displayGifts = gifts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 统计
  const validGifts = gifts
    .filter((g) => g.data && !g.data.abolished)
    .map((g) => g.data!);
  const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
  const totalGivers = validGifts.length;
  const pageSubtotal = displayGifts
    .filter((g) => g.data && !g.data.abolished)
    .reduce((sum, g) => sum + g.data!.amount, 0);

  // 导出 Excel
  const exportExcel = () => {
    const data = validGifts.map((g) => {
      const date = new Date(g.timestamp);
      const pad = (num: number) => num.toString().padStart(2, '0');
      const formattedTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

      return {
        姓名: g.name,
        金额: g.amount,
        类型: g.type,
        备注: g.remark || '',
        时间: formattedTime,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '礼金记录');
    XLSX.writeFile(wb, `${event?.name}_礼金簿.xlsx`);
  };

  // 导出 PDF（使用浏览器打印）
  const exportPDF = () => {
    window.print();
  };

  // 打开副屏
  const openGuestScreen = () => {
    window.open('/guest-screen', '_blank', 'width=1200,height=800');
  };

  if (!event) return null;

  // 根据主题应用不同的容器类
  const themeClass = event.theme === 'festive' ? 'theme-festive' : 'theme-solemn';

  return (
    <div className={`min-h-screen bg-gray-50 ${themeClass}`}>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* 头部 */}
        <div className="card themed-bg-light p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold themed-header">{event.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {(() => {
                  const formatEventTime = (dt: string) => {
                    const date = new Date(dt);
                    const pad = (num: number) => num.toString().padStart(2, '0');
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                  };
                  return `${formatEventTime(event.startDateTime)} ~ ${formatEventTime(event.endDateTime)}`;
                })()}
                {event.recorder && ` | 记账人: ${event.recorder}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap no-print">
              <button
                onClick={exportPDF}
                className="themed-button-primary px-4 py-2 rounded-lg hover-lift"
              >
                打印/PDF
              </button>
              <button
                onClick={exportExcel}
                className="themed-button-secondary px-4 py-2 rounded-lg hover-lift"
              >
                导出Excel
              </button>
              <button
                onClick={openGuestScreen}
                className="themed-button-secondary px-4 py-2 rounded-lg hover-lift"
              >
                开启副屏
              </button>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入表单 */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-4 text-center border-b pb-2 themed-header">礼金录入</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input
                    id="name-input"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="来宾姓名"
                    className="themed-ring"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="金额 (元)"
                    className="themed-ring"
                  />
                  {chineseAmount && (
                    <div className="text-sm text-gray-600 mt-1 text-right themed-text">
                      {chineseAmount}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">收款类型：</label>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {['现金', '微信', '支付宝', '其他'].map((type) => (
                      <label
                        key={type}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              type: e.target.value as any,
                            })
                          }
                          className="themed-ring"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    value={formData.remark}
                    onChange={(e) =>
                      setFormData({ ...formData, remark: e.target.value })
                    }
                    placeholder="备注内容（选填）"
                    className="themed-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full themed-button-primary p-3 rounded-lg font-bold text-lg hover-lift"
                >
                  {loading ? '录入中...' : '确认录入'}
                </button>
              </form>

              {/* 快捷统计 */}
              <div className="mt-4 pt-4 border-t themed-border grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总金额</span>
                  <span className="font-bold themed-text">{Utils.formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总人数</span>
                  <span className="font-bold themed-text">{totalGivers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：礼簿展示 */}
          <div className="lg:col-span-2">
            <div className="gift-book-frame print-area">
              {/* 页码导航 */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b themed-border no-print text-sm">
                <div className="flex items-center gap-3 font-bold themed-text">
                  <span>本页: {Utils.formatCurrency(pageSubtotal)}</span>
                  <span className="text-gray-400">|</span>
                  <span>人数: {displayGifts.filter(g => g.data && !g.data.abolished).length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="themed-button-primary w-7 h-7 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-90"
                  >
                    ←
                  </button>
                  <span className="font-bold text-gray-700 px-1">{currentPage}/{totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="themed-button-primary w-7 h-7 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-90"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* 礼簿内容 - 3行垂直布局：姓名、类型、大写金额 */}
              <div className="gift-book-grid">
                {/* 第1行：姓名（竖排） */}
                <div className="gift-book-row">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const gift = displayGifts[idx];
                    const hasData = gift && gift.data && !gift.data.abolished;
                    return (
                      <div key={idx} className="book-cell name-cell">
                        {hasData ? (
                          <div className="name">
                            {gift.data!.name.length === 2
                              ? `${gift.data!.name[0]}　${gift.data!.name[1]}`
                              : gift.data!.name}
                          </div>
                        ) : (
                          <span className="text-gray-300">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 第2行：类型（竖排） */}
                <div className="gift-book-row">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const gift = displayGifts[idx];
                    const hasData = gift && gift.data && !gift.data.abolished;
                    return (
                      <div key={idx} className="book-cell type-cell">
                        {hasData ? gift.data!.type : <span className="text-gray-300">+</span>}
                      </div>
                    );
                  })}
                </div>

                {/* 第3行：大写金额（竖排） */}
                <div className="gift-book-row">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const gift = displayGifts[idx];
                    const hasData = gift && gift.data && !gift.data.abolished;
                    return (
                      <div key={idx} className="book-cell amount-cell">
                        {hasData ? (
                          <div className="amount-chinese">
                            {Utils.amountToChinese(gift.data!.amount)}
                          </div>
                        ) : <span className="text-gray-300">+</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {displayGifts.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  暂无记录，请在左侧录入
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
