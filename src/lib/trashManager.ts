import { db, ensureCardDeletedField } from './db';
import type { Card, TrashItem } from '../types';

// 软删除卡片
export async function softDeleteCard(cardId: string): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) return;

  const deletedAt = Date.now();

  // 1. 将卡片标记为已删除
  await db.cards.update(cardId, {
    deleted: 'deleted',
    deletedAt,
    updatedAt: deletedAt
  });

  // 2. 获取卡组信息
  const deck = await db.decks.get(card.deckId);

  // 3. 添加到垃圾箱
  const trashItem: TrashItem = {
    id: `card-${cardId}-${deletedAt}`,
    type: 'card',
    name: card.front.length > 50 ? card.front.substring(0, 50) + '...' : card.front,
    description: card.back,
    deckName: deck?.name || '未知卡组',
    deletedAt,
    data: {
      originalCard: card,
      deckId: card.deckId
    }
  };

  await db.trashItems.add(trashItem);

  // 4. 更新卡组计数
  if (deck) {
    const activeCardsCount = await db.cards
      .where('deckId')
      .equals(deck.id)
      .and(card => card.deleted !== 'deleted')
      .count();

    await db.decks.update(deck.id, {
      cardsCount: activeCardsCount,
      updatedAt: deletedAt
    });
  }
}

// 恢复卡片
export async function restoreCard(trashItem: TrashItem): Promise<void> {
  const { originalCard, deckId } = trashItem.data;

  // 1. 恢复卡片
  await db.cards.update(originalCard.id, {
    deleted: 'active',
    deletedAt: undefined,
    updatedAt: Date.now()
  });

  // 2. 从垃圾箱移除
  await db.trashItems.delete(trashItem.id);

  // 3. 更新卡组计数
  const deck = await db.decks.get(deckId);
  if (deck) {
    const activeCardsCount = await db.cards
      .where('deckId')
      .equals(deck.id)
      .and(card => card.deleted !== 'deleted')
      .count();

    await db.decks.update(deck.id, {
      cardsCount: activeCardsCount,
      updatedAt: Date.now()
    });
  }
}

// 永久删除卡片
export async function permanentDeleteCard(trashItem: TrashItem): Promise<void> {
  const { originalCard } = trashItem.data;

  // 1. 真正删除卡片和复习记录
  await db.cards.delete(originalCard.id);
  await db.cardReviews.delete(originalCard.id);

  // 2. 从垃圾箱移除
  await db.trashItems.delete(trashItem.id);

  // 3. 卡组计数已经通过其他方式维护，这里不需要处理
}

// 批量软删除卡片
export async function batchSoftDeleteCards(cardIds: string[]): Promise<void> {
  const deletedAt = Date.now();
  const trashItems: TrashItem[] = [];

  for (const cardId of cardIds) {
    const card = await db.cards.get(cardId);
    if (!card) continue;

    // 标记为已删除
    await db.cards.update(cardId, {
      deleted: 'deleted',
      deletedAt,
      updatedAt: deletedAt
    });

    // 准备垃圾箱项目
    const deck = await db.decks.get(card.deckId);
    const trashItem: TrashItem = {
      id: `card-${cardId}-${deletedAt}`,
      type: 'card',
      name: card.front.length > 50 ? card.front.substring(0, 50) + '...' : card.front,
      description: card.back,
      deckName: deck?.name || '未知卡组',
      deletedAt,
      data: {
        originalCard: card,
        deckId: card.deckId
      }
    };

    trashItems.push(trashItem);
  }

  // 批量添加到垃圾箱
  if (trashItems.length > 0) {
    await db.trashItems.bulkAdd(trashItems);
  }

  // 更新所有相关卡组的计数
  const deckIdsToUpdate = new Set(cardIds.map(id => trashItems.find(item => item.data.originalCard.id === id)?.data.deckId).filter(Boolean));

  for (const updateDeckId of deckIdsToUpdate) {
    const deck = await db.decks.get(updateDeckId);
    if (deck) {
      const activeCardsCount = await db.cards
        .where('deckId')
        .equals(deck.id)
        .and(card => card.deleted !== 'deleted')
        .count();

      await db.decks.update(deck.id, {
        cardsCount: activeCardsCount,
        updatedAt: deletedAt
      });
    }
  }
}

// 获取所有垃圾箱项目
export async function getTrashItems(): Promise<TrashItem[]> {
  return await db.trashItems.orderBy('deletedAt').reverse().toArray();
}

// 清空垃圾箱（永久删除所有项目）
export async function emptyTrash(): Promise<number> {
  const trashItems = await db.trashItems.toArray();
  let deletedCount = 0;

  for (const item of trashItems) {
    if (item.type === 'card') {
      await permanentDeleteCard(item);
      deletedCount++;
    }
    // 可以添加对其他类型项目的处理
  }

  return deletedCount;
}

// 获取卡片时过滤掉已删除的
export async function getActiveCards(deckId?: string): Promise<Card[]> {
  if (deckId) {
    return await db.cards
      .where('deckId')
      .equals(deckId)
      .and(card => card.deleted !== 'deleted')
      .toArray();
  }
  return await db.cards
    .where('deleted')
    .notEqual('deleted')
    .toArray();
}

// 确保数据库字段兼容
export async function ensureSoftDeleteCompatibility(): Promise<void> {
  // 确保现有卡片都有 deleted 字段
  await ensureCardDeletedField();
}