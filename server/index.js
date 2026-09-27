import { createRequire } from 'module';

// ESM wrapper required by package.json script: `nodemon server/index.js`
// The actual Express app lives in server/index.cjs (CommonJS).
const require = createRequire(import.meta.url);
require('./index.cjs');
