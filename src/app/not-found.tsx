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
