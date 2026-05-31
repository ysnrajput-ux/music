const resultsSection =
document.getElementById("resultsSection");
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
    class="glass px-4 py-2 rounded-xl">
      ❤️
    </button>

  </div>

</div>
`;

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
