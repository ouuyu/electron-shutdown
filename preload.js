const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getShutdownSchedules: () => ipcRenderer.invoke('get-shutdown-schedules'),
  setShutdownSchedules: (schedules) => ipcRenderer.send('set-shutdown-schedules', schedules),
  executeShutdown: () => ipcRenderer.send('execute-shutdown'),
  closeCountdownWindow: () => ipcRenderer.send('close-countdown-window'),
  getUserLocation: () => ipcRenderer.invoke('get-user-location'),
  setUserLocation: (location) => ipcRenderer.invoke('set-user-location', location),

  // LLM配置
  getLLMConfig: () => ipcRenderer.invoke('get-llm-config'),
  setLLMConfig: (config) => ipcRenderer.invoke('set-llm-config', config),
  testLLMConnection: (config) => ipcRenderer.invoke('test-llm-connection', config),

  // 桌面整理事件监听
  onOrganizeLog: (callback) => ipcRenderer.on('organize-log', (_, message) => callback(message)),
  onOrganizeComplete: (callback) => ipcRenderer.on('organize-complete', () => callback()),
  onOrganizeError: (callback) => ipcRenderer.on('organize-error', (_, error) => callback(error)),
});