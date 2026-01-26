import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { SessionInfo, SessionContext, SessionStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  windowId?: number;
  connectedAt: Date;
  lastActivity: Date;
}

export class SessionManager {
  private sessions: Map<string, SessionContext> = new Map();
  private clients: Map<string, ClientConnection> = new Map();

  private getMostRecentConnectedSession(): SessionContext | undefined {
    let best: SessionContext | undefined;
    for (const session of this.sessions.values()) {
      if (session.status !== 'connected') continue;
      if (!best) {
        best = session;
        continue;
      }
      if (session.metadata.lastActivity > best.metadata.lastActivity) {
        best = session;
      }
    }
    return best;
  }

  private getMostRecentOpenClient(): ClientConnection | undefined {
    let best: ClientConnection | undefined;
    for (const client of this.clients.values()) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;
      if (!best) {
        best = client;
        continue;
      }
      if (client.lastActivity > best.lastActivity) {
        best = client;
      }
    }
    return best;
  }

  /**
   * Create a new session
   */
  createSession(windowId?: number, url?: string): string {
    const id = `session_${randomUUID().slice(0, 8)}`;
    const now = new Date();

    const session: SessionContext = {
      id,
      status: 'connecting',
      windowId,
      metadata: {
        url,
        connectedAt: now,
        lastActivity: now,
      },
    };

    this.sessions.set(id, session);
    logger.info(`Session created: ${id}`);
    return id;
  }

  /**
   * Register a WebSocket client connection
   */
  registerClient(ws: WebSocket, sessionId: string, windowId?: number): void {
    const now = new Date();

    // Update or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        status: 'connected',
        windowId,
        metadata: {
          connectedAt: now,
          lastActivity: now,
        },
      };
      this.sessions.set(sessionId, session);
    } else {
      session.status = 'connected';
      session.windowId = windowId;
      session.metadata.lastActivity = now;
    }

    // Store client connection
    this.clients.set(sessionId, {
      ws,
      sessionId,
      windowId,
      connectedAt: now,
      lastActivity: now,
    });

    logger.info(`Client registered for session: ${sessionId}`);
  }

  /**
   * Unregister a client connection
   */
  unregisterClient(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
    }
    this.clients.delete(sessionId);
    logger.info(`Client unregistered for session: ${sessionId}`);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get client connection by session ID
   */
  getClient(sessionId: string): ClientConnection | undefined {
    return this.clients.get(sessionId);
  }

  /**
   * Get the default (first connected) session
   */
  getDefaultSession(): SessionContext | undefined {
    return this.getMostRecentConnectedSession();
  }

  /**
   * Get the default (first connected) client
   */
  getDefaultClient(): ClientConnection | undefined {
    return this.getMostRecentOpenClient();
  }

  /**
   * List all sessions
   */
  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      status: session.status,
      windowId: session.windowId,
      url: session.metadata.url,
      user: session.metadata.user,
      connectedAt: session.metadata.connectedAt,
      lastActivity: session.metadata.lastActivity,
    }));
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): boolean {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
    this.clients.delete(sessionId);
    this.sessions.delete(sessionId);
    logger.info(`Session closed: ${sessionId}`);
    return true;
  }

  /**
   * Update session metadata
   */
  updateSession(sessionId: string, updates: Partial<SessionContext['metadata']>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...updates };
      session.metadata.lastActivity = new Date();
    }

    const client = this.clients.get(sessionId);
    if (client) {
      client.lastActivity = new Date();
      this.clients.set(sessionId, client);
    }
  }

  /**
   * Update session status
   */
  updateStatus(sessionId: string, status: SessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.metadata.lastActivity = new Date();
    }

    const client = this.clients.get(sessionId);
    if (client) {
      client.lastActivity = new Date();
      this.clients.set(sessionId, client);
    }
  }

  /**
   * Check if a session is connected
   */
  isConnected(sessionId?: string): boolean {
    if (sessionId) {
      const client = this.clients.get(sessionId);
      return client !== undefined && client.ws.readyState === WebSocket.OPEN;
    }
    // Check if any client is connected
    return this.getDefaultClient() !== undefined;
  }

  /**
   * Get connected session count
   */
  getConnectedCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clean up disconnected sessions
   */
  cleanup(): void {
    for (const [sessionId, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        this.unregisterClient(sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();
