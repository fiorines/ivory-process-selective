import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

// 0.0.0.0 para que emulador Android (10.0.2.2) e devices na rede local alcancem a API
createApp().listen(PORT, '0.0.0.0', () => {
  console.log(`Ivory Mini Feed API rodando em http://localhost:${PORT}`);
  console.log('Android Emulator: http://10.0.2.2:' + PORT);
  console.log('Login mock: POST /v1/auth/login { "email": "ada@ivory.test" }');
});
