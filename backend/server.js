const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const youtubedl = require('youtube-audio-stream');

const app = express();
app.use(cors());

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Query required' });
    
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

// Stream endpoint
app.get('/stream/:id', (req, res) => {
  const videoId = req.params.id;
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const stream = youtubedl(url);
    req.pipe(stream).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
