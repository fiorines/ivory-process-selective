import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

// 0.0.0.0 so the Android emulator (10.0.2.2) and devices on the local network can reach the API
createApp().listen(PORT, '0.0.0.0', () => {
  console.log(`Ivory Mini Feed API running at http://localhost:${PORT}`);
  console.log('Android Emulator: http://10.0.2.2:' + PORT);
  console.log('Mock login: POST /v1/auth/login { "email": "ada@ivory.test" }');
});
