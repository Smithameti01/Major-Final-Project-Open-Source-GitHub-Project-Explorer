import React, { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { 
  Search, Star, GitFork, AlertCircle, BookOpen, 
  Calendar, ExternalLink, Bookmark, FileText, 
  TrendingUp, BarChart2, X, Loader, Filter,
  Github, Database, BarChart3, Check, RefreshCw,
  Terminal, Cpu, Zap, Globe
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot,
  query
} from 'firebase/firestore';

// --- Firebase Configuration & Init ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- State Management ---
const initialState = {
  user: null,
  repos: [],
  bookmarks: new Map(), 
  notes: new Map(),     
  filters: {
    query: "react",
    sort: "stars",
    language: "",
    view: "discover"
  },
  ui: {
    loading: false,
    error: null,
    selectedRepo: null,
    modalOpen: false,
    noteText: "",
    syncing: false
  }
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_REPOS':
      return { ...state, repos: action.payload };
    
    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.payload };
    
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    
    case 'UPDATE_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'SET_LOADING':
      return { 
        ...state, 
        ui: { ...state.ui, loading: action.payload }
      };
    
    case 'SET_SYNCING':
      return {
        ...state,
        ui: { ...state.ui, syncing: action.payload }
      };

    case 'SET_ERROR':
      return { 
        ...state, 
        ui: { ...state.ui, error: action.payload }
      };
    
    case 'OPEN_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modalOpen: true,
          selectedRepo: action.repo,
          noteText: state.notes.get(String(action.repo.id))?.content || ""
        }
      };
    
    case 'CLOSE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modalOpen: false,
          selectedRepo: null,
          noteText: ""
        }
      };
    
    case 'UPDATE_NOTE':
      return {
        ...state,
        ui: { ...state.ui, noteText: action.payload }
      };
    
    default:
      return state;
  }
}

// --- Custom Hooks ---

const useGitHubAPI = () => {
  const fetchRepositories = useCallback(async (filters) => {
    const { query, sort, language } = filters;
    if (!query) return [];
    
    let searchQuery = query;
    if (language) searchQuery += ` language:${language}`;
    
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${sort}&order=desc&per_page=12`
    );
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("API Limit Exceeded. System cooling down...");
      }
      throw new Error("Data retrieval failed.");
    }
    
    const data = await response.json();
    return data.items || [];
  }, []);

  return { fetchRepositories };
};

// --- Components (Neon/Cyberpunk Style) ---

const Sidebar = ({ view, bookmarksCount, onViewChange }) => (
  <aside className="fixed left-0 top-0 h-full w-20 md:w-64 bg-gray-900 border-r border-cyan-900/50 z-40 flex flex-col transition-all duration-300">
    <div className="p-6 flex items-center gap-3 border-b border-cyan-900/30">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500 blur-md opacity-50 rounded-full"></div>
        <Terminal size={32} className="relative text-cyan-400" />
      </div>
      <span className="hidden md:block font-mono font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter">
        GIT_EXPLORER
      </span>
    </div>

    <nav className="flex-1 py-8 flex flex-col gap-2 px-3">
      <button 
        onClick={() => onViewChange('discover')}
        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${
          view === 'discover' 
            ? 'bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
        }`}
      >
        <Globe size={20} className={view === 'discover' ? 'animate-pulse' : ''} />
        <span className="hidden md:block font-mono">DISCOVER</span>
      </button>

      <button 
        onClick={() => onViewChange('bookmarks')}
        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
          view === 'bookmarks' 
            ? 'bg-purple-900/20 border border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
            : 'text-gray-400 hover:text-purple-300 hover:bg-gray-800'
        }`}
      >
        <Bookmark size={20} />
        <span className="hidden md:block font-mono">SAVED_REPOS</span>
        {bookmarksCount > 0 && (
          <span className="absolute top-2 right-2 md:top-auto md:bottom-auto md:right-4 w-5 h-5 flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full">
            {bookmarksCount}
          </span>
        )}
      </button>
    </nav>

    <div className="p-4 border-t border-cyan-900/30">
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          SYSTEM ONLINE
        </div>
        <div className="text-[10px] text-gray-500 font-mono break-all">
          ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
        </div>
      </div>
    </div>
  </aside>
);

const NeonBadge = ({ icon: Icon, value, color, label }) => {
  const colorMap = {
    yellow: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    blue: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    red: "text-red-400 border-red-500/30 bg-red-500/10",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border ${colorMap[color]} backdrop-blur-sm`}>
      <Icon className="w-4 h-4" />
      <span className="font-mono font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      {label && <span className="text-[10px] uppercase tracking-wider opacity-70 ml-1">{label}</span>}
    </div>
  );
};

