import React, { useState, useEffect, useRef } from 'react';
import { videosApi, UserNote, VideoBookmark } from '../api/api';
import './NotesSidebar.css';

interface NotesSidebarProps {
  videoId: string;
  videoName: string;
  currentTime: number;
  onSeek: (time: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({ 
  videoId, 
  videoName,
  currentTime, 
  onSeek, 
  isOpen,
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

  const noteContentRef = useRef<HTMLTextAreaElement>(null);

  const abbreviateVideoName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    
    // Remove extensão se presente
    const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
    
    // Se ainda for muito longo, abrevia
    if (nameWithoutExt.length > maxLength) {
      return nameWithoutExt.substring(0, maxLength - 3) + '...';
    }
    
    return nameWithoutExt;
  };

  useEffect(() => {
    if (videoId && isOpen) {
      loadNotes();
      loadBookmarks();
      setNewNote(prev => ({ ...prev, timestamp: currentTime }));
      setNewBookmark(prev => ({ ...prev, timestamp: currentTime }));
    }
  }, [videoId, currentTime, isOpen]);

  useEffect(() => {
    filterAndSortNotes();
  }, [notes, searchTerm, selectedNoteType, sortBy, sortOrder]);

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
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredNotes(filtered);
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

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      alert('Por favor, preencha o título e o conteúdo da anotação.');
      return;
    }

    const noteData = {
      video_id: videoId,
      course_id: '1',
      module_id: '1',
      timestamp: newNote.timestamp,
      title: newNote.title,
      content: newNote.content,
      note_type: newNote.noteType
    };

    console.log('🔍 NotesSidebar - Criando anotação com dados:', noteData);

    try {
      const result = await videosApi.createNote(noteData);
      console.log('✅ NotesSidebar - Anotação criada com sucesso:', result);

      setNewNote({ title: '', content: '', noteType: 'general', timestamp: currentTime });
      setIsCreatingNote(false);
      loadNotes();
    } catch (error) {
      console.error('❌ NotesSidebar - Erro ao criar anotação:', error);
      alert('Erro ao criar anotação. Tente novamente.');
    }
  };

  const handleCreateBookmark = async () => {
    if (!newBookmark.title.trim()) {
      alert('Por favor, preencha o título do bookmark.');
      return;
    }

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
      alert('Erro ao criar bookmark. Tente novamente.');
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.title.trim() || !editingNote.content.trim()) {
      alert('Por favor, preencha o título e o conteúdo da anotação.');
      return;
    }

    try {
      await videosApi.updateNote(editingNote.id, editingNote.title, editingNote.content);

      setEditingNote(null);
      loadNotes();
    } catch (error) {
      console.error('Erro ao atualizar anotação:', error);
      alert('Erro ao atualizar anotação. Tente novamente.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) {
      return;
    }

    try {
      await videosApi.deleteNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Erro ao excluir anotação:', error);
      alert('Erro ao excluir anotação. Tente novamente.');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('Tem certeza que deseja excluir este bookmark?')) {
      return;
    }

    try {
      await videosApi.deleteBookmark(bookmarkId);
      loadBookmarks();
    } catch (error) {
      console.error('Erro ao excluir bookmark:', error);
      alert('Erro ao excluir bookmark. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notes-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h3>📝 Anotações</h3>
          <p className="video-title" title={videoName}>{abbreviateVideoName(videoName)}</p>
        </div>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notas ({notes.length})
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

      <div className="sidebar-content">
        {activeTab === 'notes' && (
          <div className="notes-tab">
            <div className="notes-controls">
              <button
                className="create-button"
                onClick={() => setIsCreatingNote(true)}
                disabled={isCreatingNote}
              >
                ➕ Nova ({formatTime(currentTime)})
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
                <option value="all">Todos</option>
                <option value="general">Geral</option>
                <option value="important">Importante</option>
                <option value="question">Pergunta</option>
                <option value="summary">Resumo</option>
              </select>
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
                    placeholder="Tempo (s)"
                  />
                  <span className="timestamp-display">{formatTime(newNote.timestamp)}</span>
                </div>
                <input
                  type="text"
                  placeholder="Título"
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
                  placeholder="Conteúdo"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={4}
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
                        rows={3}
                        className="edit-content-textarea"
                      />
                      <div className="edit-actions">
                        <button onClick={handleUpdateNote} className="save-button">
                          💾
                        </button>
                        <button onClick={() => setEditingNote(null)} className="cancel-button">
                          ❌
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-content">
                      <div className="note-header">
                        <span 
                          className="note-timestamp"
                          onClick={() => onSeek(note.timestamp || 0)}
                        >
                          {formatTime(note.timestamp || 0)}
                        </span>
                        <div className="note-actions">
                          <button 
                            onClick={() => setEditingNote(note)}
                            className="edit-button"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="delete-button"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <h4 className="note-title">{note.title}</h4>
                      <p className="note-text">{note.content}</p>
                      <span className="note-type-badge">{note.note_type}</span>
                    </div>
                  )}
                </div>
              ))}
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
                    placeholder="Tempo (s)"
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
                  <div className="bookmark-content">
                    <div className="bookmark-header">
                      <span 
                        className="bookmark-timestamp"
                        onClick={() => onSeek(bookmark.timestamp)}
                      >
                        {formatTime(bookmark.timestamp)}
                      </span>
                      <button 
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="delete-button"
                      >
                        🗑️
                      </button>
                    </div>
                    <h4 className="bookmark-title">{bookmark.title}</h4>
                    {bookmark.description && (
                      <p className="bookmark-description">{bookmark.description}</p>
                    )}
                  </div>
                </div>
              ))}
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
            </div>
            
            <div className="search-results">
              {filteredNotes.map((note) => (
                <div key={note.id} className="search-result-item">
                  <div className="search-result-header">
                    <span 
                      className="result-timestamp"
                      onClick={() => onSeek(note.timestamp || 0)}
                    >
                      {formatTime(note.timestamp || 0)}
                    </span>
                    <span className="result-type">{note.note_type}</span>
                  </div>
                  <h4 className="result-title">{note.title}</h4>
                  <p className="result-content">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesSidebar;