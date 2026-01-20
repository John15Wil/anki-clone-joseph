import type { Rating, CardReview, CardState } from '../types';

// SM-2 算法参数
const LEARNING_STEPS = [1, 10, 30]; // 学习阶段的步骤（分钟）
const GRADUATING_INTERVAL = 2;      // 毕业间隔（天）
const EASY_INTERVAL = 5;            // 简单间隔（天）
const HARD_RELEARN_STEP = 10;       // 困难时重新学习的步骤（分钟）
const STARTING_EASE = 2.5;          // 初始难度因子
const MINIMUM_EASE = 1.3;           // 最小难度因子

export interface ReviewResult {
  ease: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  state: CardState;
}

/**
 * SM-2 算法核心实现
 * @param review 当前卡片的复习数据
 * @param rating 用户评级 (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @returns 更新后的复习数据
 */
export function calculateNextReview(
  review: CardReview,
  rating: Rating
): ReviewResult {
  const now = Date.now();
  let { ease, state } = review;

  // 评级为 Again (1) 时，重置学习进度
  if (rating === 1) {
    return {
      ease,
      interval: 1 / (24 * 60), // 1 分钟转换为天数（1 / 1440）
      repetitions: 0,
      nextReview: now + 60 * 1000,
      state: state === 'new' ? 'learning' : 'relearning'
    };
  }

  // 根据当前状态处理
  switch (state) {
    case 'new':
    case 'learning':
    case 'relearning':
      return handleLearningState(review, rating, now);

    case 'review':
      return handleReviewState(review, rating, now);

    default:
      return handleLearningState(review, rating, now);
  }
}

/**
 * 处理学习阶段（新卡片或重新学习）
 */
function handleLearningState(
  review: CardReview,
  rating: Rating,
  now: number
): ReviewResult {
  let { ease, repetitions } = review;

  // Easy (4) - 直接毕业到复习阶段
  if (rating === 4) {
    return {
      ease,
      interval: EASY_INTERVAL, // 天数
      repetitions: 0,
      nextReview: now + EASY_INTERVAL * 24 * 60 * 60 * 1000,
      state: 'review'
    };
  }

  // Good (3) - 正常学习进度
  if (rating === 3) {
    const currentStep = repetitions; // 直接用repetitions作为步骤索引

    // 完成所有学习步骤，毕业到复习阶段
    if (currentStep >= LEARNING_STEPS.length - 1) {
      return {
        ease,
        interval: GRADUATING_INTERVAL, // 天数
        repetitions: 0,
        nextReview: now + GRADUATING_INTERVAL * 24 * 60 * 60 * 1000,
        state: 'review'
      };
    }

    // 进入下一个学习步骤
    const nextStepMinutes = LEARNING_STEPS[currentStep + 1];
    return {
      ease,
      interval: nextStepMinutes / (24 * 60), // 转换为天数（分钟 / 1440）
      repetitions: currentStep + 1,
      nextReview: now + nextStepMinutes * 60 * 1000,
      state: review.state === 'new' ? 'learning' : 'relearning'
    };
  }

  // Hard (2) - 重复当前步骤
  const currentStepMinutes = LEARNING_STEPS[Math.min(repetitions, LEARNING_STEPS.length - 1)];
  return {
    ease,
    interval: currentStepMinutes / (24 * 60), // 转换为天数（分钟 / 1440）
    repetitions,
    nextReview: now + currentStepMinutes * 60 * 1000,
    state: review.state === 'new' ? 'learning' : 'relearning'
  };
}

/**
 * 处理复习阶段
 */
function handleReviewState(
  review: CardReview,
  rating: Rating,
  now: number
): ReviewResult {
  let { ease, interval, repetitions } = review;

  // Hard (2) - 重回学习阶段，短时间内再次复习
  if (rating === 2) {
    return {
      ease: Math.max(MINIMUM_EASE, ease - 0.15),
      interval: HARD_RELEARN_STEP / (24 * 60), // 10分钟转换为天数
      repetitions: 0,
      nextReview: now + HARD_RELEARN_STEP * 60 * 1000, // 10分钟后
      state: 'relearning' // 进入重新学习状态
    };
  }

  // 根据评级调整难度因子
  let newEase = ease;
  if (rating === 3) {
    // Good - 保持不变
    newEase = ease;
  } else if (rating === 4) {
    // Easy - 增加难度因子
    newEase = ease + 0.15;
  }

  // 计算新的间隔
  let newInterval: number;
  if (rating === 3) {
    // Good - 间隔 × ease
    newInterval = Math.round(interval * newEase);
  } else if (rating === 4) {
    // Easy - 间隔 × ease × 1.3
    newInterval = Math.round(interval * newEase * 1.3);
  } else {
    newInterval = 1;
  }

  // 确保最小间隔为1天
  if (newInterval < 1) {
    newInterval = 1;
  }

  return {
    ease: newEase,
    interval: newInterval,
    repetitions: repetitions + 1,
    nextReview: now + newInterval * 24 * 60 * 60 * 1000,
    state: 'review'
  };
}

/**
 * 创建新卡片的初始复习数据
 */
export function createInitialReview(cardId: string): CardReview {
  return {
    id: cardId,
    cardId,
    ease: STARTING_EASE,
    interval: 0,
    repetitions: 0,
    nextReview: Date.now(),
    lastReview: Date.now(),
    state: 'new'
  };
}

/**
 * 获取到期的卡片
 */
export function isDue(review: CardReview): boolean {
  return review.nextReview <= Date.now();
}

/**
 * 格式化间隔时间显示
 * @param interval 间隔时间（天）
 */
export function formatInterval(interval: number): string {
  // 小于1天，转换为分钟或小时显示
  if (interval < 1) {
    const minutes = Math.round(interval * 24 * 60);
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else {
      const hours = Math.round(minutes / 60);
      return `${hours}小时`;
    }
  } else if (interval < 30) {
    return `${Math.round(interval)}天`;
  } else if (interval < 365) {
    return `${Math.round(interval / 30)}个月`;
  } else {
    return `${Math.round(interval / 365)}年`;
  }
}
