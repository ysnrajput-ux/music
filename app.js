const API = 'https://music-dt1f.onrender.com';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const songList = document.getElementById('songList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const audio = document.getElementById('audio');

const miniPlayer = document.getElementById('miniPlayer');
const miniCover = document.getElementById('miniCover');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const playPauseBtn = document.getElementById('playPauseBtn');
const closePlayerBtn = document.getElementById('closePlayerBtn');

let currentSong = null;
let isPlaying = false;

// Default search on load
window.addEventListener('load', () => {
  searchSongs('popular music 2024');
});

// Search on button click
searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    searchSongs(query);
  } else {
    showToast('Please enter a search term');
  }
});

// Search on Enter key
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      searchSongs(query);
    }
  }
});

async function searchSongs(query) {
  try {
    // Show loading state
    songList.classList.add('hidden');
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const songs = await res.json();
    
    if (!songs || songs.length === 0) {
      showEmptyState();
      return;
    }
    
    renderSongs(songs);
    
  } catch (err) {
    console.error('Search error:', err);
    showToast('Failed to load songs. Please try again.');
    showEmptyState();
  } finally {
    loadingState.classList.add('hidden');
  }
}

function showEmptyState() {
  songList.classList.add('hidden');
  loadingState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  songList.innerHTML = '';
}

function showToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-xl z-[1000] text-sm font-medium shadow-lg';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderSongs(songs) {
  songList.classList.remove('hidden');
  emptyState.classList.add('hidden');
  songList.innerHTML = '';
  
  songs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-4 cursor-pointer group transition-all duration-300';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    // Format duration
    const duration = song.duration || '3:30';
    
    card.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="relative">
          <img
            src="${song.thumbnail || 'https://via.placeholder.com/80x80?text=No+Image'}"
            class="w-20 h-20 rounded-lg object-cover shadow-lg"
            alt="${escapeHtml(song.title)}"
            onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'"
          />
          <div class="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="play-now-btn play-button w-10 h-10 rounded-full text-black font-bold flex items-center justify-center text-xl">
              ▶
            </button>
          </div>
        </div>
        
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-white truncate pr-2" title="${escapeHtml(song.title)}">
            ${escapeHtml(song.title)}
          </h2>
          <p class="text-gray-400 text-sm truncate mt-1" title="${escapeHtml(song.artist)}">
            ${escapeHtml(song.artist)}
          </p>
          <p class="text-gray-500 text-xs mt-2">${duration}</p>
        </div>
        
        <button class="play-button px-4 py-2 rounded-lg text-black font-semibold text-sm transition transform hover:scale-105">
          Play
        </button>
      </div>
    `;
    
    // Add click handlers
    const playButton = card.querySelector('.play-button');
    const playNowBtn = card.querySelector('.play-now-btn');
    
    playButton.onclick = (e) => {
      e.stopPropagation();
      playSong(song);
    };
    
    if (playNowBtn) {
      playNowBtn.onclick = (e) => {
        e.stopPropagation();
        playSong(song);
      };
    }
    
    card.onclick = () => playSong(song);
    
    songList.appendChild(card);
    
    // Animate in
    setTimeout(() => {
      card.style.transition = 'all 0.3s ease-out';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

async function playSong(song) {
  try {
    currentSong = song;
    
    // Show loading indicator on play button
    showToast(`Loading: ${song.title}`);
    
    const res = await fetch(`${API}/stream/${song.videoId}`);
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to get stream');
    }
    
    const data = await res.json();
    
    if (!data.url) {
      throw new Error('No stream URL received');
    }
    
    // Set audio source and play
    audio.src = data.url;
    await audio.play();
    isPlaying = true;
    
    // Update mini player
    miniPlayer.classList.remove('hidden');
    miniCover.src = song.thumbnail || 'https://via.placeholder.com/80x80?text=No+Image';
    miniTitle.textContent = song.title;
    miniArtist.textContent = song.artist;
    playPauseBtn.textContent = '⏸';
    
    // Update document title
    document.title = `${song.title} - YSN MUSIC`;
    
    // Media Session API for better controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [
          { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      
      // Set action handlers
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => {});
      navigator.mediaSession.setActionHandler('nexttrack', () => {});
    }
    
  } catch (err) {
    console.error('Playback error:', err);
    showToast(`Playback failed: ${err.message}`);
  }
}

// Play/Pause button
playPauseBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶';
  }
};

// Close mini player
closePlayerBtn.onclick = () => {
  miniPlayer.classList.add('hidden');
  audio.pause();
  audio.src = '';
  isPlaying = false;
  document.title = 'YSN MUSIC';
};

// Audio event handlers
audio.onplay = () => {
  isPlaying = true;
  playPauseBtn.textContent = '⏸';
};

audio.onpause = () => {
  isPlaying = false;
  playPauseBtn.textContent = '▶';
};

audio.onerror = (e) => {
  console.error('Audio error:', e);
  showToast('Playback error occurred');
  playPauseBtn.textContent = '▶';
};

audio.onended = () => {
  playPauseBtn.textContent = '▶';
  isPlaying = false;
};

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// PWA Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('ServiceWorker registration failed:', err);
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Space bar for play/pause
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    if (currentSong) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  }
});

// Save current song position on page unload
window.addEventListener('beforeunload', () => {
  if (currentSong && audio.currentTime) {
    localStorage.setItem('lastSong', JSON.stringify({
      song: currentSong,
      time: audio.currentTime
    }));
  }
});

// Load last played song (optional)
const lastSongData = localStorage.getItem('lastSong');
if (lastSongData) {
  const { song, time } = JSON.parse(lastSongData);
  if (song && time < 300) { // Only if less than 5 minutes ago
    // Optionally restore last song
  }
}
