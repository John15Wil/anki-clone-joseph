// 卡片状态
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

// 卡片难度评级
export type Rating = 1 | 2 | 3 | 4; // Again/Hard/Good/Easy

// 删除状态
export type DeletedStatus = 'active' | 'deleted' | 'permanent_deleted';

// 卡片数据
export interface Card {
  id: string;
  deckId: string;
  front: string;         // 支持 HTML (Rich text)
  back: string;          // 支持 HTML (Rich text)
  tags: string[];
  source?: string;       // 数据来源
  notes?: string;        // 备注
  media?: {
    images?: string[];
    audio?: string[];
  };
  deleted: DeletedStatus; // 删除状态
  deletedAt?: number;     // 删除时间
  createdAt: number;
  updatedAt: number;
}

// SRS 复习数据
export interface CardReview {
  id: string;
  cardId: string;
  ease: number;          // 难度因子 (默认 2.5)
  interval: number;      // 当前间隔(天)
  repetitions: number;   // 连续正确次数
  nextReview: number;    // 下次复习时间(timestamp)
  lastReview: number;    // 上次复习时间
  state: CardState;
}

// 卡组
export interface Deck {
  id: string;
  name: string;
  description: string;
  cardsCount: number;
  newCardsPerDay: number;
  reviewsPerDay: number;
  createdAt: number;
  updatedAt: number;
}

// 学习记录
export interface StudyLog {
  id: string;
  cardId: string;
  rating: Rating;
  timeSpent: number;     // 秒
  timestamp: number;
}

// 统计数据
export interface StudyStats {
  date: string;          // YYYY-MM-DD
  newCards: number;
  reviewedCards: number;
  correctCount: number;
  totalTime: number;     // 秒
}

// 垃圾箱项目
export interface TrashItem {
  id: string;
  type: 'card' | 'deck';
  name: string;
  description?: string;
  deckName?: string;     // 卡片所属的卡组名
  deletedAt: number;
  data: any;            // 原始数据
}
