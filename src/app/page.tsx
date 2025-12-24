import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CryptoService } from "@/lib/crypto";
import { useEvents } from "@/hooks/useEvents";
import PageLayout from "@/components/layout/PageLayout";
import FormLayout from "@/components/layout/FormLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatDate, formatDateTime } from "@/utils/format";

export default function Home() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentSessionEvent, setCurrentSessionEvent] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 检查当前会话
    const session = sessionStorage.getItem("currentEvent");
    if (session) {
      const { event: currentEvent } = JSON.parse(session);
      setShowSessionChoice(true);
      setCurrentSessionEvent(currentEvent);
      return;
    }

    // 没有会话但有事件 → 显示事件管理界面，并默认选中第一个事件
    if (events.length > 0) {
      setShowPasswordInput(true);
      setSelectedEvent(events[0]); // 默认选中第一个事件
    } else {
      navigate("/setup", { replace: true });
    }
  }, [navigate, events]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !password) return;

    setLoading(true);
    setError("");

    try {
      // 验证密码
      const hash = CryptoService.hash(password);
      if (hash !== selectedEvent.passwordHash) {
        setError("密码错误！");
        setLoading(false);
        return;
      }

      // 保存会话
      sessionStorage.setItem(
        "currentEvent",
        JSON.stringify({
          event: selectedEvent,
          password: password,
          timestamp: Date.now(),
        })
      );

      // 进入主界面
      navigate("/main", { replace: true });
    } catch (err) {
      console.error(err);
      setError("登录失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  // 处理继续使用当前会话
  const handleContinueSession = () => {
    navigate("/main");
  };

  // 处理切换到其他事件
  const handleSwitchFromSession = () => {
    sessionStorage.removeItem("currentEvent");
    setShowSessionChoice(false);
    if (events.length > 0) {
      setSelectedEvent(events[0]);
      setShowPasswordInput(true);
    }
  };

  // 处理切换到特定事件
  const handleSwitchToSpecificEvent = (targetEvent: any) => {
    setSelectedEvent(targetEvent);
    setShowPasswordInput(true);
    setShowSessionChoice(false);
  };

  // 处理创建新事件
  const handleCreateNewEvent = () => {
    navigate("/setup");
  };

  // 会话选择界面
  if (showSessionChoice) {
    return (
      <PageLayout title="电子礼簿系统" subtitle="检测到当前会话">
        <FormLayout>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-bold text-blue-900 mb-1 text-sm">
              当前事件：
            </div>
            <div className="text-sm text-blue-800 font-semibold">
              {currentSessionEvent?.name}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {currentSessionEvent &&
                `${formatDate(
                  currentSessionEvent.startDateTime
                )} ~ ${formatDate(currentSessionEvent.endDateTime)}`}
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              variant="primary" 
              className="w-full p-3 rounded-lg font-bold" 
              onClick={handleContinueSession}
            >
              继续使用当前事件
            </Button>

            <Button 
              variant="secondary" 
              className="w-full p-3 rounded-lg font-bold" 
              onClick={handleSwitchFromSession}
            >
              切换到其他事件（需重新输入密码）
            </Button>

            {events.length > 1 && (
              <div className="pt-3 border-t themed-border">
                <p className="text-sm text-gray-600 mb-2">
                  快速切换（需重新输入密码）：
                </p>
                <div className="space-y-2">
                  {events.map(
                    (ev: any) =>
                      ev.id !== currentSessionEvent?.id && (
                        <Button
                          key={ev.id}
                          variant="secondary"
                          className="w-full text-left px-3 py-2 text-sm !bg-gray-100 !text-gray-800 !border-transparent hover:!bg-gray-200"
                          onClick={() => handleSwitchToSpecificEvent(ev)}
                        >
                          {ev.name}
                        </Button>
                      )
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 border-t themed-border space-y-2">
              <Button
                variant="secondary"
                className="w-full p-2 rounded text-sm"
                onClick={handleCreateNewEvent}
              >
                ✨ 创建新事件
              </Button>
              <Button
                variant="danger"
                className="w-full p-2 rounded text-sm"
                onClick={() => {
                  sessionStorage.removeItem("currentEvent");
                  navigate("/", { replace: true });
                }}
              >
                🔄 返回首页重新选择
              </Button>
            </div>
          </div>
        </FormLayout>
      </PageLayout>
    );
  }

  // 密码输入界面
  if (showPasswordInput) {
    return (
      <PageLayout title="电子礼簿系统" subtitle={selectedEvent ? "请输入密码继续" : "请选择事件并输入密码"}>
        <FormLayout>
          {/* 事件列表（当没有默认选择时） */}
          {!selectedEvent && events.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择要登录的事件
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map((ev) => (
                  <Button
                    key={ev.id}
                    variant="secondary"
                    className="w-full text-left px-3 py-2 !bg-gray-100 !text-gray-800 !border-transparent hover:!bg-blue-50 hover:!border-blue-300 !text-left !justify-start"
                    onClick={() => {
                      setSelectedEvent(ev);
                      setError("");
                    }}
                  >
                    <div className="font-semibold">{ev.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {`${formatDate(
                        ev.startDateTime
                      )} ~ ${formatDate(ev.endDateTime)}`}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 选中事件后的信息 */}
          {selectedEvent && (
            <div className="mb-4 p-3 card text-sm">
              <div className="font-bold text-gray-700">
                {selectedEvent.name}
              </div>
              <div className="text-gray-600 mt-1">
                {`${formatDateTime(
                  selectedEvent.startDateTime
                )} ~ ${formatDateTime(selectedEvent.endDateTime)}`}
              </div>
              <Button
                variant="secondary"
                className="mt-2 text-xs !p-1 !h-auto"
                onClick={() => {
                  setSelectedEvent(null);
                  setError("");
                }}
              >
                ← 重新选择事件
              </Button>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                label="管理密码"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={selectedEvent ? "默认可能是 123456" : "请输入密码"}
                error={error}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full p-3 rounded-lg font-bold"
              disabled={loading}
            >
              {loading ? "登录中..." : "登录"}
            </Button>

            <div className="pt-4 border-t themed-border space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-sm p-2 rounded"
                  onClick={() => navigate("/setup")}
                >
                  ✨ 创建新事件
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-sm p-2 rounded"
                  onClick={() => {
                    if (
                      confirm(
                        "确定要删除所有事件吗？礼金记录会保留但无法访问。"
                      )
                    ) {
                      localStorage.removeItem("giftlist_events");
                      navigate("/", { replace: true });
                    }
                  }}
                >
                  🗑️ 清除事件
                </Button>
              </div>
            </div>
          </form>
        </FormLayout>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="电子礼簿系统" subtitle="正在初始化...">
      <div className="text-center fade-in-slow">
        <div className="mt-8 text-sm text-gray-500">
          <p>正在检查存储状态...</p>
        </div>
      </div>
    </PageLayout>
  );
}