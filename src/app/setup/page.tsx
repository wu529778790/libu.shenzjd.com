import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CryptoService } from "@/lib/crypto";
import { Event } from "@/types";
import PageLayout from "@/components/layout/PageLayout";
import FormLayout from "@/components/layout/FormLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Setup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    password: "123456", // 默认密码
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
      if (!formData.name || !formData.startDate || !formData.endDate) {
        setError("请填写所有必填项！");
        setLoading(false);
        return;
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError("结束日期不能早于开始日期！");
        setLoading(false);
        return;
      }

      // 使用完整的日期字符串作为时间（默认为当天的00:00和23:59）
      const startDateTime = `${formData.startDate}T00:00:00`;
      const endDateTime = `${formData.endDate}T23:59:59`;

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
    <PageLayout title="电子礼簿系统" subtitle="创建新事件，设置活动信息和管理密码">
      <FormLayout title="创建新事件">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="事件名称 *"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="如：张三 & 李四 婚礼"
            required
            autoFocus
          />

          <Input
            label="记账人（选填）"
            type="text"
            value={formData.recorder}
            onChange={(e) =>
              setFormData({ ...formData, recorder: e.target.value })
            }
            placeholder="记账人姓名"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="开始日期 *"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              required
            />
            <Input
              label="结束日期 *"
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              required
            />
          </div>

          <Input
            label="管理密码 *"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="建议使用 123456"
            required
          />

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
            <Button
              type="submit"
              variant="primary"
              className="flex-1 p-3 rounded-lg font-bold"
              disabled={loading}
            >
              {loading ? "创建中..." : "✨ 创建事件"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1 p-3 rounded-lg font-bold"
              onClick={() => navigate("/")}
            >
              返回首页
            </Button>
          </div>

          <div className="pt-4 text-xs text-gray-500 text-center">
            💡 提示：默认密码建议使用 123456，创建后可在主页面修改
          </div>
        </form>
      </FormLayout>
    </PageLayout>
  );
}