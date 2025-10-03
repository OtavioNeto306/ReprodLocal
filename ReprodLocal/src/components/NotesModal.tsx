import React, { useState, useEffect, useRef } from 'react';
import { videosApi, UserNote, VideoBookmark } from '../api/api';
import './NotesModal.css';

interface NotesModalProps {
  videoId: string;
  videoName: string;
  currentTime: number;
  onSeek: (time: number) => void;
  onClose: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ 
  videoId, 
  videoName,
  currentTime, 
  onSeek, 
  onClose 
}) => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'search'>('notes');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [newNote, setNewNote] = useState({ 
    title: '', 
    content: '', 
    noteType: 'general',
    timestamp: 0
  });
  const [newBookmark, setNewBookmark] = useState({ 
    title: '', 
    description: '',
    timestamp: 0
  });
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<UserNote[]>([]);
  const [selectedNoteType, setSelectedNoteType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'created' | 'title'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const modalRef = useRef<HTMLDivElement>(null);
  const noteContentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (videoId) {
      loadNotes();
      loadBookmarks();
      setNewNote(prev => ({ ...prev, timestamp: currentTime }));
      setNewBookmark(prev => ({ ...prev, timestamp: currentTime }));
    }
  }, [videoId, currentTime]);

  useEffect(() => {
    filterAndSortNotes();
  }, [notes, searchTerm, selectedNoteType, sortBy, sortOrder]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const loadNotes = async () => {
    try {
      const videoNotes = await videosApi.getNotesByVideo(videoId);
      setNotes(videoNotes);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const videoBookmarks = await videosApi.getVideoBookmarks(videoId);
      setBookmarks(videoBookmarks);
    } catch (error) {
      console.error('Erro ao carregar bookmarks:', error);
    }
  };



  const filterAndSortNotes = () => {
    let filtered = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedNoteType === 'all' || note.note_type === selectedNoteType;
      return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = (a.timestamp || 0) - (b.timestamp || 0);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredNotes(filtered);
  };

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const noteData = {
      video_id: videoId,
      course_id: "1", // Valor padrão - pode ser obtido da API se necessário
      module_id: "1", // Valor padrão - pode ser obtido da API se necessário
      timestamp: newNote.timestamp,
      title: newNote.title,
      content: newNote.content,
      note_type: newNote.noteType
    };

    try {
      await videosApi.createNote(noteData);
      setNewNote({ title: '', content: '', noteType: 'general', timestamp: currentTime });
      setIsCreatingNote(false);
      loadNotes();
    } catch (error) {
      console.error('❌ Erro ao criar anotação:', error);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.title.trim() || !editingNote.content.trim()) return;

    try {
      await videosApi.updateNote(editingNote.id, editingNote.title, editingNote.content);
      setEditingNote(null);
      loadNotes();
    } catch (error) {
      console.error('Erro ao atualizar anotação:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;

    try {
      await videosApi.deleteNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Erro ao excluir anotação:', error);
    }
  };

  const handleCreateBookmark = async () => {
    if (!newBookmark.title.trim()) return;

    try {
      await videosApi.createBookmark(
        videoId,
        newBookmark.timestamp,
        newBookmark.title,
        newBookmark.description
      );

      setNewBookmark({ title: '', description: '', timestamp: currentTime });
      setIsCreatingBookmark(false);
      loadBookmarks();
    } catch (error) {
      console.error('Erro ao criar bookmark:', error);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('Tem certeza que deseja excluir este bookmark?')) return;

    try {
      await videosApi.deleteBookmark(bookmarkId);
      loadBookmarks();
    } catch (error) {
      console.error('Erro ao excluir bookmark:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'important': return '⭐';
      case 'question': return '❓';
      case 'summary': return '📋';
      default: return '📝';
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'important': return '#ffc107';
      case 'question': return '#17a2b8';
      case 'summary': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="notes-modal-overlay">
      <div className="notes-modal" ref={modalRef}>
        <div className="notes-modal-header">
          <div className="modal-title">
            <h2>📝 Anotações e Bookmarks</h2>
            <p className="video-title">{videoName}</p>
          </div>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="notes-modal-tabs">
          <button
            className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Anotações ({notes.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            🔖 Bookmarks ({bookmarks.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Buscar
          </button>
        </div>

        <div className="notes-modal-content">
          {activeTab === 'notes' && (
            <div className="notes-tab">
              <div className="notes-controls">
                <div className="controls-row">
                  <button
                    className="create-button"
                    onClick={() => setIsCreatingNote(true)}
                    disabled={isCreatingNote}
                  >
                    ➕ Nova Anotação ({formatTime(currentTime)})
                  </button>
                  
                  <div className="sort-controls">
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="sort-select"
                    >
                      <option value="timestamp">Por Tempo</option>
                      <option value="created">Por Data</option>
                      <option value="title">Por Título</option>
                    </select>
                    <button 
                      className="sort-order-button"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                <div className="filter-controls">
                  <select 
                    value={selectedNoteType} 
                    onChange={(e) => setSelectedNoteType(e.target.value)}
                    className="type-filter"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="general">Geral</option>
                    <option value="important">Importante</option>
                    <option value="question">Pergunta</option>
                    <option value="summary">Resumo</option>
                  </select>
                </div>
              </div>

              {isCreatingNote && (
                <div className="note-form">
                  <h4>Nova Anotação</h4>
                  <div className="form-row">
                    <input
                      type="number"
                      step="0.1"
                      value={newNote.timestamp}
                      onChange={(e) => setNewNote({ ...newNote, timestamp: parseFloat(e.target.value) || 0 })}
                      className="timestamp-input"
                      placeholder="Tempo (segundos)"
                    />
                    <span className="timestamp-display">{formatTime(newNote.timestamp)}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Título da anotação"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="title-input"
                  />
                  <select
                    value={newNote.noteType}
                    onChange={(e) => setNewNote({ ...newNote, noteType: e.target.value })}
                    className="type-select"
                  >
                    <option value="general">📝 Geral</option>
                    <option value="important">⭐ Importante</option>
                    <option value="question">❓ Pergunta</option>
                    <option value="summary">📋 Resumo</option>
                  </select>
                  <textarea
                    ref={noteContentRef}
                    placeholder="Conteúdo da anotação"
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    rows={6}
                    className="content-textarea"
                  />
                  <div className="form-actions">
                    <button onClick={handleCreateNote} className="save-button">
                      💾 Salvar
                    </button>
                    <button onClick={() => setIsCreatingNote(false)} className="cancel-button">
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="notes-list">
                {filteredNotes.map((note) => (
                  <div key={note.id} className={`note-item ${note.note_type}`}>
                    {editingNote?.id === note.id ? (
                      <div className="note-edit-form">
                        <input
                          type="text"
                          value={editingNote.title}
                          onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                          className="edit-title-input"
                        />
                        <textarea
                          value={editingNote.content}
                          onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                          rows={4}
                          className="edit-content-textarea"
                        />
                        <div className="edit-actions">
                          <button onClick={handleUpdateNote} className="save-button">
                            💾 Salvar
                          </button>
                          <button onClick={() => setEditingNote(null)} className="cancel-button">
                            ❌ Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-header">
                          <div className="note-time-info">
                            <span 
                              className="note-time"
                              onClick={() => onSeek(note.timestamp || 0)}
                              title="Clique para ir para este momento"
                            >
                              {formatTime(note.timestamp || 0)}
                            </span>
                            <span 
                              className="note-type-badge"
                              style={{ backgroundColor: getNoteTypeColor(note.note_type) }}
                            >
                              {getNoteTypeIcon(note.note_type)} {note.note_type}
                            </span>
                          </div>
                          <div className="note-actions">
                            <button 
                              onClick={() => setEditingNote(note)} 
                              className="edit-button"
                              title="Editar anotação"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteNote(note.id)} 
                              className="delete-button"
                              title="Excluir anotação"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h5 className="note-title">{note.title}</h5>
                        <p className="note-content">{note.content}</p>
                        <div className="note-footer">
                          <span className="note-date">{formatDate(note.created_at)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredNotes.length === 0 && !isCreatingNote && (
                  <div className="empty-state">
                    <p>
                      {searchTerm || selectedNoteType !== 'all' 
                        ? 'Nenhuma anotação encontrada com os filtros aplicados.' 
                        : 'Nenhuma anotação ainda. Clique em "Nova Anotação" para começar!'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="bookmarks-tab">
              <div className="bookmarks-controls">
                <button
                  className="create-button"
                  onClick={() => setIsCreatingBookmark(true)}
                  disabled={isCreatingBookmark}
                >
                  ➕ Novo Bookmark ({formatTime(currentTime)})
                </button>
              </div>

              {isCreatingBookmark && (
                <div className="bookmark-form">
                  <h4>Novo Bookmark</h4>
                  <div className="form-row">
                    <input
                      type="number"
                      step="0.1"
                      value={newBookmark.timestamp}
                      onChange={(e) => setNewBookmark({ ...newBookmark, timestamp: parseFloat(e.target.value) || 0 })}
                      className="timestamp-input"
                      placeholder="Tempo (segundos)"
                    />
                    <span className="timestamp-display">{formatTime(newBookmark.timestamp)}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Título do bookmark"
                    value={newBookmark.title}
                    onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                    className="title-input"
                  />
                  <textarea
                    placeholder="Descrição (opcional)"
                    value={newBookmark.description}
                    onChange={(e) => setNewBookmark({ ...newBookmark, description: e.target.value })}
                    rows={3}
                    className="description-textarea"
                  />
                  <div className="form-actions">
                    <button onClick={handleCreateBookmark} className="save-button">
                      💾 Salvar
                    </button>
                    <button onClick={() => setIsCreatingBookmark(false)} className="cancel-button">
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="bookmarks-list">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="bookmark-item">
                    <div className="bookmark-header">
                      <span 
                        className="bookmark-time"
                        onClick={() => onSeek(bookmark.timestamp)}
                        title="Clique para ir para este momento"
                      >
                        🔖 {formatTime(bookmark.timestamp)}
                      </span>
                      <button 
                        onClick={() => handleDeleteBookmark(bookmark.id)} 
                        className="delete-button"
                        title="Excluir bookmark"
                      >
                        🗑️
                      </button>
                    </div>
                    <h5 className="bookmark-title">{bookmark.title}</h5>
                    {bookmark.description && (
                      <p className="bookmark-description">{bookmark.description}</p>
                    )}
                    <div className="bookmark-footer">
                      <span className="bookmark-date">{formatDate(bookmark.created_at)}</span>
                    </div>
                  </div>
                ))}
                {bookmarks.length === 0 && !isCreatingBookmark && (
                  <div className="empty-state">
                    <p>Nenhum bookmark ainda. Clique em "Novo Bookmark" para marcar pontos importantes!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="search-tab">
              <div className="search-controls">
                <input
                  type="text"
                  placeholder="Buscar em anotações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select 
                  value={selectedNoteType} 
                  onChange={(e) => setSelectedNoteType(e.target.value)}
                  className="type-filter"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="general">Geral</option>
                  <option value="important">Importante</option>
                  <option value="question">Pergunta</option>
                  <option value="summary">Resumo</option>
                </select>
              </div>

              <div className="search-results">
                <p className="results-count">
                  {filteredNotes.length} anotação(ões) encontrada(s)
                </p>
                
                <div className="notes-list">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className={`note-item ${note.note_type}`}>
                      <div className="note-header">
                        <div className="note-time-info">
                          <span 
                            className="note-time"
                            onClick={() => onSeek(note.timestamp || 0)}
                            title="Clique para ir para este momento"
                          >
                            {formatTime(note.timestamp || 0)}
                          </span>
                          <span 
                            className="note-type-badge"
                            style={{ backgroundColor: getNoteTypeColor(note.note_type) }}
                          >
                            {getNoteTypeIcon(note.note_type)} {note.note_type}
                          </span>
                        </div>
                      </div>
                      <h5 className="note-title">{note.title}</h5>
                      <p className="note-content">{note.content}</p>
                      <div className="note-footer">
                        <span className="note-date">{formatDate(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesModal;