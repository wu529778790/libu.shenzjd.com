import { GiftType } from '@/types';

interface SearchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: "all" | GiftType;
  setFilterType: (type: "all" | GiftType) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  onClear: () => void;
  filteredCount: number;
  totalCount: number;
}

export default function SearchFilterModal({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  sortOrder,
  setSortOrder,
  onClear,
  filteredCount,
  totalCount,
}: SearchFilterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        {/* 标题 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold themed-header">🔍 搜索与筛选</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">搜索姓名或备注</label>
          <input
            type="text"
            placeholder="输入关键词..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm themed-ring focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* 类型筛选 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">支付方式筛选</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "all", label: "📋 全部", icon: "📋" },
              { value: "现金", label: "💵 现金", icon: "💵" },
              { value: "微信", label: "💚 微信", icon: "💚" },
              { value: "支付宝", label: "💙 支付宝", icon: "💙" },
              { value: "其他", label: "📦 其他", icon: "📦" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value as any)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                  filterType === option.value
                    ? 'bg-blue-500 text-white border-blue-500 font-bold'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 时间排序 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">时间排序</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder("desc")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm border transition-all ${
                sortOrder === "desc"
                  ? 'bg-purple-500 text-white border-purple-500 font-bold'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              ⏰ 倒序 (最新在前)
            </button>
            <button
              onClick={() => setSortOrder("asc")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm border transition-all ${
                sortOrder === "asc"
                  ? 'bg-purple-500 text-white border-purple-500 font-bold'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              ⏰ 正序 (最早在前)
            </button>
          </div>
        </div>

        {/* 筛选结果统计 */}
        {(searchTerm || filterType !== "all") && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-bold">📊 筛选结果</div>
              <div className="mt-1">
                显示 <strong>{filteredCount}</strong> / {totalCount} 条记录
              </div>
              {searchTerm && (
                <div className="mt-1">
                  关键词: <strong>"{searchTerm}"</strong>
                </div>
              )}
              {filterType !== "all" && (
                <div className="mt-1">
                  类型: <strong>{filterType}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            🔄 清空所有
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            ✅ 完成
          </button>
        </div>
      </div>
    </div>
  );
}
