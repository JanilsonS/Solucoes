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

## Implementado (Fase 2 - Jun 2026)
- [x] Cadastro de Pedidos detalhado: seleção de cliente do cadastro (ou novo), endereço, data + hora de entrega, preço unitário vindo da coluna "% Lucro" (preco_tabela_individual), e DRE por pedido (Receita − Deduções(índices) − Custo dos produtos = Resultado líquido + margem).
- [x] Controle de Produção (/producao): resumo consolidado de produtos a produzir + agenda de entregas (pedidos não cancelados) com cliente, telefone, endereço, data/hora.
- [x] Ficha Detalhada Cósmica (/ficha-detalhada): rótulo visual escuro/futurista por produto com upload de foto (object storage), descrição PT/EN, ingredientes-chave, valores nutricionais com barras, estrutura/camadas, texturas, parâmetros de produção, armazenamento, alérgenos, sugestão de serviço. Form editável + preview.
- [x] Object storage integrado (EMERGENT_LLM_KEY) para fotos de produto (POST /api/upload, GET /api/files/{path}?auth=).

## Implementado (Fase 3 - Reescrita Pedidos + Dashboard - Jun 2026)
- [x] Novo modelo de status: Status do Pedido (Cancelado/Aprovado/Entregue) + Status da Produção (Na fila/Em produção/Finalizado). Removido pagamento Pago/Aberto.
- [x] Formas de Pagamento como cadastro/lista com "+" (/api/formas-pagamento).
- [x] Cadastro de Pedidos (reescrito): cliente do cadastro ou novo com "+", endereço/endereço de entrega/ponto de referência, data do pedido + entrega + hora, grade de produtos com Custo Unit (col.13 Custo c/Perda) e Preço Unit (col.15 Preço de Tabela) automáticos, Custo/Preço Total, subtotal, desconto %, Total dos Produtos, seção "Outros" (Taxa Entrega/Carrinho Gourmet/Outros), Total do Pedido, DRE do Pedido ao vivo, PDF/Excel, Nº formatado 001.
- [x] Controle de Pedidos (nova tela/relatório): tabela com filtros por coluna, ordenação ABC, detalhes expansíveis (+), selects de status (produção desabilitado quando Cancelado/Entregue), totalizador de Valor Total adaptado aos filtros, export PDF/Excel.
- [x] Dashboard futurista (HUD escuro teal/ciano): KPIs (Faturamento, Lucro Líquido, Margem, Ticket Médio), P&L (donut Composição da Receita + Lucro Mensal Bruto vs Líquido), Controle de Produção (Na fila/Em produção/Finalizados + Top 5 produtos), Fluxo de Pedidos (recentes com badges + Volume 6 meses). Apenas dados reais.

## Próximas tarefas / Backlog
### Fase 3 (P1)
- (concluído acima)
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
