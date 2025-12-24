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
    theme: "festive" as "festive" | "solemn",
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
