import React, { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Video, VideoProgress, videosApi, utils } from '../api/api';
import VideoNotes from './VideoNotes';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: Video | null;
  onVideoComplete?: (video: Video) => void;
  onProgressUpdate?: (video: Video, progress: VideoProgress) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onVideoComplete,
  onProgressUpdate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (video) {
      // Parar reprodução anterior
      setIsPlaying(false);
      setError(null);
      setLoading(false);
      
      // Resetar o player HTML
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.src = '';
      }
      
      // Carregar novo vídeo
      loadVideoProgress();
      resetPlayer();
      
      // Configurar novo src do vídeo usando convertFileSrc
      if (videoRef.current && video.path) {
        const convertedSrc = convertFileSrc(video.path);
        
        videoRef.current.src = convertedSrc;
        videoRef.current.load();
      }
    }
    
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [video]);

  // Removido o tracking automático da API mock para evitar conflitos
  // O tempo será gerenciado apenas pelo elemento HTML video

  const loadVideoProgress = async () => {
    if (!video) return;
    
    try {
      const videoProgress = await videosApi.getVideoProgress(video.id);
      setProgress(videoProgress);
      
      if (videoProgress) {
        setCurrentTime(videoProgress.current_time);
        setDuration(videoProgress.duration);
      }
    } catch (error) {
      console.error('Erro ao carregar progresso do vídeo:', error);
    }
  };

  const resetPlayer = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setLoading(false);
    setProgress(null);
    setIsMarkingComplete(false);
  };

  // Funções de tracking removidas - agora usamos apenas o elemento HTML video

  const handlePlay = async () => {
    if (!video || !videoRef.current) return;

    setLoading(true);
    setError(null);

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Garantir que o vídeo está carregado
        if (videoRef.current.readyState >= 2) {
          await videoRef.current.play();
          setIsPlaying(true);
        } else {
          // Se não estiver carregado, aguardar
          videoRef.current.addEventListener('canplay', async () => {
            try {
              await videoRef.current!.play();
              setIsPlaying(true);
            } catch (err) {
              console.error('Erro ao reproduzir após carregamento:', err);
              setError('Erro ao reproduzir vídeo');
            }
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error);
      setError('Erro ao reproduzir vídeo');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSeek = async (time: number) => {
    try {
      if (videoRef.current && !isNaN(time) && time >= 0) {
        // Garantir que o tempo não exceda a duração
        const videoDuration = videoRef.current.duration || duration;
        const seekTime = Math.min(time, videoDuration);
        
        // Atualizar o elemento HTML video
        videoRef.current.currentTime = seekTime;
        
        // Atualizar estado local imediatamente para feedback visual
        setCurrentTime(seekTime);
        
        // Salvar progresso no banco de dados se o vídeo estiver carregado
        if (video && videoDuration > 0) {
          // Só marcar como concluído automaticamente se não foi marcado manualmente
          const autoCompleted = seekTime >= videoDuration * 0.95;
          const shouldMarkCompleted = autoCompleted && !progress?.completed;
          
          // Manter o status atual de conclusão se foi marcado manualmente
          const completed = progress?.completed || shouldMarkCompleted;
          
          await videosApi.updateVideoProgress(
            video.id,
            seekTime,
            videoDuration,
            completed
          );
          
          const updatedProgress: VideoProgress = {
            id: progress?.id || '',
            video_id: video.id,
            current_time: seekTime,
            duration: videoDuration,
            completed,
            last_watched: new Date().toISOString()
          };
          
          setProgress(updatedProgress);
          onProgressUpdate?.(video, updatedProgress);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar posição:', error);
      setError('Erro ao navegar no vídeo');
    }
  };

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    
    // Garantir que o clique está dentro dos limites
    const clampedX = Math.max(0, Math.min(clickX, rect.width));
    const percentage = clampedX / rect.width;
    const newTime = percentage * duration;

    // Validar o tempo calculado
    if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
      handleSeek(newTime);
    }
  };

  const handleStop = () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
    } catch (error) {
      console.error('Erro ao parar vídeo:', error);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;

    if (!isFullscreen) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMarkComplete = async () => {
    if (!video) return;
    
    setIsMarkingComplete(true);
    try {
      if (progress?.completed) {
        await videosApi.markVideoIncomplete(video.id);
      } else {
        await videosApi.markVideoCompleted(video.id);
      }
      
      // Recarrega o progresso do vídeo
      const updatedProgress = await videosApi.getVideoProgress(video.id);
      setProgress(updatedProgress);
      
      // Notifica o componente pai sobre a atualização
      if (onProgressUpdate && updatedProgress) {
        onProgressUpdate(video, updatedProgress);
      }
    } catch (error) {
      console.error('Erro ao atualizar status de conclusão:', error);
      setError('Erro ao atualizar status de conclusão');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const getProgressPercentage = () => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  };

  if (!video) {
    return (
      <div className="video-player-container">
        <div className="no-video-selected">
          <div className="no-video-icon">🎬</div>
          <h3>Selecione um vídeo para assistir</h3>
          <p>Navegue pelas pastas e clique em um vídeo para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={playerRef}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
    >
      <div className="video-info">
        <h2 className="video-title">{video.name}</h2>
        {progress?.completed && (
          <span className="completed-badge">✅ Concluído</span>
        )}
      </div>

      <div className="video-player-area">
        <video
          ref={videoRef}
          className="video-element"
          onLoadedMetadata={() => {
            if (videoRef.current && !isNaN(videoRef.current.duration)) {
              const videoDuration = videoRef.current.duration;
              setDuration(videoDuration);
              
              // Restaurar posição salva, mas garantir que não exceda a duração
              const savedTime = progress?.current_time || 0;
              const startTime = Math.min(savedTime, videoDuration);
              
              videoRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              
              // Atualizar volume
              videoRef.current.volume = volume / 100;
              videoRef.current.playbackRate = playbackRate;
            }
          }}
          onTimeUpdate={async () => {
            if (videoRef.current && video) {
              const currentVideoTime = videoRef.current.currentTime;
              const videoDuration = videoRef.current.duration;
              

              setCurrentTime(currentVideoTime);
              
              // Atualizar duração se mudou
              if (videoDuration && videoDuration !== duration) {
                setDuration(videoDuration);
              }
              
              // Salvar progresso a cada 5 segundos para não sobrecarregar
              if (Math.floor(currentVideoTime) % 5 === 0) {
                try {
                  // Só marcar como concluído automaticamente se não foi marcado manualmente
                  // e se chegou ao final do vídeo (95%)
                  const autoCompleted = currentVideoTime >= videoDuration * 0.95;
                  const shouldMarkCompleted = autoCompleted && !progress?.completed;
                  
                  // Manter o status atual de conclusão se foi marcado manualmente
                  const completed = progress?.completed || shouldMarkCompleted;
                  
                  await videosApi.updateVideoProgress(
                    video.id,
                    currentVideoTime,
                    videoDuration,
                    completed
                  );
                  
                  const updatedProgress: VideoProgress = {
                    id: progress?.id || '',
                    video_id: video.id,
                    current_time: currentVideoTime,
                    duration: videoDuration,
                    completed,
                    last_watched: new Date().toISOString()
                  };
                  
                  setProgress(updatedProgress);
                  onProgressUpdate?.(video, updatedProgress);
                  
                  if (shouldMarkCompleted) {
                    onVideoComplete?.(video);
                  }
                } catch (error) {
                  console.error('Erro ao salvar progresso:', error);
                }
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (video && onVideoComplete) {
              onVideoComplete(video);
            }
          }}
          onError={(e) => {
            console.error('Erro ao carregar vídeo:', e);
            console.error('Caminho do vídeo:', video?.path);
            console.error('Src convertido:', videoRef.current?.src);
            setError('Erro ao carregar o vídeo. Verifique se o arquivo existe.');
          }}
          poster="/video-placeholder.jpg"
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>
        <div className="progress-container">
          <div 
            className="progress-bar"
            onClick={handleProgressBarClick}
          >
            <div 
              className="progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            />
            <div 
              className="progress-thumb"
              style={{ left: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        <div className="controls-row">
          <div className="controls-left">
            <button 
              className="control-button play-button"
              onClick={handlePlay}
              disabled={loading}
            >
              {loading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button 
              className="control-button"
              onClick={handleStop}
            >
              ⏹️
            </button>

            <div className="time-display">
              <span>{formatTime(currentTime)}</span>
              <span className="time-separator">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="controls-right">
            <div className="playback-rate-control">
              <span className="rate-icon">⚡</span>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                className="rate-selector"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>

            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="volume-slider"
              />
            </div>

            <button 
              className="control-button completion-button"
              onClick={handleMarkComplete}
              disabled={isMarkingComplete}
              title={progress?.completed ? 'Marcar como incompleto' : 'Marcar como concluído'}
            >
              {isMarkingComplete ? '⏳' : progress?.completed ? '✅' : '⭕'}
            </button>

            <button 
              className="control-button"
              onClick={() => setShowNotes(!showNotes)}
              title={showNotes ? 'Ocultar anotações' : 'Mostrar anotações'}
            >
              📝
            </button>

            <button 
              className="control-button"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {progress && (
        <div className="video-stats">
          <div className="stat-item">
            <span className="stat-label">Progresso:</span>
            <span className="stat-value">{utils.getProgressPercentage(progress)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Último acesso:</span>
            <span className="stat-value">
              {new Date(progress.last_watched).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      {showNotes && (
        <VideoNotes 
          videoId={video.id} 
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
};