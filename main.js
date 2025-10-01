const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const DesktopOrganizer = require('./src/services/DesktopOrganizer');

let tray = null;
let mainWindow = null;
let countdownWindow = null;
let shutdownSchedules = []; // 存储关机计划
let timer = null;
let currentSchedule = null; // 当前触发的计划

let configPath;
const dDrive = 'd:';
const nezhaDir = path.join(dDrive, 'nezha');
const nezhaConfig = path.join(nezhaDir, 'config.json');

try {
  if (fs.existsSync(dDrive + '\\')) {
    if (!fs.existsSync(nezhaDir)) {
      fs.mkdirSync(nezhaDir, { recursive: true });
    }
    configPath = nezhaConfig;
    console.log('Using config path:', configPath);
  } else {
    configPath = path.join(app.getPath('userData'), 'config.json');
    console.log('Using config path:', configPath);
  }
} catch (e) {
  configPath = path.join(app.getPath('userData'), 'config.json');
  console.error('Error checking D drive, fallback to userData:', e);
}

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
    {
      label: '手动整理文件',
      click: () => {
        createOrganizeWindow();
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
        currentSchedule = schedule; // 保存当前触发的计划
        createCountdownWindow(schedule);
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
const createCountdownWindow = (schedule) => {
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
    countdownWindow.setAlwaysOnTop(true, 'screen-saver'); // 强制最前端
    countdownWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); // 多桌面也可见

    // 根据是否需要整理桌面选择不同页面
    const needOrganize = schedule && schedule.organizeDesktop;
    if (needOrganize) {
        countdownWindow.loadFile('src/renderer/organize.html');
        // 页面加载完成后开始整理桌面
        countdownWindow.webContents.once('did-finish-load', () => {
            startDesktopOrganize();
        });
    } else {
        countdownWindow.loadFile('src/renderer/countdown.html');
    }

    countdownWindow.on('closed', () => {
        countdownWindow = null;
        currentSchedule = null;
        if (shutdownSchedules.length > 0 && !timer) {
            timer = setInterval(checkShutdownCondition, 1000);
        }
    });
};

// 创建全屏整理窗口（不关机）
const createOrganizeWindow = () => {
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
    countdownWindow.setAlwaysOnTop(true, 'screen-saver');
    countdownWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // 创建仅整理的HTML页面
    countdownWindow.loadFile('src/renderer/organize-only.html');

    // 页面加载完成后开始整理桌面
    countdownWindow.webContents.once('did-finish-load', () => {
        startDesktopOrganize();
    });

    countdownWindow.on('closed', () => {
        countdownWindow = null;
    });
};


app.whenReady().then(() => {
  // 启动时加载配置
  loadConfig();

  createTray();
  // createMainWindow();

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

const locationPath = path.join(app.getPath('userData'), 'user_location.json');

ipcMain.handle('get-user-location', async () => {
  try {
    if (fs.existsSync(locationPath)) {
      const data = fs.readFileSync(locationPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Failed to read user location:', err);
    return null;
  }
});

ipcMain.handle('set-user-location', async (_event, location) => {
  try {
    fs.writeFileSync(locationPath, JSON.stringify(location, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save user location:', err);
    return { success: false, error: err.message };
  }
});

// LLM配置路径
const llmConfigPath = path.join(app.getPath('userData'), 'llm_config.json');

// 获取LLM配置
ipcMain.handle('get-llm-config', async () => {
  try {
    if (fs.existsSync(llmConfigPath)) {
      const data = fs.readFileSync(llmConfigPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Failed to read LLM config:', err);
    return null;
  }
});

// 保存LLM配置
ipcMain.handle('set-llm-config', async (_event, config) => {
  try {
    fs.writeFileSync(llmConfigPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save LLM config:', err);
    throw new Error(err.message);
  }
});

// 测试LLM连接
ipcMain.handle('test-llm-connection', async (_event, config) => {
  const { baseUrl, apiKey, model } = config;
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      // 确保baseUrl以 /v1 结尾或已包含完整路径
      let apiUrl = baseUrl;
      if (!apiUrl.endsWith('/')) {
        apiUrl += '/';
      }
      if (!apiUrl.includes('/chat/completions')) {
        apiUrl += 'chat/completions';
      }

      const url = new URL(apiUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const postData = JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Hi, this is a connection test. Please respond with "OK".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000 // 15秒超时
      };

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data);
              resolve({
                success: true,
                model: result.model || model,
                responseTime: responseTime,
                message: 'Connection successful!'
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError.message}`
              });
            }
          } else {
            try {
              const errorData = JSON.parse(data);
              resolve({
                success: false,
                error: `HTTP ${res.statusCode}: ${errorData.error?.message || data.substring(0, 200)}`
              });
            } catch {
              resolve({
                success: false,
                error: `HTTP ${res.statusCode}: ${data.substring(0, 200)}`
              });
            }
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: `Network error: ${error.message}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout (15s)'
        });
      });

      req.write(postData);
      req.end();
    } catch (error) {
      resolve({
        success: false,
        error: `Configuration error: ${error.message}`
      });
    }
  });
});

// 开始整理桌面
const startDesktopOrganize = async () => {
  try {
    // 加载LLM配置
    let llmConfig = null;
    if (fs.existsSync(llmConfigPath)) {
      const data = fs.readFileSync(llmConfigPath, 'utf8');
      llmConfig = JSON.parse(data);
    }

    if (!llmConfig || !llmConfig.baseUrl || !llmConfig.apiKey || !llmConfig.model) {
      sendOrganizeLog('错误：LLM配置不完整，无法整理桌面');
      sendOrganizeError('LLM配置不完整');
      return;
    }

    // 创建整理器实例
    const organizer = new DesktopOrganizer(llmConfig, (message) => {
      sendOrganizeLog(message);
    });

    // 开始整理
    await organizer.organize();

    // 发送完成事件
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      countdownWindow.webContents.send('organize-complete');
    }
  } catch (error) {
    console.error('Desktop organize error:', error);
    sendOrganizeError(error.message);
  }
};

// 发送整理日志到渲染进程
const sendOrganizeLog = (message) => {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.webContents.send('organize-log', message);
  }
};

// 发送整理错误到渲染进程
const sendOrganizeError = (error) => {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.webContents.send('organize-error', error);
  }
};