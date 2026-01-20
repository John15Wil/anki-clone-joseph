import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTrashItems,
  restoreCard,
  permanentDeleteCard,
  emptyTrash
} from '../lib/trashManager';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card as UICard, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Trash
} from 'lucide-react';
import type { TrashItem } from '../types';

export function TrashPage() {
  const navigate = useNavigate();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadTrashItems();
  }, []);

  async function loadTrashItems() {
    try {
      const items = await getTrashItems();
      setTrashItems(items);
    } catch (error) {
      console.error('Failed to load trash items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreItem(item: TrashItem) {
    setProcessing(true);
    try {
      await restoreCard(item);
      await loadTrashItems();
    } catch (error) {
      console.error('Failed to restore item:', error);
      alert('恢复失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  async function handlePermanentDeleteItem(item: TrashItem) {
    const confirmDelete = confirm('确定要永久删除这个项目吗？此操作无法撤销。');
    if (!confirmDelete) return;

    setProcessing(true);
    try {
      await permanentDeleteCard(item);
      await loadTrashItems();
    } catch (error) {
      console.error('Failed to permanently delete item:', error);
      alert('删除失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  async function handleBatchRestore() {
    if (selectedItems.size === 0) return;

    setProcessing(true);
    try {
      for (const itemId of selectedItems) {
        const item = trashItems.find(i => i.id === itemId);
        if (item) {
          await restoreCard(item);
        }
      }
      setSelectedItems(new Set());
      setBatchMode(false);
      await loadTrashItems();
    } catch (error) {
      console.error('Failed to batch restore:', error);
      alert('批量恢复失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  async function handleBatchPermanentDelete() {
    if (selectedItems.size === 0) return;

    const confirmDelete = confirm(
      `确定要永久删除选中的 ${selectedItems.size} 个项目吗？此操作无法撤销。`
    );
    if (!confirmDelete) return;

    setProcessing(true);
    try {
      for (const itemId of selectedItems) {
        const item = trashItems.find(i => i.id === itemId);
        if (item) {
          await permanentDeleteCard(item);
        }
      }
      setSelectedItems(new Set());
      setBatchMode(false);
      await loadTrashItems();
    } catch (error) {
      console.error('Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  async function handleEmptyTrash() {
    if (trashItems.length === 0) return;

    const confirmEmpty = confirm(
      `确定要清空垃圾箱吗？这将永久删除所有 ${trashItems.length} 个项目，此操作无法撤销。`
    );
    if (!confirmEmpty) return;

    setProcessing(true);
    try {
      const deletedCount = await emptyTrash();
      alert(`已永久删除 ${deletedCount} 个项目`);
      await loadTrashItems();
    } catch (error) {
      console.error('Failed to empty trash:', error);
      alert('清空垃圾箱失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }

  function toggleBatchMode() {
    setBatchMode(!batchMode);
    setSelectedItems(new Set());
  }

  function selectAllItems() {
    setSelectedItems(new Set(trashItems.map(item => item.id)));
  }

  function deselectAllItems() {
    setSelectedItems(new Set());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="mb-3 -ml-2 text-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                返回
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">垃圾箱</h1>
              <p className="text-sm text-gray-500">
                恢复已删除的卡片，或永久删除它们
              </p>
            </div>
            <div className="flex gap-2">
              {!batchMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={toggleBatchMode}
                    className="text-sm"
                    disabled={trashItems.length === 0}
                  >
                    批量操作
                  </Button>
                  <Button
                    onClick={handleEmptyTrash}
                    variant="outline"
                    className="text-sm text-red-600 hover:bg-red-50"
                    disabled={trashItems.length === 0 || processing}
                  >
                    <Trash className="w-4 h-4 mr-1.5" />
                    清空垃圾箱
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={deselectAllItems}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={selectedItems.size === 0}
                  >
                    取消选择
                  </Button>
                  <Button
                    onClick={selectAllItems}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={trashItems.length === 0}
                  >
                    全选
                  </Button>
                  <Button
                    onClick={handleBatchRestore}
                    variant="outline"
                    size="sm"
                    className="text-xs text-green-600 hover:bg-green-50"
                    disabled={selectedItems.size === 0 || processing}
                  >
                    恢复 ({selectedItems.size})
                  </Button>
                  <Button
                    onClick={handleBatchPermanentDelete}
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 hover:bg-red-50"
                    disabled={selectedItems.size === 0 || processing}
                  >
                    永久删除 ({selectedItems.size})
                  </Button>
                  <Button
                    onClick={toggleBatchMode}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    完成
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {trashItems.length === 0 ? (
          <div className="text-center py-24">
            <div className="bg-white rounded-xl border border-gray-100 p-12 max-w-md mx-auto">
              <Trash2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                垃圾箱是空的
              </h2>
              <p className="text-gray-500 mb-8">
                已删除的卡片会显示在这里
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-gray-900 hover:bg-gray-800"
              >
                返回首页
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 px-1">
              共 <span className="font-medium text-gray-900">{trashItems.length}</span> 个项目
            </div>

            {trashItems.map((item) => (
              <UICard
                key={item.id}
                className="border border-gray-100 hover:border-gray-200 transition-colors bg-white"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* 批量模式复选框 */}
                    {batchMode && (
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {item.type === 'card' ? '卡片' : '卡组'}
                        </span>
                        {item.deckName && (
                          <span className="text-xs text-gray-500">
                            {item.deckName}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(item.deletedAt), {
                            addSuffix: true,
                            locale: zhCN
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {!batchMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRestoreItem(item)}
                          className="p-2 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                          title="恢复"
                          disabled={processing}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteItem(item)}
                          className="p-2 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                          title="永久删除"
                          disabled={processing}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </UICard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}