import { create } from 'zustand';
import type { Deck, Card } from '../types';

interface AppStore {
  currentDeck: Deck | null;
  setCurrentDeck: (deck: Deck | null) => void;

  isStudying: boolean;
  setIsStudying: (studying: boolean) => void;

  studyQueue: Card[];
  setStudyQueue: (queue: Card[]) => void;

  currentCardIndex: number;
  setCurrentCardIndex: (index: number) => void;

  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;

  // 辅助方法
  nextCard: () => void;
  resetStudy: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentDeck: null,
  setCurrentDeck: (deck) => set({ currentDeck: deck }),

  isStudying: false,
  setIsStudying: (studying) => set({ isStudying: studying }),

  studyQueue: [],
  setStudyQueue: (queue) => set({ studyQueue: queue }),

  currentCardIndex: 0,
  setCurrentCardIndex: (index) => set({ currentCardIndex: index }),

  showAnswer: false,
  setShowAnswer: (show) => set({ showAnswer: show }),

  nextCard: () => {
    const { currentCardIndex, studyQueue } = get();
    if (currentCardIndex < studyQueue.length - 1) {
      set({
        currentCardIndex: currentCardIndex + 1,
        showAnswer: false
      });
    } else {
      // 学习完成
      set({
        isStudying: false,
        currentCardIndex: 0,
        showAnswer: false,
        studyQueue: []
      });
    }
  },

  resetStudy: () => {
    set({
      isStudying: false,
      currentCardIndex: 0,
      showAnswer: false,
      studyQueue: []
    });
  }
}));
