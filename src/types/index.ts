// Tipos principais do SEI-MCP

export interface SeiProcess {
  number: string;
  type: string;
  description: string;
  status: string;
  unit: string;
  createdAt: string;
  documents: SeiDocument[];
}

export interface SeiDocument {
  id: string;
  number: string;
  type: string;
  name: string;
  date: string;
  signed: boolean;
  signedBy?: string;
}

export interface SeiUnit {
  id: string;
  name: string;
  acronym: string;
}

export interface SeiUser {
  name: string;
  unit: SeiUnit;
  role: string;
}

// Mensagens WebSocket
export interface WSMessage {
  id: string;
  type: 'command' | 'response' | 'error' | 'event';
}

export interface WSCommand extends WSMessage {
  type: 'command';
  action: string;
  params: Record<string, unknown>;
  sessionId?: string;
}

export interface WSResponse extends WSMessage {
  type: 'response' | 'error';
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
  sessionId?: string;
}

export interface WSEvent extends WSMessage {
  type: 'event';
  event: 'connected' | 'disconnected' | 'page_changed' | 'login_detected' | 'logout_detected';
  data?: unknown;
}

// Tool Result
export interface ToolContent {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

// Session Management
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SessionInfo {
  id: string;
  status: SessionStatus;
  windowId?: number;
  url?: string;
  user?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface SessionContext {
  id: string;
  status: SessionStatus;
  windowId?: number;
  metadata: {
    url?: string;
    user?: string;
    connectedAt: Date;
    lastActivity: Date;
  };
}

// Window Control
export type WindowStateType = 'normal' | 'minimized' | 'maximized' | 'fullscreen';

export interface WindowState {
  windowId: number;
  state: WindowStateType;
  focused: boolean;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface WindowBounds {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

// Reconnection Config
export interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
