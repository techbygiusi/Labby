import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { userApi, getErrorMessage } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';
import { translatePortalText } from '../i18n';

/**
 * In-browser console for an assigned resource. The backend relays the
 * websocket to Proxmox or SSH, so API tokens and SSH credentials never reach the browser.
 */
function terminalText(value) {
  return translatePortalText(value, readStoredLanguage());
}

export default function TerminalView({ resourceId, resourceName, fullscreen = false }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [message, setMessage] = useState('');
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    let ws = null;
    let pingTimer = null;
    let selectionCopyTimer = null;
    let selectionDisposable = null;
    let pasteTarget = null;
    let onPaste = null;
    let onContextMenu = null;
    let lastCopiedSelection = '';
    let promptStabilized = false;
    let wakeAttempted = false;
    const autoLoginWakeTimers = [];

    const getResponsiveFontSize = () => {
      if (!fullscreen) return 14;
      const width = containerRef.current?.clientWidth || window.innerWidth || 1200;
      const height = containerRef.current?.clientHeight || window.innerHeight || 720;
      const byWidth = width / 100 / 0.62;
      const byHeight = height / 34 / 1.25;
      return Math.max(14, Math.min(22, Math.floor(Math.min(byWidth, byHeight))));
    };

    const term = new Terminal({
      cursorBlink: true,
      fontSize: getResponsiveFontSize(),
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      lineHeight: fullscreen ? 1.16 : 1,
      scrollback: 5000,
      theme: document.body.classList.contains('theme-dark')
        ? { background: '#111418', foreground: '#E6E6E6', cursor: '#c2cea7' }
        : { background: '#1b1e23', foreground: '#e8e8e8', cursor: '#7a876f' }
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    const terminalHost = containerRef.current;
    term.open(terminalHost);
    fit.fit();

    const updateTerminalFit = () => {
      if (disposed) return;
      try {
        const nextFontSize = getResponsiveFontSize();
        if (Math.abs((term.options.fontSize || 14) - nextFontSize) >= 1) {
          term.options.fontSize = nextFontSize;
        }
        fit.fit();
      } catch (_) { /* noop */ }
    };

    const sendResize = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`1:${term.cols}:${term.rows}:`);
      }
    };

    const fitAndResize = () => {
      updateTerminalFit();
      sendResize();
    };

    const onWindowResize = () => fitAndResize();
    window.addEventListener('resize', onWindowResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => fitAndResize());
      resizeObserver.observe(containerRef.current);
    }

    (async () => {
      try {
        const res = await userApi.openConsole(resourceId);
        if (disposed) return;

        const { wsPath, user, ticket, autoLogin, mode = 'proxmox' } = res.data;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        ws = new WebSocket(`${protocol}://${window.location.host}${wsPath}`);
        ws.binaryType = 'arraybuffer';

        const sendConsoleInput = (input) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            const bytes = new TextEncoder().encode(input);
            ws.send(`0:${bytes.length}:${input}`);
          }
        };

        const autoLoginState = {
          enabled: mode !== 'ssh' && !!(autoLogin?.username && autoLogin?.secret),
          username: autoLogin?.username || 'root',
          secret: autoLogin?.secret || '',
          buffer: '',
          sentUsername: false,
          sentSecret: false,
          suppressTerminalReplies: mode !== 'ssh' && !!(autoLogin?.username && autoLogin?.secret)
        };
        const stripAnsi = (value) => String(value || '')
          .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
          .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
          .replace(/\x1b[@-_]/g, '');
        const normalizeConsoleText = (value) => stripAnsi(value)
          .replace(/\r/g, '\n')
          .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
        const stripTerminalStatusReplies = (value) => String(value || '')
          .replace(/\x1b\[(?:\?|>|!)*[0-9;]*R/g, '')
          .replace(/\x1b\[(?:\?|>|!)*[0-9;]*[cn]/g, '');
        const readVisibleTerminalTail = () => {
          try {
            const active = term.buffer.active;
            const cursorLine = active.baseY + active.cursorY;
            const firstLine = Math.max(0, cursorLine - 10);
            const lines = [];
            for (let index = firstLine; index <= cursorLine; index += 1) {
              const line = active.getLine(index);
              if (line) lines.push(line.translateToString(true));
            }
            return lines.join('\n');
          } catch (_) {
            return '';
          }
        };
        const readCurrentTerminalLine = () => {
          try {
            const active = term.buffer.active;
            const cursorLine = active.baseY + active.cursorY;
            return active.getLine(cursorLine)?.translateToString(true) || '';
          } catch (_) {
            return '';
          }
        };
        const cancelAutoLoginWakeTimers = () => {
          autoLoginWakeTimers.splice(0).forEach(timer => clearTimeout(timer));
        };
        const stabilizeInteractivePrompt = () => {
          if (promptStabilized) return true;
          const currentLine = stripAnsi(readCurrentTerminalLine()).trimEnd();
          if (!currentLine || currentLine.length > 180 || !/[#$]\s*$/.test(currentLine)) {
            return false;
          }

          promptStabilized = true;
          autoLoginState.enabled = false;
          autoLoginState.sentUsername = true;
          autoLoginState.sentSecret = true;
          autoLoginState.suppressTerminalReplies = false;
          cancelAutoLoginWakeTimers();

          // Keep only the active shell prompt. Proxmox can return an existing
          // terminal screen with blank rows or repeated prompts from an older
          // session; xterm.clear() promotes the current prompt to the first row
          // without sending another Enter key to the guest.
          try {
            term.clear();
            term.scrollToBottom();
          } catch (_) { /* noop */ }

          requestAnimationFrame(() => {
            fitAndResize();
            term.focus();
          });
          return true;
        };
        const maybeSendAutoLogin = (chunk, replaceBuffer = false) => {
          if (!autoLoginState.enabled || autoLoginState.sentSecret) return;
          const normalized = normalizeConsoleText(chunk);
          autoLoginState.buffer = replaceBuffer
            ? normalized.slice(-2000)
            : (autoLoginState.buffer + normalized).slice(-2000);
          const visible = autoLoginState.buffer;
          if (!autoLoginState.sentUsername && /(?:^|\n)[^\n]{0,120}(?:login|username)\s*:\s*$/i.test(visible)) {
            autoLoginState.sentUsername = true;
            autoLoginState.buffer = '';
            // Clear the current getty input line before submitting the stored
            // username, regardless of whether the terminal had focus before.
            setTimeout(() => sendConsoleInput(`\x15${autoLoginState.username}\r`), 180);
            return;
          }
          if (autoLoginState.sentUsername && !autoLoginState.sentSecret && /(?:^|\n)[^\n]{0,120}password\s*:\s*$/i.test(visible)) {
            autoLoginState.sentSecret = true;
            autoLoginState.buffer = '';
            setTimeout(() => {
              sendConsoleInput(`\x15${autoLoginState.secret}\r`);
              // Keep filtering xterm device-status replies briefly while the
              // login program validates the submitted password.
              setTimeout(() => { autoLoginState.suppressTerminalReplies = false; }, 1500);
            }, 180);
          }
        };
        const inspectRenderedPrompt = () => {
          if (stabilizeInteractivePrompt()) return;
          maybeSendAutoLogin(readVisibleTerminalTail(), true);
        };
        const wakeAutoLoginPrompt = () => {
          if (!autoLoginState.enabled || autoLoginState.sentUsername || disposed || promptStabilized) return;
          inspectRenderedPrompt();
          if (autoLoginState.sentUsername || promptStabilized || wakeAttempted) return;

          // Wake a completely blank getty exactly once. Repeated synthetic
          // carriage returns caused extra empty shell prompts whenever the
          // console was already logged in.
          if (!readVisibleTerminalTail().trim()) {
            wakeAttempted = true;
            sendConsoleInput('\r');
          }
        };

        ws.onopen = () => {
          setStatus('open');
          if (mode !== 'ssh') ws.send(`${user}:${ticket}\n`);
          fitAndResize();
          setTimeout(fitAndResize, 150);
          setTimeout(fitAndResize, 700);
          setTimeout(fitAndResize, 1500);
          term.focus();
          if (autoLoginState.enabled) {
            // Some getty sessions remain completely blank until the first
            // carriage return. Perform one delayed blank-screen wake-up only;
            // an existing shell prompt is detected and focused instead.
            autoLoginWakeTimers.push(setTimeout(wakeAutoLoginPrompt, 1400));
          }
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send('2');
          }, 30 * 1000);
        };

        ws.onmessage = (event) => {
          const data = typeof event.data === 'string'
            ? event.data
            : new TextDecoder().decode(event.data);
          maybeSendAutoLogin(data);
          term.write(data, inspectRenderedPrompt);
        };

        ws.onclose = () => {
          setStatus('closed');
          term.write(`\r\n\x1b[90m${terminalText('[Verbindung beendet]')}\x1b[0m\r\n`);
        };

        ws.onerror = () => {
          setStatus('error');
          setMessage(terminalText('Verbindung zur Konsole fehlgeschlagen.'));
        };

        term.onData((input) => {
          const outgoing = autoLoginState.suppressTerminalReplies
            ? stripTerminalStatusReplies(input)
            : input;
          if (outgoing) sendConsoleInput(outgoing);
        });

        const fallbackCopy = (text) => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.inset = '-9999px auto auto -9999px';
          document.body.appendChild(textarea);
          textarea.select();
          try { document.execCommand('copy'); } catch (_) { /* noop */ }
          textarea.remove();
          term.focus();
        };

        const copySelection = async () => {
          const selection = term.getSelection();
          if (!selection) {
            lastCopiedSelection = '';
            return;
          }
          if (selection === lastCopiedSelection) return;
          lastCopiedSelection = selection;
          try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
              await navigator.clipboard.writeText(selection);
            } else {
              fallbackCopy(selection);
            }
          } catch (_) {
            fallbackCopy(selection);
          }
        };

        selectionDisposable = term.onSelectionChange(() => {
          if (selectionCopyTimer) clearTimeout(selectionCopyTimer);
          selectionCopyTimer = setTimeout(copySelection, 120);
        });

        term.attachCustomKeyEventHandler((event) => {
          if (event.type !== 'keydown') return true;
          const modifier = event.ctrlKey || event.metaKey;
          const key = String(event.key || '').toLowerCase();
          if (modifier && key === 'c' && term.hasSelection()) {
            copySelection();
            return false;
          }
          // Let the browser emit its native paste event. The handler below
          // feeds the clipboard content through xterm exactly once.
          if (modifier && key === 'v') return false;
          return true;
        });

        pasteTarget = terminalHost;
        onPaste = (event) => {
          const text = event.clipboardData?.getData('text/plain');
          if (!text) return;
          event.preventDefault();
          event.stopPropagation();
          term.focus();
          term.paste(text);
        };
        onContextMenu = async (event) => {
          event.preventDefault();
          term.focus();
          try {
            const text = await navigator.clipboard?.readText?.();
            if (text) term.paste(text);
          } catch (_) {
            // Clipboard read permissions vary by browser. Ctrl/Cmd+V remains
            // available through the native paste event when access is denied.
          }
        };
        pasteTarget?.addEventListener('paste', onPaste, true);
        pasteTarget?.addEventListener('contextmenu', onContextMenu);
      } catch (err) {
        setStatus('error');
        setMessage(getErrorMessage(err, 'Konsole konnte nicht geöffnet werden.'));
      }
    })();

    return () => {
      disposed = true;
      window.removeEventListener('resize', onWindowResize);
      try { resizeObserver?.disconnect(); } catch (_) { /* noop */ }
      if (pingTimer) clearInterval(pingTimer);
      if (selectionCopyTimer) clearTimeout(selectionCopyTimer);
      try { selectionDisposable?.dispose(); } catch (_) { /* noop */ }
      if (pasteTarget && onPaste) pasteTarget.removeEventListener('paste', onPaste, true);
      if (pasteTarget && onContextMenu) pasteTarget.removeEventListener('contextmenu', onContextMenu);
      autoLoginWakeTimers.forEach(timer => clearTimeout(timer));
      try { ws?.close(); } catch (_) { /* noop */ }
      term.dispose();
    };
  }, [resourceId, reconnectKey, fullscreen]);

  return (
    <div className={fullscreen ? 'terminal-wrapper terminal-wrapper-fullscreen' : 'terminal-wrapper'}>
      <div className="terminal-toolbar">
        <span className={`terminal-status terminal-status-${status}`}>
          {status === 'connecting' && terminalText('Verbinden...')}
          {status === 'open' && `${terminalText('Verbunden')} · ${resourceName}`}
          {status === 'closed' && terminalText('Getrennt')}
          {status === 'error' && (message || terminalText('Fehler'))}
        </span>
        <div className="terminal-toolbar-actions">
          {status === 'open' && (
            <span className="terminal-clipboard-hint">
              {terminalText('Markieren kopiert · Rechtsklick oder Strg+V fügt ein')}
            </span>
          )}
          {(status === 'closed' || status === 'error') && (
            <button type="button" className="btn-secondary btn-small" onClick={() => { setStatus('connecting'); setMessage(''); setReconnectKey(key => key + 1); }}>
              {terminalText('Neu verbinden')}
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="terminal-container"></div>
    </div>
  );
}
