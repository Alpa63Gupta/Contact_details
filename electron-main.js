const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const http = require("http");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const APP_URL = process.env.DESKTOP_APP_URL || "http://localhost:3000";
let mainWindow = null;
let serverListener = null;
let startedEmbeddedServer = false;
const shouldUseEmbeddedServer = /^https?:\/\/localhost(?::\d+)?$/i.test(APP_URL) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(APP_URL);

function waitForUrl(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const request = http.get(`${url}/api/health`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve(true);
          return;
        }
        retryOrFail();
      });

      request.on("error", retryOrFail);
      request.setTimeout(3000, () => {
        request.destroy();
        retryOrFail();
      });
    };

    const retryOrFail = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("POS server did not become ready in time."));
        return;
      }
      setTimeout(tryRequest, 500);
    };

    tryRequest();
  });
}

async function ensureServerRunning() {
  if (!shouldUseEmbeddedServer) {
    await waitForUrl(APP_URL, 15000);
    return;
  }

  try {
    await waitForUrl(APP_URL, 2500);
    return;
  } catch (_error) {
    const { startServer } = require(path.join(__dirname, "server.js"));
    serverListener = await startServer();
    startedEmbeddedServer = true;
    await waitForUrl(APP_URL, 15000);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#f4ede1",
    autoHideMenuBar: true,
    title: "Ramesh sweets",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(APP_URL);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await ensureServerRunning();
    createWindow();
  } catch (error) {
    dialog.showErrorBox("Ramesh sweets", error.message || "Failed to start the desktop app.");
    app.quit();
  }
});

app.on("window-all-closed", async () => {
  if (startedEmbeddedServer && serverListener) {
    await new Promise((resolve) => serverListener.close(resolve));
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
