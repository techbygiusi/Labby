/* Isolated Tree/Graph prototype. This file is not part of the production app. */
(() => {
  const networkDeviceKinds = new Set(['router-gateway', 'switch', 'access-point']);
  const state = { query: '', selectedId: '', mode: 'tree' };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function allItems() {
    return Array.isArray(items) ? items : [];
  }

  function itemById(id) {
    return allItems().find((item) => String(item.id) === String(id)) || null;
  }

  function typeName(item) {
    if (!item) return 'Resource';
    if (item.type === 'hardware') return hardwareTypeLabel(item.hardwareKind || 'server');
    if (item.type === 'vm') return 'Virtual Machine';
    if (item.type === 'lxc') return 'LXC Container';
    if (item.type === 'app') return 'Application';
    if (item.type === 'network') return networkTypeSummary(item);
    return labelSingle(item.type);
  }

  function itemIp(item) {
    if (!item) return '';
    return item.type === 'app' ? (item.ipPort || item.ip || '') : (item.ip || '');
  }

  function itemSymbol(item) {
    return item?.symbol || defaultSymbol(item?.type, item?.hardwareKind);
  }

  function itemSearchText(item) {
    return [item?.name, item?.description, item?.notes, itemIp(item), typeName(item), item?.subnet, item?.gateway]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function statusName(item) {
    return item?.ipStatus || item?.urlStatus || item?.status || '';
  }

  function statusDot(item) {
    const status = statusName(item);
    return `<span class="proto-status ${esc(status)}" title="${esc(status || 'No status')}"></span>`;
  }

  function linkedHardwareParent(item, candidates) {
    const ids = new Set((item.connections || []).map(String));
    const linked = candidates.filter((candidate) => candidate.id !== item.id &&
      (ids.has(String(candidate.id)) || (candidate.connections || []).map(String).includes(String(item.id))));
    if (item.hardwareKind === 'switch') return linked.find((entry) => entry.hardwareKind === 'router-gateway') || null;
    if (item.hardwareKind === 'access-point') return linked.find((entry) => entry.hardwareKind === 'switch') || linked.find((entry) => entry.hardwareKind === 'router-gateway') || null;
    return linked.find((entry) => entry.hardwareKind === 'switch') || linked.find((entry) => entry.hardwareKind === 'router-gateway') || null;
  }

  function relationshipModel() {
    const list = allItems();
    const ids = new Set(list.map((item) => String(item.id)));
    const hardware = list.filter((item) => item.type === 'hardware');
    const parents = new Map();
    const children = new Map(list.map((item) => [String(item.id), []]));

    list.forEach((item) => {
      let parent = '';
      if (item.type === 'vm' || item.type === 'lxc') parent = item.virtualHostedOn || item.hostedOn || '';
      else if (item.type === 'app') parent = item.appHostedOn || '';
      // Network connections are relationships, not hosting parents. Keeping
      // physical hardware as roots ensures hosts remain in Compute & Storage.
      else if (item.type === 'hardware') parent = '';
      parent = ids.has(String(parent)) && String(parent) !== String(item.id) ? String(parent) : '';
      parents.set(String(item.id), parent);
      if (parent) children.get(parent)?.push(item);
    });

    children.forEach((entries) => entries.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true })));
    return { parents, children };
  }

  function selectedRelations(item, model) {
    if (!item) return [];
    const related = new Map();
    const parent = itemById(model.parents.get(String(item.id)));
    if (parent) related.set(String(parent.id), parent);
    (model.children.get(String(item.id)) || []).forEach((entry) => related.set(String(entry.id), entry));
    (item.connections || []).forEach((id) => {
      const entry = itemById(id);
      if (entry) related.set(String(entry.id), entry);
    });
    allItems().forEach((entry) => {
      if ((entry.connections || []).map(String).includes(String(item.id))) related.set(String(entry.id), entry);
    });
    return [...related.values()];
  }

  function statsHtml() {
    const list = allItems();
    const networkDevices = list.filter((item) => item.type === 'hardware' && networkDeviceKinds.has(item.hardwareKind)).length;
    const stats = [
      ['Resources', list.length],
      ['Hardware', list.filter((item) => item.type === 'hardware' && !networkDeviceKinds.has(item.hardwareKind)).length],
      ['Network devices', networkDevices],
      ['Workloads', list.filter((item) => item.type === 'vm' || item.type === 'lxc').length],
      ['Applications', list.filter((item) => item.type === 'app').length],
    ];
    return `<div class="proto-stats">${stats.map(([name, value], index) => `<div class="proto-stat proto-stat-${index}"><span>${esc(name)}</span><strong>${value}</strong></div>`).join('')}</div>`;
  }

  function toolbarHtml(mode) {
    const action = mode === 'tree'
      ? '<button class="proto-mini-btn" data-proto-expand>＋ Expand all</button><button class="proto-mini-btn" data-proto-collapse>− Collapse all</button>'
      : '<button class="proto-mini-btn" data-proto-clear>◎ Reset map</button>';
    const key = mode === 'graph'
      ? '<div class="proto-graph-legend"><span><i></i>Hosting</span><span class="explicit"><i></i>Connected</span></div>'
      : '<div class="proto-view-key"><span class="proto-key hardware">Hardware</span><span class="proto-key workload">VM/LXC</span><span class="proto-key app">App</span><span class="proto-key network">Network</span></div>';
    const primary = mode === 'tree'
      ? `<label class="proto-search"><input type="search" data-proto-search placeholder="Search name, IP, type or subnet..." value="${esc(state.query)}"></label>`
      : '<div class="proto-graph-help"><strong>Drag to move · Scroll to zoom</strong><span>Real topology layout with connected nodes.</span></div>';
    return `<div class="proto-toolbar">
      ${primary}
      ${key}
      <div class="proto-toolbar-actions">${action}</div>
    </div>`;
  }

  function inspectorHtml(model) {
    const item = itemById(state.selectedId);
    if (!item) return `<div class="proto-inspector-sticky"><div class="proto-inspector-empty"><span class="proto-empty-icon">◎</span><strong>Select a resource</strong><span>Details and direct relationships appear here.</span></div></div>`;
    const relations = selectedRelations(item, model);
    const rows = [
      ['Type', typeName(item)],
      ['IP / URL', itemIp(item) || item.webUrl || '—'],
      ['Status', statusName(item) || 'Not set'],
      ['Description', item.description || '—'],
    ];
    return `<div class="proto-inspector-sticky">
      <div><div class="proto-node-symbol">${esc(itemSymbol(item))}</div></div>
      <div><h4>${esc(item.name || 'Unnamed')}</h4><div class="proto-inspector-type">${esc(typeName(item))}</div></div>
      <div class="proto-inspector-grid">${rows.map(([key, value]) => `<div class="proto-info-row"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
      <div><div class="proto-inspector-type">Direct relationships · ${relations.length}</div><div class="proto-relations">${relations.length ? relations.map((entry) => `<span class="proto-relation-pill">${esc(entry.name)}</span>`).join('') : '<span class="proto-relation-pill">None</span>'}</div></div>
    </div>`;
  }

  function nodeHtml(item, model, visible, trail = new Set()) {
    const id = String(item.id);
    if (trail.has(id) || (visible && !visible.has(id))) return '';
    const nextTrail = new Set(trail).add(id);
    const children = (model.children.get(id) || []).filter((entry) => !visible || visible.has(String(entry.id)));
    const childHtml = children.map((entry) => nodeHtml(entry, model, visible, nextTrail)).join('');
    const hasChildren = Boolean(childHtml);
    const meta = [typeName(item), itemIp(item)].filter(Boolean).join(' · ');
    const selected = state.selectedId === id ? ' proto-node-selected' : '';
    if (!hasChildren) {
      return `<article class="proto-tree-node proto-node-leaf${selected}" data-proto-node="${esc(id)}"><div class="proto-node-summary"><span class="proto-node-symbol">${esc(itemSymbol(item))}</span><span class="proto-node-copy"><strong>${esc(item.name || 'Unnamed')}</strong><small>${esc(meta)}</small></span><span class="proto-node-meta">${statusDot(item)}</span></div></article>`;
    }
    return `<details class="proto-tree-node${selected}" data-proto-node="${esc(id)}" open><summary class="proto-node-summary"><span class="proto-node-symbol">${esc(itemSymbol(item))}</span><span class="proto-node-copy"><strong>${esc(item.name || 'Unnamed')}</strong><small>${esc(meta)}</small></span><span class="proto-node-meta">${statusDot(item)}<span class="proto-child-count">${children.length}</span></span></summary><div class="proto-tree-children">${childHtml}</div></details>`;
  }

  function renderTree(root, model) {
    const list = allItems();
    const query = state.query.trim().toLowerCase();
    let visible = null;
    if (query) {
      visible = new Set();
      list.filter((item) => itemSearchText(item).includes(query)).forEach((item) => {
        let id = String(item.id);
        visible.add(id);
        const guard = new Set();
        while (model.parents.get(id) && !guard.has(id)) {
          guard.add(id);
          id = model.parents.get(id);
          visible.add(id);
        }
      });
    }

    const roots = list.filter((item) => !model.parents.get(String(item.id)) && (!visible || visible.has(String(item.id))));
    const groups = [
      { title: 'Network foundation', sub: 'Networks, gateways, switches and access points', match: (item) => item.type === 'network' || (item.type === 'hardware' && networkDeviceKinds.has(item.hardwareKind)) },
      { title: 'Compute & storage', sub: 'Physical hosts, hypervisors, NAS and infrastructure', match: (item) => item.type === 'hardware' && !networkDeviceKinds.has(item.hardwareKind) },
      { title: 'Unassigned workloads', sub: 'Resources without a valid parent relationship', match: (item) => item.type !== 'hardware' && item.type !== 'network' },
    ];
    const sections = groups.map((group) => {
      const entries = roots.filter(group.match);
      if (!entries.length && query) return '';
      const body = entries.length ? entries.map((item) => nodeHtml(item, model, visible)).join('') : '<div class="proto-empty">No resources in this section.</div>';
      return `<section class="proto-group"><div class="proto-group-head"><div class="proto-group-title"><strong>${group.title}</strong><small>${group.sub}</small></div><span class="proto-count">${entries.length}</span></div><div class="proto-tree-roots">${body}</div></section>`;
    }).join('');
    root.querySelector('.proto-main').innerHTML = sections || '<div class="proto-empty">No resources match this search.</div>';
  }

  function graphLane(item) {
    if (item.type === 'network' || (item.type === 'hardware' && networkDeviceKinds.has(item.hardwareKind))) return 0;
    if (item.type === 'hardware') return 1;
    if (item.type === 'vm' || item.type === 'lxc') return 2;
    return 3;
  }

  function graphEdges(model) {
    const result = [];
    const seen = new Set();
    const add = (source, target, kind) => {
      if (!source || !target || String(source) === String(target)) return;
      const key = [String(source), String(target)].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ source: String(source), target: String(target), kind });
    };
    model.parents.forEach((parent, child) => add(parent, child, 'hosting'));
    allItems().forEach((item) => (item.connections || []).forEach((target) => add(item.id, target, 'explicit')));
    return result.filter((edge) => itemById(edge.source) && itemById(edge.target));
  }

  function nodeCardHtml(item) {
    const queryMuted = state.query && !itemSearchText(item).includes(state.query.toLowerCase()) ? ' is-muted' : '';
    const active = String(item.id) === state.selectedId ? ' is-active' : '';
    return `<button type="button" class="proto-graph-node${queryMuted}${active}" data-proto-graph-node="${esc(item.id)}"><span class="proto-node-symbol">${esc(itemSymbol(item))}</span><span class="proto-node-copy"><strong>${esc(item.name || 'Unnamed')}</strong><small>${esc(itemIp(item) || typeName(item))}</small></span><span class="proto-node-kind">${esc(item.type === 'hardware' ? (item.hardwareKind || 'hardware') : item.type)}</span></button>`;
  }

  function drawGraph(root, edges) {
    const board = root.querySelector('.proto-graph-board');
    const svg = root.querySelector('.proto-graph-links');
    if (!board || !svg) return;
    const boardRect = board.getBoundingClientRect();
    const width = Math.max(board.scrollWidth, board.clientWidth);
    const height = Math.max(board.scrollHeight, board.clientHeight);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '<defs><marker id="proto-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path></marker></defs>';
    edges.forEach((edge) => {
      const source = root.querySelector(`[data-proto-graph-node="${CSS.escape(edge.source)}"]`);
      const target = root.querySelector(`[data-proto-graph-node="${CSS.escape(edge.target)}"]`);
      if (!source || !target) return;
      const a = source.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const downward = b.top >= a.top;
      const x1 = a.left + a.width / 2 - boardRect.left;
      const y1 = (downward ? a.bottom : a.top) - boardRect.top;
      const x2 = b.left + b.width / 2 - boardRect.left;
      const y2 = (downward ? b.top : b.bottom) - boardRect.top;
      const bend = Math.max(34, Math.abs(y2 - y1) * .42);
      const muted = state.selectedId && edge.source !== state.selectedId && edge.target !== state.selectedId;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + (downward ? bend : -bend)}, ${x2} ${y2 - (downward ? bend : -bend)}, ${x2} ${y2}`);
      path.setAttribute('class', `proto-edge ${edge.kind}${muted ? ' is-muted' : ''}`);
      path.setAttribute('marker-end', 'url(#proto-arrow)');
      svg.appendChild(path);
    });
  }

  function renderGraph(root, model) {
    const lanes = [
      ['01 · Network', 'Networks, routers, switches & access points'],
      ['02 · Hardware', 'Hosts, hypervisors, storage & physical devices'],
      ['03 · Workloads', 'Virtual machines & LXC containers'],
      ['04 · Services', 'Applications & exposed services'],
    ];
    const grouped = lanes.map(() => []);
    allItems().forEach((item) => grouped[graphLane(item)].push(item));
    grouped.forEach((entries) => entries.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true })));
    const maxCount = Math.max(1, ...grouped.map((entries) => entries.length));
    root.querySelector('.proto-main').innerHTML = `<div class="proto-graph-scroll"><div class="proto-graph-board" style="min-height:${Math.max(610, 100 + maxCount * 78)}px"><svg class="proto-graph-links" aria-hidden="true"></svg><div class="proto-graph-lanes">${lanes.map(([title, sub], index) => `<section class="proto-lane"><div class="proto-lane-head"><div><strong>${title}</strong><div class="proto-inspector-type">${sub}</div></div><span>${grouped[index].length}</span></div><div class="proto-lane-nodes">${grouped[index].map(nodeCardHtml).join('') || '<div class="proto-empty">Empty</div>'}</div></section>`).join('')}</div></div></div>`;
    const edges = graphEdges(model);
    requestAnimationFrame(() => drawGraph(root, edges));
    if (window.ResizeObserver) new ResizeObserver(() => drawGraph(root, edges)).observe(root.querySelector('.proto-graph-board'));
  }

  function bindPrototype(root, model) {
    const search = root.querySelector('[data-proto-search]');
    search?.addEventListener('input', () => {
      state.query = search.value;
      const container = root.closest('#tree-content, #mobile-tree-content') || treeContent;
      renderInto(container, state.mode);
      requestAnimationFrame(() => {
        const next = container.querySelector('[data-proto-search]');
        next?.focus();
        if (next) next.selectionStart = next.selectionEnd = next.value.length;
      });
    });
    root.querySelector('[data-proto-expand]')?.addEventListener('click', () => root.querySelectorAll('.proto-tree-node').forEach((node) => { if (node.tagName === 'DETAILS') node.open = true; }));
    root.querySelector('[data-proto-collapse]')?.addEventListener('click', () => root.querySelectorAll('.proto-tree-node').forEach((node) => { if (node.tagName === 'DETAILS') node.open = false; }));
    root.querySelector('[data-proto-clear]')?.addEventListener('click', () => {
      state.selectedId = '';
      state.query = '';
      const container = root.closest('#tree-content, #mobile-tree-content') || treeContent;
      renderInto(container, state.mode);
    });

    root.querySelectorAll('[data-proto-node]').forEach((node) => node.addEventListener('click', (event) => {
      event.stopPropagation();
      state.selectedId = node.dataset.protoNode;
      root.querySelectorAll('[data-proto-node]').forEach((entry) => entry.classList.toggle('proto-node-selected', entry.dataset.protoNode === state.selectedId));
      root.querySelector('.proto-inspector').innerHTML = inspectorHtml(model);
    }));

    const edges = graphEdges(model);
    root.querySelectorAll('[data-proto-graph-node]').forEach((node) => node.addEventListener('click', () => {
      state.selectedId = node.dataset.protoGraphNode;
      const connected = new Set([state.selectedId]);
      edges.forEach((edge) => { if (edge.source === state.selectedId) connected.add(edge.target); if (edge.target === state.selectedId) connected.add(edge.source); });
      root.querySelectorAll('[data-proto-graph-node]').forEach((entry) => {
        entry.classList.toggle('is-active', entry.dataset.protoGraphNode === state.selectedId);
        entry.classList.toggle('is-muted', !connected.has(entry.dataset.protoGraphNode));
      });
      root.querySelector('.proto-inspector').innerHTML = inspectorHtml(model);
      drawGraph(root, edges);
    }));
  }

  function renderInto(container, mode) {
    if (!container) return;
    state.mode = mode;
    const model = relationshipModel();
    container.classList.toggle('graph-mode', mode === 'graph');
    const conceptTitle = mode === 'graph' ? 'Topology Map' : 'Infrastructure Tree';
    const conceptText = mode === 'graph'
      ? 'A real node graph for navigating hosting and infrastructure relationships.'
      : 'Follow every resource from its root device down to guests and applications.';
    if (mode === 'graph') {
      container.innerHTML = `<div class="tree-shell"><div class="proto-view proto-view-native-graph"><header class="proto-concept-head"><div><h2>${conceptTitle}</h2><p>${conceptText}</p></div></header>${toolbarHtml(mode)}<main class="proto-native-graph"></main></div></div>`;
      const root = container.querySelector('.proto-view');
      root.querySelector('.proto-native-graph').appendChild(buildGraphView());
      bindPrototype(root, model);
      return;
    }
    container.innerHTML = `<div class="tree-shell"><div class="proto-view"><header class="proto-concept-head"><div><h2>${conceptTitle}</h2><p>${conceptText}</p></div></header>${toolbarHtml(mode)}${statsHtml()}<div class="proto-workspace"><main class="proto-main${mode === 'graph' ? ' proto-graph-main' : ''}"></main><aside class="proto-inspector">${inspectorHtml(model)}</aside></div></div></div>`;
    const root = container.querySelector('.proto-view');
    renderTree(root, model);
    bindPrototype(root, model);
  }

  function renderPrototypeView() {
    renderInto(treeContent, treeViewMode === 'graph' ? 'graph' : 'tree');
  }

  renderTreeView = renderPrototypeView;

  if (typeof renderMobileTree === 'function') {
    renderMobileTree = function renderMobilePrototype() {
      const container = document.getElementById('mobile-tree-content');
      const graphMode = treeViewMode === 'graph';
      document.getElementById('mobile-tree-mode-tree')?.classList.toggle('active', !graphMode);
      document.getElementById('mobile-tree-mode-graph')?.classList.toggle('active', graphMode);
      renderInto(container, graphMode ? 'graph' : 'tree');
    };
  }

  const mobileGraphButton = document.getElementById('mobile-tree-mode-graph');
  const mobileTreeButton = document.getElementById('mobile-tree-mode-tree');
  mobileGraphButton?.addEventListener('click', (event) => {
    event.stopImmediatePropagation();
    treeViewMode = 'graph';
    mobileTreeButton?.classList.remove('active');
    mobileGraphButton.classList.add('active');
    renderMobileTree();
  }, { capture: true });
  mobileTreeButton?.addEventListener('click', (event) => {
    event.stopImmediatePropagation();
    treeViewMode = 'tree';
    mobileTreeButton.classList.add('active');
    mobileGraphButton?.classList.remove('active');
    renderMobileTree();
  }, { capture: true });
})();