const RepoCard = ({ repository, isBookmarked, onBookmarkToggle, onDetailsOpen }) => {
  return (
    <article 
      onClick={() => onDetailsOpen(repository)}
      className="group relative bg-gray-900/80 border border-gray-800 p-6 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-gray-600 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-gray-600 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-gray-600 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-gray-600 group-hover:border-cyan-400 transition-colors"></div>

      <header className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400 blur opacity-0 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <img 
              src={repository.owner.avatar_url} 
              alt={repository.owner.login}
              className="w-10 h-10 rounded-full border border-gray-700 relative z-10"
            />
          </div>
          <h3 className="font-mono font-bold text-lg text-gray-200 group-hover:text-cyan-400 transition-colors truncate max-w-[200px]">
            {repository.name}
          </h3>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onBookmarkToggle(repository); }}
          className={`p-2 rounded-lg transition-all duration-300 ${
            isBookmarked 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
              : 'text-gray-500 hover:text-purple-400 hover:bg-purple-900/20'
          }`}
        >
          <Bookmark size={18} className={isBookmarked ? "fill-current" : ""} />
        </button>
      </header>

      <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2 h-10 font-sans">
        {repository.description || "No transmission data available."}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="flex items-center gap-2 text-xs text-yellow-400/80 font-mono bg-yellow-400/5 px-2 py-1 rounded border border-yellow-400/10">
          <Star size={12} /> {repository.stargazers_count.toLocaleString()}
        </div>
        <div className="flex items-center gap-2 text-xs text-cyan-400/80 font-mono bg-cyan-400/5 px-2 py-1 rounded border border-cyan-400/10">
          <GitFork size={12} /> {repository.forks_count.toLocaleString()}
        </div>
      </div>

      <footer className="flex justify-between items-center pt-4 border-t border-gray-800">
        <span className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <span className={`w-2 h-2 rounded-sm ${repository.language ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-gray-700'}`}></span>
          {repository.language || "UNKNOWN"}
        </span>
        
        <div className="text-cyan-500 text-xs font-mono flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
          INITIATE_SCAN <TrendingUp size={12} />
        </div>
      </footer>
    </article>
  );
};

const FilterBar = ({ filters, onFiltersChange }) => (
  <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 mb-6">
    <div className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto">
      <div className="relative flex-grow group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-20 group-focus-within:opacity-75 transition duration-500"></div>
        <div className="relative flex items-center bg-gray-900 rounded-lg border border-gray-700 group-focus-within:border-transparent">
          <Search className="ml-3 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onFiltersChange({ query: e.target.value })}
            placeholder="SEARCH_DATABASE..."
            className="w-full bg-transparent border-none text-gray-200 font-mono placeholder-gray-600 focus:ring-0 py-2 px-3"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <select 
          value={filters.sort}
          onChange={(e) => onFiltersChange({ sort: e.target.value })}
          className="bg-gray-900 text-gray-300 font-mono text-sm border border-gray-700 rounded-lg px-4 py-2 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="stars">SORT: STARS</option>
          <option value="forks">SORT: FORKS</option>
          <option value="updated">SORT: UPDATED</option>
        </select>

        <select 
          value={filters.language}
          onChange={(e) => onFiltersChange({ language: e.target.value })}
          className="bg-gray-900 text-gray-300 font-mono text-sm border border-gray-700 rounded-lg px-4 py-2 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="">LANG: ALL</option>
          <option value="javascript">JS</option>
          <option value="typescript">TS</option>
          <option value="python">PYTHON</option>
          <option value="rust">RUST</option>
          <option value="go">GO</option>
        </select>
      </div>
    </div>
  </div>
);

