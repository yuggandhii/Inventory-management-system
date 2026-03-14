import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(config.port, () => {
  console.log(`IMS API running on http://localhost:${config.port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});
