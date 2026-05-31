const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { YTDlpWrap } = require('yt-dlp-wrap');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const app = express();

// Cache setup with longer TTL for 429 responses
const streamCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 }); // 1 hour cache
const failedCache = new NodeCache({ stdTTL: 300 }); // Cache failed IDs for 5 minutes

// Rate limiter for search endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many search requests. Please wait a moment.' }
});

// Rate limiter for stream endpoints
const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many stream requests. Please wait a moment.' }
});

app.use(cors());
app.use(express.json());

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Method 1: Try ytdl-core with retries and better headers
async function getStreamWithYtdl(videoId, retryCount = 0) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Random user agent to avoid detection
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': randomUA,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      }
    });
    
    // Find best audio format
    let audioFormat = info.formats.find(format => 
      format.hasAudio && !format.hasVideo && format.audioBitrate
    );
    
    if (!audioFormat) {
      audioFormat = info.formats.find(format => 
        format.hasAudio && format.audioBitrate
      );
    }
    
    if (!audioFormat) {
      audioFormat = info.formats.find(format => format.hasAudio);
    }
    
    if (!audioFormat || !audioFormat.url) {
      throw new Error('No audio stream found');
    }
    
    return { url: audioFormat.url, method: 'ytdl-core' };
    
  } catch (err) {
    // Handle 429 specifically
    if (err.statusCode === 429 || err.message.includes('429')) {
      console.log(`Rate limit hit for ${videoId}, attempt ${retryCount + 1}`);
      if (retryCount < 3) {
        const waitTime = (retryCount + 1) * 2000; // 2, 4, 6 seconds
        await delay(waitTime);
        return getStreamWithYtdl(videoId, retryCount + 1);
      }
    }
    throw err;
  }
}

// Method 2: Using yt-dlp with proxy support
async function getStreamWithYtDlp(videoId, retryCount = 0) {
  try {
    const ytDlpWrap = new YTDlpWrap();
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const info = await ytDlpWrap.getVideoInfo(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Find best audio-only format
    let audioFormat = info.formats.find(format => 
      (format.acodec !== 'none' || format.audio_channels) && 
      format.vcodec === 'none'
    );
    
    if (!audioFormat) {
      audioFormat = info.formats.find(format => 
        format.acodec !== 'none' || format.audio_channels
      );
    }
    
    if (!audioFormat || !audioFormat.url) {
      throw new Error('No audio format found');
    }
    
    return { url: audioFormat.url, method: 'yt-dlp' };
    
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('rate limit')) {
      console.log(`yt-dlp rate limit for ${videoId}`);
      if (retryCount < 2) {
        await delay(3000);
        return getStreamWithYtDlp(videoId, retryCount + 1);
      }
    }
    throw err;
  }
}

// Method 3: Get direct audio stream as proxy (best for avoiding rate limits)
async function getDirectAudioStream(videoId, res) {
  return new Promise(async (resolve, reject) => {
    try {
      const { YTDlpWrap } = require('yt-dlp-wrap');
      const ytDlpWrap = new YTDlpWrap();
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Set headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=300');
      
      // Create stream with better quality
      const ytDlpProcess = ytDlpWrap.execStream([
        url,
        '-f', 'bestaudio[ext=webm]/bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '2',
        '--no-playlist',
        '--no-check-certificate',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '-o', '-'
      ]);
      
      ytDlpProcess.stdout.pipe(res);
      
      ytDlpProcess.on('error', (err) => {
        console.error('Stream error:', err);
        reject(err);
      });
      
      ytDlpProcess.on('close', () => {
        resolve(true);
      });
      
    } catch (err) {
      reject(err);
    }
  });
}

// Search endpoint with rate limiting
app.get('/search', searchLimiter, async (req, res) => {
  try {
    const q = req.query.q;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`Searching for: ${q}`);
    
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
      durationSeconds: v.duration || 0,
      url: v.url
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

// Stream endpoint with rate limiting and multiple fallbacks
app.get('/stream/:id', streamLimiter, async (req, res) => {
  const videoId = req.params.id;
  
  if (!videoId || videoId.length < 5) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  // Check if this video is temporarily blocked
  const failed = failedCache.get(videoId);
  if (failed) {
    return res.status(429).json({ 
      error: 'This video is temporarily unavailable. Please try again in a few minutes.',
      retryAfter: failed.retryAfter 
    });
  }
  
  // Check cache first
  const cached = streamCache.get(videoId);
  if (cached) {
    console.log(`Serving cached stream for: ${videoId}`);
    return res.json({ 
      url: cached.url, 
      source: cached.method,
      cached: true 
    });
  }
  
  console.log(`Attempting to get stream for: ${videoId}`);
  
  // Try direct streaming first (avoids URL expiration)
  try {
    console.log('Trying direct audio stream method...');
    await getDirectAudioStream(videoId, res);
    return; // Response already handled
  } catch (err) {
    console.log('Direct stream failed:', err.message);
  }
  
  // Try ytdl-core with retries
  try {
    const result = await getStreamWithYtdl(videoId);
    if (result && result.url) {
      streamCache.set(videoId, {
        url: result.url,
        method: result.method,
        timestamp: Date.now()
      });
      
      return res.json({
        url: result.url,
        source: result.method,
        videoId: videoId
      });
    }
  } catch (err) {
    console.log('ytdl-core failed:', err.message);
  }
  
  // Try yt-dlp as last resort
  try {
    const result = await getStreamWithYtDlp(videoId);
    if (result && result.url) {
      streamCache.set(videoId, {
        url: result.url,
        method: result.method,
        timestamp: Date.now()
      });
      
      return res.json({
        url: result.url,
        source: result.method,
        videoId: videoId
      });
    }
  } catch (err) {
    console.log('yt-dlp failed:', err.message);
  }
  
  // If all methods fail, mark as failed
  failedCache.set(videoId, {
    retryAfter: 120 // 2 minutes
  });
  
  res.status(429).json({
    error: 'Unable to get stream due to rate limiting. Please try a different song or wait a moment.',
    retryAfter: 120
  });
});

// Alternative endpoint that returns audio directly (better for rate limits)
app.get('/audio/:id', streamLimiter, async (req, res) => {
  const videoId = req.params.id;
  
  try {
    await getDirectAudioStream(videoId, res);
  } catch (err) {
    console.error('Audio stream error:', err);
    res.status(429).json({ 
      error: 'Stream unavailable due to rate limits. Please try again in a moment.' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cacheStats: {
      streamCacheSize: streamCache.keys().length,
      failedCacheSize: failedCache.keys().length
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`YSN MUSIC Backend Running On Port ${PORT}`);
});
