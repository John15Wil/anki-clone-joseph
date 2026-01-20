import { db } from '../lib/db';
import { getActiveCards } from './trashManager';

// 修复卡组卡片计数的函数
export async function fixDeckCardCounts() {
  try {
    const decks = await db.decks.toArray();
    console.log('Fixing card counts for', decks.length, 'decks');

    for (const deck of decks) {
      // 获取实际的活动卡片数量（排除已删除的）
      const actualCardCount = await getActiveCards(deck.id).then(cards => cards.length);

      // 如果计数不匹配，更新卡组
      if (actualCardCount !== deck.cardsCount) {
        console.log(`Deck "${deck.name}": ${deck.cardsCount} -> ${actualCardCount}`);
        await db.decks.update(deck.id, {
          cardsCount: actualCardCount,
          updatedAt: Date.now()
        });
      }
    }

    console.log('Card counts fixed successfully');
    return true;
  } catch (error) {
    console.error('Failed to fix card counts:', error);
    return false;
  }
}

// 清理孤立的复习记录（没有对应活动卡片的记录）
export async function cleanupOrphanedReviews() {
  try {
    const allCards = await getActiveCards();
    const cardIds = new Set(allCards.map(c => c.id));

    const allReviews = await db.cardReviews.toArray();
    const orphanedReviews = allReviews.filter(r => !cardIds.has(r.cardId));

    if (orphanedReviews.length > 0) {
      console.log(`Cleaning up ${orphanedReviews.length} orphaned reviews`);
      for (const review of orphanedReviews) {
        await db.cardReviews.delete(review.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to cleanup orphaned reviews:', error);
    return false;
  }
}

// 清理孤立的学习记录
export async function cleanupOrphanedStudyLogs() {
  try {
    const allCards = await getActiveCards();
    const cardIds = new Set(allCards.map(c => c.id));

    const allLogs = await db.studyLogs.toArray();
    const orphanedLogs = allLogs.filter(log => !cardIds.has(log.cardId));

    if (orphanedLogs.length > 0) {
      console.log(`Cleaning up ${orphanedLogs.length} orphaned study logs`);
      for (const log of orphanedLogs) {
        await db.studyLogs.delete(log.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to cleanup orphaned study logs:', error);
    return false;
  }
}

// 运行所有清理操作
export async function runDatabaseMaintenance() {
  const results = {
    cardCounts: await fixDeckCardCounts(),
    orphanedReviews: await cleanupOrphanedReviews(),
    orphanedLogs: await cleanupOrphanedStudyLogs()
  };

  console.log('Database maintenance completed:', results);
  return results;
}