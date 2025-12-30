import { useEffect, useState, useRef } from "react";
import { amountToChinese } from "@/utils/format";

interface GiftData {
  name: string;
  amount: number;
  type: "现金" | "微信" | "支付宝" | "其他";
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
  const lastChecksum = useRef<string>("");
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // 检查数据是否发生变化
  const hasDataChanged = (newData: SyncData): boolean => {
    const checksum = `${newData.eventName}-${newData.gifts.length}-${newData.gifts[newData.gifts.length - 1]?.timestamp}`;
    if (checksum !== lastChecksum.current) {
      lastChecksum.current = checksum;
      return true;
    }
    return false;
  };

  // 读取并更新数据
  const updateData = () => {
    const syncData = localStorage.getItem("guest_screen_data");
    if (syncData) {
      try {
        const parsed = JSON.parse(syncData) as SyncData;
        if (hasDataChanged(parsed)) {
          setData(parsed);
        }
      } catch (e) {
        console.error("解析同步数据失败:", e);
      }
    }
  };

  // 监听数据同步
  useEffect(() => {
    updateData();

    // 优化：使用 BroadcastChannel 进行跨标签页通信（如果浏览器支持）
    if (typeof BroadcastChannel !== "undefined") {
      broadcastRef.current = new BroadcastChannel("guest_screen_sync");
      broadcastRef.current.onmessage = () => {
        updateData();
      };
    }

    // 优化：减少轮询频率，从2秒改为3秒
    // 只有在没有 BroadcastChannel 时才依赖轮询
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!broadcastRef.current) {
      interval = setInterval(updateData, 3000);
    }

    // storage 事件监听（其他标签页修改数据时触发）
    const handleStorage = () => {
      updateData();
      // 通知其他 BroadcastChannel 监听器
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({ type: "update" });
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (interval) clearInterval(interval);
      if (broadcastRef.current) {
        broadcastRef.current.close();
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!data || data.gifts.length === 0) {
    return (
      <div className="guest-screen-empty">
        <h1>副屏展示</h1>
        <p>等待主屏数据同步...</p>
        <p className="text-xs text-gray-400 mt-2">提示：请在主屏录入数据或刷新页面</p>
      </div>
    );
  }

  // 格式化姓名（两个字中间加空格）
  const formatName = (name: string) => {
    return name.length === 2 ? `${name[0]}　${name[1]}` : name;
  };

  const themeClass =
    data.theme === "theme-festive" ? "theme-festive" : "theme-solemn";

  // 只显示最新的12条数据（单行展示）
  const MAX_DISPLAY = 12;
  const allGifts = data.gifts.slice(-MAX_DISPLAY);

  return (
    <div className={`guest-screen-wrapper ${themeClass}`}>
      {/* 顶部标题 - 固定在上方 */}
      <div className="guest-screen-header">
        <h1 className="guest-screen-title">{data.eventName}</h1>
      </div>

      {/* 礼簿内容 - 显示最新数据 */}
      <div className="gift-book-columns">
        {allGifts.map((gift, idx) => {
          const isLatest = idx === allGifts.length - 1;
          return (
            <div
              key={idx}
              className={`gift-book-column ${isLatest ? "latest" : ""}`}
              data-index={idx}>
              <div className="book-cell name-cell column-top">
                <div className="name">{formatName(gift.name)}</div>
              </div>
              <div className="book-cell amount-cell column-bottom">
                <div className="amount-chinese">
                  {amountToChinese(gift.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
