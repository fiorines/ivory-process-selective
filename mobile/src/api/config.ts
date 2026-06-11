/**
 * Backend URL depending on where the app runs:
 *
 * - Android Emulator:            http://10.0.2.2:3000  (alias for the host machine's localhost)
 * - iOS Simulator (macOS):       http://localhost:3000
 * - Expo Go / physical device:   http://<your-computer-local-IP>:3000 (e.g. http://192.168.1.50:3000)
 *
 * Adjust it ONCE here before running the app.
 */
export const API_BASE_URL = 'http://10.0.2.2:3000';
