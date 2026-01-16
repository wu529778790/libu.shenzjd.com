import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Event, GiftRecord } from "@/types";
import { generateId } from "@/utils/format";
import { useAppStore } from "@/store/appStore";
import { saveGiftsByEventId } from "@/lib/storage";
import PageLayout from "@/components/layout/PageLayout";
import FormLayout from "@/components/layout/FormLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Setup() {
  const navigate = useNavigate();
  const { actions } = useAppStore();
  const [formData, setFormData] = useState({
    name: "张三 & 李四 婚礼", // 默认事件名称
    startDate: new Date().toISOString().split('T')[0], // 默认为今天
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认为一周后
    theme: "festive" as "festive" | "solemn",
    recorder: "管理员", // 默认记账人
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
        id: generateId(),
        name: formData.name,
        startDateTime,
        endDateTime,
        passwordHash: '', // 不再需要密码
        theme: formData.theme,
        recorder: formData.recorder || undefined,
        createdAt: new Date().toISOString(),
      };

      // 使用 store actions 创建事件
      const success = await actions.addEvent(event);
      if (!success) {
        setError("创建事件失败，请重试");
        setLoading(false);
        return;
      }

      // 自动创建测试数据（明文存储，无需加密）
      const testGift: GiftRecord = {
        id: generateId(),
        eventId: event.id,
        dataJson: JSON.stringify({
          name: "测试来宾",
          amount: 888,
          type: "现金" as const,
          remark: "新婚快乐",
          timestamp: new Date().toISOString(),
          abolished: false,
        }),
      };
      saveGiftsByEventId(event.id, [testGift]);

      // 保存会话信息
      actions.saveSession(event);

      // 直接跳转到主页面
      navigate("/main", { replace: true });
    } catch (err) {
      console.error(err);
      setError("创建事件失败: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="电子礼簿系统" subtitle="创建新事件，设置活动信息">
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
            💡 提示：所有数据本地存储，可随时导出Excel备份
          </div>
        </form>
      </FormLayout>
    </PageLayout>
  );
}
