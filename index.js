const express = require('express');
const app = express();
const axios = require('axios');
require('dotenv').config();

// Middleware
app.use(express.static('public'));
app.use(express.json());

let accessToken = '';

app.get('/authorize', (req, res) => {
  const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${process.env.ZOOM_REDIRECT_URI}`;
  res.redirect(zoomAuthUrl);
});

// http://localhost:3000/callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI,
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
    });

    accessToken = response.data.access_token;
    res.json({ accessToken });
  } catch (error) {
    console.error('Error fetching Zoom token:', error);
    res.status(500).send('OAuth Error');
  }
});

// Endpoint to create a meeting
app.post('/create-meeting', async (req, res) => {
  const { userId = 'me' } = req.body; // Use "me" by default
  if (!accessToken) {
    return res
      .status(400)
      .send('Access token is missing. Please authorize the app first.');
  }

  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      {
        topic: 'New Zoom Meeting',
        type: 1, // Instant meeting
        settings: {
          host_video: true,
          participant_video: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Meeting created:', response.data);
    res.json(response.data); // Returns meeting details
  } catch (error) {
    console.error('Error creating meeting:', error.response.data);
    res.status(500).send('Failed to create meeting.');
  }
});

app.listen(3000, () => {
  console.log(`Server running on http://localhost:${3000}`);
});
