import React, { useState, useEffect } from 'react';
import { videosApi, UserNote, VideoBookmark, Video } from '../api/api';
import './VideoNotes.css';

interface VideoNotesProps {
  video: Video;
  currentTime: number;
  onSeekTo: (time: number) => void;
}

const VideoNotes: React.FC<VideoNotesProps> = ({ video, currentTime, onSeekTo }) => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', noteType: 'general' });
  const [newBookmark, setNewBookmark] = useState({ title: '', description: '' });
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  useEffect(() => {
    if (video) {
      loadNotes();
      loadBookmarks();
    }
  }, [video]);

  const loadNotes = async () => {
    try {
      const videoNotes = await videosApi.getNotesByVideo(video.id);
      setNotes(videoNotes);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const videoBookmarks = await videosApi.getVideoBookmarks(video.id);
      setBookmarks(videoBookmarks);
    } catch (error) {
      console.error('Erro ao carregar bookmarks:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const noteData = {
      video_id: video.id,
      course_id: video.course_id.toString(),
      module_id: video.module_id.toString(),
      timestamp: currentTime,
      title: newNote.title,
      content: newNote.content,
      note_type: newNote.noteType
    };

    console.log('🔍 Criando anotação com dados:', noteData);

    try {
      const result = await videosApi.createNote(noteData);
      console.log('✅ Anotação criada com sucesso:', result);

      setNewNote({ title: '', content: '', noteType: 'general' });
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
        video.id,
        currentTime,
        newBookmark.title,
        newBookmark.description
      );

      setNewBookmark({ title: '', description: '' });
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

  return (
    <div className="video-notes">
      <div className="notes-header">
        <div className="notes-tabs">
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
        </div>
        
        <div className="notes-actions">
          {activeTab === 'notes' && (
            <button
              className="add-button"
              onClick={() => setIsCreatingNote(true)}
              disabled={isCreatingNote}
            >
              ➕ Nova Anotação
            </button>
          )}
          {activeTab === 'bookmarks' && (
            <button
              className="add-button"
              onClick={() => setIsCreatingBookmark(true)}
              disabled={isCreatingBookmark}
            >
              ➕ Novo Bookmark
            </button>
          )}
        </div>
      </div>

      <div className="notes-content">
        {activeTab === 'notes' && (
          <div className="notes-tab">
            {isCreatingNote && (
              <div className="note-form">
                <h4>Nova Anotação - {formatTime(currentTime)}</h4>
                <input
                  type="text"
                  placeholder="Título da anotação"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                />
                <select
                  value={newNote.noteType}
                  onChange={(e) => setNewNote({ ...newNote, noteType: e.target.value })}
                >
                  <option value="general">Geral</option>
                  <option value="important">Importante</option>
                  <option value="question">Pergunta</option>
                  <option value="summary">Resumo</option>
                </select>
                <textarea
                  placeholder="Conteúdo da anotação"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={4}
                />
                <div className="form-actions">
                  <button onClick={handleCreateNote} className="save-button">
                    Salvar
                  </button>
                  <button onClick={() => setIsCreatingNote(false)} className="cancel-button">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="notes-list">
              {notes.map((note) => (
                <div key={note.id} className={`note-item ${note.note_type}`}>
                  {editingNote?.id === note.id ? (
                    <div className="note-form">
                      <input
                        type="text"
                        value={editingNote.title}
                        onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                      />
                      <textarea
                        value={editingNote.content}
                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                        rows={4}
                      />
                      <div className="form-actions">
                        <button onClick={handleUpdateNote} className="save-button">
                          Salvar
                        </button>
                        <button onClick={() => setEditingNote(null)} className="cancel-button">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="note-header">
                        <span className="note-time" onClick={() => onSeekTo(note.timestamp)}>
                          🕒 {formatTime(note.timestamp)}
                        </span>
                        <span className={`note-type ${note.note_type}`}>
                          {note.note_type === 'important' && '⭐'}
                          {note.note_type === 'question' && '❓'}
                          {note.note_type === 'summary' && '📋'}
                          {note.note_type === 'general' && '📝'}
                        </span>
                      </div>
                      <h5 className="note-title">{note.title}</h5>
                      <p className="note-content">{note.content}</p>
                      <div className="note-footer">
                        <span className="note-date">{formatDate(note.created_at)}</span>
                        <div className="note-actions">
                          <button onClick={() => setEditingNote(note)} className="edit-button">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} className="delete-button">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {notes.length === 0 && !isCreatingNote && (
                <div className="empty-state">
                  <p>Nenhuma anotação ainda. Clique em "Nova Anotação" para começar!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="bookmarks-tab">
            {isCreatingBookmark && (
              <div className="bookmark-form">
                <h4>Novo Bookmark - {formatTime(currentTime)}</h4>
                <input
                  type="text"
                  placeholder="Título do bookmark"
                  value={newBookmark.title}
                  onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                />
                <textarea
                  placeholder="Descrição (opcional)"
                  value={newBookmark.description}
                  onChange={(e) => setNewBookmark({ ...newBookmark, description: e.target.value })}
                  rows={2}
                />
                <div className="form-actions">
                  <button onClick={handleCreateBookmark} className="save-button">
                    Salvar
                  </button>
                  <button onClick={() => setIsCreatingBookmark(false)} className="cancel-button">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="bookmarks-list">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bookmark-item">
                  <div className="bookmark-header">
                    <span className="bookmark-time" onClick={() => onSeekTo(bookmark.timestamp)}>
                      🕒 {formatTime(bookmark.timestamp)}
                    </span>
                    <button onClick={() => handleDeleteBookmark(bookmark.id)} className="delete-button">
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
                  <p>Nenhum bookmark ainda. Clique em "Novo Bookmark" para marcar momentos importantes!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoNotes;