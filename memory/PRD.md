# PRD — MM Confeitaria & Eventos (Sistema de Gestão & Precificação)

## Problema Original
Sistema completo de gestão e precificação de confeitaria para "MM Confeitaria & Eventos".
Roda localmente (React + FastAPI + MongoDB). Idioma: Português (pt-BR).
Formatação localizada (dd/mm/yyyy, moeda BR), dedução de estoque em tempo real,
preços históricos versionados, menu lateral agrupado.

## Stack
- Frontend: React, Tailwind, shadcn/ui (`/app/frontend`)
- Backend: FastAPI (`/app/backend/server.py`), MongoDB
- Integrações: Emergent Object Storage (upload de imagens na Ficha Detalhada), WhatsApp (URL wa.me nativa, sem API)

## Credenciais de Teste
admin@mm.com / mm123456

## Módulos Implementados (DONE)
- Dashboard futurista, DRE
- Matéria-Prima, Equipamentos, Custos (Horas/Mês global)
- Produtos, Markup
- Ficha Técnica (5 opções de margem), Ficha Detalhada Cósmica (foto via Object Storage)
- Precificação / Tabela de Venda (versionamento preço atual vs anterior)
- Pedido de Compras, Movimento de MP, Gestão de Estoques
- Cadastro de Pedidos (cliente, entrega, DRE por pedido, WhatsApp, PDF/Excel)
- Controle de Pedidos (filtros, range datas, status), Controle de Produção
- Configurações (mensagem WhatsApp customizável)
- Menu lateral agrupado
- **Manual do Usuário online (`/manual`)** — CONCLUÍDO em 20/06/2026 (Lote D finalizado), com botão Imprimir/PDF e detalhamento de instalação (pacotes pip, venv na pasta backend)
- **Gestão Financeira (`/financeiro`)** — CONCLUÍDO em 22/06/2026: campo Data de Vencimento em Pedidos; Telefone do Fornecedor em Compras; 4 blocos (Entradas, Saídas, Fluxo de Caixa por grupo, Contas Vencidas); toggles Recebido/Pago; gráficos (recharts); pop-up automático de vencidos no login. Testado 100% (iteration_7.json).

## Backlog / Próximas
- P2: Refatorar `server.py` (1200+ linhas) em rotas modulares (`/app/backend/routes/...`)
- P2: Exportar PDF da Ficha Detalhada Cósmica (se solicitado)

## Notas
- WhatsApp: apenas constrói URL https://wa.me/... (sem API paga)
- .env: manter REACT_APP_BACKEND_URL, MONGO_URL, DB_NAME inalterados
- URL preview atual: https://ficha-tecnica-3.preview.emergentagent.com
