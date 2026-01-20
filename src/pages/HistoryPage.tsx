import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import type { StudyLog, Card } from '../types';
import { Button } from '../components/ui/Button';
import { Card as UICard, CardContent } from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';

interface LogWithCard extends StudyLog {
  card?: Card;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogWithCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      // 加载所有学习记录
      const allLogs = await db.studyLogs.orderBy('timestamp').reverse().toArray();

      // 关联卡片信息
      const logsWithCards = await Promise.all(
        allLogs.map(async (log) => {
          const card = await db.cards.get(log.cardId);
          return { ...log, card };
        })
      );

      setLogs(logsWithCards);

      // 提取所有日期
      const uniqueDates = Array.from(
        new Set(
          allLogs.map((log) => new Date(log.timestamp).toLocaleDateString('zh-CN'))
        )
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      setDates(uniqueDates);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs =
    selectedDate === 'all'
      ? logs
      : logs.filter(
          (log) =>
            new Date(log.timestamp).toLocaleDateString('zh-CN') === selectedDate
        );

  // 统计信息
  const stats = {
    total: filteredLogs.length,
    again: filteredLogs.filter((log) => log.rating === 1).length,
    hard: filteredLogs.filter((log) => log.rating === 2).length,
    good: filteredLogs.filter((log) => log.rating === 3).length,
    easy: filteredLogs.filter((log) => log.rating === 4).length,
    totalTime: filteredLogs.reduce((sum, log) => sum + log.timeSpent, 0),
  };

  const accuracy = stats.total > 0
    ? Math.round(((stats.good + stats.easy) / stats.total) * 100)
    : 0;

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return '❌ 重来';
      case 2: return '😰 困难';
      case 3: return '👍 一般';
      case 4: return '✨ 简单';
      default: return '未知';
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return 'text-red-600 bg-red-50';
      case 2: return 'text-orange-600 bg-orange-50';
      case 3: return 'text-blue-600 bg-blue-50';
      case 4: return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">学习记录</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 日期筛选 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDate('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDate === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              全部 ({logs.length})
            </button>
            {dates.map((date) => {
              const count = logs.filter(
                (log) => new Date(log.timestamp).toLocaleDateString('zh-CN') === date
              ).length;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDate === date
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {date} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <UICard className="bg-white border-gray-100">
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 mb-1">学习卡片</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            </CardContent>
          </UICard>
          <UICard className="bg-white border-gray-100">
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 mb-1">正确率</div>
              <div className="text-2xl font-semibold text-green-600">{accuracy}%</div>
            </CardContent>
          </UICard>
          <UICard className="bg-white border-gray-100">
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 mb-1">学习时长</div>
              <div className="text-2xl font-semibold text-blue-600">
                {Math.round(stats.totalTime / 60)}分
              </div>
            </CardContent>
          </UICard>
          <UICard className="bg-red-50 border-red-100">
            <CardContent className="p-4">
              <div className="text-xs text-red-600 mb-1">重来</div>
              <div className="text-2xl font-semibold text-red-600">{stats.again}</div>
            </CardContent>
          </UICard>
          <UICard className="bg-orange-50 border-orange-100">
            <CardContent className="p-4">
              <div className="text-xs text-orange-600 mb-1">困难</div>
              <div className="text-2xl font-semibold text-orange-600">{stats.hard}</div>
            </CardContent>
          </UICard>
          <UICard className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="text-xs text-green-600 mb-1">简单</div>
              <div className="text-2xl font-semibold text-green-600">{stats.easy}</div>
            </CardContent>
          </UICard>
        </div>

        {/* 学习记录列表 */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl border border-gray-100 p-12 max-w-md mx-auto">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">还没有学习记录</h2>
              <p className="text-sm text-gray-500 mb-8">开始学习后，记录会显示在这里</p>
              <Button onClick={() => navigate('/')} className="bg-gray-900 hover:bg-gray-800">
                开始学习
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => (
              <UICard key={index} className="bg-white border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* 卡片内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRatingColor(log.rating)}`}>
                          {getRatingText(log.rating)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-gray-400">
                          用时 {log.timeSpent}秒
                        </span>
                      </div>
                      {log.card ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 line-clamp-1 card-content">
                            <span className="font-medium">问：</span>
                            <span dangerouslySetInnerHTML={{ __html: log.card.front }} />
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-1 card-content">
                            <span className="font-medium">答：</span>
                            <span dangerouslySetInnerHTML={{ __html: log.card.back }} />
                          </div>
                          {log.card.source && (
                            <p className="text-xs text-gray-500">
                              来源：{log.card.source}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">卡片已删除</p>
                      )}
                    </div>
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
