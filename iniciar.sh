#!/bin/bash
# MM Confeitaria - Iniciar (Mac/Linux)

cd "$(dirname "$0")"

# Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
yarn start &
FRONTEND_PID=$!
cd ..

echo "=========================================="
echo "MM Confeitaria rodando em:"
echo "http://localhost:3000"
echo ""
echo "Login: admin@mm.com / mm123456"
echo ""
echo "Pressione Ctrl+C para encerrar."
echo "=========================================="

# Aguardar
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT
wait
