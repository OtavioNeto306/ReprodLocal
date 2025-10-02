import React, { useState, useEffect } from 'react';
import { Course, Module, Video, VideoProgress } from '../api/api';
import { Sidebar } from '../components/Sidebar';
import { VideoList } from '../components/VideoList';
import { VideoPlayer } from '../components/VideoPlayer';
import './Home.css';

export const Home: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>();
  const [selectedModule, setSelectedModule] = useState<Module | undefined>();
  const [selectedVideo, setSelectedVideo] = useState<Video | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [videoListCollapsed, setVideoListCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Aplicar tema dark mode
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    // Limpar seleções anteriores quando trocar de curso
    setSelectedModule(undefined);
    setSelectedVideo(undefined);
  };

  const handleModuleSelect = (module: Module) => {
    setSelectedModule(module);
    // Limpar vídeo selecionado quando trocar de módulo
    setSelectedVideo(undefined);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
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
          {selectedCourse && (
            <div className="breadcrumb">
              <span className="breadcrumb-item">{selectedCourse.name}</span>
              {selectedModule && (
                <>
                  <span className="breadcrumb-separator">›</span>
                  <span className="breadcrumb-item">{selectedModule.name}</span>
                </>
              )}
              {selectedVideo && (
                <>
                  <span className="breadcrumb-separator">›</span>
                  <span className="breadcrumb-item current">{selectedVideo.name}</span>
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
            disabled={!selectedModule}
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
        {/* Sidebar */}
        <div className={`sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Sidebar
            onCourseSelect={handleCourseSelect}
            onModuleSelect={handleModuleSelect}
            selectedCourse={selectedCourse}
            selectedModule={selectedModule}
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
            module={selectedModule || null}
            selectedVideo={selectedVideo}
            onVideoSelect={handleVideoSelect}
          />
        </div>
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          {selectedCourse && (
            <span className="status-item">
              📚 {selectedCourse.name}
            </span>
          )}
          {selectedModule && (
            <span className="status-item">
              📁 {selectedModule.name}
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

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-shortcuts" title="Atalhos do teclado">
        <div className="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>1</kbd> - Alternar barra lateral
        </div>
        <div className="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>2</kbd> - Alternar lista de vídeos
        </div>
        <div className="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>D</kbd> - Alternar tema
        </div>
        <div className="shortcut-item">
          <kbd>Espaço</kbd> - Play/Pause
        </div>
      </div>
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