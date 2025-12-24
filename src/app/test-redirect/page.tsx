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
