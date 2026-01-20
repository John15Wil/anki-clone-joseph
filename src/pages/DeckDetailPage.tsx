import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { getActiveCards, batchSoftDeleteCards, softDeleteCard } from '../lib/trashManager';
import { generateId } from '../lib/utils';
import type { Deck, Card } from '../types';
import { Button } from '../components/ui/Button';
import { Card as UICard, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { RichTextEditor } from '../components/RichTextEditor';
import { ArrowLeft, Plus, Trash2, Edit, Search, ChevronDown, ChevronUp } from 'lucide-react';

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // 新卡片表单
  const [showAddCard, setShowAddCard] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  // 编辑卡片
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // 搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);

  // 卡片展开状态
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // 批量操作
  const [batchMode, setBatchMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (deckId && deckId !== 'new') {
      loadDeck();
    } else {
      setLoading(false);
    }
  }, [deckId]);

  // 搜索过滤
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCards(cards);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cards.filter(
        card =>
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query)
      );
      setFilteredCards(filtered);
    }
  }, [searchQuery, cards]);

  async function loadDeck() {
    try {
      const deckData = await db.decks.get(deckId!);
      const cardsData = await getActiveCards(deckId!);

      setDeck(deckData || null);
      setCards(cardsData);
    } catch (error) {
      console.error('Failed to load deck:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDeck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const newDeck: Deck = {
      id: generateId(),
      name,
      description,
      cardsCount: 0,
      newCardsPerDay: 20,
      reviewsPerDay: 200,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.decks.add(newDeck);
    navigate(`/deck/${newDeck.id}`);
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();

    if (!front.trim() || !back.trim() || !deck) return;

    const newCard: Card = {
      id: generateId(),
      deckId: deck.id,
      front: front.trim(),
      back: back.trim(),
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: [],
      deleted: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.cards.add(newCard);
    await db.decks.update(deck.id, {
      cardsCount: deck.cardsCount + 1,
      updatedAt: Date.now()
    });

    setCards([...cards, newCard]);
    setDeck({ ...deck, cardsCount: deck.cardsCount + 1 });
    setFront('');
    setBack('');
    setSource('');
    setNotes('');
    setShowAddCard(false);
  }

  async function handleDeleteCard(cardId: string) {
    if (!confirm('确定要删除这张卡片吗？删除后可以到垃圾箱恢复。')) return;

    try {
      // 使用软删除
      await softDeleteCard(cardId);

      if (deck) {
        // 重新计算实际的活动卡片数量
        const actualCardsCount = await getActiveCards(deck.id).then(cards => cards.length);

        // 更新卡组卡片数量为实际数量
        await db.decks.update(deck.id, {
          cardsCount: actualCardsCount,
          updatedAt: Date.now()
        });

        // 更新本地状态
        setDeck({ ...deck, cardsCount: actualCardsCount });
      }

      // 更新卡片列表
      setCards(cards.filter((c) => c.id !== cardId));
    } catch (error) {
      console.error('Delete card failed:', error);
      alert('删除卡片失败，请重试');
    }
  }

  function handleEditCard(card: Card) {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditSource(card.source || '');
    setEditNotes(card.notes || '');
    setShowAddCard(false);
  }

  async function handleUpdateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard || !editFront.trim() || !editBack.trim()) return;

    const updatedCard: Card = {
      ...editingCard,
      front: editFront.trim(),
      back: editBack.trim(),
      source: editSource.trim() || undefined,
      notes: editNotes.trim() || undefined,
      updatedAt: Date.now()
    };

    await db.cards.put(updatedCard);

    setCards(cards.map(c => c.id === editingCard.id ? updatedCard : c));
    setEditingCard(null);
    setEditFront('');
    setEditBack('');
    setEditSource('');
    setEditNotes('');
  }

  function cancelEdit() {
    setEditingCard(null);
    setEditFront('');
    setEditBack('');
    setEditSource('');
    setEditNotes('');
  }

  function toggleCardExpanded(cardId: string) {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }

  // 批量操作函数
  function toggleBatchMode() {
    setBatchMode(!batchMode);
    setSelectedCards(new Set());
  }

  function toggleCardSelection(cardId: string) {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }

  function selectAllCards() {
    setSelectedCards(new Set(filteredCards.map(c => c.id)));
  }

  function deselectAllCards() {
    setSelectedCards(new Set());
  }

  async function batchDeleteCards() {
    if (selectedCards.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedCards.size} 张卡片吗？删除后可以到垃圾箱恢复。`)) return;

    try {
      // 使用软删除
      await batchSoftDeleteCards(Array.from(selectedCards));

      if (deck) {
        // 重新计算实际的活动卡片数量
        const actualCardsCount = await getActiveCards(deck.id).then(cards => cards.length);

        // 更新卡组卡片数量为实际数量
        await db.decks.update(deck.id, {
          cardsCount: actualCardsCount,
          updatedAt: Date.now()
        });

        // 更新本地状态
        setDeck({ ...deck, cardsCount: actualCardsCount });
      }

      // 更新卡片列表
      setCards(cards.filter((c) => !selectedCards.has(c.id)));
      setSelectedCards(new Set());
      setBatchMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('批量删除失败，请重试');
    }
  }

  async function batchMoveCards() {
    if (selectedCards.size === 0) return;

    // 获取所有卡组
    const allDecks = await db.decks.toArray();
    const otherDecks = allDecks.filter(d => d.id !== deckId);

    if (otherDecks.length === 0) {
      alert('没有其他卡组可以移动到');
      return;
    }

    // 显示选择目标卡组的对话框
    const deckNames = otherDecks.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
    const choice = prompt(`选择目标卡组（输入序号）：\n\n${deckNames}`);

    if (!choice) return;

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= otherDecks.length) {
      alert('无效的选择');
      return;
    }

    const targetDeck = otherDecks[index];

    try {
      // 移动所有选中的卡片
      for (const cardId of selectedCards) {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          await db.cards.update(cardId, {
            deckId: targetDeck.id,
            updatedAt: Date.now()
          });
        }
      }

      // 更新源卡组计数 - 重新计算实际数量（只计算活动卡片）
      if (deck) {
        const sourceActualCount = await getActiveCards(deck.id).then(cards => cards.length);
        await db.decks.update(deck.id, {
          cardsCount: sourceActualCount,
          updatedAt: Date.now()
        });
        setDeck({ ...deck, cardsCount: sourceActualCount });
      }

      // 更新目标卡组计数 - 重新计算实际数量（只计算活动卡片）
      const targetActualCount = await getActiveCards(targetDeck.id).then(cards => cards.length);
      await db.decks.update(targetDeck.id, {
        cardsCount: targetActualCount,
        updatedAt: Date.now()
      });

      setCards(cards.filter((c) => !selectedCards.has(c.id)));
      setSelectedCards(new Set());
      setBatchMode(false);

      alert(`成功移动 ${selectedCards.size} 张卡片到 "${targetDeck.name}"`);
    } catch (error) {
      console.error('Batch move failed:', error);
      alert('批量移动失败，请重试');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  // 新建卡组
  if (deckId === 'new') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <UICard className="shadow-xl border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">📚 创建新卡组</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                创建一个新的卡组来组织你的学习内容
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDeck} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    卡组名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="例如：英语单词、历史知识、编程概念"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="简单描述这个卡组的用途和内容"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" size="lg" className="flex-1">
                    创建卡组
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/')}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </UICard>
        </main>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">卡组不存在</div>
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
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{deck.name}</h1>
              {deck.description && (
                <p className="text-sm text-gray-500">{deck.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!batchMode ? (
                <>
                  <Button
                    onClick={toggleBatchMode}
                    variant="outline"
                    className="text-sm"
                  >
                    批量操作
                  </Button>
                  <Button
                    onClick={() => setShowAddCard(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    添加卡片
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={deselectAllCards}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={selectedCards.size === 0}
                  >
                    取消选择
                  </Button>
                  <Button
                    onClick={selectAllCards}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    全选
                  </Button>
                  <Button
                    onClick={batchMoveCards}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={selectedCards.size === 0}
                  >
                    移动 ({selectedCards.size})
                  </Button>
                  <Button
                    onClick={batchDeleteCards}
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 hover:bg-red-50"
                    disabled={selectedCards.size === 0}
                  >
                    删除 ({selectedCards.size})
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
        {showAddCard && (
          <UICard className="mb-6 border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">添加新卡片</h3>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    问题
                  </label>
                  <RichTextEditor
                    content={front}
                    onChange={setFront}
                    placeholder="输入问题"
                    minHeight="150px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    答案
                  </label>
                  <RichTextEditor
                    content={back}
                    onChange={setBack}
                    placeholder="输入答案"
                    minHeight="150px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    来源（选填）
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="例如：教材第3章、某书籍、某网站"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注（选填）
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="添加额外的笔记或说明"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-sm">
                    添加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddCard(false);
                      setFront('');
                      setBack('');
                      setSource('');
                      setNotes('');
                    }}
                    className="text-sm"
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </UICard>
        )}

        {editingCard && (
          <UICard className="mb-6 border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">编辑卡片</h3>
              <form onSubmit={handleUpdateCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    问题
                  </label>
                  <RichTextEditor
                    content={editFront}
                    onChange={setEditFront}
                    minHeight="150px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    答案
                  </label>
                  <RichTextEditor
                    content={editBack}
                    onChange={setEditBack}
                    minHeight="150px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    来源（选填）
                  </label>
                  <input
                    type="text"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="例如：教材第3章、某书籍、某网站"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注（选填）
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="添加额外的笔记或说明"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-sm">
                    保存
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="text-sm"
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </UICard>
        )}

        {cards.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl border border-gray-100 p-12 max-w-md mx-auto">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                还没有卡片
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                添加第一张卡片开始学习
              </p>
              <Button
                onClick={() => setShowAddCard(true)}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加卡片
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 搜索栏 */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索卡片..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border-0 focus:outline-none focus:ring-0 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 卡片数量统计 */}
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
              {searchQuery ? (
                <span>
                  找到 <span className="font-medium text-gray-900">{filteredCards.length}</span> 张卡片
                  <span className="text-gray-400 ml-1">(共 {cards.length} 张)</span>
                </span>
              ) : (
                <span>
                  共 <span className="font-medium text-gray-900">{cards.length}</span> 张卡片
                </span>
              )}
            </div>

            {/* 卡片列表 */}
            {filteredCards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
                <p className="text-gray-500 text-sm">没有找到匹配的卡片</p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-sm"
                >
                  清除搜索
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCards.map((card) => {
                  const isExpanded = expandedCards.has(card.id);
                  const cardNumber = cards.findIndex(c => c.id === card.id) + 1;

                  return (
                    <UICard
                      key={card.id}
                      className="border border-gray-100 hover:border-gray-200 transition-colors bg-white group"
                    >
                      <CardContent className="p-0">
                        {/* 卡片头部 */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => !batchMode && toggleCardExpanded(card.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* 批量模式复选框 */}
                            {batchMode && (
                              <div className="flex-shrink-0 pt-1">
                                <input
                                  type="checkbox"
                                  checked={selectedCards.has(card.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleCardSelection(card.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-400 font-medium">
                                  #{cardNumber}
                                </span>
                                {!isExpanded && !batchMode && (
                                  <span className="text-xs text-gray-400">
                                    点击展开
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm text-gray-900 leading-relaxed card-content ${
                                isExpanded ? '' : 'line-clamp-2'
                              }`} dangerouslySetInnerHTML={{ __html: card.front }}>
                              </p>
                            </div>

                            {/* 操作按钮 */}
                            {!batchMode && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCard(card);
                                  }}
                                  className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                  }}
                                  className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 text-gray-400"
                                  title={isExpanded ? "收起" : "展开"}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 展开的答案 */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-50">
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">答案</span>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap card-content" dangerouslySetInnerHTML={{ __html: card.back }}>
                            </div>

                            {/* 来源和备注 */}
                            {(card.source || card.notes) && (
                              <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                                {card.source && (
                                  <div>
                                    <span className="text-xs text-gray-500">来源：</span>
                                    <span className="text-xs text-gray-700">{card.source}</span>
                                  </div>
                                )}
                                {card.notes && (
                                  <div>
                                    <span className="text-xs text-gray-500">备注：</span>
                                    <span className="text-xs text-gray-700">{card.notes}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 元数据 */}
                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3 text-xs text-gray-400">
                              <span>{new Date(card.createdAt).toLocaleDateString('zh-CN')}</span>
                              {card.updatedAt !== card.createdAt && (
                                <span>• 已编辑</span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </UICard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
