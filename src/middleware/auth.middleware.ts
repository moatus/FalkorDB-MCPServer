import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Middleware to authenticate MCP API requests
 */
export const authenticateMCP = (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Skip authentication for development environment
  if (config.server.nodeEnv === 'development' && !config.mcp.apiKey) {
    console.warn('Warning: Running without API key authentication in development mode');
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  
  if (apiKey !== config.mcp.apiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};