// Keep native selects as the source of truth while presenting their options in
// the same Labby menu on pointer and touch input. Keyboard use stays native.
(() => {
  let activeMenu = null;
  let activeSelect = null;
  function closeMenu(restoreFocus = false) {
    const previous = activeSelect;
    activeMenu?.remove();
    activeMenu = null;
    activeSelect = null;
    if (restoreFocus && previous?.isConnected) previous.focus();
  }
  document.addEventListener('pointerdown', (event) => {
    const select = event.target.closest('select');
    if (!select || select.multiple || select.size > 1 || select.disabled) {
      if (activeMenu && !activeMenu.contains(event.target)) closeMenu();
      return;
    }
    event.preventDefault();
    if (activeSelect === select) { closeMenu(true); return; }
    closeMenu();
    activeSelect = select;
    const menu = document.createElement('div');
    menu.className = 'labby-select-menu';
    menu.setAttribute('role', 'listbox');
    const rect = select.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom;
    const menuHeight = Math.min(300, window.innerHeight * .45, Math.max(100, select.options.length * 40 + 12));
    menu.style.left = `${Math.max(4, rect.left)}px`;
    menu.style.width = `${Math.min(rect.width, window.innerWidth - 8)}px`;
    menu.style.top = `${Math.max(4, availableBelow >= menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4)}px`;
    menu.style.maxHeight = `${menuHeight}px`;
    [...select.options].forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.textContent;
      button.disabled = option.disabled || option.parentElement?.disabled;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(option.selected));
      button.addEventListener('click', () => {
        const changed = select.selectedIndex !== index;
        select.selectedIndex = index;
        closeMenu(true);
        if (changed) {
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      menu.appendChild(button);
    });
    (select.closest('dialog[open]') || document.body).appendChild(menu);
    activeMenu = menu;
    menu.querySelector('[aria-selected="true"]:not(:disabled)')?.focus({ preventScroll: true });
  }, true);
  document.addEventListener('keydown', (event) => {
    if (!activeMenu) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const options = [...activeMenu.querySelectorAll('button:not(:disabled)')];
      const index = options.indexOf(document.activeElement);
      options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
    }
  });
  window.addEventListener('resize', () => closeMenu());
  document.addEventListener('scroll', (event) => {
    if (activeMenu && !activeMenu.contains(event.target)) closeMenu();
  }, true);
})();
