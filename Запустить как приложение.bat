@echo off
setlocal
set "APP=%~dp0index.html"
where msedge.exe >nul 2>&1 && start "" msedge.exe --app="%APP%" && exit /b
where chrome.exe >nul 2>&1 && start "" chrome.exe --app="%APP%" && exit /b
start "" "%APP%"
endlocal
