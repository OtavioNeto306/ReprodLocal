import React, { useState } from 'react';
import { Home } from './pages/Home';
import FolderBrowserPage from './pages/FolderBrowserPage';
import './App.css';

type AppPage = 'home' | 'folder-browser';

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigateToFolderBrowser={() => setCurrentPage('folder-browser')} />;
      case 'folder-browser':
        return <FolderBrowserPage onNavigateToHome={() => setCurrentPage('home')} />;
      default:
        return <Home onNavigateToFolderBrowser={() => setCurrentPage('folder-browser')} />;
    }
  };

  return (
    <div className="app">
      {renderCurrentPage()}
    </div>
  );
}

export default App;
