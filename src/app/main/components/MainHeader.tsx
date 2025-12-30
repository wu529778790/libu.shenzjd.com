import { Event } from '@/types';
import { formatDateTime } from '@/utils/format';
import Button from '@/components/ui/Button';
import { BackupService } from '@/lib/backup';
import { success } from '@/components/ui/Toast';

interface MainHeaderProps {
  event: Event;
  onGoHome: () => void;
  onExportPDF: () => void;
  onImport: () => void;
  onExportExcel: () => void;
  onOpenGuestScreen: () => void;
}

export default function MainHeader({
  event,
  onGoHome,
  onExportPDF,
  onImport,
  onExportExcel,
  onOpenGuestScreen,
}: MainHeaderProps) {
  const handleDownloadTemplate = () => {
    BackupService.exportTemplate();
    success('Excel模板已下载，请查看浏览器下载文件夹');
  };

  return (
    <div className="card themed-bg-light p-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold themed-header">
            {event.name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {formatDateTime(event.startDateTime)} ~{" "}
            {formatDateTime(event.endDateTime)}
            {event.recorder && ` | 记账人: ${event.recorder}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          <Button variant="danger" size="sm" onClick={onGoHome}>
            返回首页
          </Button>
          <Button variant="primary" onClick={onExportPDF}>
            打印/PDF
          </Button>
          <Button
            variant="secondary"
            onClick={onImport}
          >
            📥 导入数据
          </Button>
          <Button variant="secondary" onClick={onExportExcel}>
            📊 导出数据
          </Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            📋 下载模板
          </Button>
          <Button variant="secondary" onClick={onOpenGuestScreen}>
            开启副屏
          </Button>
        </div>
      </div>
    </div>
  );
}
