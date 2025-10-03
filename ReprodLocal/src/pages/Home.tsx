import React, { useState, useEffect } from 'react';
import { Video, VideoProgress, FolderContent, MediaFile } from '../api/api';
import { FolderBrowser } from '../components/FolderBrowser';
import { VideoList } from '../components/VideoList';
import { VideoPlayer } from '../components/VideoPlayer';
import './Home.css';

interface HomeProps {
  // Removido onNavigateToFolderBrowser pois agora está integrado
}

export const Home: React.FC<HomeProps> = () => {
  const [selectedVideo, setSelectedVideo] = useState<Video | undefined>();
  const [currentFolderVideos, setCurrentFolderVideos] = useState<Video[]>([]);
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [videoListCollapsed, setVideoListCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Aplicar tema dark mode
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleFolderChange = (folderContent: FolderContent, folderPath: string) => {
    // Converter MediaFile[] para Video[]
    const videos: Video[] = folderContent.media_files.map((file: MediaFile, index: number) => ({
      id: `${folderPath}_${index}`,
      module_id: '0',
      course_id: '0',
      name: file.name,
      path: file.path,
      duration: file.duration || 0,
      order_index: index
    }));
    
    setCurrentFolderVideos(videos);
    setCurrentFolderPath(folderPath);
    setSelectedVideo(undefined); // Limpar vídeo selecionado ao trocar de pasta
  };

  const handlePlayFile = (filePath: string) => {
    // Encontrar o vídeo correspondente ao arquivo selecionado
    const video = currentFolderVideos.find(v => v.path === filePath);
    if (video) {
      setSelectedVideo(video);
    }
  };

  const handlePlayPlaylist = (files: string[]) => {
    // Reproduzir o primeiro arquivo da playlist
    if (files.length > 0) {
      handlePlayFile(files[0]);
    }
  };

  const handleVideoComplete = (video: Video) => {
    console.log(`Vídeo concluído: ${video.name}`);
    // Aqui você pode implementar lógica adicional quando um vídeo é concluído
    // Por exemplo, avançar automaticamente para o próximo vídeo
  };

  const handleProgressUpdate = (video: Video, progress: VideoProgress) => {
    console.log(`Progresso atualizado para ${video.name}: ${progress.current_time}s`);
    // Aqui você pode implementar lógica adicional para atualizações de progresso
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleVideoList = () => {
    setVideoListCollapsed(!videoListCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`home-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button 
            className="toggle-button"
            onClick={toggleSidebar}
            title="Alternar barra lateral"
          >
            ☰
          </button>
          <h1 className="app-title">EAD Desktop</h1>
        </div>

        <div className="header-center">
          {currentFolderPath && (
            <div className="breadcrumb">
              <span className="breadcrumb-item">📁 {currentFolderPath.split('\\').pop() || currentFolderPath}</span>
              {selectedVideo && (
                <>
                  <span className="breadcrumb-separator">›</span>
                  <span className="breadcrumb-item current">🎬 {selectedVideo.name}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          <button 
            className="toggle-button"
            onClick={toggleVideoList}
            title="Alternar lista de vídeos"
            disabled={currentFolderVideos.length === 0}
          >
            📹
          </button>
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
        <div className={`sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <FolderBrowser
            onPlayFile={handlePlayFile}
            onPlayPlaylist={handlePlayPlaylist}
            onFolderChange={handleFolderChange}
          />
        </div>

        {/* Video Player */}
        <div className="video-player-container">
          <VideoPlayer
            video={selectedVideo || null}
            onVideoComplete={handleVideoComplete}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>

        {/* Video List */}
        <div className={`video-list-container ${videoListCollapsed ? 'collapsed' : ''}`}>
          <VideoList
            videos={currentFolderVideos}
            selectedVideo={selectedVideo}
            onVideoSelect={handleVideoSelect}
          />
        </div>
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          {currentFolderPath && (
            <span className="status-item">
              📁 {currentFolderPath}
            </span>
          )}
          {currentFolderVideos.length > 0 && (
            <span className="status-item">
              🎬 {currentFolderVideos.length} vídeo{currentFolderVideos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="status-center">
          {selectedVideo && (
            <span className="status-item">
              🎬 {selectedVideo.name}
            </span>
          )}
        </div>

        <div className="status-right">
          <span className="status-item">
            {darkMode ? '🌙' : '☀️'} {darkMode ? 'Modo Escuro' : 'Modo Claro'}
          </span>
          <span className="status-item">
            ⚡ EAD Desktop v1.0
          </span>
        </div>
      </footer>
    </div>
  );
};

// Hook para atalhos de teclado
export const useKeyboardShortcuts = (
  toggleSidebar: () => void,
  toggleVideoList: () => void,
  toggleDarkMode: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            toggleSidebar();
            break;
          case '2':
            event.preventDefault();
            toggleVideoList();
            break;
          case 'd':
          case 'D':
            event.preventDefault();
            toggleDarkMode();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleVideoList, toggleDarkMode]);
};