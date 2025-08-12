import { FalkorDB } from 'falkordb';
import { config } from '../config/index.js';
import { GraphReply } from 'falkordb/dist/src/graph.js';
import { AppError, CommonErrors } from '../errors/AppError.js';
import { logger } from './logger.service.js';

class FalkorDBService {
  private client: FalkorDB | null = null;
  private readonly maxRetries = 5;
  private retryCount = 0;
  private isInitializing = false;

  constructor() {
    // Don't initialize in constructor - use explicit initialization
  }

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      return;
    }
    
    this.isInitializing = true;
    
    try {
      logger.info('Attempting to connect to FalkorDB', {
        host: config.falkorDB.host,
        port: config.falkorDB.port,
        attempt: this.retryCount + 1,
        usingConnectionUrl: !!config.falkorDB.connectionUrl
      });

      this.client = await FalkorDB.connect({
        socket: {
          host: config.falkorDB.host,
          port: config.falkorDB.port,
        },
        password: config.falkorDB.password,
        username: config.falkorDB.username,
      });
      
      // Test connection
      const connection = await this.client.connection;
      await connection.ping();
      
      logger.info('Successfully connected to FalkorDB');
      this.retryCount = 0;
      this.isInitializing = false;
    } catch (error) {
      this.isInitializing = false;
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.warn('Failed to connect to FalkorDB, retrying...', {
          attempt: this.retryCount,
          maxRetries: this.maxRetries,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.initialize();
      } else {
        const appError = new AppError(
          CommonErrors.CONNECTION_FAILED,
          `Failed to connect to FalkorDB after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
        
        logger.error('FalkorDB connection failed permanently', appError);
        throw appError;
      }
    }
  }

  async executeQuery(graphName: string, query: string, params?: Record<string, any>): Promise<GraphReply<any>> {
    if (!this.client) {
      throw new AppError(
        CommonErrors.CONNECTION_FAILED,
        'FalkorDB client not initialized. Call initialize() first.',
        true
      );
    }

    try {
      const graph = this.client.selectGraph(graphName);
      const result = await graph.query(query, params);
      
      logger.debug('Query executed successfully', {
        graphName,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        hasParams: !!params
      });
      
      return result;
    } catch (error) {
      const appError = new AppError(
        CommonErrors.OPERATION_FAILED,
        `Failed to execute query on graph '${graphName}': ${error instanceof Error ? error.message : String(error)}`,
        true
      );
      
      logger.error('Query execution failed', appError, { graphName, query });
      throw appError;
    }
  }

  /**
   * Lists all available graphs in FalkorDB
   * @returns Array of graph names
   */
  async listGraphs(): Promise<string[]> {
    if (!this.client) {
      throw new AppError(
        CommonErrors.CONNECTION_FAILED,
        'FalkorDB client not initialized. Call initialize() first.',
        true
      );
    }

    try {
      const graphs = await this.client.list();
      logger.debug('Listed graphs successfully', { count: graphs.length });
      return graphs;
    } catch (error) {
      const appError = new AppError(
        CommonErrors.OPERATION_FAILED,
        `Failed to list graphs: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
      
      logger.error('Failed to list graphs', appError);
      throw appError;
    }
  }

  async deleteGraph(graphName: string): Promise<void> {
    if (!this.client) {
      throw new AppError(
        CommonErrors.CONNECTION_FAILED,
        'FalkorDB client not initialized. Call initialize() first.',
        true
      );
    }

    try {
      await this.client.selectGraph(graphName).delete();
      logger.info('Graph deleted successfully', { graphName });
    } catch (error) {
      const appError = new AppError(
        CommonErrors.OPERATION_FAILED,
        `Failed to delete graph '${graphName}': ${error instanceof Error ? error.message : String(error)}`,
        true
      );
      
      logger.error('Failed to delete graph', appError, { graphName });
      throw appError;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        logger.info('FalkorDB connection closed successfully');
      } catch (error) {
        logger.error('Error closing FalkorDB connection', error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.client = null;
        this.retryCount = 0;
      }
    }
  }
}

// Export a singleton instance
export const falkorDBService = new FalkorDBService();