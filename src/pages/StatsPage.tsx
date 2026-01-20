import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { getTodayString } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card as CardUI, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ArrowLeft, TrendingUp, BookOpen, Calendar, Award, ChevronRight } from 'lucide-react';
import type { Card, Deck, StudyLog } from '../types';

interface DayStats {
  date: string;
  count: number;
  accuracy: number;
}

interface DeckStats {
  deck: Deck;
  logsCount: number;
  accuracy: number;
  totalTime: number;
}

// 获取活动卡片
async function getActiveCards(deckId?: string): Promise<Card[]> {
  let query = db.cards.where('deleted').equals('active');

  if (deckId) {
    query = query.and((card: Card) => card.deckId === deckId);
  }

  return query.toArray();
}

export function StatsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalCards: 0,
    studiedToday: 0,
    studiedThisWeek: 0,
    studiedThisMonth: 0,
    totalReviews: 0,
    averageAccuracy: 0
  });

  // 下钻状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [deckStats, setDeckStats] = useState<DeckStats[]>([]);
  const [dailyLogs, setDailyLogs] = useState<StudyLog[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // 获取卡组和卡片统计
      const decks = await db.decks.toArray();
      const cards = await getActiveCards(); // 只获取活动卡片
      const logs = await db.studyLogs.toArray();

      // 过滤有效的学习记录（只包含活动卡片的记录）
      const activeCardIds = new Set(cards.map(c => c.id));
      const validLogs = logs.filter(log => activeCardIds.has(log.cardId));

      // 今天的学习记录
      const today = getTodayString();
      const todayStart = new Date(today).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      const todayLogs = validLogs.filter(log =>
        log.timestamp >= todayStart && log.timestamp < todayEnd
      );

      // 本周的学习记录
      const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
      const weekLogs = validLogs.filter(log => log.timestamp >= weekStart);

      // 本月的学习记录
      const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;
      const monthLogs = validLogs.filter(log => log.timestamp >= monthStart);

      // 计算正确率
      const goodRatings = validLogs.filter(log => log.rating >= 3).length;
      const accuracy = validLogs.length > 0 ? (goodRatings / validLogs.length * 100) : 0;

      setStats({
        totalDecks: decks.length,
        totalCards: cards.length,
        studiedToday: todayLogs.length,
        studiedThisWeek: weekLogs.length,
        studiedThisMonth: monthLogs.length,
        totalReviews: logs.length,
        averageAccuracy: Math.round(accuracy)
      });

      // 计算每日统计（最近30天）
      const dailyStatsMap = new Map<string, { count: number; goodCount: number }>();

      for (let i = 0; i < 30; i++) {
        const date = new Date(todayStart - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('zh-CN');
        dailyStatsMap.set(dateStr, { count: 0, goodCount: 0 });
      }

      logs.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleDateString('zh-CN');
        if (dailyStatsMap.has(dateStr)) {
          const stats = dailyStatsMap.get(dateStr)!;
          stats.count++;
          if (log.rating >= 3) stats.goodCount++;
        }
      });

      const dailyStats: DayStats[] = Array.from(dailyStatsMap.entries())
        .map(([date, stats]) => ({
          date,
          count: stats.count,
          accuracy: stats.count > 0 ? Math.round((stats.goodCount / stats.count) * 100) : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setDayStats(dailyStats);

      // 计算按卡组的统计
      const deckStatsMap = new Map<string, { logs: StudyLog[]; goodCount: number; totalTime: number }>();

      logs.forEach(log => {
        const card = cards.find((c: Card) => c.id === log.cardId);
        if (card) {
          if (!deckStatsMap.has(card.deckId)) {
            deckStatsMap.set(card.deckId, { logs: [], goodCount: 0, totalTime: 0 });
          }
          const deckStat = deckStatsMap.get(card.deckId)!;
          deckStat.logs.push(log);
          deckStat.totalTime += log.timeSpent;
          if (log.rating >= 3) deckStat.goodCount++;
        }
      });

      const deckStatsList: DeckStats[] = [];
      for (const deck of decks) {
        const stat = deckStatsMap.get(deck.id);
        if (stat && stat.logs.length > 0) {
          deckStatsList.push({
            deck,
            logsCount: stat.logs.length,
            accuracy: Math.round((stat.goodCount / stat.logs.length) * 100),
            totalTime: stat.totalTime
          });
        }
      }

      deckStatsList.sort((a, b) => b.logsCount - a.logsCount);
      setDeckStats(deckStatsList);

    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDateClick(date: string) {
    setSelectedDate(date);

    // 加载该日期的所有学习记录
    const dateObj = new Date(date);
    const dayStart = dateObj.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const logs = await db.studyLogs.toArray();
    const filtered = logs.filter(log =>
      log.timestamp >= dayStart && log.timestamp < dayEnd
    );

    setDailyLogs(filtered);
  }

  function getHeatColor(count: number): string {
    if (count === 0) return 'bg-gray-100';
    if (count <= 5) return 'bg-green-200';
    if (count <= 10) return 'bg-green-400';
    if (count <= 20) return 'bg-green-600';
    return 'bg-green-800';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 学习统计</h1>
              <p className="text-sm text-gray-600 mt-1">查看你的学习进度和表现</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 总览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardUI className="bg-white shadow-md border-2 hover:border-blue-200 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">总卡组数</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">{stats.totalDecks}</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-full">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </CardUI>

          <CardUI className="bg-white shadow-md border-2 hover:border-green-200 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">总卡片数</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">{stats.totalCards}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-full">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </CardUI>

          <CardUI className="bg-white shadow-md border-2 hover:border-purple-200 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">总复习次数</p>
                  <p className="text-4xl font-bold text-purple-600 mt-2">{stats.totalReviews}</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-full">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </CardUI>

          <CardUI className="bg-white shadow-md border-2 hover:border-orange-200 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">平均正确率</p>
                  <p className="text-4xl font-bold text-orange-600 mt-2">{stats.averageAccuracy}%</p>
                </div>
                <div className="bg-orange-100 p-4 rounded-full">
                  <Award className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </CardUI>
        </div>

        {/* 学习热力图 */}
        <CardUI className="bg-white shadow-lg border-2 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">🔥 学习热力图（最近30天）</CardTitle>
            <p className="text-sm text-gray-500 mt-1">点击日期查看详细统计</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {dayStats.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleDateClick(day.date)}
                  className={`aspect-square rounded-lg ${getHeatColor(day.count)} hover:ring-2 hover:ring-blue-400 transition-all flex flex-col items-center justify-center p-1 text-xs ${
                    selectedDate === day.date ? 'ring-2 ring-blue-600' : ''
                  }`}
                  title={`${day.date}: ${day.count}张卡片, ${day.accuracy}%正确率`}
                >
                  <div className="font-medium text-gray-700">
                    {new Date(day.date).getDate()}
                  </div>
                  {day.count > 0 && (
                    <div className="text-white font-bold text-xs">{day.count}</div>
                  )}
                </button>
              ))}
            </div>

            {/* 图例 */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
              <span>学习强度:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span>1-5</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span>6-10</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>11-20</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-800 rounded"></div>
                <span>20+</span>
              </div>
            </div>
          </CardContent>
        </CardUI>

        {/* 选中日期的详情 */}
        {selectedDate && (
          <CardUI className="bg-white shadow-lg border-2 mb-8 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📅 {selectedDate} 详细统计</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  关闭
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">学习卡片</p>
                  <p className="text-2xl font-bold text-blue-600">{dailyLogs.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">正确率</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dailyLogs.length > 0
                      ? Math.round((dailyLogs.filter(l => l.rating >= 3).length / dailyLogs.length) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">学习时长</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(dailyLogs.reduce((sum, l) => sum + l.timeSpent, 0) / 60)}分
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                共 {dailyLogs.length} 条学习记录
              </div>
            </CardContent>
          </CardUI>
        )}

        {/* 按卡组统计 */}
        <CardUI className="bg-white shadow-lg border-2 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">📚 按卡组统计</CardTitle>
          </CardHeader>
          <CardContent>
            {deckStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                还没有学习记录
              </div>
            ) : (
              <div className="space-y-3">
                {deckStats.map((stat) => (
                  <div
                    key={stat.deck.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/deck/${stat.deck.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{stat.deck.name}</h3>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stat.deck.description}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">复习次数</p>
                        <p className="font-bold text-blue-600">{stat.logsCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">正确率</p>
                        <p className="font-bold text-green-600">{stat.accuracy}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">学习时长</p>
                        <p className="font-bold text-purple-600">{Math.round(stat.totalTime / 60)}分</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CardUI>

        {/* 学习活动 */}
        <CardUI className="bg-white shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl">📈 学习活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-lg font-semibold text-gray-800">今天学习</p>
                  <p className="text-sm text-gray-600">Today's study session</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{stats.studiedToday}</p>
                  <p className="text-sm text-gray-600">张卡片</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-lg font-semibold text-gray-800">本周学习</p>
                  <p className="text-sm text-gray-600">Last 7 days</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{stats.studiedThisWeek}</p>
                  <p className="text-sm text-gray-600">张卡片</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-lg font-semibold text-gray-800">本月学习</p>
                  <p className="text-sm text-gray-600">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{stats.studiedThisMonth}</p>
                  <p className="text-sm text-gray-600">张卡片</p>
                </div>
              </div>
            </div>

            {stats.totalReviews === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有学习记录</p>
                <Button onClick={() => navigate('/')}>
                  开始学习
                </Button>
              </div>
            )}
          </CardContent>
        </CardUI>

        {/* 提示信息 */}
        {stats.totalReviews > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">学习建议</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ 每天坚持学习，即使只有几分钟也能保持记忆</li>
                  <li>✓ 正确率 {stats.averageAccuracy >= 80 ? '非常好' : '还不错'}，继续保持！</li>
                  <li>✓ 建议每天复习 20-50 张卡片，效果最佳</li>
                  <li>✓ 及时复习到期的卡片，避免遗忘</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
