import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { X, FileText, FileJson } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCSV: () => void;
  onSelectJSON: () => void;
}

export function ImportModal({ isOpen, onClose, onSelectCSV, onSelectJSON }: ImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">选择导入方式</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            {/* CSV导入 */}
            <button
              onClick={() => {
                onClose();
                onSelectCSV();
              }}
              className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">CSV 文件</h4>
                  <p className="text-sm text-gray-500">
                    从 Anki 导出的 CSV 文件，创建新卡组
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持: 逗号/制表符分隔，带标签
                  </p>
                </div>
              </div>
            </button>

            {/* JSON导入 */}
            <button
              onClick={() => {
                onClose();
                onSelectJSON();
              }}
              className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <FileJson className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">JSON 备份</h4>
                  <p className="text-sm text-gray-500">
                    从本应用导出的完整备份文件
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    包含: 所有卡组、卡片、学习记录
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full text-sm"
            >
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
