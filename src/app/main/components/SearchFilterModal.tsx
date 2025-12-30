import { GiftType, GiftData } from '@/types';
import { formatDateTime, formatCurrency } from '@/utils/format';

interface SearchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: "all" | GiftType;
  setFilterType: (type: "all" | GiftType) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  filteredCount: number;
  totalCount: number;
  theme: "festive" | "solemn";
  filteredGifts: GiftData[];
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
  filteredCount,
  totalCount,
  theme,
  filteredGifts,
}: SearchFilterModalProps) {
  if (!isOpen) return null;

  // 根据主题设置颜色
  const colors = {
    festive: {
      primary: 'red',
      primaryBg: 'bg-red-500',
      primaryHover: 'hover:bg-red-600',
      primaryBorder: 'border-red-500',
      activeBg: 'bg-red-600',
      activeHover: 'hover:bg-red-700',
      activeBorder: 'border-red-600',
      infoBg: 'bg-red-50',
      infoBorder: 'border-red-200',
      infoText: 'text-red-800',
    },
    solemn: {
      primary: 'gray',
      primaryBg: 'bg-gray-600',
      primaryHover: 'hover:bg-gray-700',
      primaryBorder: 'border-gray-600',
      activeBg: 'bg-gray-700',
      activeHover: 'hover:bg-gray-800',
      activeBorder: 'border-gray-700',
      infoBg: 'bg-gray-50',
      infoBorder: 'border-gray-200',
      infoText: 'text-gray-800',
    },
  };

  const color = colors[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 标题 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold themed-header">🔍 搜索与筛选</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* 滚动内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "all", label: "📋" },
                { value: "现金", label: "💵" },
                { value: "微信", label: "💚" },
                { value: "支付宝", label: "💙" },
                { value: "其他", label: "📦" },
              ].map((option) => (
                <button
                  key={option.value}
                  title={option.value === "all" ? "全部" : option.value}
                  onClick={() => setFilterType(option.value as any)}
                  className={`px-2 py-1.5 rounded text-sm border transition-all ${
                    filterType === option.value
                      ? `${color.activeBg} ${color.activeHover} text-white ${color.activeBorder} font-bold`
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
            <label className="block text-sm font-medium text-gray-700 mb-1">时间排序</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSortOrder("desc")}
                title="时间倒序（最新在前）"
                className={`px-2.5 py-1.5 rounded text-sm border transition-all ${
                  sortOrder === "desc"
                    ? `${color.activeBg} ${color.activeHover} text-white ${color.activeBorder} font-bold`
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                ⏰
              </button>
              <button
                onClick={() => setSortOrder("asc")}
                title="时间正序（最早在前）"
                className={`px-2.5 py-1.5 rounded text-sm border transition-all ${
                  sortOrder === "asc"
                    ? `${color.activeBg} ${color.activeHover} text-white ${color.activeBorder} font-bold`
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                ⏰
              </button>
            </div>
          </div>

          {/* 筛选结果统计 */}
          {(searchTerm || filterType !== "all") && (
            <div className={`mb-4 p-3 ${color.infoBg} border ${color.infoBorder} rounded-lg`}>
              <div className={`text-sm ${color.infoText}`}>
                <div className="font-bold">📊 筛选结果</div>
                <div className="mt-1">
                  显示 <strong>{filteredCount}</strong> / {totalCount} 条记录
                </div>
              </div>
            </div>
          )}

          {/* 筛选结果列表 - 只在有筛选条件时显示 */}
          {(searchTerm || filterType !== "all") && filteredGifts.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">筛选结果预览</label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {filteredGifts.map((gift, index) => (
                  <div key={index} className="flex justify-between items-start p-2 bg-white rounded border gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg md:text-base">{gift.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="hidden md:inline">{formatDateTime(gift.timestamp)} | </span>
                        <span className="text-gray-600">{gift.type}</span>
                        {gift.remark && <span className="ml-1 text-gray-500">| {gift.remark}</span>}
                      </div>
                    </div>
                    <div className="font-bold themed-text text-lg md:text-base whitespace-nowrap mt-0.5">
                      {formatCurrency(gift.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无结果提示 */}
          {(searchTerm || filterType !== "all") && filteredGifts.length === 0 && (
            <div className="mb-4 p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">😅</div>
              <div>没有找到符合条件的记录</div>
            </div>
          )}
        </div>

        {/* 底部 - 只有一个关闭按钮 */}
        <div className="p-6 border-t bg-gray-50 text-center">
          <button
            onClick={onClose}
            className={`px-6 py-2 ${color.primaryBg} ${color.primaryHover} text-white rounded-lg font-medium transition-colors`}
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
}
