import { useEffect, useState } from "react";
import { Utils } from "@/lib/utils";

interface GiftData {
  name: string;
  amount: number;
  type: '现金' | '微信' | '支付宝' | '其他';
  remark?: string;
  timestamp: string;
  abolished?: boolean;
}

interface SyncData {
  eventName: string;
  theme: string;
  gifts: GiftData[];
}

export default function GuestScreen() {
  const [data, setData] = useState<SyncData | null>(null);

  useEffect(() => {
    // 监听 localStorage 变化
    const handleStorageChange = () => {
      const syncData = localStorage.getItem("guest_screen_data");
      if (syncData) {
        try {
          const parsed = JSON.parse(syncData) as SyncData;
          setData(parsed);
        } catch (e) {
          console.error("解析同步数据失败:", e);
        }
      }
    };

    // 初始加载
    handleStorageChange();

    // 定时检查更新（每2秒）
    const interval = setInterval(handleStorageChange, 2000);

    // 监听 storage 事件（其他标签页的修改）
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold themed-header mb-4">副屏展示</h1>
          <p className="text-gray-600">等待主屏数据同步...</p>
          <p className="text-xs text-gray-400 mt-2">
            请在主屏录入数据后自动同步
          </p>
        </div>
      </div>
    );
  }

  const themeClass = data.theme === "theme-festive" ? "theme-festive" : "theme-solemn";

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <div className="max-w-7xl mx-auto p-4">
        {/* 标题 */}
        <div className="card themed-bg-light p-4 mb-4 text-center">
          <h1 className="text-3xl font-bold themed-header">{data.eventName}</h1>
          <p className="text-sm text-gray-600 mt-1">实时礼金展示</p>
        </div>

        {/* 最新礼金列表 */}
        <div className="gift-book-frame">
          <div className="gift-book-columns">
            {Array.from({ length: 12 }).map((_, idx) => {
              const gift = data.gifts[idx];
              const isLatest = idx === data.gifts.length - 1;

              return (
                <div key={idx} className="gift-book-column" data-col-index={idx}>
                  {/* 姓名区域 */}
                  <div className={`book-cell name-cell column-top ${isLatest ? 'bg-yellow-100' : ''}`}>
                    {gift ? (
                      <div className="name">
                        {gift.name.length === 2
                          ? `${gift.name[0]}　${gift.name[1]}`
                          : gift.name}
                      </div>
                    ) : (
                      <span className="text-gray-300">+</span>
                    )}
                  </div>

                  {/* 金额区域 */}
                  <div className={`book-cell amount-cell column-bottom ${isLatest ? 'bg-yellow-100' : ''}`}>
                    {gift ? (
                      <div className="amount-chinese">
                        {Utils.amountToChinese(gift.amount)}
                      </div>
                    ) : (
                      <span className="text-gray-300">+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="card p-4 mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">最新记录</div>
            <div className="text-2xl font-bold themed-text">
              {data.gifts.length > 0 ? data.gifts[data.gifts.length - 1].name : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">最新金额</div>
            <div className="text-2xl font-bold themed-text">
              {data.gifts.length > 0 ? `¥${data.gifts[data.gifts.length - 1].amount.toFixed(2)}` : "-"}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          自动同步中 | 最后更新: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