const CyberModal = ({ isOpen, repository, noteText, onClose, onNoteChange, onNoteSave, isSyncing }) => {
  if (!isOpen || !repository) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-cyan-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.15)] relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Scanning line animation */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-scan"></div>

        <header className="sticky top-0 bg-gray-900/95 border-b border-gray-800 px-6 py-4 flex justify-between items-center z-10 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur opacity-20 rounded-full"></div>
              <img src={repository.owner.avatar_url} className="w-12 h-12 rounded-full border-2 border-gray-800 relative z-10" alt="" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-xl text-white tracking-tight flex items-center gap-2">
                {repository.full_name}
              </h2>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">SECURE</span>
                <span className="text-[10px] font-mono bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">PUBLIC ACCESS</span>
              </div>
            </div>
          </div>
          <button 
            className="p-2 hover:bg-red-900/20 text-gray-500 hover:text-red-400 rounded transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </header>

        <div className="p-8 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-cyan-500 font-mono text-sm mb-2 flex items-center gap-2">
                <Cpu size={14} /> DESCRIPTION_LOG
              </h3>
              <p className="text-gray-300 leading-relaxed bg-gray-800/30 p-4 rounded border border-gray-800">
                {repository.description}
              </p>
              <a 
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-purple-400 font-mono text-sm hover:text-purple-300 hover:underline"
              >
                <ExternalLink size={14} /> ACCESS_SOURCE_CODE
              </a>
            </div>
            
            <div className="space-y-3">
              <NeonBadge icon={Star} value={repository.stargazers_count} color="yellow" label="STARS" />
              <NeonBadge icon={GitFork} value={repository.forks_count} color="blue" label="FORKS" />
              <NeonBadge icon={AlertCircle} value={repository.open_issues_count} color="red" label="ISSUES" />
              <NeonBadge icon={Database} value={repository.watchers_count} color="purple" label="WATCH" />
            </div>
          </section>

          <section className="bg-gray-950 rounded-xl p-1 border border-gray-800">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center gap-2 font-mono font-bold text-gray-200">
                  <FileText size={16} className="text-green-500" />
                  USER_NOTES.txt
                </h3>
                {isSyncing ? (
                   <span className="text-xs font-mono text-green-500 animate-pulse flex items-center gap-2">
                     <RefreshCw size={10} className="animate-spin" /> UPLOADING
                   </span>
                ) : (
                   <span className="text-xs font-mono text-gray-600">LOCAL_SYNC_ACTIVE</span>
                )}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="// Enter observation data here..."
                className="w-full h-32 p-4 bg-black/50 border border-gray-700 rounded text-green-400 font-mono text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-900/50 placeholder-gray-700 resize-none"
              />
              <div className="flex justify-end mt-3">
                <button 
                  onClick={onNoteSave} 
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 px-6 py-2 rounded font-mono text-sm transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                >
                  <Check size={16} /> EXECUTE_SAVE
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function GitHubExplorer() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { fetchRepositories } = useGitHubAPI();
  const searchTimeoutRef = useRef();

  const { user, repos, bookmarks, notes, filters, ui } = state;

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
        dispatch({ type: 'SET_ERROR', payload: "Authentication Matrix Failed." });
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => dispatch({ type: 'SET_USER', payload: u }));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const bookmarksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'bookmarks');
    const unsubBookmarks = onSnapshot(bookmarksRef, 
      (snapshot) => {
        const newBookmarks = new Map();
        snapshot.forEach(doc => newBookmarks.set(doc.id, doc.data()));
        dispatch({ type: 'SET_BOOKMARKS', payload: newBookmarks });
      },
      (error) => console.error("Bookmark sync error:", error)
    );

    const notesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
    const unsubNotes = onSnapshot(notesRef, 
      (snapshot) => {
        const newNotes = new Map();
        snapshot.forEach(doc => newNotes.set(doc.id, doc.data()));
        dispatch({ type: 'SET_NOTES', payload: newNotes });
      },
      (error) => console.error("Note sync error:", error)
    );

    return () => { unsubBookmarks(); unsubNotes(); };
  }, [user]);

  const handleSearch = useCallback(async () => {
    if (filters.view !== 'discover') return;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const repositories = await fetchRepositories(filters);
      dispatch({ type: 'SET_REPOS', payload: repositories });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [filters, fetchRepositories]);

  const handleBookmarkToggle = useCallback(async (repo) => {
    if (!user) return;
    const repoId = String(repo.id);
    const isBookmarked = bookmarks.has(repoId);
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', repoId);

    try {
      if (isBookmarked) await deleteDoc(docRef);
      else await setDoc(docRef, repo);
    } catch (err) {
      console.error("Bookmark error", err);
      dispatch({ type: 'SET_ERROR', payload: "Bookmark Protocol Failed." });
    }
  }, [user, bookmarks]);

  const handleNoteSave = useCallback(async () => {
    if (!user || !ui.selectedRepo) return;
    const repoId = String(ui.selectedRepo.id);
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'notes', repoId);
    
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await setDoc(docRef, { content: ui.noteText, updatedAt: new Date().toISOString() });
      setTimeout(() => dispatch({ type: 'SET_SYNCING', payload: false }), 500);
    } catch (err) {
      dispatch({ type: 'SET_SYNCING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: "Note Encryption Failed." });
    }
  }, [user, ui.selectedRepo, ui.noteText]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (filters.view === 'discover') searchTimeoutRef.current = setTimeout(handleSearch, 600);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [filters, handleSearch]);

  const displayedRepos = filters.view === 'bookmarks' ? Array.from(bookmarks.values()) : repos;

  return (
    <div className="flex h-screen bg-black text-gray-100 font-sans overflow-hidden">
      <Sidebar 
        view={filters.view} 
        bookmarksCount={bookmarks.size} 
        onViewChange={(view) => dispatch({ type: 'UPDATE_FILTERS', payload: { view } })} 
      />

      <div className="flex-1 flex flex-col ml-20 md:ml-64 h-full overflow-hidden relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-black z-0"></div>
        
        <div className="relative z-10 flex flex-col h-full">
           {filters.view === 'discover' && (
            <FilterBar 
              filters={filters} 
              onFiltersChange={(updates) => dispatch({ type: 'UPDATE_FILTERS', payload: updates })} 
            />
          )}

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {ui.error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-2 max-w-4xl mx-auto">
                <AlertCircle size={24} className="shrink-0 animate-pulse" />
                <span className="font-mono font-bold">ERROR: {ui.error}</span>
              </div>
            )}

            {ui.loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-cyan-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                  <Loader className="w-16 h-16 animate-spin relative z-10" />
                </div>
                <p className="font-mono mt-6 text-lg animate-pulse">ESTABLISHING CONNECTION...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {displayedRepos.map(repo => (
                    <RepoCard
                      key={repo.id}
                      repository={repo}
                      isBookmarked={bookmarks.has(String(repo.id))}
                      onBookmarkToggle={handleBookmarkToggle}
                      onDetailsOpen={(r) => dispatch({ type: 'OPEN_MODAL', repo: r })}
                    />
                  ))}
                </div>

                {displayedRepos.length === 0 && !ui.loading && (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-600 text-center">
                    <div className="bg-gray-900 p-6 rounded-full mb-6 border border-gray-800">
                      <Terminal size={48} className="opacity-50" />
                    </div>
                    <h3 className="text-xl font-mono text-gray-400 mb-2">
                      {filters.view === 'bookmarks' ? 'NO_SAVED_DATA_FOUND' : 'SEARCH_YIELDED_ZERO_RESULTS'}
                    </h3>
                    <p className="max-w-sm mx-auto font-mono text-sm opacity-60">
                      {filters.view === 'bookmarks' ? 'Initiate discovery to populate database.' : 'Refine search parameters and retry.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <CyberModal
        isOpen={ui.modalOpen}
        repository={ui.selectedRepo}
        noteText={ui.noteText}
        isSyncing={ui.syncing}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onNoteChange={(text) => dispatch({ type: 'UPDATE_NOTE', payload: text })}
        onNoteSave={handleNoteSave}
      />
    </div>
  );
}
