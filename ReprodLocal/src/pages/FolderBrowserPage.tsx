import React, { useState, useEffect } from 'react';
import FolderBrowser from '../components/FolderBrowser';
import { VideoPlayer } from '../components/VideoPlayer';
import { Video } from '../api/api';
import './FolderBrowserPage.css';

interface FolderBrowserPageProps {
  onNavigateToHome?: () => void;
}

export const FolderBrowserPage: React.FC<FolderBrowserPageProps> = ({ onNavigateToHome }) => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Aplicar tema dark mode
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handlePlayFile = (filePath: string) => {
    // Criar um objeto Video temporário para o arquivo selecionado
    const video: Video = {
      id: filePath,
      name: filePath.split('\\').pop() || filePath.split('/').pop() || 'Arquivo',
      path: filePath,
      duration: 0, // Será determinado pelo player
      module_id: 'folder-browser',
      order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentVideo(video);
    setPlaylist([filePath]);
    setCurrentIndex(0);
  };

  const handlePlayPlaylist = (files: string[]) => {
    if (files.length === 0) return;

    // Criar um objeto Video para o primeiro arquivo da playlist
    const firstFile = files[0];
    const video: Video = {
      id: firstFile,
      name: firstFile.split('\\').pop() || firstFile.split('/').pop() || 'Arquivo',
      path: firstFile,
      duration: 0,
      module_id: 'folder-browser',
      order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentVideo(video);
    setPlaylist(files);
    setCurrentIndex(0);
  };

  const handleVideoComplete = (video: Video) => {
    // Avançar para o próximo vídeo na playlist
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextFile = playlist[nextIndex];
      
      const nextVideo: Video = {
        id: nextFile,
        name: nextFile.split('\\').pop() || nextFile.split('/').pop() || 'Arquivo',
        path: nextFile,
        duration: 0,
        module_id: 'folder-browser',
        order: nextIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentVideo(nextVideo);
      setCurrentIndex(nextIndex);
    } else {
      // Fim da playlist
      console.log('Playlist concluída');
    }
  };

  const handleProgressUpdate = (video: Video, progress: any) => {
    // Atualizar progresso se necessário
    console.log(`Progresso: ${progress.current_time}s`);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevFile = playlist[prevIndex];
      
      const prevVideo: Video = {
        id: prevFile,
        name: prevFile.split('\\').pop() || prevFile.split('/').pop() || 'Arquivo',
        path: prevFile,
        duration: 0,
        module_id: 'folder-browser',
        order: prevIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentVideo(prevVideo);
      setCurrentIndex(prevIndex);
    }
  };

  const goToNext = () => {
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextFile = playlist[nextIndex];
      
      const nextVideo: Video = {
        id: nextFile,
        name: nextFile.split('\\').pop() || nextFile.split('/').pop() || 'Arquivo',
        path: nextFile,
        duration: 0,
        module_id: 'folder-browser',
        order: nextIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentVideo(nextVideo);
      setCurrentIndex(nextIndex);
    }
  };

  return (
    <div className={`folder-browser-page ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          {onNavigateToHome && (
            <button 
              className="toggle-button"
              onClick={onNavigateToHome}
              title="Voltar para Home"
            >
              🏠
            </button>
          )}
          <button 
            className="toggle-button"
            onClick={toggleSidebar}
            title="Alternar navegador de pastas"
          >
            📁
          </button>
          <h1 className="app-title">Navegador de Pastas</h1>
        </div>

        <div className="header-center">
          {currentVideo && (
            <div className="breadcrumb">
              <span className="breadcrumb-item current">{currentVideo.name}</span>
              {playlist.length > 1 && (
                <span className="playlist-info">
                  ({currentIndex + 1} de {playlist.length})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          {playlist.length > 1 && (
            <>
              <button 
                className="nav-button"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                title="Anterior"
              >
                ⏮️
              </button>
              <button 
                className="nav-button"
                onClick={goToNext}
                disabled={currentIndex === playlist.length - 1}
                title="Próximo"
              >
                ⏭️
              </button>
            </>
          )}
          <button 
            className="toggle-button theme-toggle"
            onClick={toggleDarkMode}
            title="Alternar tema"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Folder Browser */}
        <div className={`folder-browser-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <FolderBrowser
            onPlayFile={handlePlayFile}
            onPlayPlaylist={handlePlayPlaylist}
          />
        </div>

        {/* Video Player */}
        <div className="video-player-container">
          <VideoPlayer
            video={currentVideo}
            onVideoComplete={handleVideoComplete}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          {currentVideo && (
            <span className="status-item">
              📹 {currentVideo.name}
            </span>
          )}
          {playlist.length > 1 && (
            <span className="status-item">
              🎵 Playlist: {playlist.length} arquivos
            </span>
          )}
        </div>
        
        <div className="status-right">
          <span className="status-item">
            {darkMode ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default FolderBrowserPage;