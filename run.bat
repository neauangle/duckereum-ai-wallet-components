@echo off
REM Change to batch file's location so we can call it anywhere
CD /D "%~dp0" 

cd telegram_bot
if not exist "node_modules" (
	echo Installing telegram_bot dependencies...
    CALL npm install
	echo: 
)

cd ../wallet_verify
if not exist "node_modules" (
	echo Installing verification site dependencies...
    CALL npm install
	echo: 
)

cd ..

start node telegram_bot/bot.js
CALL node wallet_verify/server.js

set /p Input=