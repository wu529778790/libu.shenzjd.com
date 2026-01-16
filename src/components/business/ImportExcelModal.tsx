import React, { useState } from 'react';
import { BackupService, ExcelPreview, ExcelImportResult } from '@/lib/backup';
import { Event } from '@/types';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { error, warning } from '@/components/ui/Toast';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: ExcelImportResult) => void;
  currentEvent?: Event | null;
  allEvents?: Event[];
}

const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentEvent,
  allEvents = [],
}) => {
  const { error: showErrorToast } = useToast();
  const [step, setStep] = useState<'select' | 'preview' | 'config' | 'result'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 导入配置
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite' | 'both'>('skip');
  const [targetEventId, setTargetEventId] = useState<string>('');
  const [createNewEvent, setCreateNewEvent] = useState(true);

  if (!isOpen) return null;

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 验证文件类型
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      showErrorToast('请选择 Excel 文件 (.xlsx 或 .xls)');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      // 预览文件内容
      const previewData = await BackupService.previewExcel(selectedFile);
      setPreview(previewData);

      // 自动设置目标事件
      if (previewData.events.length > 0) {
        // Excel包含事件信息 → 创建新事件
        setCreateNewEvent(true);
      } else if (currentEvent) {
        // Excel无事件信息但有当前事件 → 导入到当前事件
        setTargetEventId(currentEvent.id);
        setCreateNewEvent(false);
      } else if (allEvents.length > 0) {
        // Excel无事件信息且无当前事件但有其他事件 → 默认选择第一个事件
        setTargetEventId(allEvents[0].id);
        setCreateNewEvent(false);
      } else {
        // Excel无事件信息且无任何事件 → 需要用户创建新事件（但需要先设置事件信息）
        // 这种情况下，我们提示用户需要先创建事件或Excel包含事件信息
        setCreateNewEvent(true);
      }

      setStep('preview');
    } catch (error) {
      showErrorToast('无法读取文件：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!file || !preview) return;

    // 验证：如果选择创建新事件但Excel没有事件信息，且没有当前事件可导入
    if (createNewEvent && preview.events.length === 0 && !currentEvent && allEvents.length === 0) {
      warning('无法导入：Excel文件中没有包含事件信息，且当前没有可用的事件。请在Excel中添加事件信息表，或先创建一个事件后再导入。');
      return;
    }

    setLoading(true);
    try {
      const importResult = await BackupService.importExcel(file, {
        conflictStrategy,
        targetEventId: createNewEvent ? undefined : targetEventId,
        createNewEvent,
      });

      setResult(importResult);
      setStep('result');

      if (importResult.success) {
        onImportSuccess(importResult);
      }
    } catch (error) {
      showErrorToast('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 重置并关闭
  const handleClose = () => {
    setStep('select');
    setFile(null);
    setPreview(null);
    setResult(null);
    setConflictStrategy('skip');
    setTargetEventId('');
    setCreateNewEvent(true);
    onClose();
  };

  // 渲染步骤1：选择文件
  const renderSelectStep = () => {
    return (
      <div className="space-y-4">
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600 mb-4">选择 Excel 文件导入数据</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-file-input"
          />
          <label
            htmlFor="excel-file-input"
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
            {loading ? '读取中...' : '选择 Excel 文件'}
          </label>
          <p className="text-xs text-gray-400 mt-4">支持 .xlsx 和 .xls 格式</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <strong>💡 提示：</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Excel 可以包含礼金明细和事件信息</li>
            <li>支持直接修改数据后重新导入</li>
            <li>自动识别重复数据并提供处理选项</li>
          </ul>
        </div>
      </div>
    );
  };

  // 渲染步骤2：预览和配置
  const renderPreviewStep = () => {
    if (!preview) return null;

    return (
      <div className="space-y-4">
        {/* 文件信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="font-semibold text-blue-800 mb-2">📁 {preview.fileName}</div>
          <div className="text-sm text-blue-600">
            包含 {preview.gifts.length} 条礼金记录
            {preview.events.length > 0 && ` + ${preview.events.length} 个事件信息`}
          </div>
        </div>

        {/* 数据预览（前5条） */}
        {preview.gifts.length > 0 && (
          <div>
            <div className="font-semibold mb-2">📋 数据预览（前5条）</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-1 text-left">姓名</th>
                    <th className="p-1 text-left">金额</th>
                    <th className="p-1 text-left">类型</th>
                    <th className="p-1 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.gifts.slice(0, 5).map((gift, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-1">{gift.name}</td>
                      <td className="p-1">¥{gift.amount}</td>
                      <td className="p-1">{gift.type}</td>
                      <td className="p-1 text-gray-500">{gift.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.gifts.length > 5 && (
              <div className="text-xs text-gray-500 mt-1">
                还有 {preview.gifts.length - 5} 条数据...
              </div>
            )}
          </div>
        )}

        {/* 导入配置 */}
        <div className="space-y-3 border-t pt-4">
          {/* 提示信息 */}
          {preview.events.length === 0 && !currentEvent && allEvents.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ⚠️ 请注意：Excel中没有事件信息，且当前没有可用事件。
              <br />
              您需要先在Excel中添加事件信息表，或先创建一个事件。
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">🎯 导入目标</label>
            <div className="flex gap-2 flex-wrap">
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border ${createNewEvent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  checked={createNewEvent}
                  onChange={() => setCreateNewEvent(true)}
                />
                <span className="text-sm">创建新事件</span>
                {preview.events.length > 0 && <span className="text-xs text-green-600"> (Excel包含事件信息)</span>}
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border ${!createNewEvent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  checked={!createNewEvent}
                  onChange={() => setCreateNewEvent(false)}
                  disabled={allEvents.length === 0}
                />
                <span className="text-sm">导入到现有事件</span>
                {allEvents.length === 0 && <span className="text-xs text-gray-400"> (无可用事件)</span>}
              </label>
            </div>
          </div>

          {!createNewEvent && (
            <div>
              <label className="block text-sm font-medium mb-2">选择事件</label>
              <select
                value={targetEventId}
                onChange={(e) => setTargetEventId(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required>
                <option value="">请选择事件...</option>
                {allEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">🔄 重复数据处理</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflict"
                  value="skip"
                  checked={conflictStrategy === 'skip'}
                  onChange={() => setConflictStrategy('skip')}
                />
                <span className="text-sm">跳过重复（保留原有数据）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflict"
                  value="overwrite"
                  checked={conflictStrategy === 'overwrite'}
                  onChange={() => setConflictStrategy('overwrite')}
                />
                <span className="text-sm">覆盖重复（用新数据替换）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflict"
                  value="both"
                  checked={conflictStrategy === 'both'}
                  onChange={() => setConflictStrategy('both')}
                />
                <span className="text-sm">都保留（添加所有数据）</span>
              </label>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setStep('select')}
            className="flex-1">
            ← 返回选择
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || (!createNewEvent && !targetEventId)}
            className="flex-1">
            {loading ? '导入中...' : '确认导入'}
          </Button>
        </div>
      </div>
    );
  };

  // 渲染步骤3：结果
  const renderResultStep = () => {
    if (!result) return null;

    const isSuccess = result.success;
    const hasWarnings = result.warnings.length > 0;

    return (
      <div className="space-y-4">
        {/* 结果状态 */}
        <div className={`p-4 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl">{isSuccess ? '✅' : '❌'}</div>
            <div className={`font-bold ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
              {isSuccess ? '导入成功' : '导入失败'}
            </div>
          </div>
          <div className={`text-sm ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </div>
        </div>

        {/* 详细统计 */}
        {isSuccess && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white p-2 rounded border">
              <div className="text-gray-500">导入事件</div>
              <div className="font-bold text-lg">{result.events}</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-gray-500">导入礼金</div>
              <div className="font-bold text-lg">{result.gifts}</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-gray-500">跳过重复</div>
              <div className="font-bold text-lg">{result.skipped}</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-gray-500">冲突数据</div>
              <div className="font-bold text-lg">{result.conflicts}</div>
            </div>
          </div>
        )}

        {/* 警告信息 */}
        {hasWarnings && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="font-semibold text-yellow-800 mb-2">⚠️ 注意事项</div>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {result.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setStep('select')}
            className="flex-1">
            导入另一个文件
          </Button>
          <Button
            variant="primary"
            onClick={handleClose}
            className="flex-1">
            完成
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📥</span>
            <h2 className="text-xl font-bold">导入 Excel 数据</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 步骤指示器 */}
          {step !== 'select' && (
            <div className="flex items-center justify-center gap-4 mb-6 text-sm">
              <div className={`flex items-center gap-1 ${step === 'preview' ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">1</span>
                预览
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-1 ${step === 'result' ? 'font-bold text-green-600' : 'text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">2</span>
                完成
              </div>
            </div>
          )}

          {/* 步骤内容 */}
          {step === 'select' && renderSelectStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'result' && renderResultStep()}
        </div>
      </div>
    </div>
  );
};

export default ImportExcelModal;