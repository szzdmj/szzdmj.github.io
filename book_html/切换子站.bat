@echo off&color 1f
title 切换网站
setlocal EnableDelayedExpansion

set p=%~dp0
cd /d %p%

:L0
echo.
echo  1. 一页式
echo.
echo  2. 分页式
echo.
echo  3. 翻墙软件下载
echo.
echo  4. 翻墙软件下载（有图）
echo.
set c1=
set /p c1= 请输入（1-4）: 
echo.

if "%c1%"=="1" (
	copy index1.html index.html /y
	if exist menu1.js copy menu1.js menu.js /y
) else if "%c1%"=="2" (
	copy index2.html index.html /y
	if exist menu2.js copy menu2.js menu.js /y
) else if "%c1%"=="3" (
	copy index3.html index.html /y
) else if "%c1%"=="4" (
	copy index4.html index.html /y
)

echo.
pause
echo.
goto L0
