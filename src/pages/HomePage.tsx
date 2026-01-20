import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import { getActiveCards } from '../lib/trashManager';
import { cloudSync } from '../lib/cloudSync';
import { runDatabaseMaintenance } from '../lib/dbMaintenance';
import type { Deck } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BookOpen, Plus, BarChart3, Download, Upload, History, Cloud, LogOut, LogIn, Trash2 } from 'lucide-react';
import { CSVImportModal } from '../components/CSVImportModal';
import { ImportModal } from '../components/ImportModal';
import { SyncStatusBadge } from '../components/SyncStatusBadge';

export function HomePage() {
  const { user, signOut, isCloudSyncEnabled } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Record<string, number>>({});
  const [graduatedCards, setGraduatedCards] = useState<Record<string, number>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    window.location.reload();
  }

  useEffect(() => {
    loadDecks();

    // 运行数据库维护来修复计数
    runDatabaseMaintenance().then(results => {
      console.log('Database maintenance results:', results);
      // 重新加载卡组以获取更新后的计数
      loadDecks();
    });

    // 登录后立即同步
    if (user && isCloudSyncEnabled) {
      cloudSync.syncAll();
    }
  }, [user, isCloudSyncEnabled]);

  async function loadDecks() {
    try {
      const allDecks = await db.decks.toArray();
      setDecks(allDecks);

      // 计算每个卡组的到期卡片数量和已毕业卡片数量（只考虑活动卡片）
      const dueCount: Record<string, number> = {};
      const graduatedCount: Record<string, number> = {};
      const now = Date.now();

      for (const deck of allDecks) {
        const cards = await getActiveCards(deck.id);
        let due = 0;
        let graduated = 0;

        for (const card of cards) {
          const review = await db.cardReviews.get(card.id);

          if (!review) {
            // 新卡片：没有review记录，应该学习
            due++;
          } else if (review.nextReview <= now) {
            // 待复习卡片：下次复习时间已到
            due++;
          }

          // 计算已毕业卡片（review状态）
          if (review && review.state === 'review') {
            graduated++;
          }
        }

        dueCount[deck.id] = due;
        graduatedCount[deck.id] = graduated;
      }

      setDueCards(dueCount);
      setGraduatedCards(graduatedCount);
    } catch (error) {
      console.error('Failed to load decks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStudy(deck: Deck) {
    navigate(`/study/${deck.id}`);
  }

  async function handleExportData() {
    try {
      const allDecks = await db.decks.toArray();
      const allCards = await db.cards.toArray();
      const allReviews = await db.cardReviews.toArray();
      const allLogs = await db.studyLogs.toArray();

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        decks: allDecks,
        cards: allCards,
        reviews: allReviews,
        logs: allLogs
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anki-clone-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('数据导出成功！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  }

  async function handleImportData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // 验证数据格式
        if (!importData.version || !importData.decks || !importData.cards) {
          throw new Error('Invalid backup file format');
        }

        // 确认导入
        const confirmed = confirm(
          `将导入 ${importData.decks.length} 个卡组，${importData.cards.length} 张卡片。\n\n⚠️ 警告：这将覆盖现有数据！\n\n是否继续？`
        );

        if (!confirmed) return;

        // 清空现有数据
        await db.decks.clear();
        await db.cards.clear();
        await db.cardReviews.clear();
        await db.studyLogs.clear();

        // 导入新数据
        await db.decks.bulkAdd(importData.decks);
        await db.cards.bulkAdd(importData.cards);
        if (importData.reviews) {
          await db.cardReviews.bulkAdd(importData.reviews);
        }
        if (importData.logs) {
          await db.studyLogs.bulkAdd(importData.logs);
        }

        alert('数据导入成功！页面即将刷新。');
        window.location.reload();
      } catch (error) {
        console.error('Import failed:', error);
        alert('导入失败：数据格式错误或文件损坏');
      }
    };

    input.click();
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">记忆卡片</h1>
                <SyncStatusBadge />
              </div>
              <p className="text-sm text-gray-500 mt-1">基于间隔重复算法的智能学习工具</p>
              {isCloudSyncEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  {user ? (
                    <>
                      <Cloud className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">已登录：{user.email}</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">本地模式</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isCloudSyncEnabled && (
                user ? (
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="text-sm"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    退出登录
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/auth')}
                    className="text-sm"
                  >
                    <LogIn className="w-4 h-4 mr-1.5" />
                    登录
                  </Button>
                )
              )}
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="text-sm"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                导入
              </Button>
              <Button
                variant="outline"
                onClick={handleExportData}
                className="text-sm"
              >
                <Download className="w-4 h-4 mr-1.5" />
                导出
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/history')}
                className="text-sm"
              >
                <History className="w-4 h-4 mr-1.5" />
                学习记录
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/trash')}
                className="text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                垃圾箱
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/stats')}
                className="text-sm"
              >
                <BarChart3 className="w-4 h-4 mr-1.5" />
                统计
              </Button>
              <Button
                onClick={() => navigate('/deck/new')}
                className="text-sm bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                新建卡组
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {decks.length === 0 ? (
          <div className="text-center py-24">
            <div className="bg-white rounded-xl border border-gray-100 p-12 max-w-md mx-auto">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                还没有卡组
              </h2>
              <p className="text-gray-500 mb-8">
                创建第一个卡组开始学习
              </p>
              <Button
                onClick={() => navigate('/deck/new')}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建卡组
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => {
              const dueCount = dueCards[deck.id] || 0;
              const graduatedCount = graduatedCards[deck.id] || 0;
              // 修复进度计算：改为计算已毕业卡片的比例（真实学习进度）
              const progress = deck.cardsCount > 0 ? (graduatedCount / deck.cardsCount) * 100 : 0;

              return (
              <Card key={deck.id} className="hover:shadow-xl transition-all border-gray-100 bg-white flex flex-col group">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">{deck.name}</CardTitle>
                  {/* 固定高度的描述区域，避免高度不一致 */}
                  <div className="h-10 mt-1">
                    {deck.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{deck.description}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col">
                    {/* 学习进度条 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">学习进度</span>
                        <span className="text-xs font-medium text-gray-900">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 统计信息 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">总卡片</div>
                        <div className="text-2xl font-semibold text-gray-900">{deck.cardsCount}</div>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        dueCount > 0 ? 'bg-orange-50' : 'bg-green-50'
                      }`}>
                        <div className="text-xs text-gray-500 mb-1">待复习</div>
                        <div className={`text-2xl font-semibold ${
                          dueCount > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {dueCount}
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 - 固定在底部 */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <Button
                        className={`w-full text-sm font-medium shadow-sm ${
                          dueCount > 0
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        onClick={() => handleStudy(deck)}
                      >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        {dueCount > 0 ? `复习 ${dueCount} 张` : '开始学习'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-sm text-gray-600 hover:bg-gray-50"
                        onClick={() => navigate(`/deck/${deck.id}`)}
                      >
                        管理卡片
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </main>

      {/* 导入选择模态框 */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSelectCSV={() => setShowCSVImport(true)}
        onSelectJSON={handleImportData}
      />

      {/* CSV导入模态框 */}
      <CSVImportModal
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={() => {
          loadDecks();
          alert('CSV导入成功！');
        }}
        decks={decks}
      />
    </div>
  );
}
