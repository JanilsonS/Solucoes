@echo off
chcp 65001 > nul
title MM Confeitaria - Iniciando
color 0D
echo.
echo ==========================================
echo   MM CONFEITARIA - INICIANDO O SISTEMA
echo ==========================================
echo.
echo Aguarde abrir as janelas do Backend e Frontend...
echo NAO FECHE as janelas enquanto estiver usando!
echo.

REM Inicia Backend em nova janela
start "MM Confeitaria - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

REM Aguarda backend subir
timeout /t 5 /nobreak > nul

REM Inicia Frontend em nova janela
start "MM Confeitaria - Frontend" cmd /k "cd /d %~dp0frontend && yarn start"

REM Aguarda frontend subir
timeout /t 10 /nobreak > nul

REM Abre navegador
start http://localhost:3000

echo.
echo ==========================================
echo   SISTEMA RODANDO!
echo ==========================================
echo.
echo Acesse no navegador: http://localhost:3000
echo.
echo Login:
echo    Email: admin@mm.com
echo    Senha: mm123456
echo.
echo Para FECHAR o sistema, basta fechar as 2 janelas
echo pretas que abriram (Backend e Frontend).
echo.
echo Esta janela pode ser fechada agora.
echo.
pause
