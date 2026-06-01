let favorites = JSON.parse(
localStorage.getItem("favorites") || "[]"
);

let recentlyPlayed = 0;
let recentSongs = [];
let totalSearches = 0;
function updateFavoriteCount(){

const favCount =
document.getElementById("favCount");

if(favCount){

favCount.innerText =
"❤️ Favorites: " +
favorites.length;

}

}
function updatePlayCount(){

const playCount =
document.getElementById("playCount");

if(playCount){

playCount.innerText =
"▶ Played: " +
recentlyPlayed;

}

}
function updateRecentSongs(){

const recentList =
document.getElementById("recentList");

if(!recentList){
return;
}

recentList.innerHTML = "";

recentSongs.forEach(song => {

recentList.innerHTML += `
<div class="glass p-4 rounded-2xl">
<h3 class="font-bold text-green-400">
${song.title}
</h3>

<p class="text-gray-400">
${song.artist}
</p>
</div>
`;

});

}
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
updateFavoriteCount();
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
<div class="glass p-5 rounded-3xl hover:scale-105 hover:-translate-y-2 transition-all duration-300">

  <img
  src="https://picsum.photos/400?random=${Math.floor(Math.random()*1000)}"
  class="w-full h-56 object-cover rounded-2xl mb-4"
  >

  <h3 class="text-xl font-bold text-green-400">
    ${song.title}
  </h3>

  <p class="text-gray-300 mt-1">
    ${song.artist}
  </p>

  <div class="flex gap-3 mt-5">

   <button
class="bg-green-400 text-black px-5 py-2 rounded-xl font-bold play-btn hover:scale-110 transition-all">
▶ Play
</button>
 <button
class="glass px-4 py-2 rounded-xl fav-btn">
${favorites.find(s => s.title === song.title) ? "💚" : "❤️"}
</button>
  </div>

</div>
`;

  });
const favBtns =
document.querySelectorAll(".fav-btn");

favBtns.forEach((btn,index)=>{
const playBtns =
document.querySelectorAll(".play-btn");

playBtns.forEach((btn,index)=>{

btn.onclick = ()=>{

recentlyPlayed++;

updatePlayCount();

alert(
"▶ Playing: " +
list[index].title
);
recentSongs.unshift(
list[index]
);

if(recentSongs.length > 6){

recentSongs.pop();

}

updateRecentSongs();
};

});
btn.onclick = ()=>{

toggleFavorite(list[index]);

btn.innerHTML = "💚";

};

});
}

renderSongs([]);
updateFavoriteCount();
updatePlayCount();
searchInput.addEventListener("input", () => {

  const value = searchInput.value.toLowerCase().trim();

  if (value === "") {

    renderSongs([]);

    return;
}
totalSearches++;

const searchCount =
document.getElementById("searchCount");

if(searchCount){

searchCount.innerText =
"🔎 Searches: " +
totalSearches;

}
  const results = demoSongs.filter(song =>
    song.title.toLowerCase().includes(value) ||
    song.artist.toLowerCase().includes(value)
  );

  renderSongs(results);
document.getElementById(
"searchCount"
).innerText =
"Results: " +
results.length;
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
let currentTheme =
Number(
localStorage.getItem("theme")
) || 0;

document.body.style.background =
themes[currentTheme];

console.log(themeBtn);
themeBtn.onclick = () => {

currentTheme++;

if(currentTheme >= themes.length){
currentTheme = 0;
}

document.body.style.background =
themes[currentTheme];
localStorage.setItem(
"theme",
currentTheme
);
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
const hour =
new Date().getHours();

const welcomeText =
document.getElementById("welcomeText");

if(welcomeText){

if(hour < 12){

welcomeText.innerText =
"🌞 Good Morning";

}
else if(hour < 18){

welcomeText.innerText =
"☀️ Good Afternoon";

}
else{

welcomeText.innerText =
"🌙 Good Evening";

}

}
const randomBtn =
document.getElementById("randomBtn");

if(randomBtn){

randomBtn.onclick = ()=>{

const randomSong =
demoSongs[
Math.floor(
Math.random() *
demoSongs.length
)
];

alert(
"🎵 " +
randomSong.title +
"\n" +
randomSong.artist
);

};

}
setTimeout(() => {

alert(
"🎵 Welcome Back To YSN MUSIC"
);

},2000);
