const crypto = require('crypto');
const WebSocket = require('ws');
const { Client: SshClient } = require('ssh2');

/**
 * Console flow:
 * 1. Client POSTs /api/user/resources/:id/console (JWT-protected).
 *    The backend verifies access and creates either a Proxmox termproxy
 *    session or an SSH session for a manually configured guest IP.
 * 2. Client opens ws(s)://<portal>/api/console/ws?token=<sessionToken>.
 *    The one-time token keeps Proxmox and SSH credentials server-side.
 */

const SESSION_TTL_MS = 30 * 1000;
const sessions = new Map();

function createConsoleSession(data) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { ...data, createdAt: Date.now() });
  setTimeout(() => sessions.delete(token), SESSION_TTL_MS + 1000).unref?.();
  return token;
}

function consumeConsoleSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  sessions.delete(token);
  if (Date.now() - session.createdAt > SESSION_TTL_MS) return null;
  return session;
}

function attachConsoleProxy(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    let pathname = '';
    let token = '';
    try {
      const url = new URL(request.url, 'http://localhost');
      pathname = url.pathname;
      token = url.searchParams.get('token') || '';
    } catch (_) {
      socket.destroy();
      return;
    }

    if (pathname !== '/api/console/ws') {
      socket.destroy();
      return;
    }

    const session = consumeConsoleSession(token);
    if (!session) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientWs) => {
      if (session.mode === 'ssh') bridgeToSsh(clientWs, session);
      else bridgeToProxmox(clientWs, session);
    });
  });

  console.log('✓ Console WebSocket proxy attached at /api/console/ws');
}

function bridgeToProxmox(clientWs, session) {
  const { clusterUrl, apiToken, node, type, vmid, port, ticket } = session;
  const kind = type === 'lxc' ? 'lxc' : 'qemu';
  const base = clusterUrl.replace(/^http/i, 'ws');
  const endpoint = `/api2/json/nodes/${node}/${kind}/${vmid}/vncwebsocket`;
  const target = `${base}${endpoint}?port=${encodeURIComponent(port)}&vncticket=${encodeURIComponent(ticket)}`;

  const upstream = new WebSocket(target, ['binary'], {
    rejectUnauthorized: false,
    headers: { Authorization: `PVEAPIToken=${apiToken}` }
  });

  const closeBoth = () => {
    try { clientWs.close(); } catch (_) { /* noop */ }
    try { upstream.close(); } catch (_) { /* noop */ }
  };

  const pendingClientMessages = [];

  clientWs.on('message', (data) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data);
      return;
    }
    pendingClientMessages.push(data);
  });

  upstream.on('open', () => {
    while (pendingClientMessages.length > 0 && upstream.readyState === WebSocket.OPEN) {
      upstream.send(pendingClientMessages.shift());
    }
  });

  upstream.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
  });

  upstream.on('close', closeBoth);
  upstream.on('error', () => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(localized(session, '\r\n[Portal] Verbindung zu Proxmox fehlgeschlagen.\r\n', '\r\n[Portal] Connection to Proxmox failed.\r\n'));
    }
    closeBoth();
  });

  clientWs.on('close', closeBoth);
  clientWs.on('error', closeBoth);
}

function bridgeToSsh(clientWs, session) {
  const ssh = new SshClient();
  let stream = null;
  let closed = false;
  const pendingInput = [];
  let pendingWindow = { cols: 120, rows: 34 };

  const sendClient = (data) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
  };

  const closeAll = () => {
    if (closed) return;
    closed = true;
    try { stream?.end(); } catch (_) { /* noop */ }
    try { ssh.end(); } catch (_) { /* noop */ }
    try { clientWs.close(); } catch (_) { /* noop */ }
  };
  const closeSoon = () => setTimeout(closeAll, 120);

  const handleClientFrame = (frame) => {
    const text = Buffer.isBuffer(frame) ? frame.toString('utf8') : String(frame || '');
    if (text === '2') return;

    const resize = text.match(/^1:(\d+):(\d+):$/);
    if (resize) {
      pendingWindow = { cols: Number(resize[1]) || 120, rows: Number(resize[2]) || 34 };
      try { stream?.setWindow(pendingWindow.rows, pendingWindow.cols, 0, 0); } catch (_) { /* noop */ }
      return;
    }

    if (text.startsWith('0:')) {
      const payloadStart = text.indexOf(':', 2);
      if (payloadStart === -1) return;
      const payload = text.slice(payloadStart + 1);
      if (stream) stream.write(payload);
      else pendingInput.push(payload);
    }
  };

  clientWs.on('message', handleClientFrame);
  clientWs.on('close', closeAll);
  clientWs.on('error', closeAll);

  ssh.on('ready', () => {
    ssh.shell({
      term: 'xterm-256color',
      cols: pendingWindow.cols,
      rows: pendingWindow.rows
    }, (err, shell) => {
      if (err) {
        sendClient(localized(session, '\r\n[Portal] SSH-Shell konnte nicht geöffnet werden.\r\n', '\r\n[Portal] The SSH shell could not be opened.\r\n'));
        closeSoon();
        return;
      }

      stream = shell;
      while (pendingInput.length > 0) stream.write(pendingInput.shift());
      stream.on('data', sendClient);
      stream.stderr?.on('data', sendClient);
      stream.on('close', closeSoon);
      stream.on('error', (streamError) => {
        sendClient(`\r\n[Portal] ${streamError.message || 'SSH stream error'}\r\n`);
        closeSoon();
      });
    });
  });

  ssh.on('error', (err) => {
    const prefix = localized(session, '[Portal] SSH-Verbindung fehlgeschlagen', '[Portal] SSH connection failed');
    sendClient(`\r\n${prefix}: ${err.message || 'unknown error'}\r\n`);
    closeSoon();
  });

  ssh.on('close', closeSoon);
  ssh.connect({
    host: session.host,
    port: Number(session.sshPort || 22),
    username: session.username,
    password: session.password,
    readyTimeout: 15000,
    keepaliveInterval: 15000,
    keepaliveCountMax: 3
  });
}

function localized(session, de, en) {
  return String(session?.language || '').toLowerCase() === 'de' ? de : en;
}

module.exports = { createConsoleSession, attachConsoleProxy };
