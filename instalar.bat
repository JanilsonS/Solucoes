@echo off
chcp 65001 > nul
title MM Confeitaria - Instalacao
color 0D
echo.
echo ==========================================
echo   MM CONFEITARIA - INSTALANDO O SISTEMA
echo ==========================================
echo.
echo Isso vai demorar uns 5-10 minutos. Calma!
echo.

REM Verifica Python
python --version > nul 2>&1
if errorlevel 1 (
  echo [ERRO] Python nao encontrado. Instale em https://www.python.org/downloads/
  echo IMPORTANTE: marque "Add Python to PATH" durante a instalacao.
  pause
  exit /b
)

REM Verifica Node
node --version > nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org/
  pause
  exit /b
)

REM Verifica Yarn
yarn --version > nul 2>&1
if errorlevel 1 (
  echo Instalando Yarn...
  call npm install -g yarn
)

echo.
echo [1/3] Instalando dependencias do Backend (Python)...
echo.
cd backend
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
  echo [ERRO] Falha ao instalar pacotes Python
  pause
  exit /b
)

REM Cria .env local se nao existir
if not exist .env (
  echo Criando arquivo de configuracao do backend...
  (
    echo MONGO_URL=mongodb://localhost:27017
    echo DB_NAME=mm_confeitaria
    echo CORS_ORIGINS=http://localhost:3000
    echo JWT_SECRET=mm-confeitaria-local-secret-change-me
  ) > .env
)

deactivate
cd ..

echo.
echo [2/3] Instalando dependencias do Frontend (React)...
echo.
cd frontend
call yarn install
if errorlevel 1 (
  echo [ERRO] Falha ao instalar pacotes do Frontend
  pause
  exit /b
)

REM Cria .env local
if not exist .env.local (
  echo Criando arquivo de configuracao do frontend...
  (
    echo REACT_APP_BACKEND_URL=http://localhost:8001
    echo WDS_SOCKET_PORT=3000
    echo ENABLE_HEALTH_CHECK=false
  ) > .env.local
)
cd ..

echo.
echo [3/3] Pronto! Tudo instalado com sucesso!
echo.
echo ==========================================
echo   INSTALACAO CONCLUIDA!
echo ==========================================
echo.
echo Para usar o sistema, clique duas vezes em:
echo    iniciar.bat
echo.
echo Login padrao:
echo    Email: admin@mm.com
echo    Senha: mm123456
echo.
pause
