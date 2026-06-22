import { useState } from "react";
import { BookOpen, Download, HardDrive, Shield, LayoutGrid, AlertTriangle, ChevronRight, Printer } from "lucide-react";

const SECTIONS = [
  { id: "visao", label: "Visão Geral", icon: BookOpen },
  { id: "programas", label: "Programas Necessários", icon: Download },
  { id: "instalacao", label: "Instalação e Uso", icon: HardDrive },
  { id: "backup", label: "Backup e Restauração", icon: Shield },
  { id: "modulos", label: "Módulos do Sistema", icon: LayoutGrid },
  { id: "problemas", label: "Problemas Comuns", icon: AlertTriangle },
];

const PROGRAMAS = [
  { nome: "Python", versao: "3.11 ou superior", link: "https://www.python.org/downloads/", obs: "Marque \"Add Python to PATH\" antes de instalar." },
  { nome: "Node.js (LTS)", versao: "20.x LTS", link: "https://nodejs.org/", obs: "Clique no botão verde \"LTS\" e instale (next, next, finish)." },
  { nome: "MongoDB Community Server", versao: "7.x (MSI)", link: "https://www.mongodb.com/try/download/community", obs: "Marque \"Install MongoDB as a Service\"." },
  { nome: "Yarn", versao: "1.22+", link: "https://classic.yarnpkg.com/", obs: "Após o Node, rode no cmd: npm install -g yarn" },
];

const MODULOS = [
  ["Dashboard", "Painel estratégico com faturamento, lucro líquido, margem, ticket médio, produção e fluxo de pedidos."],
  ["DRE", "Demonstrativo de Resultado consolidado (receitas, deduções, custos, resultado)."],
  ["Matéria-Prima", "Cadastro dos insumos. Quantidade e Custo são calculados pelo Movimento de MP (somente leitura); informe o Estoque Inicial."],
  ["Equipamentos / Custos", "Equipamentos com custo/hora e contas de custos. Horas/Mês é global (definido em Custos)."],
  ["Produtos / Markup", "Cadastro de produtos e índices de markup (despesas e margens de lucro L1–L4)."],
  ["Ficha Técnica", "Receita do produto: insumos, custos indiretos e margem (5 opções de lucro). Calcula o custo de produção."],
  ["Ficha Detalhada", "Rótulo visual do produto (ingredientes, nutrição, alérgenos, foto)."],
  ["Precificação", "Calcula o preço de venda. Botão \"Atualizar Tabela de Venda\" congela os preços oficiais."],
  ["Tabela de Preço de Venda", "Tabela oficial congelada, com preço atual, anterior e variação. Usada nos pedidos."],
  ["Pedido de Compras", "Registra compras de matéria-prima (gera entradas no estoque)."],
  ["Movimento de Matéria-Prima", "Entradas (compras) e saídas (produção) por período, com saldo em quantidade e valor (custo médio)."],
  ["Gestão de Estoques", "Estoque atual x necessidade dos pedidos. Saldo negativo em vermelho. Ordenação ABC."],
  ["Gestão Financeira", "Entradas (vendas) e Saídas (compras) com status Recebido/Pago, fluxo de caixa por grupo, gráficos e alerta de contas vencidas."],
  ["Cadastro de Pedidos", "Monta o pedido (cliente, entrega, produtos com preço oficial, outros, DRE do pedido). Exporta PDF/Excel e WhatsApp."],
  ["Controle de Pedidos", "Relatório com filtros, range de datas, status e detalhes expansíveis."],
  ["Controle de Produção", "Lista consolidada de produtos a produzir e agenda de entregas."],
  ["Configurações", "Mensagem padrão do WhatsApp e parâmetros do sistema."],
];

const Sec = ({ id, title, icon: Icon, children }) => (
  <section id={id} className="scroll-mt-6 mm-card-glow">
    <h2 className="font-display text-2xl text-[#3D2817] flex items-center gap-2 mb-3"><Icon size={22} className="text-[#C8856A]" />{title}</h2>
    <div className="text-[#5B3A26] text-sm space-y-2 leading-relaxed">{children}</div>
  </section>
);

