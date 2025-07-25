import { FalkorDB } from 'falkordb';
import { config } from '../config/index.js';
import { GraphReply } from 'falkordb/dist/src/graph.js';

class FalkorDBService {
  private client: FalkorDB | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
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
      // console.log('Successfully connected to FalkorDB');
    } catch (error) {
      // console.error('Failed to connect to FalkorDB:', error);
      // Retry connection after a delay
      setTimeout(() => this.init(), 5000);
    }
  }

  async executeQuery(graphName: string, query: string, params?: Record<string, any>): Promise<GraphReply<any>> {
    if (!this.client) {
      throw new Error('FalkorDB client not initialized');
    }

    const graph = this.client.selectGraph(graphName);
    const result = await graph.query(query, params);
    return result;
  }

  /**
   * Lists all available graphs in FalkorDB
   * @returns Array of graph names
   */
  async listGraphs(): Promise<string[]> {
    if (!this.client) {
      throw new Error('FalkorDB client not initialized');
    }

    return await this.client.list();
  }

  async deleteGraph(graphName: string) {
    if (!this.client) {
      throw new Error('FalkorDB client not initialized');
    }

    await this.client.selectGraph(graphName).delete();
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

// Export a singleton instance
export const falkorDBService = new FalkorDBService();