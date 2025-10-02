import React, { useState, useEffect } from 'react';
import { FolderContent, MediaFile, SubFolder, folderApi, utils } from '../api/api';
import './FolderBrowser.css';

interface FolderBrowserProps {
  onPlayFile: (filePath: string) => void;
  onPlayPlaylist: (files: string[]) => void;
}

export const FolderBrowser: React.FC<FolderBrowserProps> = ({
  onPlayFile,
  onPlayPlaylist
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [folderContent, setFolderContent] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const selectFolder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const selectedPath = await folderApi.selectFolder();
      if (selectedPath) {
        setCurrentPath(selectedPath);
        setPathHistory([selectedPath]);
        await loadFolderContent(selectedPath);
      }
    } catch (err) {
      setError('Erro ao selecionar pasta');
      console.error('Erro ao selecionar pasta:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContent = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const content = await folderApi.scanFolderContent(path);
      setFolderContent(content);
      setSelectedFiles(new Set());
    } catch (err) {
      setError('Erro ao carregar conteúdo da pasta');
      console.error('Erro ao carregar pasta:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = async (folderPath: string) => {
    setCurrentPath(folderPath);
    setPathHistory(prev => [...prev, folderPath]);
    await loadFolderContent(folderPath);
  };

  const navigateBack = async () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1);
      const previousPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
      await loadFolderContent(previousPath);
    }
  };

  const navigateUp = async () => {
    const parentPath = currentPath.split('\\').slice(0, -1).join('\\');
    if (parentPath && parentPath !== currentPath) {
      setCurrentPath(parentPath);
      setPathHistory(prev => [...prev, parentPath]);
      await loadFolderContent(parentPath);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (!folderContent) return;
    const allPaths = new Set(folderContent.media_files.map(f => f.path));
    setSelectedFiles(allPaths);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const playSelected = () => {
    if (!folderContent || selectedFiles.size === 0) return;
    
    const selectedMedia = folderContent.media_files.filter(f => selectedFiles.has(f.path));
    if (selectedMedia.length > 0) {
      const filePaths = selectedMedia.map(f => f.path);
      if (filePaths.length === 1) {
        onPlayFile(filePaths[0]);
      } else {
        onPlayPlaylist(filePaths);
      }
    }
  };

  const playAll = async () => {
    if (!currentPath) return;
    
    try {
      setLoading(true);
      const playlist = await folderApi.getFolderPlaylist(currentPath);
      if (playlist.length > 0) {
        const filePaths = playlist.map(f => f.path);
        if (filePaths.length === 1) {
          onPlayFile(filePaths[0]);
        } else {
          onPlayPlaylist(filePaths);
        }
      }
    } catch (err) {
      setError('Erro ao criar playlist');
      console.error('Erro ao criar playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return utils.formatFileSize(bytes);
  };

  const getFileIcon = (fileType: string): string => {
    const type = fileType.toLowerCase();
    if (['mp4', 'mkv', 'avi', 'mov'].includes(type)) return '🎬';
    if (['mp3', 'wav', 'flac', 'aac'].includes(type)) return '🎵';
    return '📄';
  };

  if (!currentPath) {
    return (
      <div className="folder-browser">
        <div className="folder-browser-empty">
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>Selecione uma Pasta</h3>
            <p>Escolha uma pasta para reproduzir todo o conteúdo de mídia</p>
            <button 
              className="select-folder-btn"
              onClick={selectFolder}
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Selecionar Pasta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="folder-browser">
      {/* Header com navegação */}
      <div className="folder-header">
        <div className="folder-navigation">
          <button 
            className="nav-btn"
            onClick={navigateBack}
            disabled={pathHistory.length <= 1 || loading}
            title="Voltar"
          >
            ←
          </button>
          <button 
            className="nav-btn"
            onClick={navigateUp}
            disabled={loading}
            title="Pasta pai"
          >
            ↑
          </button>
          <div className="current-path" title={currentPath}>
            {currentPath.split('\\').pop() || currentPath}
          </div>
        </div>

        <div className="folder-actions">
          <button 
            className="action-btn"
            onClick={selectFolder}
            disabled={loading}
          >
            📁 Nova Pasta
          </button>
          <button 
            className="action-btn primary"
            onClick={playAll}
            disabled={loading || !folderContent?.media_files.length}
          >
            ▶️ Reproduzir Tudo
          </button>
        </div>
      </div>

      {/* Informações da pasta */}
      {folderContent && (
        <div className="folder-info">
          <div className="folder-stats">
            <span>{folderContent.total_files} arquivos de mídia</span>
            <span>{folderContent.subfolders.length} subpastas</span>
          </div>
          
          {selectedFiles.size > 0 && (
            <div className="selection-actions">
              <span>{selectedFiles.size} selecionados</span>
              <button onClick={playSelected} className="play-selected-btn">
                ▶️ Reproduzir Selecionados
              </button>
              <button onClick={clearSelection} className="clear-selection-btn">
                Limpar
              </button>
            </div>
          )}
          
          {folderContent.media_files.length > 0 && (
            <button onClick={selectAllFiles} className="select-all-btn">
              Selecionar Todos
            </button>
          )}
        </div>
      )}

      {/* Conteúdo da pasta */}
      <div className="folder-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Carregando...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={() => loadFolderContent(currentPath)}>
              Tentar Novamente
            </button>
          </div>
        )}

        {folderContent && !loading && (
          <>
            {/* Subpastas */}
            {folderContent.subfolders.length > 0 && (
              <div className="subfolders-section">
                <h4>📁 Pastas ({folderContent.subfolders.length})</h4>
                <div className="subfolders-grid">
                  {folderContent.subfolders.map((folder: SubFolder) => (
                    <div 
                      key={folder.path}
                      className="subfolder-item"
                      onClick={() => navigateToFolder(folder.path)}
                    >
                      <div className="folder-icon">📁</div>
                      <div className="folder-info">
                        <div className="folder-name">{folder.name}</div>
                        <div className="folder-count">{folder.media_count} arquivos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arquivos de mídia */}
            {folderContent.media_files.length > 0 && (
              <div className="media-files-section">
                <h4>🎬 Arquivos de Mídia ({folderContent.media_files.length})</h4>
                <div className="media-files-list">
                  {folderContent.media_files.map((file: MediaFile) => (
                    <div 
                      key={file.path}
                      className={`media-file-item ${selectedFiles.has(file.path) ? 'selected' : ''}`}
                    >
                      <div className="file-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => toggleFileSelection(file.path)}
                        />
                      </div>
                      
                      <div className="file-icon">
                        {getFileIcon(file.file_type)}
                      </div>
                      
                      <div 
                        className="file-info"
                        onClick={() => onPlayFile(file.path)}
                      >
                        <div className="file-name">{file.name}</div>
                        <div className="file-details">
                          <span className="file-type">{file.file_type}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                          {file.duration && (
                            <span className="file-duration">
                              {utils.formatDuration(file.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        className="play-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayFile(file.path);
                        }}
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
            {folderContent.media_files.length === 0 && folderContent.subfolders.length === 0 && (
              <div className="empty-folder">
                <div className="empty-icon">📂</div>
                <h3>Pasta Vazia</h3>
                <p>Nenhum arquivo de mídia ou subpasta encontrado</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FolderBrowser;