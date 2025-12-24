import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CryptoService } from "@/lib/crypto";

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
