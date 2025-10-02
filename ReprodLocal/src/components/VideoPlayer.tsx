import React, { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Video, VideoProgress, playerApi, videosApi, utils } from '../api/api';
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressUpdateInterval = useRef<number | null>(null);
  const hideControlsTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (video) {
      loadVideoProgress();
      resetPlayer();
    }
    
    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [video]);

  useEffect(() => {
    if (isPlaying) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
  }, [isPlaying]);

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
  };

  const startProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }

    progressUpdateInterval.current = setInterval(async () => {
      try {
        const status = await playerApi.getVideoStatus();
        if (status) {
          setCurrentTime(status.current_time);
          setDuration(status.duration);
          setVolume(status.volume);
          setIsPlaying(status.is_playing);

          // Atualizar progresso no banco de dados
          if (video) {
            const completed = status.current_time >= status.duration * 0.95; // 95% = completo
            
            await videosApi.updateVideoProgress(
              video.id,
              status.current_time,
              status.duration,
              completed
            );

            const updatedProgress: VideoProgress = {
              id: progress?.id || '',
              video_id: video.id,
              current_time: status.current_time,
              duration: status.duration,
              completed,
              last_watched: new Date().toISOString()
            };

            setProgress(updatedProgress);
            onProgressUpdate?.(video, updatedProgress);

            if (completed && !progress?.completed) {
              onVideoComplete?.(video);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar progresso:', error);
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }
  };

  const handlePlay = async () => {
    if (!video || !videoRef.current) return;

    setLoading(true);
    setError(null);

    try {
      if (isPlaying) {
        videoRef.current.pause();
        await playerApi.pauseVideo();
      } else {
        await videoRef.current.play();
        await playerApi.playVideo(video.path);
      }
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error);
      setError('Erro ao reproduzir vídeo');
    } finally {
      setLoading(false);
    }
  };

  const handleSeek = async (time: number) => {
    try {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      await playerApi.seekVideo(time);
      setCurrentTime(time);
    } catch (error) {
      console.error('Erro ao buscar posição:', error);
    }
  };

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    handleSeek(newTime);
  };

  const handleStop = async () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      await playerApi.stopVideo();
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
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              videoRef.current.currentTime = progress?.current_time || 0;
              setCurrentTime(progress?.current_time || 0);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
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
          onError={() => setError('Erro ao carregar o vídeo')}
          poster="/video-placeholder.jpg"
        >
          <source src={convertFileSrc(video.path)} type="video/mp4" />
          <source src={convertFileSrc(video.path)} type="video/webm" />
          <source src={convertFileSrc(video.path)} type="video/ogg" />
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
    </div>
  );
};