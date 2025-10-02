import React, { useState, useEffect } from 'react';
import { Video, VideoProgress, Module, videosApi, utils } from '../api/api';
import './VideoList.css';

interface VideoListProps {
  module: Module | null;
  selectedVideo?: Video;
  onVideoSelect: (video: Video) => void;
}

export const VideoList: React.FC<VideoListProps> = ({
  module,
  selectedVideo,
  onVideoSelect
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoProgresses, setVideoProgresses] = useState<Map<string, VideoProgress>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (module) {
      loadVideos();
    } else {
      setVideos([]);
      setVideoProgresses(new Map());
    }
  }, [module]);

  const loadVideos = async () => {
    if (!module) return;

    try {
      setLoading(true);
      const videosData = await videosApi.getModuleVideos(module.id);
      setVideos(videosData);

      // Carregar progresso de cada vídeo
      const progressMap = new Map<string, VideoProgress>();
      
      for (const video of videosData) {
        try {
          const progress = await videosApi.getVideoProgress(video.id);
          if (progress) {
            progressMap.set(video.id, progress);
          }
        } catch (error) {
          console.error(`Erro ao carregar progresso do vídeo ${video.id}:`, error);
        }
      }
      
      setVideoProgresses(progressMap);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVideoProgress = (video: Video, progress: VideoProgress) => {
    setVideoProgresses(prev => new Map(prev.set(video.id, progress)));
  };

  const filteredVideos = videos.filter(video =>
    video.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVideoStats = () => {
    const total = videos.length;
    const completed = Array.from(videoProgresses.values()).filter(p => p.completed).length;
    const inProgress = Array.from(videoProgresses.values()).filter(p => !p.completed && p.current_time > 0).length;
    
    return { total, completed, inProgress };
  };

  const getTotalDuration = () => {
    return Array.from(videoProgresses.values()).reduce((total, progress) => {
      return total + (progress.duration || 0);
    }, 0);
  };

  const getWatchedDuration = () => {
    return Array.from(videoProgresses.values()).reduce((total, progress) => {
      return total + (progress.current_time || 0);
    }, 0);
  };

  const formatVideoExtension = (path: string) => {
    const ext = utils.getVideoExtension(path).toUpperCase();
    return ext || 'VIDEO';
  };

  const getProgressColor = (progress: VideoProgress) => {
    if (progress.completed) return '#10b981'; // Verde
    if (progress.current_time > 0) return '#f59e0b'; // Amarelo
    return '#6b7280'; // Cinza
  };

  if (!module) {
    return (
      <div className="video-list-container">
        <div className="no-module-selected">
          <div className="no-module-icon">📁</div>
          <h3>Selecione um módulo</h3>
          <p>Escolha um módulo na barra lateral para ver os vídeos</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="video-list-container">
        <div className="module-header">
          <h2>{module.name}</h2>
        </div>
        <div className="loading-videos">
          <div className="loading-spinner">⏳</div>
          <p>Carregando vídeos...</p>
        </div>
      </div>
    );
  }

  const stats = getVideoStats();
  const totalDuration = getTotalDuration();
  const watchedDuration = getWatchedDuration();

  return (
    <div className="video-list-container">
      <div className="module-header">
        <div className="module-info">
          <h2>{module.name}</h2>
          <div className="module-stats">
            <span className="stat-item">
              📹 {stats.total} vídeos
            </span>
            <span className="stat-item">
              ✅ {stats.completed} concluídos
            </span>
            <span className="stat-item">
              ⏯️ {stats.inProgress} em progresso
            </span>
            {totalDuration > 0 && (
              <span className="stat-item">
                ⏱️ {utils.formatDuration(totalDuration)}
              </span>
            )}
          </div>
        </div>

        {totalDuration > 0 && (
          <div className="module-progress">
            <div className="progress-info">
              <span>Progresso do Módulo</span>
              <span>{Math.round((watchedDuration / totalDuration) * 100)}%</span>
            </div>
            <div className="progress-bar-module">
              <div 
                className="progress-fill-module"
                style={{ width: `${(watchedDuration / totalDuration) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {videos.length > 5 && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar vídeos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      )}

      <div className="videos-list">
        {filteredVideos.length === 0 ? (
          <div className="no-videos">
            {searchTerm ? (
              <>
                <div className="no-videos-icon">🔍</div>
                <h3>Nenhum vídeo encontrado</h3>
                <p>Tente buscar com outros termos</p>
              </>
            ) : (
              <>
                <div className="no-videos-icon">📹</div>
                <h3>Nenhum vídeo encontrado</h3>
                <p>Este módulo não contém vídeos</p>
              </>
            )}
          </div>
        ) : (
          filteredVideos.map((video, index) => {
            const progress = videoProgresses.get(video.id);
            const isSelected = selectedVideo?.id === video.id;
            
            return (
              <div 
                key={video.id}
                className={`video-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onVideoSelect(video)}
              >
                <div className="video-thumbnail">
                  <div className="video-number">{index + 1}</div>
                  <div className="video-type">
                    {formatVideoExtension(video.path)}
                  </div>
                  {progress?.completed && (
                    <div className="completed-overlay">
                      <span className="completed-icon">✅</span>
                    </div>
                  )}
                </div>

                <div className="video-details">
                  <h3 className="video-name">{video.name}</h3>
                  
                  <div className="video-meta">
                    {progress && (
                      <>
                        <span className="video-duration">
                          {utils.formatDuration(progress.duration)}
                        </span>
                        {progress.current_time > 0 && (
                          <span className="video-watched">
                            Assistido: {utils.formatDuration(progress.current_time)}
                          </span>
                        )}
                        {progress.last_watched && (
                          <span className="video-last-watched">
                            {new Date(progress.last_watched).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {progress && (
                    <div className="video-progress">
                      <div className="progress-bar-video">
                        <div 
                          className="progress-fill-video"
                          style={{ 
                            width: `${utils.getProgressPercentage(progress)}%`,
                            backgroundColor: getProgressColor(progress)
                          }}
                        />
                      </div>
                      <span className="progress-percentage">
                        {utils.getProgressPercentage(progress)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="video-actions">
                  {isSelected && (
                    <div className="playing-indicator">
                      <span className="playing-icon">▶️</span>
                      <span>Selecionado</span>
                    </div>
                  )}
                  
                  {progress?.completed && (
                    <div className="status-badge completed">
                      Concluído
                    </div>
                  )}
                  
                  {progress && !progress.completed && progress.current_time > 0 && (
                    <div className="status-badge in-progress">
                      Em progresso
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {filteredVideos.length > 0 && searchTerm && (
        <div className="search-results-info">
          Mostrando {filteredVideos.length} de {videos.length} vídeos
        </div>
      )}
    </div>
  );
};