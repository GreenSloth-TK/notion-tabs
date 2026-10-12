const { app, BrowserWindow, WebContentsView, ipcMain, screen, shell, session } = require("electron");
const { registerMenuHandling } = require("./menuBarHandling");

const HOME_URL = "https://notion.so";
const TAB_BAR_HEIGHT = 34;

// One entry per window: { win, tabs: [{ id, view, favicon }], activeId }
const windows = new Set();

const isNotionUrl = (url) => {
  if (url === "" || url === "about:blank") return true;
  try {
    const { hostname } = new URL(url);
    return /(^|\.)notion\.(so|site|com)$/.test(hostname);
  } catch {
    return false;
  }
};

const findTab = (id) => {
  for (const state of windows) {
    const index = state.tabs.findIndex((t) => t.id === id);
    if (index !== -1) return { state, index, tab: state.tabs[index] };
  }
  return {};
};

const stateOfBar = (webContents) => [...windows].find((s) => s.win.webContents === webContents);

const sendTabs = (state) => {
  if (state.win.isDestroyed()) return;
  const list = state.tabs.map(({ id, view, favicon }) => ({
    id,
    favicon,
    title: view.webContents.getTitle() || "Notion",
  }));
  state.win.webContents.send("tabs", { tabs: list, activeId: state.activeId });
  const active = state.tabs.find((t) => t.id === state.activeId);
  if (active) state.win.setTitle(active.view.webContents.getTitle() || "Notion");
};

const layout = (state) => {
  const { width, height } = state.win.getContentBounds();
  for (const { view } of state.tabs) {
    view.setBounds({ x: 0, y: TAB_BAR_HEIGHT, width, height: height - TAB_BAR_HEIGHT });
  }
};

const activateTab = (state, id) => {
  state.activeId = id;
  for (const t of state.tabs) t.view.setVisible(t.id === id);
  state.tabs.find((t) => t.id === id)?.view.webContents.focus();
  sendTabs(state);
};

// Takes a tab out of its window without destroying it or touching the rest of the window
const takeTab = (id) => {
  const found = findTab(id);
  if (!found.tab) return found;
  found.state.tabs.splice(found.index, 1);
  found.state.win.contentView.removeChildView(found.tab.view);
  return found;
};

// Like takeTab, but closes the window if it was the last tab, or activates a neighbour
const detachTab = (id) => {
  const { state, index, tab } = takeTab(id);
  if (!tab) return null;
  if (state.tabs.length === 0) state.win.close();
  else if (state.activeId === id) activateTab(state, state.tabs[Math.min(index, state.tabs.length - 1)].id);
  else sendTabs(state);
  return tab;
};

const attachTab = (state, tab, index = state.tabs.length, background = false) => {
  state.tabs.splice(index, 0, tab);
  state.win.contentView.addChildView(tab.view);
  layout(state);
  if (background) {
    tab.view.setVisible(false);
    sendTabs(state);
  } else {
    activateTab(state, tab.id);
  }
};

const closeTab = (id) => {
  const tab = detachTab(id);
  if (tab && !tab.view.webContents.isDestroyed()) tab.view.webContents.close();
};

const cycleTab = (state, step) => {
  const index = state.tabs.findIndex((t) => t.id === state.activeId);
  activateTab(state, state.tabs[(index + step + state.tabs.length) % state.tabs.length].id);
};

const handleShortcuts = (id) => (event, input) => {
  if (input.type !== "keyDown" || !input.control || input.alt) return;
  const { state } = findTab(id);
  if (!state) return;
  const key = input.key.toLowerCase();
  if (key === "t" && !input.shift) addTab(state, { url: HOME_URL });
  else if (key === "n" && !input.shift) createWindow();
  else if (key === "w" && !input.shift) closeTab(state.activeId);
  else if (key === "tab") cycleTab(state, input.shift ? -1 : 1);
  else if (key === "pagedown") cycleTab(state, 1);
  else if (key === "pageup") cycleTab(state, -1);
  else return;
  event.preventDefault();
};

