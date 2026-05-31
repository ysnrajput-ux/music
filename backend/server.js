const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { YTDlpWrap } = require('yt-dlp-wrap');
const rateLimit = require('express-rate-limit');

const app = express();

// Simple in-memory cache with shorter TTL
const streamCache = new Map();
const requestCounts = new Map(); // Track request frequency per video

// Cleanup function
setInterval(() => {
  const now = Date.now();
  // Clear old cache entries (5 minutes)
  for (const [key, value] of streamCache.entries()) {
    if (now - value.timestamp > 300000) {
      streamCache.delete(key);
    }
  }
  // Clear old request counts (1 minute)
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.timestamp > 60000) {
      requestCounts.delete(key);
    }
  }
}, 60000);

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Too many requests. Please wait a moment.' }
});

app.use(cors());
app.use(limiter);

// Helper to check if we're requesting too fast for a video
function isRateLimited(videoId) {
  const now = Date.now();
  const requests = requestCounts.get(videoId);
  
  if (!requests) {
    requestCounts.set(videoId, { count: 1, timestamp: now });
    return false;
  }
  
  // Reset if older than 30 seconds
  if (now - requests.timestamp > 30000) {
    requestCounts.set(videoId, { count: 1, timestamp: now });
    return false;
  }
  
  // Allow 3 requests per 30 seconds per video
  if (requests.count >= 3) {
    return true;
  }
  
  requests.count++;
  requestCounts.set(videoId, requests);
  return false;
}

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`Searching for: ${q}`);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await yts(q);
    
    if (!result || !result.videos || result.videos.length === 0) {
      return res.status(404).json({ error: 'No videos found' });
    }
    
    const songs = result.videos.slice(0, 20).map(v => ({
      title: v.title || 'Unknown Title',
      artist: v.author?.name || 'Unknown Artist',
      thumbnail: v.thumbnail || '',
      videoId: v.videoId,
      duration: v.timestamp || '0:00',
      durationSeconds: v.duration || 0
    }));
    
    res.json(songs);
    
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      error: 'Failed to search videos',
      details: err.message 
    });
  }
});

// Get stream URL with multiple methods
async function getStreamUrl(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  ];
  
  // Try ytdl-core first
  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      }
    });
    
    // Find audio format
    let format = info.formats.find(f => f.hasAudio && !f.hasVideo && f.audioBitrate);
    if (!format) format = info.formats.find(f => f.hasAudio && f.audioBitrate);
    if (!format) format = info.formats.find(f => f.hasAudio);
    
    if (format && format.url) {
      return { url: format.url, method: 'ytdl-core' };
    }
  } catch (err) {
    console.log(`ytdl-core error for ${videoId}:`, err.message);
  }
  
  // Try yt-dlp as fallback
  try {
    const ytDlpWrap = new YTDlpWrap();
    const info = await ytDlpWrap.getVideoInfo(url);
    
    let format = info.formats.find(f => (f.acodec !== 'none' || f.audio_channels) && f.vcodec === 'none');
    if (!format) format = info.formats.find(f => f.acodec !== 'none' || f.audio_channels);
    
    if (format && format.url) {
      return { url: format.url, method: 'yt-dlp' };
    }
  } catch (err) {
    console.log(`yt-dlp error for ${videoId}:`, err.message);
  }
  
  return null;
}

// Stream endpoint
app.get('/stream/:id', async (req, res) => {
  const videoId = req.params.id;
  
  if (!videoId || videoId.length < 5) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  // Check if we're requesting too fast
  if (isRateLimited(videoId)) {
    return res.status(429).json({ 
      error: 'Requesting too fast. Please wait a moment.',
      retryAfter: 5
    });
  }
  
  // Check cache
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < 300000) {
    console.log(`Returning cached stream for ${videoId}`);
    return res.json({ url: cached.url, source: 'cache' });
  }
  
  console.log(`Fetching stream for ${videoId}`);
  
  try {
    const result = await getStreamUrl(videoId);
    
    if (result && result.url) {
      // Cache the result
      streamCache.set(videoId, {
        url: result.url,
        method: result.method,
        timestamp: Date.now()
      });
      
      res.json({ 
        url: result.url, 
        source: result.method,
        videoId: videoId
      });
    } else {
      res.status(404).json({ 
        error: 'No audio stream found for this video',
        videoId: videoId
      });
    }
  } catch (err) {
    console.error(`Stream error for ${videoId}:`, err);
    res.status(500).json({ 
      error: 'Failed to get stream URL',
      details: err.message
    });
  }
});

// Direct audio proxy endpoint (most reliable)
app.get('/audio/:id', async (req, res) => {
  const videoId = req.params.id;
  
  if (!videoId || videoId.length < 5) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  if (isRateLimited(videoId)) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }
  
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const ytDlpWrap = new YTDlpWrap();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    const stream = ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '2',
      '--no-playlist',
      '-o', '-'
    ]);
    
    stream.stdout.pipe(res);
    
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });
    
  } catch (err) {
    console.error('Audio proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cacheSize: streamCache.size
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
