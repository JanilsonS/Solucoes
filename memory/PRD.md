# MM Confeitaria & Eventos - Sistema de Gestão

## Problema Original
Sistema de gestão e precificação para confeitaria MM, em Python/FastAPI + React, com 6 módulos: Cadastros, Ficha Técnica, Tabela de Preço, Pedidos, DRE e Dashboard. Design futurista com tema confeitaria (paleta rosé/marrom da logo), formatação BR, linhas alternadas, marca d'água do rodapé.

## Arquitetura
- Backend: FastAPI + Motor (MongoDB async) + JWT + bcrypt
- Frontend: React 19 + react-router-dom + Tailwind + shadcn/ui + recharts + sonner toast
- DB: MongoDB collections: users, groups, materias_primas, equipamentos, custos, produtos, markups, fichas_tecnicas, clientes, pedidos, counters

## Implementado (Feb 2026 - v1)
- [x] Autenticação JWT (login/registro)
- [x] CRUD Matéria-Prima (custo unit. automático)
- [x] CRUD Equipamentos (custo/hora automático + totalizador valor compra)
- [x] CRUD Custos (custo/hora automático)
- [x] CRUD Produtos (ATIVO/SUSPENSO)
- [x] CRUD Markup (Índices + Lucros L1-L4)
- [x] Ficha Técnica com 7 abas e cálculo de Preço Recomendado via Markup divisor
- [x] Tabela de Preço com 4 preços finais L1-L4 + % perda
- [x] Pedidos com numeração automática, cliente, receita comercial, desconto, PDF
- [x] DRE com período, receita por grupo/produto, deduções, CPV, resultado bruto
- [x] Dashboard com KPIs e gráficos (recharts)
- [x] Exportação Excel/PDF com cabeçalho, logo e marca d'água
- [x] Linhas alternadas em todas as tabelas
- [x] Marca d'água "Produto de uso exclusivo da MM Confeitaria e Eventos" no rodapé
- [x] Logo MM em header do sidebar, login, e PDFs
- [x] Formato BR (milhar=ponto, decimal=vírgula, 2 ou 4 casas decimais)

## Personas
- Confeiteira/proprietária (Admin MM) - acesso total

## Implementado (Fase 1 - Ajustes - Jun 2026)
- [x] Horas/Mês GLOBAL: configuração única em Custos (collection `configuracoes`, GET/PUT /api/config). Custo/Hora = Valor Mensal ÷ Horas/Mês global. Campo por linha removido.
- [x] Ficha Técnica - campo Margem com 5 opções mostrando % reais: Lucro 1-4 (do Markup) + "Tabela de Preço (X%)" = % Lucro individual do produto (margem_lucro_idx=5).
- [x] Tratamento global de erros (interceptor axios) normaliza detail do FastAPI para string (evita crash React em 422).

## Próximas tarefas / Backlog
### Fase 2 (P1) - próximo
- P1: Cadastro de Pedidos detalhado (cliente, endereço, telefone, data/hora entrega, itens, qtd, descontos, receita comercial, DRE por pedido)
- P1: Tela de Controle de Produção (lista consolidada de produtos a produzir, pedidos não cancelados)
- P1: Ficha Detalhada Cósmica (relatório visual estilo rótulo nutricional, foto do produto, alérgenos, parâmetros)
### Outros
- P1: Upload de logo dinâmico via interface (atualmente fixo via URL)
- P1: Edição inline do markup selecionado nos pedidos com recálculo automático
- P2: Notificação por WhatsApp do pedido ao cliente (integração Twilio/Z-API)
- P2: Pedido recorrente / agenda de eventos
- P2: Controle de estoque (entradas/saídas)
- P3: Múltiplos usuários com perfis (admin/operador)
- P3: Backup/restore de dados

## Credenciais
- admin@mm.com / mm123456
