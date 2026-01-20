import { supabase } from './supabase';
import { db } from './db';
import type { CardReview } from '../types';

export interface SyncStatus {
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

class CloudSyncService {
  private syncInProgress = false;
  private lastSyncTime: number | null = null;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 每5分钟自动同步一次
    this.syncInterval = setInterval(() => this.autoSync(), 5 * 60 * 1000);
  }

  // 清理资源
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncListeners = [];
  }

  // 监听同步状态
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(callback => callback(status));
  }

  private getStatus(syncing: boolean, error: string | null = null): SyncStatus {
    return {
      syncing,
      lastSync: this.lastSyncTime,
      error
    };
  }

  // 自动同步
  private async autoSync() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !this.syncInProgress) {
      await this.syncAll();
    }
  }

  // 同步所有数据
  async syncAll(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not logged in, skipping sync');
      return;
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners(this.getStatus(true));

    try {
      console.log('Starting full sync...');

      // 1. 同步卡组
      await this.syncDecks(user.id);

      // 2. 同步卡片
      await this.syncCards(user.id);

      // 3. 同步复习记录
      await this.syncCardReviews(user.id);

      // 4. 同步学习记录
      await this.syncStudyLogs(user.id);

      this.lastSyncTime = Date.now();
      this.notifyListeners(this.getStatus(false));
      console.log('Sync completed successfully');

    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners(this.getStatus(false, error instanceof Error ? error.message : 'Sync failed'));
    } finally {
      this.syncInProgress = false;
    }
  }

  // 同步卡组
  private async syncDecks(userId: string): Promise<void> {
    // 获取本地卡组
    const localDecks = await db.decks.toArray();

    // 获取云端卡组
    const { data: cloudDecks, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) throw error;
    if (!cloudDecks) return;

    // 上传本地新增的卡组到云端
    for (const localDeck of localDecks) {
      const cloudDeck = cloudDecks.find(d => d.id === localDeck.id);

      if (!cloudDeck) {
        // 本地有，云端没有 -> 上传（不指定 id，让 Supabase 生成 UUID）
        const { data: newDeck, error: insertError } = await supabase.from('decks').insert({
          user_id: userId,
          name: localDeck.name,
          description: localDeck.description,
          cards_count: localDeck.cardsCount,
          created_at: localDeck.createdAt,
          updated_at: localDeck.updatedAt
        }).select().single();

        if (insertError) {
          console.error('Failed to upload deck:', insertError);
          continue;
        }

        console.log('Uploaded deck:', localDeck.name);

        // 更新本地的 ID 为云端生成的 ID
        if (newDeck && newDeck.id !== localDeck.id) {
          // 更新所有属于这个卡组的卡片的 deckId
          await db.cards.where('deckId').equals(localDeck.id).modify(card => {
            card.deckId = newDeck.id;
            card.updatedAt = Date.now();
          });

          // 更新本地卡组的 ID
          await db.decks.delete(localDeck.id);
          await db.decks.add({
            ...localDeck,
            id: newDeck.id,
            updatedAt: Date.now()
          });
        }
      } else if (cloudDeck && localDeck.updatedAt > cloudDeck.updated_at) {
        // 本地更新 -> 更新云端
        await supabase
          .from('decks')
          .update({
            name: localDeck.name,
            description: localDeck.description,
            cards_count: localDeck.cardsCount,
            updated_at: localDeck.updatedAt
          })
          .eq('id', cloudDeck.id);
        console.log('Updated cloud deck:', localDeck.name);
      } else if (cloudDeck && cloudDeck.updated_at > localDeck.updatedAt) {
        // 云端更新 -> 更新本地
        await db.decks.update(localDeck.id, {
          name: cloudDeck.name,
          description: cloudDeck.description,
          cardsCount: cloudDeck.cards_count,
          updatedAt: cloudDeck.updated_at
        });
        console.log('Updated local deck:', cloudDeck.name);
      }
    }

    // 下载云端新增的卡组到本地
    for (const cloudDeck of cloudDecks) {
      const localDeck = localDecks.find(d => d.id === cloudDeck.id);
      if (!localDeck) {
        await db.decks.add({
          id: cloudDeck.id, // 使用云端 UUID
          name: cloudDeck.name,
          description: cloudDeck.description,
          cardsCount: cloudDeck.cards_count,
          newCardsPerDay: 20,
          reviewsPerDay: 100,
          createdAt: cloudDeck.created_at,
          updatedAt: cloudDeck.updated_at
        });
        console.log('Downloaded deck:', cloudDeck.name);
      }
    }
  }

  // 同步卡片
  private async syncCards(userId: string): Promise<void> {
    const localCards = await db.cards.toArray();

    const { data: cloudCards, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) throw error;
    if (!cloudCards) return;

    // 获取云端卡组映射，确保卡组存在
    const { data: cloudDecks } = await supabase
      .from('decks')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    // 上传本地新增的卡片
    for (const localCard of localCards) {
      const cloudCard = cloudCards.find(c => c.id === localCard.id);
      const correspondingCloudDeck = cloudDecks?.find(d => d.id === localCard.deckId);

      if (!cloudCard && correspondingCloudDeck) {
        await supabase.from('cards').insert({
          id: localCard.id, // 使用本地 ID，因为现在本地也使用 UUID
          user_id: userId,
          deck_id: localCard.deckId, // 使用已存在的云端卡组 ID
          front: localCard.front,
          back: localCard.back,
          created_at: localCard.createdAt,
          updated_at: localCard.updatedAt
        });
        console.log('Uploaded card');
      } else if (cloudCard && localCard.updatedAt > cloudCard.updated_at) {
        await supabase
          .from('cards')
          .update({
            deck_id: localCard.deckId,
            front: localCard.front,
            back: localCard.back,
            updated_at: localCard.updatedAt
          })
          .eq('id', cloudCard.id);
        console.log('Updated cloud card');
      } else if (cloudCard && cloudCard.updated_at > localCard.updatedAt) {
        await db.cards.update(localCard.id, {
          deckId: cloudCard.deck_id,
          front: cloudCard.front,
          back: cloudCard.back,
          updatedAt: cloudCard.updated_at
        });
        console.log('Updated local card');
      }
    }

    // 下载云端新增的卡片到本地（忽略已删除的卡片）
    // const localCardIds = new Set(localCards.map(c => c.id));
    for (const cloudCard of cloudCards) {
      const localCard = localCards.find(c => c.id === cloudCard.id);
      if (!localCard) {
        await db.cards.add({
          id: cloudCard.id,
          deckId: cloudCard.deck_id,
          front: cloudCard.front,
          back: cloudCard.back,
          tags: [],
          deleted: 'active' as const,
          createdAt: cloudCard.created_at,
          updatedAt: cloudCard.updated_at
        });
        console.log('Downloaded card');
      }
    }
  }

  // 同步复习记录
  private async syncCardReviews(userId: string): Promise<void> {
    const localReviews = await db.cardReviews.toArray();

    // 如果本地没有复习记录，直接尝试下载
    if (localReviews.length === 0) {
      console.log('No local review data to sync, downloading from cloud...');
      await this.downloadCardReviews(userId, localReviews);
      return;
    }

    const localCards = await db.cards.toArray();
    const localCardIds = new Set(localCards.map(c => c.id));

    // 获取云端卡片映射，确认哪些卡片在云端存在
    const { data: cloudCards, error: cardsError } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (cardsError) {
      console.error('Failed to fetch cloud cards:', cardsError);
      return;
    }

    const cloudCardIds = new Set(cloudCards?.map(c => c.id) || []);

    const { data: cloudReviews, error } = await supabase
      .from('card_reviews')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch cloud reviews:', error);
      return;
    }

    if (!cloudReviews || cloudReviews.length === 0) {
      console.log('No cloud review data found');
      return;
    }

    // 只同步存在的卡片且有云端对应卡片的复习记录
    const validReviews = localReviews.filter(r =>
      localCardIds.has(r.cardId) && cloudCardIds.has(r.cardId)
    );

    // 上传本地新增的复习记录
    for (const localReview of validReviews) {
      const cloudReview = cloudReviews.find(r => r.card_id === localReview.cardId);

      if (!cloudReview) {
        try {
          await supabase.from('card_reviews').insert({
            // 不指定 id，让数据库自动生成 UUID
            user_id: userId,
            card_id: localReview.cardId, // 使用已存在的云端卡片 ID
            ease_factor: localReview.ease,
            interval: localReview.interval,
            repetitions: localReview.repetitions,
            next_review: localReview.nextReview,
            last_review: localReview.lastReview,
            created_at: localReview.lastReview || Date.now(), // 使用复习时间作为创建时间
            updated_at: Date.now()
          });
          console.log('Uploaded review for card:', localReview.cardId);
        } catch (err) {
          console.error('Failed to upload review for card:', localReview.cardId, err);
          // 不抛出错误，继续处理其他记录
        }
      } else if ((!localReview.lastReview || !cloudReview.last_review ||
                 localReview.lastReview > cloudReview.last_review)) {
        try {
          await supabase
            .from('card_reviews')
            .update({
              ease_factor: localReview.ease,
              interval: localReview.interval,
              repetitions: localReview.repetitions,
              next_review: localReview.nextReview,
              last_review: localReview.lastReview,
              updated_at: Date.now()
            })
            .eq('card_id', localReview.cardId);
          console.log('Updated cloud review for card:', localReview.cardId);
        } catch (err) {
          console.error('Failed to update review for card:', localReview.cardId, err);
        }
      } else if (cloudReview.last_review > (localReview.lastReview || 0)) {
        try {
          await db.cardReviews.update(localReview.cardId, {
            ease: cloudReview.ease_factor,
            interval: cloudReview.interval,
            repetitions: cloudReview.repetitions,
            nextReview: cloudReview.next_review,
            lastReview: cloudReview.last_review
          });
          console.log('Updated local review for card:', localReview.cardId);
        } catch (err) {
          console.error('Failed to update local review for card:', localReview.cardId, err);
        }
      }
    }

    // 下载云端新增的复习记录
    await this.downloadCardReviews(userId, validReviews);
  }

  private async downloadCardReviews(userId: string, localReviews: CardReview[] = []): Promise<void> {
    const { data: cloudReviews, error } = await supabase
      .from('card_reviews')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch cloud reviews for download:', error);
      return;
    }

    if (!cloudReviews || cloudReviews.length === 0) {
      console.log('No cloud reviews to download');
      return;
    }

    const localCardIds = new Set(localReviews.map(r => r.cardId));

    for (const cloudReview of cloudReviews) {
      if (!localCardIds.has(cloudReview.card_id)) {
        try {
          await db.cardReviews.add({
            id: cloudReview.id,
            cardId: cloudReview.card_id,
            ease: cloudReview.ease_factor,
            interval: cloudReview.interval,
            repetitions: cloudReview.repetitions,
            nextReview: cloudReview.next_review,
            lastReview: cloudReview.last_review,
            state: 'review'
          });
          console.log('Downloaded review for card:', cloudReview.card_id);
        } catch (err) {
          console.warn('Failed to download review for card:', cloudReview.card_id, err);
          // 不抛出错误，继续处理其他记录
        }
      }
    }
  }

  // 同步学习记录
  private async syncStudyLogs(userId: string): Promise<void> {
    const localLogs = await db.studyLogs.toArray();

    // 先获取所有本地卡片ID
    const localCards = await db.cards.toArray();
    const localCardIds = new Set(localCards.map(c => c.id));

    // 只同步存在对应卡片的学习记录
    const validLogs = localLogs.filter(log => localCardIds.has(log.cardId));

    // 获取云端最新的学习记录时间戳
    const { data: latestCloudLog } = await supabase
      .from('study_logs')
      .select('timestamp')
      .eq('user_id', userId)
      .gt('timestamp', 0)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestCloudTimestamp = latestCloudLog?.timestamp || 0;

    // 只上传云端没有的学习记录
    const logsToUpload = validLogs.filter(log => log.timestamp > latestCloudTimestamp);

    if (logsToUpload.length > 0) {
      for (const log of logsToUpload) {
        try {
          await supabase.from('study_logs').insert({
            user_id: userId,
            card_id: log.cardId,
            rating: log.rating,
            time_spent: log.timeSpent,
            timestamp: log.timestamp
          });
        } catch (err) {
          // 如果因为外键约束失败，跳过这条记录
          console.warn('Failed to upload study log, card may not exist:', log.cardId);
        }
      }
      console.log(`Attempted to upload ${logsToUpload.length} study logs`);
    }

    // 下载本地没有的学习记录
    const localTimestamps = new Set(validLogs.map(log => log.timestamp));

    const { data: cloudLogs, error } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .gt('timestamp', Math.max(...Array.from(localTimestamps), 0));

    if (error) throw error;

    if (cloudLogs && cloudLogs.length > 0) {
      // 下载时使用云端的 UUID，但本地使用自己的 ID 格式
      const logsToDownload = cloudLogs
        .filter(log => !localTimestamps.has(log.timestamp))
        .map(log => ({
          id: `${log.timestamp}-${Math.random().toString(36).substring(2, 11)}`, // 本地生成 ID
          cardId: log.card_id,
          rating: log.rating,
          timeSpent: log.time_spent,
          timestamp: log.timestamp
        }));

      if (logsToDownload.length > 0) {
        for (const log of logsToDownload) {
          try {
            await db.studyLogs.add(log);
          } catch (err) {
            // 如果插入失败（可能是重复），忽略
            console.warn('Failed to download study log, may already exist:', log.cardId);
          }
        }
        console.log(`Attempted to download ${logsToDownload.length} study logs`);
      }
    }
  }

  // 单独同步卡组
  async syncDeck(deckId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deck = await db.decks.get(deckId);
    if (!deck) return;

    // 检查云端是否已存在
    const { data: existingDeck } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single();

    if (existingDeck) {
      // 更新现有卡组
      await supabase
        .from('decks')
        .update({
          name: deck.name,
          description: deck.description,
          cards_count: deck.cardsCount,
          updated_at: deck.updatedAt
        })
        .eq('id', deckId);
    } else {
      // 插入新卡组，让 Supabase 生成 UUID
      await supabase.from('decks').insert({
        user_id: user.id,
        name: deck.name,
        description: deck.description,
        cards_count: deck.cardsCount,
        created_at: deck.createdAt,
        updated_at: deck.updatedAt
      });
    }
  }

  // 单独同步卡片
  async syncCard(cardId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const card = await db.cards.get(cardId);
    if (!card) return;

    // 检查云端是否已存在
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (existingCard) {
      // 更新现有卡片
      await supabase
        .from('cards')
        .update({
          deck_id: card.deckId,
          front: card.front,
          back: card.back,
          updated_at: card.updatedAt
        })
        .eq('id', cardId);
    } else {
      // 插入新卡片，让 Supabase 生成 UUID
      await supabase.from('cards').insert({
        user_id: user.id,
        deck_id: card.deckId,
        front: card.front,
        back: card.back,
        created_at: card.createdAt,
        updated_at: card.updatedAt
      });
    }
  }
}

export const cloudSync = new CloudSyncService();