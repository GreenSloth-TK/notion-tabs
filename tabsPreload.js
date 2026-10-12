const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tabsApi", {
  onTabs: (callback) => ipcRenderer.on("tabs", (_, state) => callback(state)),
  activate: (id) => ipcRenderer.send("tab:activate", id),
  close: (id) => ipcRenderer.send("tab:close", id),
  newTab: () => ipcRenderer.send("tab:new"),
  move: (id, toIndex) => ipcRenderer.send("tab:move", id, toIndex),
  dragEnd: (id) => ipcRenderer.send("tab:drag-end", id),
});
