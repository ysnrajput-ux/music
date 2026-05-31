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
let retryTimeout = null;

// Initialize
window.addEventListener('load', () => {
  searchSongs('Trending Punjabi Bollywood English Songs');
});

// Search button click
searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    searchSongs(query);
  } else {
    showToast('Please enter a search term');
  }
});

// Enter key search
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      searchSongs(query);
    }
  }
});

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

// Close player button
closePlayerBtn.onclick = () => {
  miniPlayer.classList.add('hidden');
  audio.pause();
  audio.src = '';
  isPlaying = false;
  document.title = 'YSN MUSIC';
  if (retryTimeout) clearTimeout(retryTimeout);
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

audio.onerror = () => {
  showToast('Playback error. Try another song.');
  playPauseBtn.textContent = '▶';
};

// Search function
async function searchSongs(query) {
  try {
    songList.classList.add('hidden');
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
    
    if (res.status === 429) {
      showToast('Too many requests. Please wait a moment.');
      loadingState.classList.add('hidden');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
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

// Render songs to UI
function renderSongs(songs) {
  songList.classList.remove('hidden');
  emptyState.classList.add('hidden');
  songList.innerHTML = '';
  
  songs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-4 cursor-pointer group transition-all duration-300';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    card.innerHTML = `
      <div class="flex items-start gap-4">
        <img
          src="${song.thumbnail || 'https://via.placeholder.com/80x80?text=No+Image'}"
          class="w-20 h-20 rounded-lg object-cover shadow-lg"
          alt="${escapeHtml(song.title)}"
          onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'"
        />
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-white truncate">${escapeHtml(song.title)}</h2>
          <p class="text-gray-400 text-sm truncate mt-1">${escapeHtml(song.artist)}</p>
          <p class="text-gray-500 text-xs mt-2">${song.duration}</p>
        </div>
        <button class="play-button px-4 py-2 rounded-lg text-black font-semibold text-sm">
          Play
        </button>
      </div>
    `;
    
    const playButton = card.querySelector('.play-button');
    playButton.onclick = (e) => {
      e.stopPropagation();
      playSong(song);
    };
    
    card.onclick = () => playSong(song);
    
    songList.appendChild(card);
    
    setTimeout(() => {
      card.style.transition = 'all 0.3s ease-out';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

// UPDATED: playSongWithRetry function
async function playSongWithRetry(song, retries = 3) {
  currentSong = song;
  showToast(`Loading: ${song.title}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${retries} for ${song.title}`);
      
      const res = await fetch(`${API}/stream/${song.videoId}`);
      
      // Handle rate limiting
      if (res.status === 429) {
        const waitTime = 2000 * (i + 1); // 2s, 4s, 6s
        showToast(`Rate limited. Retrying in ${waitTime/1000}s... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!data.url) {
        throw new Error('No stream URL received');
      }
      
      // Success - play the audio
      audio.src = data.url;
      await audio.play();
      isPlaying = true;
      
      // Update mini player
      miniPlayer.classList.remove('hidden');
      miniCover.src = song.thumbnail || 'https://via.placeholder.com/80x80?text=No+Image';
      miniTitle.textContent = song.title;
      miniArtist.textContent = song.artist;
      playPauseBtn.textContent = '⏸';
      
      document.title = `${song.title} - YSN MUSIC`;
      
      // Media Session API
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          artwork: [
            { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' }
          ]
        });
        
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      }
      
      showToast(`Now playing: ${song.title}`);
      return true;
      
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err.message);
      
      if (i === retries - 1) {
        // Last attempt failed
        showToast(`Failed to play "${song.title}". Please try another song.`);
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Direct audio endpoint (fallback method)
async function playSongDirect(song) {
  try {
    showToast(`Streaming directly: ${song.title}`);
    audio.src = `${API}/audio/${song.videoId}`;
    await audio.play();
    isPlaying = true;
    
    miniPlayer.classList.remove('hidden');
    miniCover.src = song.thumbnail;
    miniTitle.textContent = song.title;
    miniArtist.textContent = song.artist;
    playPauseBtn.textContent = '⏸';
    
    return true;
  } catch (err) {
    console.error('Direct playback error:', err);
    showToast('Playback failed. Please try another song.');
    return false;
  }
}

// Main play function
async function playSong(song) {
  // Clear any existing retry timeout
  if (retryTimeout) clearTimeout(retryTimeout);
  
  // Try with retry logic first
  const success = await playSongWithRetry(song, 3);
  
  // If retry fails, try direct method
  if (!success) {
    console.log('Retry failed, trying direct method...');
    await playSongDirect(song);
  }
}

// Helper functions
function showEmptyState() {
  songList.classList.add('hidden');
  loadingState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  songList.innerHTML = '';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900/95 text-white px-6 py-3 rounded-xl z-[1000] text-sm font-medium shadow-lg border border-green-400/30';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.log);
}
