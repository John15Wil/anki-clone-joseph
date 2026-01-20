import Dexie, { type Table } from 'dexie';
import type { Card, CardReview, Deck, StudyLog, StudyStats, TrashItem } from '../types';

export class AnkiDatabase extends Dexie {
  cards!: Table<Card, string>;
  cardReviews!: Table<CardReview, string>;
  decks!: Table<Deck, string>;
  studyLogs!: Table<StudyLog, string>;
  studyStats!: Table<StudyStats, string>;
  trashItems!: Table<TrashItem, string>;

  constructor() {
    super('AnkiCloneDB');

    this.version(2).stores({
      cards: 'id, deckId, createdAt, updatedAt, deleted, deletedAt, *tags',
      cardReviews: 'id, cardId, nextReview, state',
      decks: 'id, createdAt, updatedAt',
      studyLogs: 'id, cardId, timestamp',
      studyStats: 'date'
    });

    this.version(3).stores({
      cards: 'id, deckId, createdAt, updatedAt, deleted, deletedAt, *tags',
      cardReviews: 'id, cardId, nextReview, state',
      decks: 'id, createdAt, updatedAt',
      studyLogs: 'id, cardId, timestamp',
      studyStats: 'date',
      trashItems: 'id, type, deletedAt'
    });
  }
}

// 创建数据库实例
export const db = new AnkiDatabase();

// 初始化默认卡组
export async function initDefaultDeck() {
  const deckCount = await db.decks.count();

  if (deckCount === 0) {
    const defaultDeck: Deck = {
      id: 'default',
      name: '默认卡组',
      description: '开始学习吧！',
      cardsCount: 0,
      newCardsPerDay: 20,
      reviewsPerDay: 200,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.decks.add(defaultDeck);
  }
}

// 确保现有数据的.deleted字段存在
export async function ensureCardDeletedField() {
  const cardsWithoutDeleted = await db.cards.where('deleted').notEqual('active').and(card => !card.deleted).toArray();

  for (const card of cardsWithoutDeleted) {
    await db.cards.update(card.id, {
      deleted: 'active',
      updatedAt: Date.now()
    });
  }
}
