import querystring from 'querystring';
import axios from 'axios';
import User from '../models/User.js';

const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// @desc    Redirect to Spotify login
// @route   GET /api/spotify/login
// @access  Private (Needs JWT token in query to identify user)
export const login = (req, res) => {
  const state = generateRandomString(16) + '|' + req.user.id; // Store orbit user ID in state
  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read';

  const url = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      state: state,
      show_dialog: true
    });
    
  res.json({ url });
};

// @desc    Spotify callback
// @route   GET /api/spotify/callback
// @access  Public (Spotify redirects here)
export const callback = async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    return;
  }

  // Extract user ID from state
  const orbitUserId = state.split('|')[1];

  try {
    const authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios(authOptions);
    const { access_token, refresh_token, expires_in } = response.data;

    // Save tokens to user
    if (orbitUserId) {
      await User.findByIdAndUpdate(orbitUserId, {
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiry: new Date(Date.now() + expires_in * 1000)
      });
    }

    // Redirect back to frontend
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (frontendUrl && !frontendUrl.startsWith('http')) {
      frontendUrl = 'https://' + frontendUrl;
    }
    res.redirect(`${frontendUrl}/lobby?spotify_connected=true&access_token=${access_token}`);
  } catch (error) {
    const errorMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
    console.error('Spotify Auth Error:', errorMsg);
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (frontendUrl && !frontendUrl.startsWith('http')) {
      frontendUrl = 'https://' + frontendUrl;
    }
    res.redirect(`${frontendUrl}/lobby?error=${encodeURIComponent(errorMsg)}`);
  }
};

// @desc    Refresh Spotify token
// @route   GET /api/spotify/refresh_token
// @access  Private
export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.spotifyRefreshToken) {
      return res.status(400).json({ message: 'No refresh token available' });
    }

    const authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken
      }),
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios(authOptions);
    const { access_token, expires_in } = response.data;

    user.spotifyAccessToken = access_token;
    user.spotifyTokenExpiry = new Date(Date.now() + expires_in * 1000);
    // Sometimes a new refresh token is returned
    if (response.data.refresh_token) {
      user.spotifyRefreshToken = response.data.refresh_token;
    }
    await user.save();

    res.json({ access_token });
  } catch (error) {
    console.error('Spotify Refresh Error:', error.response?.data || error.message);
    res.status(401).json({ message: 'Failed to refresh token' });
  }
};
