// main.js
const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { create } = require('domain');

let tray = null;
let mainWindow = null;
let countdownWindow = null;
let shutdownSchedules = []; // 存储关机计划
let timer = null;

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');

// 保存配置到文件
const saveConfig = () => {
  try {
    const config = {
      shutdownSchedules: shutdownSchedules,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('config save to ', configPath);
  } catch (error) {
    console.error('fail to save config', error);
  }
};

// 从文件加载配置
const loadConfig = () => {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      shutdownSchedules = config.shutdownSchedules || [];
      console.log('config loaded', shutdownSchedules);
      console.log('last updated', config.lastUpdated);

      timer = setInterval(checkShutdownCondition, 1000);
      console.log('timer started');

      if (tray) {
        updateTrayMenu();
      }
    } else {
      console.log('no config, use default');
    }
  } catch (error) {
    console.error('fail to load config', error);
    shutdownSchedules = [];
  }
};

// 创建主窗口
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');

  // 窗口准备好后，确保渲染进程能获取到最新配置
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('finish loading main thread', shutdownSchedules);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// 创建系统托盘
const createTray = () => {
  tray = new Tray(path.join(__dirname, 'icon.png')); // 请准备一个 icon.png
  updateTrayMenu();
  tray.setToolTip('自动关机程序');
};

// 更新托盘菜单
const updateTrayMenu = () => {
  if (!tray) return;

  const scheduleCount = shutdownSchedules.length;
  const statusText = scheduleCount > 0 ? `当前有 ${scheduleCount} 个计划` : '暂无计划';

  const contextMenu = Menu.buildFromTemplate([
    { label: statusText, enabled: false },
    { type: 'separator' },
    {
      label: '手动倒计时',
      click: () => {
        createCountdownWindow();
      }
    },
    { type: 'separator' },
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        } else {
          createMainWindow();
        }
      }
    },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
};

// 轮询是否满足关机条件
const checkShutdownCondition = () => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 周日为7
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    for (const schedule of shutdownSchedules) {
      if (schedule.days.includes(dayOfWeek) &&
          schedule.time.hh === currentHour &&
          schedule.time.mm === currentMinute &&
          schedule.time.ss === currentSecond) {
        console.log('start countdown', schedule);
        createCountdownWindow();
        if(mainWindow) mainWindow.hide(); 
        clearInterval(timer); 
        timer = null;
        break;
      }
    }
  } catch (error) {
    console.error('check error', error);
  }
};

// 创建全屏倒计时窗口
const createCountdownWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    countdownWindow = new BrowserWindow({
        width,
        height,
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });
    countdownWindow.loadFile('src/renderer/countdown.html');
    countdownWindow.on('closed', () => {
        countdownWindow = null;
        if (shutdownSchedules.length > 0 && !timer) {
            timer = setInterval(checkShutdownCondition, 1000);
        }
    });
};


app.whenReady().then(() => {
  // 启动时加载配置
  loadConfig();

  createTray();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {});

// 获取当前关机计划
ipcMain.handle('get-shutdown-schedules', () => {
  return shutdownSchedules;
});

// 更新关机时间表
ipcMain.on('set-shutdown-schedules', (_, schedules) => {
  shutdownSchedules = schedules;
  console.log('update shutdown schedules', shutdownSchedules);

  // 保存配置到文件
  saveConfig();

  // 更新托盘菜单
  updateTrayMenu();

  // 清除现有定时器
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  // 如果有计划，启动新的定时器
  if (shutdownSchedules.length > 0) {
    timer = setInterval(checkShutdownCondition, 1000);
    console.log('restart timer, schedule num ', shutdownSchedules.length);
  } else {
    console.log('no schedule, timer stop');
  }
});

// 执行关机命令
ipcMain.on('execute-shutdown', () => {
  const command = process.platform === 'win32' ? 'shutdown /s /t 60' : 'shutdown -h now';
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`error to shutdonw: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
});

// 关闭倒计时窗口
ipcMain.on('close-countdown-window', () => {
    if (countdownWindow) {
        countdownWindow.close();
    }
});