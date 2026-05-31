let favorites = JSON.parse(
localStorage.getItem("favorites") || "[]"
);
function toggleFavorite(song){

const exists = favorites.find(
s => s.title === song.title
);

if(exists){

favorites = favorites.filter(
s => s.title !== song.title
);

}else{

favorites.push(song);

}

localStorage.setItem(
"favorites",
JSON.stringify(favorites)
);

}
const searchInput = document.getElementById("searchInput");
const songList = document.getElementById("songList");

const demoSongs = [
  { title: "Kesariya", artist: "Arijit Singh" },
  { title: "Tum Hi Ho", artist: "Arijit Singh" },
  { title: "Apna Bana Le", artist: "Arijit Singh" },
  { title: "Heeriye", artist: "Arijit Singh" },
  { title: "Shape Of You", artist: "Ed Sheeran" },
  { title: "Blinding Lights", artist: "The Weeknd" }
];

function renderSongs(list) {
if(list.length === 0){
  songList.innerHTML = `
  <p class="text-gray-400 text-center col-span-full">
    Search music...
  </p>`;
  return;
}
  songList.innerHTML = "";

  list.forEach(song => {

  songList.innerHTML += `
<div class="glass p-5 rounded-3xl hover:scale-105 transition-all duration-300">

  <img
  src="https://picsum.photos/400?random=${Math.floor(Math.random()*1000)}"
  class="w-full h-56 object-cover rounded-2xl mb-4"
  >

  <h3 class="text-xl font-bold">
    ${song.title}
  </h3>

  <p class="text-gray-400 mt-1">
    ${song.artist}
  </p>

  <div class="flex gap-3 mt-5">

    <button
    class="bg-green-400 text-black px-5 py-2 rounded-xl font-bold">
      ▶ Play
    </button>

   <button
class="glass px-4 py-2 rounded-xl fav-btn">
❤️
</button>
  </div>

</div>
`;

  });
const favBtns =
document.querySelectorAll(".fav-btn");

favBtns.forEach((btn,index)=>{

btn.onclick = ()=>{

toggleFavorite(list[index]);

btn.innerHTML = "💚";

};

});
}

renderSongs([]);

searchInput.addEventListener("input", () => {

  const value = searchInput.value.toLowerCase().trim();

  if (value === "") {

    renderSongs([]);

    return;
}

  const results = demoSongs.filter(song =>
    song.title.toLowerCase().includes(value) ||
    song.artist.toLowerCase().includes(value)
  );

  renderSongs(results);

});
console.log("APP LOADED");
searchInput.addEventListener("input", () => {
  console.log("typing:", searchInput.value);
});
const themeBtn =
document.getElementById("themeBtn");
console.log(
document.getElementById("themeBtn")
);
const themes = [
"#050505",
"#220033",
"#001933",
"#001f10",
"#2b0000",
"#000000",
"#1f1700",
"#001f26",
"#2d033b",
"#202020"
];

let currentTheme = 0;
console.log(themeBtn);
themeBtn.onclick = () => {

currentTheme++;

if(currentTheme >= themes.length){
currentTheme = 0;
}

document.body.style.background =
themes[currentTheme];

};
const homeBtn =
document.getElementById("homeBtn");

const trendingBtn =
document.getElementById("trendingBtn");

const favoritesBtn =
document.getElementById("favoritesBtn");

if(homeBtn){

homeBtn.onclick = () => {

window.scrollTo({
top:0,
behavior:"smooth"
});

};

}

if(trendingBtn){

trendingBtn.onclick = () => {

alert("Trending Section");

};

}

if(favoritesBtn){

favoritesBtn.onclick = () => {

alert(
"Favorites Saved: " +
favorites.length
);

};

}

trendingBtn.onclick = () => {

alert("🔥 Trending Section");

};

favoritesBtn.onclick = () => {

alert(
"❤️ Favorites Saved: " +
favorites.length
);

};
const playlistBtn =
document.getElementById("playlistBtn");

const settingsBtn =
document.getElementById("settingsBtn");

if(playlistBtn){

playlistBtn.onclick = () => {

alert("🎵 Playlist Feature Coming Soon");

};

}

if(settingsBtn){

settingsBtn.onclick = () => {

alert("⚙ Settings Panel Coming Soon");

};

}
