const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const dialog = electron.dialog;
const powerSaveBlocker = electron.powerSaveBlocker;

const {Menu, MenuItem, ipcMain} = electron;

const fs = require("fs");
const striptags = require("striptags");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let windows = [];
let powerSaveBlock

function createWindow (e, path) {
    // Create the browser window.
    let mainWindow = new BrowserWindow({
	width: 800,
	height: 680,
	title: "NearPrompt",
	acceptFirstMouse: true,
	titleBarStyle: 'hidden',
	center: false
    });

    
  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  mainWindow.index = windows.push(mainWindow) - 1
		     
  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function (e) {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
      windows.splice(mainWindow.index, 1);
  })

  if (!powerSaveBlock) {
      powerSaveBlock = powerSaveBlocker.start("prevent-display-sleep");
  }
		     
  if (path && typeof path == "string") {
      app.addRecentDocument(path);
      fs.openSync(path, "r");
      var p, data = fs.readFileSync(path);
      if (path.endsWith("nps")) {
	  p = JSON.parse(data);
      } else {
	  p =  {
	      fontSize: "64px",
	      font: "Arial",
	      invert: false,
	      text: data.toString("utf-8")
	  }
      }
      mainWindow.webContents.on("did-finish-load", function() {
	  mainWindow.webContents.send("fileopen", p);
      });
      mainWindow.filename = path;
  }
}

function openFile(e) {
    paths = dialog.showOpenDialog({
	filters: [
	    {name: "All Supported Files", extensions: ["nps", "txt", "html"]},
	    {name: "NearPrompt Scripts", extensions: ["nps"]},
	    {name: "Text Files", extensions: ["txt", "html"]},
	],
	properties: ["openFile"]
    });
    if (paths && paths.length) {
	createWindow(e, paths[0]);
    }
}

function save(item) {
    var currentWindow = BrowserWindow.getFocusedWindow();
    if (item.label == "Save As" || !currentWindow.filename || !currentWindow.filename.endsWith(".nps")) {
	var def = "Untitled";
	if (currentWindow.filename) {
	    def = currentWindow.filename.slice(0, currentWindow.filename.lastIndexOf("."));
	    def += ".nps";
	}
	path = dialog.showSaveDialog(currentWindow,{
	    filters: [
		{name: "All Supported Files",
		 extensions: ["nps", "txt", "html"]},
		{name: "NearPrompt Scripts", extensions: ["nps"]},
		{name: "Text Files", extensions: ["txt"]},
		{name: "HTML Files", extensions: ["html"]},
	    ],
	    defaultPath: def
	});
	if (path) {
	    currentWindow.filename = path;
	    currentWindow.webContents.send("updatename", path);
	} else {
	    return false;
	}
    }
    currentWindow.webContents.send("filesave",true);
}
    
const template = [
    {
	label: 'File',
	submenu: [
	    {
		label: 'New',
		accelerator: 'CmdOrCtrl+N',
		click: createWindow
	    },
	    {
		label: 'Open',
		accelerator: 'CmdOrCtrl+O',
		click: openFile
	    },
	    {
		label: 'Close',
		accelerator: 'CmdOrCtrl+W',
		role: 'close'
	    },
	    {
		type: 'separator'
	    },
	    {
		label: 'Save',
		accelerator: 'CmdOrCtrl+S',
		click: save
	    },
	    {
		label: 'Save As',
		accelerator: 'Shift+CmdOrCtrl+S',
		click: save
	    }
	]
    },
    {
	label: 'Edit',
	submenu: [
	    {
		label: 'Undo',
		accelerator: 'CmdOrCtrl+Z',
		role: 'undo'
	    },
	    {
		label: 'Redo',
		accelerator: 'Shift+CmdOrCtrl+Z',
		role: 'redo'
	    },
	    {
		type: 'separator'
	    },
	    {
		label: 'Cut',
		accelerator: 'CmdOrCtrl+X',
		role: 'cut'
	    },
	    {
		label: 'Copy',
		accelerator: 'CmdOrCtrl+C',
		role: 'copy'
	    },
	    {
		label: 'Paste',
		accelerator: 'CmdOrCtrl+V',
		role: 'paste'
	    },
	    {
		label: 'Select All',
		accelerator: 'CmdOrCtrl+A',
		role: 'selectall'
	    },
	]
    },
    {
	label: 'Window',
	role: 'window',
	submenu: [
	    {
		label: 'Minimize',
		accelerator: 'CmdOrCtrl+M',
		role: 'minimize'
	    },
	    {
		label: 'Close',
		accelerator: 'CmdOrCtrl+W',
		role: 'close'
	    },
	]
    },
    {
	label: 'Help',
	role: 'help',
	submenu: [
	    {
		label: 'Learn More',
		click() { require('electron').shell.openExternal('http://nearprompt.aolkin.me'); }
	    },
	]
    },
];

if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
	label: name,
	submenu: [
	    {
		label: 'About ' + name,
		role: 'about'
	    },
	    {
		type: 'separator'
	    },
	    {
		label: 'Services',
		role: 'services',
		submenu: []
	    },
	    {
		type: 'separator'
	    },
	    {
		label: 'Hide ' + name,
		accelerator: 'Command+H',
		role: 'hide'
	    },
	    {
		label: 'Hide Others',
		accelerator: 'Command+Alt+H',
		role: 'hideothers'
	    },
	    {
		label: 'Show All',
		role: 'unhide'
	    },
	    {
		type: 'separator'
	    },
	    {
		label: 'Quit',
		accelerator: 'Command+Q',
		click: function click() { app.quit(); }
	    },
	]
    });
    // Window menu.
    template[3].submenu.push(
	{
	    type: 'separator'
	},
	{
	    label: 'Bring All to Front',
	    role: 'front'
	}
    );
}

menu = Menu.buildFromTemplate(template);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(e) {
    Menu.setApplicationMenu(menu);
    createWindow(e);
    
    ipcMain.on("filesave", function(event, data) {
	var filename = BrowserWindow.getFocusedWindow().filename;
	if (filename.endsWith(".nps")) {
	    fs.writeFileSync(filename, data, "utf-8");
	} else if (filename.endsWith(".txt")) {
	    var text = striptags(JSON.parse(data).text);
	    fs.writeFileSync(filename, text, "utf-8");
	} else if (filename.endsWith(".html")) {
	    var text = JSON.parse(data).text;
	    fs.writeFileSync(filename, text, "utf-8");
	}
    });
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
  powerSaveBlocker.stop(powerSaveBlock);
})

app.on('activate', function (e) {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.length === 0) {
    createWindow(e)
  }
})
    
app.on('open-file', createWindow);

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
