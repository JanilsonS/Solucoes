@echo off
chcp 65001 > nul
title MM Confeitaria - Backup
color 0D
echo.
echo ==========================================
echo   MM CONFEITARIA - BACKUP DOS DADOS
echo ==========================================
echo.

REM Pega a data e hora para nomear o arquivo
for /f "tokens=2 delims==" %%a in ('"wmic OS Get localdatetime /value"') do set "dt=%%a"
set "DATA=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%h%dt:~10,2%"

set "PASTA_BACKUP=%~dp0backups"
set "NOME_BACKUP=mm_confeitaria_%DATA%"
set "CAMINHO_TEMP=%PASTA_BACKUP%\%NOME_BACKUP%"

REM Cria pasta de backups se não existir
if not exist "%PASTA_BACKUP%" mkdir "%PASTA_BACKUP%"

echo Criando backup em: %PASTA_BACKUP%
echo.

REM Tenta achar o mongodump
set "MONGODUMP="
where mongodump > nul 2>&1
if not errorlevel 1 (
  set "MONGODUMP=mongodump"
) else (
  REM Procura nas pastas comuns do MongoDB
  for /d %%i in ("C:\Program Files\MongoDB\Server\*") do (
    if exist "%%i\bin\mongodump.exe" set "MONGODUMP=%%i\bin\mongodump.exe"
  )
)

if "%MONGODUMP%"=="" (
  echo [ERRO] mongodump nao encontrado!
  echo.
  echo SOLUCAO: instale as "MongoDB Database Tools" em:
  echo https://www.mongodb.com/try/download/database-tools
  echo.
  pause
  exit /b
)

echo Exportando banco mm_confeitaria...
"%MONGODUMP%" --uri="mongodb://localhost:27017" --db=mm_confeitaria --out="%CAMINHO_TEMP%"

if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao gerar backup. Verifique se o MongoDB esta rodando.
  pause
  exit /b
)

echo.
echo Compactando em arquivo .zip...
powershell -NoProfile -Command "Compress-Archive -Path '%CAMINHO_TEMP%\*' -DestinationPath '%PASTA_BACKUP%\%NOME_BACKUP%.zip' -Force"

REM Remove pasta temporaria
rmdir /S /Q "%CAMINHO_TEMP%"

echo.
echo ==========================================
echo   BACKUP CONCLUIDO COM SUCESSO!
echo ==========================================
echo.
echo Arquivo gerado:
echo    %PASTA_BACKUP%\%NOME_BACKUP%.zip
echo.
echo DICA: copie esse .zip para o OneDrive ou
echo Google Drive para guardar como backup.
echo.
pause