// Either loads `url` in a new view, or wraps the webContents/webPreferences Electron
// hands us for a window.open() so the opener relationship stays intact.
const addTab = (state, { url, webContents, webPreferences, background = false }) => {
  const view = new WebContentsView({
    ...(webContents && { webContents }),
    webPreferences: { spellcheck: false, ...webPreferences },
  });
  const tab = { id: view.webContents.id, view, favicon: null };
  const refresh = () => {
    const owner = findTab(tab.id).state;
    if (owner) sendTabs(owner);
  };

  view.webContents.on("page-title-updated", refresh);
  view.webContents.on("page-favicon-updated", (_, favicons) => {
    tab.favicon = favicons[0] ?? null;
    refresh();
  });
  view.webContents.on("before-input-event", handleShortcuts(tab.id));
  view.webContents.on("destroyed", () => detachTab(tab.id));

  attachTab(state, tab, undefined, background);
  if (url) view.webContents.loadURL(url, { userAgent: "Chrome" });
  return view.webContents;
};

const createWindow = ({ tab, bounds } = {}) => {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    icon: __dirname + "/icon.png",
    ...bounds,
    show: false,
    webPreferences: {
      preload: __dirname + "/tabsPreload.js",
    },
  });
  const state = { win, tabs: [], activeId: null };
  windows.add(state);

  // Maximizing before the window is mapped is sometimes ignored on X11
  win.once("ready-to-show", () => (bounds ? win.show() : win.maximize()));
  win.loadFile(__dirname + "/tabs.html");
  win.webContents.on("did-finish-load", () => sendTabs(state));
  // X11 maximize doesn't always emit "resize"
  for (const event of ["resize", "maximize", "unmaximize", "enter-full-screen", "leave-full-screen"]) {
    win.on(event, () => layout(state));
  }
  win.on("closed", () => {
    windows.delete(state);
    const closing = state.tabs;
    state.tabs = [];
    for (const { view } of closing) {
      if (!view.webContents.isDestroyed()) view.webContents.close();
    }
  });

  if (windows.size === 1) registerMenuHandling(win);
  if (tab) attachTab(state, tab);
  else addTab(state, { url: HOME_URL });
  return state;
};

// Applies to every tab, so Notion links (middle click, "open in new tab") become tabs
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(({ url, disposition }) => {
    if (!isNotionUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    const state = findTab(contents.id).state ?? [...windows][0] ?? createWindow();
    return {
      action: "allow",
      createWindow: (options) =>
        addTab(state, {
          webContents: options.webContents,
          webPreferences: options.webPreferences,
          background: disposition === "background-tab",
        }),
    };
  });
});

ipcMain.on("tab:activate", (_, id) => {
  const { state } = findTab(id);
  if (state) activateTab(state, id);
});
ipcMain.on("tab:close", (_, id) => closeTab(id));
ipcMain.on("tab:new", (event) => addTab(stateOfBar(event.sender), { url: HOME_URL }));

// Dropped on a tab bar (same or another window): move it there
ipcMain.on("tab:move", (event, id, toIndex) => {
  const target = stateOfBar(event.sender);
  const { state: source, index } = findTab(id);
  if (!target || !source) return;
  if (source === target && index < toIndex) toIndex--;
  if (source === target && index === toIndex) return;
  const tab = source === target ? takeTab(id).tab : detachTab(id);
  attachTab(target, tab, Math.min(toIndex, target.tabs.length));
  target.win.focus();
});

// Dropped outside any tab bar: if it left the window, pop it into a new window there
ipcMain.on("tab:drag-end", (_, id) => {
  const { state } = findTab(id);
  if (!state || state.tabs.length < 2) return;
  const cursor = screen.getCursorScreenPoint();
  const { x, y, width, height } = state.win.getBounds();
  const inside = cursor.x >= x && cursor.x < x + width && cursor.y >= y && cursor.y < y + height;
  if (inside) return;
  const size = state.win.isMaximized() ? { width: Math.round(width * 0.7), height: Math.round(height * 0.7) } : { width, height };
  createWindow({ tab: detachTab(id), bounds: { x: cursor.x - 100, y: cursor.y - 15, ...size } });
});

app.on("ready", () => {
  session.defaultSession.setUserAgent("Chrome");
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["User-Agent"] = "Chrome";
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  createWindow();
});
