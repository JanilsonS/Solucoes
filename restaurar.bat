@echo off
chcp 65001 > nul
title MM Confeitaria - Restaurar Backup
color 0D
echo.
echo ==========================================
echo   MM CONFEITARIA - RESTAURAR BACKUP
echo ==========================================
echo.
echo ATENCAO: isso vai SUBSTITUIR os dados atuais
echo pelos dados do arquivo de backup escolhido.
echo.
set /p CONFIRMA="Tem certeza que deseja continuar? (S/N): "
if /i not "%CONFIRMA%"=="S" (
  echo Operacao cancelada.
  pause
  exit /b
)

REM Abre janela do Explorer para escolher o .zip
echo.
echo Selecione o arquivo .zip de backup...
echo.

powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Arquivos de Backup (*.zip)|*.zip'; $f.InitialDirectory = '%~dp0backups'; if ($f.ShowDialog() -eq 'OK') { $f.FileName } else { '' }" > "%TEMP%\bkp_path.txt"

set /p ARQUIVO_ZIP=<"%TEMP%\bkp_path.txt"
del "%TEMP%\bkp_path.txt"

if "%ARQUIVO_ZIP%"=="" (
  echo Nenhum arquivo selecionado. Operacao cancelada.
  pause
  exit /b
)

echo Arquivo escolhido: %ARQUIVO_ZIP%
echo.

set "PASTA_TEMP=%TEMP%\mm_restore_%RANDOM%"
mkdir "%PASTA_TEMP%"

echo Descompactando...
powershell -NoProfile -Command "Expand-Archive -Path '%ARQUIVO_ZIP%' -DestinationPath '%PASTA_TEMP%' -Force"

REM Procura mongorestore
set "MONGORESTORE="
where mongorestore > nul 2>&1
if not errorlevel 1 (
  set "MONGORESTORE=mongorestore"
) else (
  for /d %%i in ("C:\Program Files\MongoDB\Server\*") do (
    if exist "%%i\bin\mongorestore.exe" set "MONGORESTORE=%%i\bin\mongorestore.exe"
  )
)

if "%MONGORESTORE%"=="" (
  echo [ERRO] mongorestore nao encontrado!
  echo Instale as "MongoDB Database Tools" em:
  echo https://www.mongodb.com/try/download/database-tools
  rmdir /S /Q "%PASTA_TEMP%"
  pause
  exit /b
)

echo.
echo Restaurando dados...
"%MONGORESTORE%" --uri="mongodb://localhost:27017" --db=mm_confeitaria --drop "%PASTA_TEMP%\mm_confeitaria"

if errorlevel 1 (
  echo [ERRO] Falha ao restaurar. Verifique se o MongoDB esta rodando.
  rmdir /S /Q "%PASTA_TEMP%"
  pause
  exit /b
)

rmdir /S /Q "%PASTA_TEMP%"

echo.
echo ==========================================
echo   RESTAURACAO CONCLUIDA COM SUCESSO!
echo ==========================================
echo.
echo Os dados foram restaurados. Voce ja pode
echo usar o sistema normalmente com os dados
echo do backup escolhido.
echo.
pause
