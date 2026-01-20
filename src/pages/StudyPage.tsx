import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { getActiveCards } from '../lib/trashManager';
import { calculateNextReview, isDue, formatInterval } from '../lib/srs';
import type { Card, CardReview, Rating } from '../types';
import { Button } from '../components/ui/Button';
import { Card as UICard, CardContent } from '../components/ui/Card';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

// 预测下次复习的间隔
function predictInterval(review: CardReview, rating: Rating): string {
  const result = calculateNextReview(review, rating);
  return formatInterval(result.interval);
}

// 学习会话设置
const MAX_CARDS_PER_SESSION = 20; // 每次学习最多20张卡片

export function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studyQueue, setStudyQueue] = useState<{ card: Card; review: CardReview }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [history, setHistory] = useState<number[]>([]); // 历史记录：存储访问过的索引
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    startTime: Date.now(),
    totalTimeSpent: 0 // 总学习时间（秒）
  });
  const [cardStartTime, setCardStartTime] = useState(Date.now()); // 当前卡片开始时间

  useEffect(() => {
    if (deckId) {
      loadStudyQueue();
    }
  }, [deckId]);

  // 当切换卡片时重置计时器
  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentIndex]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 如果正在输入，不响应快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!showAnswer) {
        // 显示答案 - 空格键或回车键
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleShowAnswer();
        }
      } else {
        // 评分快捷键
        e.preventDefault();
        switch (e.code) {
          case 'Digit1':
          case 'Numpad1':
            handleAnswer(1); // 重来
            break;
          case 'Digit2':
          case 'Numpad2':
            handleAnswer(2); // 困难
            break;
          case 'Digit3':
          case 'Numpad3':
          case 'Space':
            handleAnswer(3); // 一般
            break;
          case 'Digit4':
          case 'Numpad4':
            handleAnswer(4); // 简单
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, currentIndex, studyQueue]);

  function handleShowAnswer() {
    setIsFlipping(true);
    setTimeout(() => {
      setShowAnswer(true);
      setIsFlipping(false);
    }, 150);
  }

  async function loadStudyQueue() {
    try {
      // 获取该卡组的所有活动卡片（排除已删除的）
      const cards = await getActiveCards(deckId!);

      // 获取需要复习的卡片
      const queue: { card: Card; review: CardReview }[] = [];

      for (const card of cards) {
        let review = await db.cardReviews.get(card.id);

        // 如果没有复习记录，创建新的
        if (!review) {
          review = {
            id: card.id,
            cardId: card.id,
            ease: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: Date.now(),
            lastReview: Date.now(),
            state: 'new'
          };
          await db.cardReviews.add(review);
        }

        // 只添加到期的卡片
        if (isDue(review)) {
          queue.push({ card, review });
        }
      }

      // 优先级排序：最久未复习的卡片优先
      queue.sort((a, b) => a.review.nextReview - b.review.nextReview);

      // 限制会话卡片数量
      const limitedQueue = queue.slice(0, MAX_CARDS_PER_SESSION);

      // 卡片混合洗牌：将新卡片和复习卡片混合
      const newCards = limitedQueue.filter(item => item.review.state === 'new');
      const reviewCards = limitedQueue.filter(item => item.review.state !== 'new');

      // 交替混合新卡片和复习卡片
      const shuffledQueue: typeof limitedQueue = [];
      const maxLength = Math.max(newCards.length, reviewCards.length);

      for (let i = 0; i < maxLength; i++) {
        if (i < reviewCards.length) {
          shuffledQueue.push(reviewCards[i]);
        }
        if (i < newCards.length) {
          shuffledQueue.push(newCards[i]);
        }
      }

      // 如果没有复习卡片，只有新卡片，则使用全部新卡片
      if (reviewCards.length === 0) {
        shuffledQueue.push(...newCards);
      }

      setStudyQueue(shuffledQueue);
      setSessionStats(prev => ({
        ...prev,
        total: shuffledQueue.length
      }));
    } catch (error) {
      console.error('Failed to load study queue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(rating: Rating) {
    const current = studyQueue[currentIndex];
    if (!current) return;

    const { card, review } = current;

    // 计算该卡片的学习时间
    const cardTimeSpent = Math.round((Date.now() - cardStartTime) / 1000);

    // 更新统计
    setSessionStats(prev => ({
      ...prev,
      total: prev.total + 1,
      again: prev.again + (rating === 1 ? 1 : 0),
      hard: prev.hard + (rating === 2 ? 1 : 0),
      good: prev.good + (rating === 3 ? 1 : 0),
      easy: prev.easy + (rating === 4 ? 1 : 0),
      totalTimeSpent: prev.totalTimeSpent + cardTimeSpent
    }));

    // 计算下次复习时间
    const result = calculateNextReview(review, rating);

    // 更新数据库
    await db.cardReviews.update(card.id, {
      ...result,
      lastReview: Date.now()
    });

    // 记录学习日志（包含实际学习时间）
    await db.studyLogs.add({
      id: `${Date.now()}-${Math.random()}`,
      cardId: card.id,
      rating,
      timeSpent: cardTimeSpent,
      timestamp: Date.now()
    });

    // 记录历史
    setHistory(prev => [...prev, currentIndex]);

    // 移动到下一张卡片
    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setStudyComplete(true);
    }
  }

  function handlePrevious() {
    if (history.length === 0) return;

    // 获取上一张卡片的索引
    const prevIndex = history[history.length - 1];

    // 从历史记录中移除
    setHistory(prev => prev.slice(0, -1));

    // 返回到上一张卡片
    setCurrentIndex(prevIndex);
    setShowAnswer(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (studyComplete) {
    const accuracy = sessionStats.total > 0
      ? Math.round(((sessionStats.good + sessionStats.easy) / sessionStats.total) * 100)
      : 0;

    // 计算总学习时间（分钟）
    const totalMinutes = Math.round(sessionStats.totalTimeSpent / 60);
    const avgTimePerCard = sessionStats.total > 0
      ? Math.round(sessionStats.totalTimeSpent / sessionStats.total)
      : 0;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-xl mx-4">
          <div className="bg-white rounded-xl border border-gray-100 p-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">学习完成</h2>
            <p className="text-sm text-gray-500 mb-8">
              今天已经没有需要复习的卡片了
            </p>

            {/* 学习统计 */}
            {sessionStats.total > 0 && (
              <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-4">本次学习统计</h3>

                {/* 第一行：主要统计 */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">学习卡片</p>
                    <p className="text-2xl font-semibold text-gray-900">{sessionStats.total}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">正确率</p>
                    <p className="text-2xl font-semibold text-green-600">{accuracy}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">学习时长</p>
                    <p className="text-2xl font-semibold text-blue-600">
                      {totalMinutes > 0 ? `${totalMinutes}分` : `${sessionStats.totalTimeSpent}秒`}
                    </p>
                  </div>
                </div>

                {/* 第二行：评分分布 */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">重来</p>
                    <p className="text-lg font-semibold text-red-600">{sessionStats.again}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">困难</p>
                    <p className="text-lg font-semibold text-orange-600">{sessionStats.hard}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">一般</p>
                    <p className="text-lg font-semibold text-gray-900">{sessionStats.good}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">简单</p>
                    <p className="text-lg font-semibold text-green-600">{sessionStats.easy}</p>
                  </div>
                </div>

                {/* 平均时间 */}
                <div className="mt-3 text-xs text-gray-500 text-center">
                  平均每张卡片 {avgTimePerCard} 秒
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate('/')}
              className="bg-gray-900 hover:bg-gray-800 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const current = studyQueue[currentIndex];
  if (!current) return null;

  // 检查是否还有更多待复习的卡片（超过本次会话数量）
  const hasMoreCards = studyQueue.length >= MAX_CARDS_PER_SESSION;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              返回
            </Button>
            <div className="text-center">
              <div className="text-xs text-gray-500">学习进度</div>
              <div className="text-sm font-medium text-gray-900">
                {currentIndex + 1} / {studyQueue.length}
                {hasMoreCards && <span className="text-orange-600 ml-1">（限量）</span>}
              </div>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 会话限制提示 */}
        {hasMoreCards && (
          <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-orange-600 text-sm">ℹ️</span>
              </div>
              <div className="ml-2">
                <p className="text-xs text-orange-800">
                  本次学习限制为 {MAX_CARDS_PER_SESSION} 张卡片，完成后可继续下一轮学习
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              {currentIndex + 1} / {studyQueue.length}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(((currentIndex + 1) / studyQueue.length) * 100)}%
            </span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / studyQueue.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 卡片 */}
        <div
          className={`mb-4 cursor-pointer transition-transform duration-150 ${isFlipping ? 'scale-95' : ''}`}
          onClick={() => !showAnswer && handleShowAnswer()}
        >
          <UICard className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="text-center">
                {/* 问题 */}
                <div className={`transition-opacity duration-200 ${isFlipping ? 'opacity-0' : 'opacity-100'}`}>
                  <div
                    className="text-2xl sm:text-3xl font-medium mb-6 whitespace-pre-wrap leading-relaxed text-gray-900 card-content"
                    dangerouslySetInnerHTML={{ __html: current.card.front }}
                  />

                  {/* 点击提示 */}
                  {!showAnswer && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <p className="text-xs text-gray-400">点击卡片或按空格查看答案</p>
                    </div>
                  )}
                </div>

                {/* 答案 */}
                {showAnswer && (
                  <div className="mt-8 pt-8 border-t border-gray-200 animate-fadeIn">
                    <div
                      className="text-lg sm:text-xl text-gray-700 whitespace-pre-wrap leading-relaxed card-content"
                      dangerouslySetInnerHTML={{ __html: current.card.back }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </UICard>
        </div>

        {!showAnswer ? (
          <div className="flex justify-center gap-3">
            {history.length > 0 && (
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="px-6 py-3 text-base"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一题
              </Button>
            )}
            <Button
              onClick={handleShowAnswer}
              className="px-12 py-3 text-base bg-gray-900 hover:bg-gray-800"
            >
              显示答案
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-center text-xs text-gray-500 mb-2">
              你记住了吗？
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
              {/* 第一行：重来和困难 */}
              <Button
                onClick={() => handleAnswer(1)}
                className="flex-col h-auto py-4 px-3 text-sm bg-red-600 hover:bg-red-700"
              >
                <div className="text-base font-medium mb-1">❌ 重来</div>
                <div className="text-xs opacity-90">&lt;1分钟</div>
              </Button>
              <Button
                onClick={() => handleAnswer(2)}
                className="flex-col h-auto py-4 px-3 text-sm bg-orange-500 hover:bg-orange-600"
              >
                <div className="text-base font-medium mb-1">😰 困难</div>
                <div className="text-xs opacity-90">
                  {predictInterval(current.review, 2)}
                </div>
              </Button>
              {/* 第二行：一般和简单 */}
              <Button
                onClick={() => handleAnswer(3)}
                className="flex-col h-auto py-4 px-3 text-sm bg-blue-600 hover:bg-blue-700"
              >
                <div className="text-base font-medium mb-1">👍 一般</div>
                <div className="text-xs opacity-90">
                  {predictInterval(current.review, 3)}
                </div>
              </Button>
              <Button
                onClick={() => handleAnswer(4)}
                className="flex-col h-auto py-4 px-3 text-sm bg-green-600 hover:bg-green-700"
              >
                <div className="text-base font-medium mb-1">✨ 简单</div>
                <div className="text-xs opacity-90">
                  {predictInterval(current.review, 4)}
                </div>
              </Button>
            </div>
            {history.length > 0 && (
              <div className="text-center mt-3">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  返回上一题
                </Button>
              </div>
            )}
            <div className="text-center text-xs text-gray-400 mt-2">
              快捷键: 1(重来) 2(困难) 3(一般) 4(简单)
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
