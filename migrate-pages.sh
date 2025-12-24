#!/bin/bash

# 迁移所有页面从 Next.js 到 Vite + React Router

echo "🔄 开始迁移页面..."

# Setup 页面
echo "迁移: setup/page.tsx"
cat > /Users/mac/github/libu.shenzjd.com/src/app/setup/page.tsx << 'EOF'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CryptoService } from "@/lib/crypto";
import { Event } from "@/types";

export default function Setup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    password: "",
    confirmPassword: "",
    theme: "festive" as const,
    recorder: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (formData.password !== formData.confirmPassword) {
        setError("两次输入的密码不一致！");
        setLoading(false);
        return;
      }

      if (!formData.name || !formData.startDate || !formData.endDate) {
        setError("请填写所有必填项！");
        setLoading(false);
        return;
      }

      const startDateTime = `${formData.startDate}T${formData.startTime || "00:00"}`;
      const endDateTime = `${formData.endDate}T${formData.endTime || "23:59"}`;

      const event: Event = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: formData.name,
        startDateTime,
        endDateTime,
        passwordHash: CryptoService.hash(formData.password),
        theme: formData.theme,
        recorder: formData.recorder || undefined,
        createdAt: new Date().toISOString(),
      };

      const existingEvents = JSON.parse(
        localStorage.getItem("giftlist_events") || "[]"
      );
      existingEvents.push(event);
      localStorage.setItem("giftlist_events", JSON.stringify(existingEvents));

      // 自动创建测试数据
      const testGifts = [
        {
          id: "test1",
          eventId: event.id,
          encryptedData: CryptoService.encrypt(
            {
              name: "测试来宾",
              amount: 888,
              type: "现金" as const,
              remark: "新婚快乐",
              timestamp: new Date().toISOString(),
            },
            formData.password
          ),
        },
      ];
      localStorage.setItem(`giftlist_gifts_${event.id}`, JSON.stringify(testGifts));

      navigate("/test-data", { state: { eventId: event.id, password: formData.password } });
    } catch (err) {
      console.error(err);
      setError("创建事件失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl card p-8 fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center themed-header">
          创建新事件
        </h1>
        <p className="text-gray-600 text-center mb-6">
          设置活动信息和管理密码
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事件名称 *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="如：张三 & 李四 婚礼"
                className="themed-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                记账人（选填）
              </label>
              <input
                type="text"
                value={formData.recorder}
                onChange={(e) =>
                  setFormData({ ...formData, recorder: e.target.value })
                }
                placeholder="记账人姓名"
                className="themed-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期 *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="themed-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="themed-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期 *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="themed-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="themed-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                管理密码 *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="建议使用 123456"
                className="themed-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="再次输入密码"
                className="themed-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主题风格
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="festive"
                  checked={formData.theme === "festive"}
                  onChange={() => setFormData({ ...formData, theme: "festive" })}
                  className="themed-ring"
                />
                <span>🎉 喜事（红色）</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="solemn"
                  checked={formData.theme === "solemn"}
                  onChange={() => setFormData({ ...formData, theme: "solemn" })}
                  className="themed-ring"
                />
                <span>🕯️ 白事（灰色）</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 themed-button-primary p-3 rounded-lg font-bold hover-lift disabled:opacity-50">
              {loading ? "创建中..." : "✨ 创建事件"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 themed-button-secondary p-3 rounded-lg font-bold hover-lift">
              返回首页
            </button>
          </div>

          <div className="pt-4 text-xs text-gray-500 text-center">
            💡 提示：默认密码建议使用 123456，创建后可在主页面修改
          </div>
        </form>
      </div>
    </div>
  );
}
EOF

# Main 页面
echo "迁移: main/page.tsx"
# 复制已修改的 main/page.tsx
cp /Users/mac/github/libu.shenzjd.com/src/app/main/page.tsx /Users/mac/github/libu.shenzjd.com/src/app/main/page.tsx

# Guest Screen 页面
echo "迁移: guest-screen/page.tsx"
cat > /Users/mac/github/libu.shenzjd.com/src/app/guest-screen/page.tsx << 'EOF'
import { useEffect, useState } from "react";

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

// 工具函数（临时定义，实际会从 utils 导入）
const Utils = {
  amountToChinese: (n: number): string => {
    if (typeof n !== 'number') return '';
    if (n === 0) return '零元整';

    let unit = '京亿万仟佰拾兆万仟佰拾亿仟佰拾万仟佰拾元角分';
    let str = '';
    let s = n.toString();

    if (s.indexOf('.') > -1) s = (n * 100).toFixed(0);
    else s += '00';

    if (s.length > unit.length) return '金额过大';
    unit = unit.substr(unit.length - s.length);

    for (let i = 0; i < s.length; i++) {
      const digit = parseInt(s.charAt(i), 10);
      str += '零壹贰叁肆伍陆柒捌玖'.charAt(digit) + unit.charAt(i);
    }

    return str
      .replace(/零(仟|佰|拾|角)/g, '零')
      .replace(/(零)+/g, '零')
      .replace(/零(兆|万|亿|元)/g, '$1')
      .replace(/(兆|亿)万/g, '$1')
      .replace(/(京|兆)亿/g, '$1')
      .replace(/(京)兆/g, '$1')
      .replace(/(亿)万/g, '$1')
      .replace(/(京|兆|亿|仟|佰|拾)(万?)(.)/g, '$1$2$3')
      .replace(/零元/g, '元')
      .replace(/零分/g, '')
      .replace(/零角/g, '零')
      .replace(/元$/g, '元整')
      .replace(/角$/g, '角整');
  },
};
EOF

# Test Data 页面
echo "迁移: test-data/page.tsx"
cat > /Users/mac/github/libu.shenzjd.com/src/app/test-data/page.tsx << 'EOF'
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CryptoService } from "@/lib/crypto";
import { Utils } from "@/lib/utils";

