#!/usr/bin/env node

import { runServer } from './server.js';
import { logger } from './utils/logger.js';

// Entry point do servidor SEI-MCP
runServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
