const searchInput = document.getElementById("searchInput");
const songList = document.getElementById("songList");

const demoSongs = [
{
title:"Kesariya",
artist:"Arijit Singh"
},
{
title:"Tum Hi Ho",
artist:"Arijit Singh"
},
{
title:"Apna Bana Le",
artist:"Arijit Singh"
},
{
title:"Heeriye",
artist:"Arijit Singh"
},
{
title:"Shape Of You",
artist:"Ed Sheeran"
},
{
title:"Blinding Lights",
artist:"The Weeknd"
}
];

function renderSongs(list){

songList.innerHTML="";

list.forEach(song=>{

songList.innerHTML += `
<div class="glass p-5 rounded-2xl">

<h3 class="text-xl font-bold">
${song.title}
</h3>

<p class="text-gray-400 mt-2">
${song.artist}
</p>

<button
class="bg-green-400 text-black px-5 py-2 rounded-xl mt-4"
>
▶ Play
</button>

</div>
`;

});

}

renderSongs(demoSongs);

searchInput.addEventListener("keyup",(e)=>{

const value=e.target.value.toLowerCase();

const filtered=demoSongs.filter(song=>

song.title.toLowerCase().includes(value) ||
song.artist.toLowerCase().includes(value)

);

renderSongs(filtered);

});
