import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { initDefaultDeck, ensureCardDeletedField } from './lib/db';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { StatsPage } from './pages/StatsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AuthPage } from './pages/AuthPage';
import { TrashPage } from './pages/TrashPage';

function App() {
  useEffect(() => {
    // 初始化数据库
    initDefaultDeck();

    // 确保软删除功能兼容性
    ensureCardDeletedField();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/study/:deckId" element={<StudyPage />} />
          <Route path="/deck/:deckId" element={<DeckDetailPage />} />
          <Route path="/deck/new" element={<DeckDetailPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
