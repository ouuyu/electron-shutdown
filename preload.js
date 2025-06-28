const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getShutdownSchedules: () => ipcRenderer.invoke('get-shutdown-schedules'),
  setShutdownSchedules: (schedules) => ipcRenderer.send('set-shutdown-schedules', schedules),
  executeShutdown: () => ipcRenderer.send('execute-shutdown'),
  closeCountdownWindow: () => ipcRenderer.send('close-countdown-window'),
  getUserLocation: () => ipcRenderer.invoke('get-user-location'),
  setUserLocation: (location) => ipcRenderer.invoke('set-user-location', location),
});