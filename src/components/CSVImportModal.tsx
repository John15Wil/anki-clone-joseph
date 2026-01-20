import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { X, Upload, FileText } from 'lucide-react';
import { parseCSV, validateCSV, type CSVCard } from '../lib/csvParser';
import { db } from '../lib/db';
import { generateId } from '../lib/utils';
import type { Deck } from '../types';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  decks: Deck[];
}

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvCards, setCSVCards] = useState<CSVCard[]>([]);
  const [deckName, setDeckName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    try {
      const content = await selectedFile.text();

      // 验证CSV
      const validation = validateCSV(content);
      if (!validation.valid) {
        setError(validation.error || 'CSV格式错误');
        setCSVCards([]);
        return;
      }

      // 解析CSV
      const cards = parseCSV(content);
      setCSVCards(cards);

      // 自动设置卡组名称（使用文件名）
      if (!deckName) {
        const name = selectedFile.name.replace(/\.csv$/i, '');
        setDeckName(name);
      }
    } catch (err) {
      setError('读取文件失败');
      setCSVCards([]);
    }
  };

  const handleImport = async () => {
    if (!deckName.trim()) {
      setError('请输入卡组名称');
      return;
    }

    if (csvCards.length === 0) {
      setError('没有可导入的卡片');
      return;
    }

    setImporting(true);
    setError('');

    try {
      // 创建新卡组
      const newDeck: Deck = {
        id: generateId(),
        name: deckName.trim(),
        description: `从 ${file?.name || 'CSV'} 导入`,
        cardsCount: csvCards.length,
        newCardsPerDay: 20,
        reviewsPerDay: 200,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.decks.add(newDeck);

      // 导入卡片
      const cards = csvCards.map(csvCard => ({
        id: generateId(),
        deckId: newDeck.id,
        front: csvCard.front,
        back: csvCard.back,
        tags: csvCard.tags || [],
        deleted: 'active' as const,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      await db.cards.bulkAdd(cards);

      // 成功
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Import failed:', err);
      setError('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCSVCards([]);
    setDeckName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-900">导入 Anki CSV</CardTitle>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-6">
          <div className="space-y-6">
            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择CSV文件
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-gray-300 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  {file ? (
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <FileText className="w-4 h-4" />
                      {file.name}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-1">
                        点击选择CSV文件
                      </p>
                      <p className="text-xs text-gray-400">
                        支持Anki导出的CSV格式
                      </p>
                    </>
                  )}
                </label>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>支持的格式：</p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>正面,背面</li>
                  <li>正面,背面,标签</li>
                  <li>支持制表符或逗号分隔</li>
                  <li>支持引号包裹字段</li>
                </ul>
              </div>
            </div>

            {/* 卡组名称 */}
            {csvCards.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    卡组名称
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="输入新卡组名称"
                  />
                </div>

                {/* 预览 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    预览 ({csvCards.length} 张卡片)
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {csvCards.slice(0, 5).map((card, index) => (
                      <div
                        key={index}
                        className="p-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-xs text-gray-500 mb-1">#{index + 1}</div>
                        <div className="text-sm text-gray-900 mb-1">
                          <span className="font-medium">问：</span> {card.front.slice(0, 100)}
                          {card.front.length > 100 && '...'}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">答：</span> {card.back.slice(0, 100)}
                          {card.back.length > 100 && '...'}
                        </div>
                        {card.tags && card.tags.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            标签: {card.tags.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {csvCards.length > 5 && (
                      <div className="p-3 text-center text-xs text-gray-500">
                        还有 {csvCards.length - 5} 张卡片...
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </CardContent>

        <div className="border-t border-gray-100 p-4 flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importing}
            className="text-sm"
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || csvCards.length === 0 || !deckName.trim() || importing}
            className="bg-gray-900 hover:bg-gray-800 text-sm"
          >
            {importing ? '导入中...' : `导入 ${csvCards.length} 张卡片`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
