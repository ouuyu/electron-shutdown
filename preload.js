// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 从主进程 -> 渲染进程
  getShutdownSchedules: () => ipcRenderer.invoke('get-shutdown-schedules'),
  // 从渲染进程 -> 主进程
  setShutdownSchedules: (schedules) => ipcRenderer.send('set-shutdown-schedules', schedules),
  executeShutdown: () => ipcRenderer.send('execute-shutdown'),
  closeCountdownWindow: () => ipcRenderer.send('close-countdown-window'),
});