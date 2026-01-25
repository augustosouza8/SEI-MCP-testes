import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { sessionManager } from '../sessions/session-manager.js';
import type { WSCommand, WSResponse, WSEvent, ReconnectConfig } from '../types/index.js';

const DEFAULT_PORT = 19999;
const COMMAND_TIMEOUT = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

interface PendingCommand {
  resolve: (response: WSResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  sessionId?: string;
}

export class SeiWebSocketServer {
  private wss: WebSocketServer | null = null;
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private commandCounter = 0;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectConfig: ReconnectConfig = {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  constructor(private port: number = DEFAULT_PORT) {}

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('listening', () => {
          logger.info(`WebSocket server listening on port ${this.port}`);
          resolve();
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.wss.on('error', (err) => {
          logger.error('WebSocket server error', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    // Generate or extract session ID from connection
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    let sessionId = url.searchParams.get('sessionId') || `session_${randomUUID().slice(0, 8)}`;
    const windowId = url.searchParams.get('windowId')
      ? parseInt(url.searchParams.get('windowId')!, 10)
      : undefined;

    logger.info(`Chrome extension connected: ${sessionId}`);
    sessionManager.registerClient(ws, sessionId, windowId);

    // Start heartbeat for this session
    this.startHeartbeat(sessionId);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSResponse | WSEvent;
        this.handleMessage(message, sessionId);
      } catch (err) {
        logger.error('Failed to parse message', err);
      }
    });

    ws.on('close', () => {
      logger.info(`Chrome extension disconnected: ${sessionId}`);
      this.stopHeartbeat(sessionId);
      sessionManager.unregisterClient(sessionId);

      // Reject pending commands for this session
      for (const [id, pending] of this.pendingCommands) {
        if (!pending.sessionId || pending.sessionId === sessionId) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Connection closed for session: ${sessionId}`));
          this.pendingCommands.delete(id);
        }
      }
    });

    ws.on('error', (err) => {
      logger.error(`WebSocket error for session ${sessionId}`, err);
    });

    ws.on('pong', () => {
      sessionManager.updateSession(sessionId, { lastActivity: new Date() });
    });
  }

  private handleMessage(message: WSResponse | WSEvent, sessionId: string): void {
    if (message.type === 'event') {
      const event = message as WSEvent;
      logger.debug(`Received event from ${sessionId}: ${event.event}`, event.data);

      // Handle special events
      if (event.event === 'login_detected' && event.data) {
        const data = event.data as { user?: string; url?: string };
        sessionManager.updateSession(sessionId, {
          user: data.user,
          url: data.url,
        });
      }
      return;
    }

    if (message.type === 'response' || message.type === 'error') {
      const response = message as WSResponse;
      const pending = this.pendingCommands.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(response.id);
        pending.resolve(response);
      } else {
        logger.warn(`Received response for unknown command: ${response.id}`);
      }
    }
  }

  private startHeartbeat(sessionId: string): void {
    const interval = setInterval(() => {
      const client = sessionManager.getClient(sessionId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        this.stopHeartbeat(sessionId);
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(sessionId, interval);
  }

  private stopHeartbeat(sessionId: string): void {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionId);
    }
  }

  /**
   * Send command to a specific session or the default session
   */
  async sendCommand(
    action: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<WSResponse> {
    // Get target client
    const client = sessionId
      ? sessionManager.getClient(sessionId)
      : sessionManager.getDefaultClient();

    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      const targetSession = sessionId || 'default';
      throw new Error(
        `No Chrome extension connected for session: ${targetSession}. Please open SEI in Chrome and connect the extension.`
      );
    }

    const id = `cmd_${++this.commandCounter}_${Date.now()}`;
    const command: WSCommand = {
      id,
      type: 'command',
      action,
      params,
      sessionId: client.sessionId,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`Command timeout: ${action}`));
      }, COMMAND_TIMEOUT);

      this.pendingCommands.set(id, {
        resolve,
        reject,
        timeout,
        sessionId: client.sessionId,
      });

      try {
        client.ws.send(JSON.stringify(command));
        logger.debug(`Sent command to ${client.sessionId}: ${action}`, params);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingCommands.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Check if connected (optionally for a specific session)
   */
  isConnected(sessionId?: string): boolean {
    return sessionManager.isConnected(sessionId);
  }

  /**
   * List all sessions
   */
  listSessions() {
    return sessionManager.listSessions();
  }

  /**
   * Close a specific session
   */
  closeSession(sessionId: string): boolean {
    this.stopHeartbeat(sessionId);
    return sessionManager.closeSession(sessionId);
  }

  /**
   * Get connected session count
   */
  getConnectedCount(): number {
    return sessionManager.getConnectedCount();
  }

  stop(): void {
    // Stop all heartbeats
    for (const sessionId of this.heartbeatIntervals.keys()) {
      this.stopHeartbeat(sessionId);
    }

    // Close all clients
    for (const session of sessionManager.listSessions()) {
      sessionManager.closeSession(session.id);
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info('WebSocket server stopped');
    }
  }
}
