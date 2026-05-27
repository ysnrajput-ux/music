const API = 'https://ysnrajput-ux.github.io/music';

const searchInput = document.getElementById('searchInput');
const songList = document.getElementById('songList');
const audio = document.getElementById('audio');

const miniPlayer = document.getElementById('miniPlayer');
const miniCover = document.getElementById('miniCover');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const playBtn = document.getElementById('playBtn');

let currentSong = null;

async function searchSongs(query){

  try{

    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);

    const songs = await res.json();

    renderSongs(songs);

  }catch(err){

    console.error(err);

    songList.innerHTML = `
      <div class="text-center text-red-400 mt-10">
        Failed to load songs
      </div>
    `;

  }

}

function renderSongs(songs){

  songList.innerHTML='';

  songs.forEach(song=>{

    const card=document.createElement('div');

    card.className='song-card glass rounded-3xl p-3 flex items-center gap-4 mb-4 cursor-pointer';

    card.innerHTML=`

      <img
      src="${song.thumbnail}"
      class="w-16 h-16 rounded-2xl object-cover"
      >

      <div class="flex-1 overflow-hidden">

        <h2 class="font-bold truncate">
          ${song.title}
        </h2>

        <p class="text-gray-400 text-sm truncate">
          ${song.artist}
        </p>

      </div>

      <button
      class="bg-green-400 text-black px-4 py-2 rounded-full"
      >
      ▶
      </button>

    `;

    card.onclick=()=>playSong(song);

    songList.appendChild(card);

  });

}

function playSong(song){

  currentSong = song;

  audio.src = `${API}/stream/${song.videoId}`;

  audio.play();

  miniPlayer.classList.remove('hidden');

  miniPlayer.classList.add('flex');

  miniCover.src = song.thumbnail;

  miniTitle.innerText = song.title;

  miniArtist.innerText = song.artist;

  playBtn.innerText='⏸';

  if('mediaSession' in navigator){

    navigator.mediaSession.metadata = new MediaMetadata({

      title: song.title,

      artist: song.artist,

      artwork:[
        {
          src:song.thumbnail,
          sizes:'512x512',
          type:'image/png'
        }
      ]

    });

  }

}

playBtn.onclick=()=>{

  if(audio.paused){

    audio.play();

    playBtn.innerText='⏸';

  }else{

    audio.pause();

    playBtn.innerText='▶';

  }

};

audio.onerror=()=>{

  alert('Playback failed');

};

let timeout;

searchInput.addEventListener('input',()=>{

  clearTimeout(timeout);

  timeout=setTimeout(()=>{

    if(searchInput.value.trim()){

      searchSongs(searchInput.value);

    }

  },400);

});

searchSongs('Trending Punjabi Bollywood English Songs');

if('serviceWorker' in navigator){

  navigator.serviceWorker.register('sw.js');

}
