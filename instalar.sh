#!/bin/bash
# MM Confeitaria - Instalação (Mac/Linux)

set -e
echo "=========================================="
echo "  MM CONFEITARIA - INSTALANDO O SISTEMA"
echo "=========================================="
echo ""

# Backend
echo "[1/3] Instalando Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=mm_confeitaria
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=mm-confeitaria-local-secret-change-me
EOF
fi
deactivate
cd ..

# Frontend
echo "[2/3] Instalando Frontend..."
cd frontend
yarn install
if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
EOF
fi
cd ..

echo "[3/3] Concluído!"
echo ""
echo "Para iniciar o sistema: ./iniciar.sh"
echo ""