export default function Manual() {
  const [active, setActive] = useState("visao");
  const go = (id) => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap"><div><h1 className="font-display text-4xl text-[#3D2817] flex items-center gap-2"><BookOpen size={28} className="text-[#C8856A]" />Manual do Usuário</h1><p className="text-[#8B5E48] italic text-sm">Guia completo de instalação, backup e uso do sistema</p></div><button data-testid="manual-print-btn" onClick={() => window.print()} className="mm-btn-3d flex items-center gap-2 no-print"><Printer size={16} />Imprimir / Salvar PDF</button></header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <aside className="lg:col-span-1 no-print">
          <div className="mm-card-glow sticky top-4">
            <div className="font-semibold text-[#3D2817] mb-2 text-sm uppercase tracking-wide">Sumário</div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <button key={s.id} data-testid={`manual-nav-${s.id}`} onClick={() => go(s.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${active === s.id ? "bg-[#F5EBE0] text-[#C8856A] font-semibold" : "text-[#5B3A26] hover:bg-[#FBF6F0]"}`}>
                  <s.icon size={15} />{s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-4" data-testid="manual-content">
          <Sec id="visao" title="Visão Geral" icon={BookOpen}>
            <p>O <strong>MM Confeitaria & Eventos</strong> é um sistema completo de gestão e precificação de confeitaria. Ele roda <strong>localmente no seu computador</strong> — nenhum dado vai para a internet.</p>
            <p>Login padrão: <strong>admin@mm.com</strong> / <strong>mm123456</strong>.</p>
          </Sec>

          <Sec id="programas" title="Programas Necessários (instalar 1 vez)" icon={Download}>
            <div className="overflow-x-auto"><table className="mm-table">
              <thead><tr><th>Programa</th><th>Versão</th><th>Download</th><th>Observação</th></tr></thead>
              <tbody>
                {PROGRAMAS.map((p) => (
                  <tr key={p.nome}>
                    <td className="font-semibold">{p.nome}</td><td>{p.versao}</td>
                    <td><a className="text-[#C8856A] underline" href={p.link} target="_blank" rel="noreferrer">Baixar ↗</a></td>
                    <td>{p.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p className="text-xs italic">O sistema deve ficar numa pasta fixa, ex.: <code className="bg-[#F5EBE0] px-1 rounded">C:\MMConfeitaria</code>. O MongoDB instala como serviço e inicia sozinho.</p>
          </Sec>

          <Sec id="instalacao" title="Instalação e Uso" icon={HardDrive}>
            <p className="font-semibold text-[#3D2817]">📁 Onde instalar?</p>
            <p>O sistema é instalado <strong>dentro da própria pasta onde você baixou/descompactou</strong> os arquivos (ex.: <code className="bg-[#F5EBE0] px-1 rounded">C:\MMConfeitaria</code>). <strong>Não</strong> instala no diretório raiz do Windows nem em "Arquivos de Programas". Tudo fica autocontido nessa pasta — inclusive as bibliotecas Python (numa subpasta <code className="bg-[#F5EBE0] px-1 rounded">backend\venv</code>) e do frontend (<code className="bg-[#F5EBE0] px-1 rounded">frontend\node_modules</code>).</p>

            <p className="font-semibold text-[#3D2817] mt-3">⚙️ Primeira vez (instalação automática)</p>
            <p>Dê dois cliques em <code className="bg-[#F5EBE0] px-1 rounded">instalar.bat</code> (leva 5–10 min). Ele faz, sozinho, na pasta do sistema:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Confere se Python, Node.js e Yarn estão instalados.</li>
              <li>Cria um ambiente virtual Python isolado: <code className="bg-[#F5EBE0] px-1 rounded">python -m venv venv</code> (dentro de <code>backend\</code>).</li>
              <li>Instala todas as bibliotecas Python com <code className="bg-[#F5EBE0] px-1 rounded">pip install -r requirements.txt</code>.</li>
              <li>Cria os arquivos de configuração <code>.env</code> do backend e do frontend.</li>
              <li>Instala as dependências do frontend com <code className="bg-[#F5EBE0] px-1 rounded">yarn install</code>.</li>
            </ol>

            <p className="font-semibold text-[#3D2817] mt-3">📦 Bibliotecas Python instaladas (requirements.txt)</p>
            <p className="text-xs">Você não precisa instalar manualmente — o <code>instalar.bat</code> cuida disso. Lista de referência:</p>
            <div className="overflow-x-auto"><table className="mm-table text-xs">
              <thead><tr><th>Pacote</th><th>Para quê serve</th></tr></thead>
              <tbody>
                <tr><td>fastapi, uvicorn</td><td>Servidor da API (backend).</td></tr>
                <tr><td>motor, pymongo</td><td>Conexão com o banco MongoDB.</td></tr>
                <tr><td>pydantic, email-validator</td><td>Validação dos dados.</td></tr>
                <tr><td>pyjwt, bcrypt, passlib, python-jose</td><td>Login seguro e senhas.</td></tr>
                <tr><td>python-dotenv</td><td>Leitura do arquivo .env.</td></tr>
                <tr><td>python-multipart, boto3</td><td>Upload de imagens (Ficha Detalhada).</td></tr>
                <tr><td>pandas, numpy</td><td>Cálculos e relatórios.</td></tr>
                <tr><td>requests, requests-oauthlib, cryptography</td><td>Integrações e segurança.</td></tr>
              </tbody>
            </table></div>
            <p className="text-xs italic">Para reinstalar/atualizar manualmente (avançado): abra o cmd na pasta <code>backend</code>, rode <code className="bg-[#F5EBE0] px-1 rounded">venv\Scripts\activate</code> e depois <code className="bg-[#F5EBE0] px-1 rounded">pip install -r requirements.txt</code>.</p>

            <p className="font-semibold text-[#3D2817] mt-3">▶️ Para usar todo dia</p>
            <p>Dois cliques em <code className="bg-[#F5EBE0] px-1 rounded">iniciar.bat</code>. Aguarde abrir 2 janelas pretas (Backend e Frontend — <strong>não feche</strong>) e o navegador abrir em <code className="bg-[#F5EBE0] px-1 rounded">http://localhost:3000</code>.</p>
            <p><strong>Para fechar:</strong> feche as 2 janelas pretas.</p>
          </Sec>

          <Sec id="backup" title="Backup e Restauração" icon={Shield}>
            <p><strong>Fazer backup:</strong> dois cliques em <code className="bg-[#F5EBE0] px-1 rounded">backup.bat</code> → gera um <code>.zip</code> na pasta <code>backups/</code> com data e hora.</p>
            <p className="font-semibold text-[#B85450]">⚠️ Copie esse .zip para um local seguro!</p>
            <p><strong>Salvar no OneDrive automaticamente:</strong> mova/salve a pasta <code>backups/</code> dentro da sua pasta do OneDrive (ex.: <code className="bg-[#F5EBE0] px-1 rounded">C:\Users\SeuNome\OneDrive\MMBackups</code>). Assim cada backup sincroniza na nuvem sozinho.</p>
            <p><strong>Restaurar:</strong> dois cliques em <code className="bg-[#F5EBE0] px-1 rounded">restaurar.bat</code> e escolha o arquivo de backup. Isso recupera todos os dados sem perda.</p>
          </Sec>

          <Sec id="modulos" title="Módulos do Sistema" icon={LayoutGrid}>
            <div className="space-y-2">
              {MODULOS.map(([nome, desc]) => (
                <div key={nome} className="flex gap-2"><ChevronRight size={16} className="text-[#C8856A] mt-0.5 shrink-0" /><p><strong className="text-[#3D2817]">{nome}:</strong> {desc}</p></div>
              ))}
            </div>
          </Sec>

          <Sec id="problemas" title="Problemas Comuns" icon={AlertTriangle}>
            <div className="overflow-x-auto"><table className="mm-table">
              <thead><tr><th>Problema</th><th>Solução</th></tr></thead>
              <tbody>
                <tr><td>"python não é reconhecido"</td><td>Reinstale o Python marcando "Add to PATH".</td></tr>
                <tr><td>"yarn não é reconhecido"</td><td>Rode <code>npm install -g yarn</code> no cmd como administrador.</td></tr>
                <tr><td>MongoDB não conecta</td><td>Reinicie o PC (o serviço inicia sozinho).</td></tr>
                <tr><td>Página não abre</td><td>Aguarde 30s após <code>iniciar.bat</code> e recarregue.</td></tr>
              </tbody>
            </table></div>
          </Sec>
        </div>
      </div>
    </div>
  );
}
