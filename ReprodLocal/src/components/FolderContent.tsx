import React from 'react';
import { FolderContent as FolderContentType, MediaFile, SubFolder } from '../api/api';
import './FolderContent.css';

interface FolderContentProps {
  content: FolderContentType;
  selectedFiles: Set<string>;
  onFolderClick: (folderPath: string) => void;
  onFileSelect: (filePath: string, selected: boolean) => void;
  onPlayFile: (filePath: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

const FolderContent: React.FC<FolderContentProps> = ({
  content,
  selectedFiles,
  onFolderClick,
  onFileSelect,
  onPlayFile,
  onSelectAll,
  onClearSelection,
}) => {
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'webm':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return '🎵';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="folder-content-container">
      {/* Informações da seleção */}
      {content.media_files.length > 0 && (
        <div className="selection-info">
          <div className="selection-stats">
            <span>{selectedFiles.size} de {content.media_files.length} arquivos selecionados</span>
          </div>
          <div className="selection-actions">
            <button
              className="select-all-btn"
              onClick={onSelectAll}
              disabled={selectedFiles.size === content.media_files.length}
            >
              Selecionar Todos
            </button>
            <button
              className="clear-selection-btn"
              onClick={onClearSelection}
              disabled={selectedFiles.size === 0}
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Subpastas */}
      {content.subfolders.length > 0 && (
        <div className="subfolders-section">
          <h4>📁 Pastas ({content.subfolders.length})</h4>
          <div className="subfolders-list">
            {content.subfolders.map((folder: SubFolder) => (
              <div
                key={folder.path}
                className="subfolder-item"
                onClick={() => onFolderClick(folder.path)}
              >
                <div className="folder-icon">📁</div>
                <div className="folder-info">
                    <div className="folder-name">{folder.name}</div>
                    <div className="folder-stats">
                      {folder.media_count} arquivo{folder.media_count !== 1 ? 's' : ''} de mídia
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arquivos de mídia */}
      {content.media_files.length > 0 && (
        <div className="media-files-section">
          <h4>🎬 Arquivos de Mídia ({content.media_files.length})</h4>
          <div className="media-files-list">
            {content.media_files.map((file: MediaFile) => (
              <div
                key={file.path}
                className={`media-file-item ${selectedFiles.has(file.path) ? 'selected' : ''}`}
              >
                <div className="file-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={(e) => onFileSelect(file.path, e.target.checked)}
                  />
                </div>
                
                <div className="file-icon">
                  {getFileIcon(file.file_type)}
                </div>
                
                <div
                  className="file-info"
                  onClick={() => onFileSelect(file.path, !selectedFiles.has(file.path))}
                >
                  <div className="file-name">{file.name}</div>
                  <div className="file-details">
                    <span className="file-type">{file.file_type.toUpperCase()}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                    {file.duration && (
                      <span className="file-duration">{formatDuration(file.duration)}</span>
                    )}
                  </div>
                </div>
                
                <button
                  className="play-file-btn"
                  onClick={() => onPlayFile(file.path)}
                  title="Reproduzir arquivo"
                >
                  ▶️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {content.subfolders.length === 0 && content.media_files.length === 0 && (
        <div className="empty-folder">
          <div className="empty-icon">📂</div>
          <h3>Pasta Vazia</h3>
          <p>Esta pasta não contém arquivos de mídia ou subpastas.</p>
        </div>
      )}
    </div>
  );
};

export default FolderContent;