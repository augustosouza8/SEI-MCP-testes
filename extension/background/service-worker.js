// SEI-MCP Bridge - Service Worker (Background Script)
// Gerencia conexão WebSocket com o servidor MCP e roteia mensagens

const WS_URL = 'ws://localhost:19999';
const RECONNECT_DELAY = 3000;

let ws = null;
let isConnected = false;
let reconnectTimeout = null;
let activeTabId = null;

// Conectar ao servidor WebSocket
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[SEI-MCP] Already connected');
    return;
  }

  console.log('[SEI-MCP] Connecting to', WS_URL);

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[SEI-MCP] Connected to server');
      isConnected = true;
      updateBadge('connected');

      // Notificar popup
      chrome.runtime.sendMessage({ type: 'status', connected: true });

      // Enviar evento de conexão
      sendEvent('connected', { timestamp: Date.now() });
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[SEI-MCP] Received:', message);

        if (message.type === 'command') {
          const response = await handleCommand(message);
          ws.send(JSON.stringify(response));
        }
      } catch (err) {
        console.error('[SEI-MCP] Error handling message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[SEI-MCP] Disconnected');
      isConnected = false;
      ws = null;
      updateBadge('disconnected');

      // Notificar popup
      chrome.runtime.sendMessage({ type: 'status', connected: false }).catch(() => {});

      // Tentar reconectar
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('[SEI-MCP] WebSocket error:', error);
    };
  } catch (err) {
    console.error('[SEI-MCP] Failed to connect:', err);
    scheduleReconnect();
  }
}

// Agendar reconexão
function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  reconnectTimeout = setTimeout(() => {
    console.log('[SEI-MCP] Attempting reconnect...');
    connect();
  }, RECONNECT_DELAY);
}

// Desconectar
function disconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected = false;
  updateBadge('disconnected');
}

// Atualizar badge do ícone
function updateBadge(status) {
  const colors = {
    connected: '#22c55e',
    disconnected: '#ef4444',
    working: '#f59e0b',
  };

  chrome.action.setBadgeBackgroundColor({ color: colors[status] || '#6b7280' });
  chrome.action.setBadgeText({ text: status === 'connected' ? '✓' : '✗' });
}

// Enviar evento para o servidor
function sendEvent(event, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      id: `evt_${Date.now()}`,
      type: 'event',
      event,
      data,
    }));
  }
}

// Processar comando do servidor
async function handleCommand(message) {
  const { id, action, params } = message;

  try {
    updateBadge('working');

    // Encontrar aba do SEI
    const tabs = await chrome.tabs.query({ url: '*://*/*sei/*' });
    if (tabs.length === 0) {
      throw new Error('Nenhuma aba do SEI encontrada. Por favor, abra o SEI no navegador.');
    }

    activeTabId = tabs[0].id;

    // Executar ação no content script
    const results = await chrome.tabs.sendMessage(activeTabId, {
      type: 'execute',
      action,
      params,
    });

    updateBadge('connected');

    return {
      id,
      type: 'response',
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('[SEI-MCP] Command error:', error);
    updateBadge('connected');

    return {
      id,
      type: 'response',
      success: false,
      error: {
        code: 'COMMAND_ERROR',
        message: error.message || 'Erro desconhecido',
      },
    };
  }
}

// Listener para mensagens do popup e content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SEI-MCP] Internal message:', message);

  if (message.type === 'connect') {
    connect();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'disconnect') {
    disconnect();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'getStatus') {
    sendResponse({ connected: isConnected });
    return true;
  }

  if (message.type === 'pageChanged') {
    sendEvent('page_changed', message.data);
    return true;
  }

  return false;
});

// Inicializar
console.log('[SEI-MCP] Service worker initialized');
updateBadge('disconnected');
