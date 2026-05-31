const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { YTDlpWrap } = require('yt-dlp-wrap');
const { PassThrough } = require('stream');

const app = express();
const ytDlpWrap = new YTDlpWrap();

// Cache for stream URLs to reduce requests
const streamCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.use(cors());

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of streamCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      streamCache.delete(key);
    }
  }
}, 60000); // Clean every minute

// Search endpoint
app.get('/search', async (req, res) => {
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

// Method 1: Try ytdl-core first
async function getStreamWithYtdl(videoId) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    });
    
    // Try to find audio-only formats first
    let audioFormat = info.formats.find(format => 
      format.hasAudio && !format.hasVideo && format.audioBitrate
    );
    
    // If no audio-only format, find best audio quality format
    if (!audioFormat) {
      audioFormat = info.formats.find(format => 
        format.hasAudio && format.audioBitrate
      );
    }
    
    // Fallback to any format with audio
    if (!audioFormat) {
      audioFormat = info.formats.find(format => format.hasAudio);
    }
    
    if (!audioFormat || !audioFormat.url) {
      throw new Error('No audio stream found');
    }
    
    return audioFormat.url;
  } catch (err) {
    console.log('ytdl-core failed:', err.message);
    throw err;
  }
}

// Method 2: Try yt-dlp as fallback
async function getStreamWithYtDlp(videoId) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get video info using yt-dlp
    const info = await ytDlpWrap.getVideoInfo(url);
    
    // Find best audio format
    const audioFormat = info.formats.find(format => 
      (format.acodec !== 'none' || format.audio_channels) && 
      format.vcodec === 'none'
    );
    
    if (!audioFormat || !audioFormat.url) {
      // Try to get any format with audio
      const anyAudioFormat = info.formats.find(format => 
        format.acodec !== 'none' || format.audio_channels
      );
      
      if (anyAudioFormat && anyAudioFormat.url) {
        return anyAudioFormat.url;
      }
      throw new Error('No audio stream found with yt-dlp');
    }
    
    return audioFormat.url;
  } catch (err) {
    console.log('yt-dlp failed:', err.message);
    throw err;
  }
}

// Method 3: Direct stream using yt-dlp as a proxy
async function getStreamAsProxy(videoId, res) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Create a stream using yt-dlp
    const stream = new PassThrough();
    
    // Execute yt-dlp to get audio stream
    const ytDlpProcess = ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '2',
      '-o', '-'
    ]);
    
    // Pipe the output to response
    ytDlpProcess.stdout.pipe(res);
    
    // Handle errors
    ytDlpProcess.on('error', (err) => {
      console.error('yt-dlp stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });
    
    return true; // Indicates we're streaming directly
  } catch (err) {
    throw err;
  }
}

// Stream endpoint with multiple fallback methods
app.get('/stream/:id', async (req, res) => {
  const videoId = req.params.id;
  
  if (!videoId || videoId.length < 5) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  try {
    // Check cache first
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Serving cached stream for: ${videoId}`);
      return res.json({ url: cached.url, source: 'cache' });
    }
    
    console.log(`Attempting to get stream for: ${videoId}`);
    
    let streamUrl = null;
    let method = null;
    
    // Try ytdl-core first
    try {
      streamUrl = await getStreamWithYtdl(videoId);
      method = 'ytdl-core';
      console.log(`Success with ${method}`);
    } catch (err1) {
      // Try yt-dlp info method as second attempt
      try {
        streamUrl = await getStreamWithYtDlp(videoId);
        method = 'yt-dlp';
        console.log(`Success with ${method}`);
      } catch (err2) {
        // If both fail, try direct proxy streaming
        console.log('Attempting proxy streaming method...');
        const streaming = await getStreamAsProxy(videoId, res);
        if (streaming) {
          return; // Response already handled by proxy stream
        }
        throw new Error('All streaming methods failed');
      }
    }
    
    // If we got a URL (not streaming directly), cache and return it
    if (streamUrl) {
      // Cache the URL
      streamCache.set(videoId, {
        url: streamUrl,
        timestamp: Date.now(),
        method: method
      });
      
      res.json({
        url: streamUrl,
        source: method,
        videoId: videoId
      });
    }
    
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ 
      error: 'Failed to get audio stream',
      details: err.message,
      suggestion: 'Try a different video or check back later'
    });
  }
});

// Alternative direct audio endpoint (returns audio directly)
app.get('/audio/:id', async (req, res) => {
  const videoId = req.params.id;
  
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Use yt-dlp to stream audio directly
    const stream = ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '2',
      '-o', '-'
    ]);
    
    stream.stdout.pipe(res);
    
    stream.on('error', (err) => {
      console.error('Audio stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio stream failed' });
      }
    });
    
  } catch (err) {
    console.error('Audio endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    methods: ['ytdl-core', 'yt-dlp', 'proxy']
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`YSN MUSIC Backend Running On Port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  - GET /search?q=query`);
  console.log(`  - GET /stream/:id`);
  console.log(`  - GET /audio/:id (direct audio stream)`);
  console.log(`  - GET /health`);
});
