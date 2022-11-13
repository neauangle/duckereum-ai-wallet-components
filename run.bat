@echo off
REM Change to batch file's location so we can call it anywhere
CD /D "%~dp0" 

cd telegram_bot
echo Installing telegram_bot dependencies...
CALL npm install
echo: 


cd ../verification_site
echo Installing verification site dependencies...
CALL npm install
echo: 

cd ..

start node telegram_bot/bot.js
CALL node verification_site/server.js

set /p Input=