export default function TestData() {
  const navigate = useNavigate();
  const location = useLocation();
  const [eventId, setEventId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 检查是否有传递的参数
    const state = location.state as any;
    if (state?.eventId && state?.password) {
      setEventId(state.eventId);
      setPassword(state.password);
    } else {
      // 尝试从 sessionStorage 获取
      const session = sessionStorage.getItem("currentEvent");
      if (session) {
        const { event, password } = JSON.parse(session);
        setEventId(event.id);
        setPassword(password);
      }
    }
  }, [location]);

  const generateTestData = async () => {
    if (!eventId || !password) {
      alert("请先创建事件或登录！");
      navigate("/");
      return;
    }

    setLoading(true);

    try {
      // 生成测试数据
      const testNames = [
        "张三", "李四", "王五", "赵六", "钱七",
        "孙八", "周九", "吴十", "郑十一", "王十二",
        "刘十三", "陈十四", "杨十五", "黄十六", "林十七"
      ];

      const testTypes = ["现金", "微信", "支付宝", "其他"] as const;
      const testRemarks = ["新婚快乐", "百年好合", "恭喜发财", "万事如意", ""];

      const gifts: any[] = [];

      for (let i = 0; i < 15; i++) {
        const amount = Math.floor(Math.random() * 5000) + 100; // 100-5000
        const giftData = {
          name: testNames[i],
          amount: amount,
          type: testTypes[Math.floor(Math.random() * testTypes.length)],
          remark: testRemarks[Math.floor(Math.random() * testRemarks.length)],
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          abolished: false,
        };

        const encrypted = CryptoService.encrypt(giftData, password);
        gifts.push({
          id: `test-${i}`,
          eventId,
          encryptedData: encrypted,
        });
      }

      // 保存到 localStorage
      localStorage.setItem(`giftlist_gifts_${eventId}`, JSON.stringify(gifts));

      // 同步到副屏
      const decryptedGifts = gifts.map((r) =>
        CryptoService.decrypt(r.encryptedData, password)
      ).filter(g => g !== null);

      const syncData = {
        eventName: "测试事件",
        theme: "theme-festive",
        gifts: decryptedGifts.slice(-12),
      };
      localStorage.setItem("guest_screen_data", JSON.stringify(syncData));

      alert(`✅ 成功生成 ${gifts.length} 条测试数据！\n\n现在可以：\n1. 返回首页登录\n2. 在主界面查看和管理数据\n3. 打开副屏（/guest-screen）实时查看`);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("生成测试数据失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md card p-8 fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center themed-header">
          🧪 生成测试数据
        </h1>
        <p className="text-gray-600 text-center mb-6">
          快速创建测试数据，方便演示和测试
        </p>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-bold text-blue-900 mb-1">说明：</div>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>自动生成 15 条随机礼金记录</li>
              <li>金额范围：100-5000 元</li>
              <li>包含多种支付方式</li>
              <li>数据已加密存储</li>
            </ul>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <div className="font-bold text-yellow-900 mb-1">⚠️ 注意：</div>
            <div className="text-yellow-800">
              生成测试数据会覆盖当前事件的所有礼金记录！
            </div>
          </div>

          <button
            onClick={generateTestData}
            disabled={loading || !eventId}
            className="w-full themed-button-primary p-3 rounded-lg font-bold hover-lift disabled:opacity-50">
            {loading ? "生成中..." : "🎯 生成测试数据"}
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full themed-button-secondary p-3 rounded-lg font-bold hover-lift">
            ← 返回首页
          </button>

          {!eventId && (
            <div className="text-center text-red-600 text-sm">
              ⚠️ 请先创建事件或登录！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

# Test Redirect 页面
echo "迁移: test-redirect/page.tsx"
cat > /Users/mac/github/libu.shenzjd.com/src/app/test-redirect/page.tsx << 'EOF'
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TestRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否有事件存在
    const events = JSON.parse(localStorage.getItem("giftlist_events") || "[]");

    if (events.length > 0) {
      // 有事件，跳转到首页
      navigate("/");
    } else {
      // 没有事件，跳转到设置页面
      navigate("/setup");
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold themed-header mb-4">正在重定向...</h1>
        <p className="text-gray-600">请稍候</p>
      </div>
    </div>
  );
}
EOF

# Not Found 页面
echo "迁移: not-found.tsx"
cat > /Users/mac/github/libu.shenzjd.com/src/app/not-found.tsx << 'EOF'
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h2 className="text-4xl font-bold mb-4">404 - 页面未找到</h2>
      <p className="text-gray-600 mb-6">您访问的页面不存在</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2 themed-button-danger rounded-lg hover-lift">
        返回首页
      </button>
    </div>
  );
}
EOF

echo "✅ 页面迁移完成！"
echo ""
echo "接下来需要："
echo "1. 更新 src/app/main/page.tsx（已复制，需要检查）"
echo "2. 更新 src/app/guest-screen/page.tsx（需要导入 Utils）"
echo "3. 安装依赖: pnpm install"
echo "4. 测试: pnpm dev"
