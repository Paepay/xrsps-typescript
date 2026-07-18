@echo off
cd /d "%~dp0"

start "xRSPS Server" cmd /k "yarn server:start"
start "xRSPS Client" cmd /k "yarn start"