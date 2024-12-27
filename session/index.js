const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors')

dotenv.config();

const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(cors());

function generateVideoSdkSessionJwt(appKey, appSecret, sessionId, userId, role, tokenExpiry = 3600) {
    const iat = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const exp = iat + tokenExpiry; // Token expiry timestamp
  
    const payload = {
      app_key: appKey,
      tpc: sessionId,
      role_type: role, // Role (0: attendee, 1: host)
      user_identity: userId,
      version: 1,
      iat: iat,
      exp: exp,
    };
  
    // Generate and sign the token using HMAC SHA256
    const token = jwt.sign(payload, appSecret, { algorithm: 'HS256' });
  
    return token;
  }

app.post('/create-session', async (req, res) => {
  try {
    const token = jwt.sign(
      {
        iss: process.env.ZOOM_API_KEY,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token valid for 1 hour
      },
      process.env.ZOOM_API_SECRET,
    );

    console.log('Your Zoom JWT:', token);
    const response = await axios.post(
      'https://api.zoom.us/v2/videosdk/sessions',
      {
        session_name: req.body.sessionName,
        session_password: req.body.sessionPasscode,
        settings: {
            auto_recording: 'cloud',
            host_video: true,
            participant_video: true,
            cn_meeting: false,
            in_meeting: false,
            join_before_host: true,
            mute_upon_entry: false,
            watermark: false,
            use_pmi: false,
            approval_type: 2,
            registration_type: 1,
            audio: 'voip',
            auto_delete_cmr: true,
            alternative_hosts: 'string',
            close_registration: false,
            waiting_room: false,
            registrants_email_notification: true,
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('Session info:', response.data);

    // host token
    const feToken = generateVideoSdkSessionJwt(process.env.ZOOM_SDK_KEY, process.env.ZOOM_SDK_SECRET, response.data.session_id, 'user1', 1);
    console.log('FE TOKEN:', feToken);
    response.data.fe_token = feToken;
    res.json(response.data);
  } catch (error) {
    console.error('Error creating session:', error.response.data);
    res.status(500).send('Failed to create session');
  }
});

const port = 3333;
app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
