const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const app = express();

app.use(cors());

app.get('/search', async (req, res) => {

  try {

    const q = req.query.q;

    const result = await yts(q);

    const songs = result.videos.slice(0, 20).map(v => ({
      title: v.title,
      artist: v.author.name,
      thumbnail: v.thumbnail,
      videoId: v.videoId,
      duration: v.timestamp
    }));

    res.json(songs);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

app.get('/stream/:id', async (req, res) => {

  try {

    const url = `https://www.youtube.com/watch?v=${req.params.id}`;

    const info = await ytdl.getInfo(url);

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'lowestaudio',
      filter: 'audioonly'
    });

    if (!format || !format.url) {

      return res.status(404).json({
        error: 'No audio stream found'
      });

    }

    res.json({
      url: format.url
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.listen(3000, () => {
  console.log('YSN MUSIC Backend Running On Port 3000');
});
