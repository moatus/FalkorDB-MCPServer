import dotenv from 'dotenv';
import { parseFalkorDBConnectionString } from '../utils/connection-parser.js';

// Load environment variables from .env file
dotenv.config({
  quiet: true,
});

// Parse FalkorDB connection - prioritize URL over individual parameters
const getFalkorDBConfig = () => {
  const connectionUrl = process.env.FALKORDB_URL;
  
  if (connectionUrl) {
    // Use connection URL if provided (supports embedded API key/credentials)
    const parsed = parseFalkorDBConnectionString(connectionUrl);
    return {
      host: parsed.host,
      port: parsed.port,
      username: parsed.username || '',
      password: parsed.password || '',
      connectionUrl, // Store original URL for reference
    };
  } else {
    // Fall back to individual environment variables
    return {
      host: process.env.FALKORDB_HOST || 'localhost',
      port: parseInt(process.env.FALKORDB_PORT || '6379'),
      username: process.env.FALKORDB_USERNAME || '',
      password: process.env.FALKORDB_PASSWORD || '',
      connectionUrl: null,
    };
  }
};

export const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  falkorDB: getFalkorDBConfig(),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
  },
  mcp: {
    apiKey: process.env.MCP_API_KEY || '',
  },
};