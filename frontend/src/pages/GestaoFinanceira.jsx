import { useEffect, useState, useCallback } from "react";
import api, { LOGO_URL } from "@/lib/api";
import { toast } from "sonner";
import { fmtMoney, fmtDate, exportCSV } from "@/lib/format";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, CheckCircle2, Circle, Phone, Filter, Activity, TrendingUp, TrendingDown, FileText, FileSpreadsheet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, Legend } from "recharts";

const COLORS = ["#C8856A", "#8B5E48", "#6B8E5A", "#D4A373", "#A87C5F", "#9C6B4A", "#E8C9A0", "#B85450"];
const MES_LABEL = (mm) => { const [y, m] = mm.split("-"); return `${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][Number(m) - 1]}/${String(y).slice(2)}`; };

const KpiCard = ({ icon: Icon, label, value, tone, tid }) => (
  <div className="mm-glass p-4 flex items-center gap-3" data-testid={tid}>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}><Icon size={22} /></div>
    <div><div className="text-[11px] uppercase tracking-wide text-[#8B5E48]">{label}</div><div className="font-display text-xl text-[#3D2817]">{value}</div></div>
  </div>
);

const tooltipStyle = { backgroundColor: "#FFF8F1", border: "1px solid #E8DDD3", borderRadius: 10, color: "#3D2817" };

export default function GestaoFinanceira() {
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState({ inicio: "", fim: "" });
  const [evolucao, setEvolucao] = useState([]);

  const load = useCallback(async (f) => {
    const ff = f || filtro;
    try {
      const params = {};
      if (ff.inicio) params.inicio = ff.inicio;
      if (ff.fim) params.fim = ff.fim;
      const { data } = await api.get("/financeiro", { params });
      setData(data); setErro(false);
    } catch { setErro(true); }
  }, [filtro]);

  const loadEvolucao = async () => {
    try { const { data } = await api.get("/financeiro/evolucao", { params: { meses: 6 } }); setEvolucao(data); } catch { /* noop */ }
  };

  useEffect(() => { load(); loadEvolucao(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltro = (f) => { setFiltro(f); load(f); };
  const presetMes = (offset) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const iso = (x) => x.toISOString().slice(0, 10);
    aplicarFiltro({ inicio: iso(ini), fim: iso(fim) });
  };
  const limparFiltro = () => aplicarFiltro({ inicio: "", fim: "" });

  const togglePedido = async (e) => {
    const novo = e.status_financeiro === "RECEBIDO" ? "ABERTO" : "RECEBIDO";
    try {
      await api.patch(`/pedidos/${e.id}/financeiro`, { status_financeiro: novo });
      toast.success(`Venda Nº ${String(e.numero).padStart(3, "0")} → ${novo}`); load(); loadEvolucao();
    } catch { toast.error("Não foi possível atualizar o status"); }
  };
  const toggleCompra = async (s) => {
    const novo = s.status_financeiro === "PAGO" ? "ABERTO" : "PAGO";
    try {
      await api.patch(`/compras/${s.id}/financeiro`, { status_financeiro: novo });
      toast.success(`Compra ${s.codigo} → ${novo}`); load(); loadEvolucao();
    } catch { toast.error("Não foi possível atualizar o status"); }
  };

  if (erro) return <div className="text-[#B85450] p-6" data-testid="financeiro-erro">Erro ao carregar a gestão financeira. <button className="underline" onClick={() => load()}>Tentar novamente</button></div>;
  if (!data) return <div className="text-[#8B5E48] italic p-6">Carregando gestão financeira...</div>;

  const { entradas, saidas, fluxo_caixa: fx, vencidos } = data;
  const aReceber = entradas.filter((e) => e.status_financeiro === "ABERTO").reduce((s, e) => s + e.valor, 0);
  const aPagar = saidas.filter((s) => s.status_financeiro === "ABERTO").reduce((a, s) => a + s.valor, 0);
  const temVencidos = vencidos.entradas.length + vencidos.saidas.length > 0;
  const barData = [{ nome: "Recebido", valor: fx.total_entradas }, { nome: "Pago", valor: fx.total_saidas }];
  const filtroAtivo = !!(filtro.inicio || filtro.fim);
  const periodoLabel = filtroAtivo ? `${filtro.inicio ? fmtDate(filtro.inicio) : "início"} a ${filtro.fim ? fmtDate(filtro.fim) : "fim"}` : "Todos os períodos";
  const periodoSlug = filtroAtivo ? `${filtro.inicio || "ini"}_${filtro.fim || "fim"}` : "completo";

  const exportarExcel = () => {
    const rows = [
      ...entradas.map((e) => ({ tipo: "ENTRADA", doc: String(e.numero).padStart(3, "0"), nome: e.cliente, valor: e.valor, venc: fmtDate(e.data_vencimento), status: e.status_financeiro })),
      ...saidas.map((s) => ({ tipo: "SAÍDA", doc: s.codigo, nome: s.fornecedor, valor: s.valor, venc: fmtDate(s.data_vencimento), status: s.status_financeiro })),
    ];
    const headers = [
      { label: "Tipo", value: (r) => r.tipo }, { label: "Documento", value: (r) => r.doc },
      { label: "Cliente/Fornecedor", value: (r) => r.nome }, { label: "Valor", value: (r) => Number(Number(r.valor || 0).toFixed(2)) },
      { label: "Vencimento", value: (r) => r.venc }, { label: "Status", value: (r) => r.status },
    ];
    exportCSV(rows, headers, `financeiro-${periodoSlug}.csv`);
  };

  const exportarPDF = () => {
    const linhas = (arr, tipo) => arr.map((r) => `<tr><td>${tipo === "E" ? String(r.numero).padStart(3, "0") : r.codigo}</td><td>${tipo === "E" ? r.cliente : r.fornecedor}</td><td style="text-align:right">${fmtMoney(r.valor)}</td><td style="text-align:right">${fmtDate(r.data_vencimento)}</td><td>${r.status_financeiro}</td></tr>`).join("");
    const fxLinhas = (arr) => arr.length ? arr.map((g) => `<tr><td>${g.grupo}</td><td style="text-align:right">${fmtMoney(g.valor)}</td></tr>`).join("") : `<tr><td colspan="2"><i>Sem lançamentos</i></td></tr>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Permita pop-ups para gerar o PDF"); return; }
    w.document.write(`<html><head><title>Relatório Financeiro</title><style>
      @media print { @page { size: A4 portrait; margin: 12mm; } }
      body { font-family: Georgia, serif; color: #3D2817; padding: 20px; }
      .hd { display:flex; align-items:center; gap:16px; border-bottom:2px solid #C49080; padding-bottom:10px; margin-bottom:14px; }
      .hd img { height:64px; } h1 { color:#8B5E48; font-size:22px; margin:0; } h2 { color:#8B5E48; font-size:15px; margin:18px 0 6px; }
      .sub { font-size:12px; color:#B47B6B; } .grid { display:flex; gap:10px; flex-wrap:wrap; margin:8px 0; }
      .kpi { border:1px solid #E8DDD3; border-radius:8px; padding:8px 12px; font-size:12px; }
      .kpi b { display:block; font-size:14px; color:#3D2817; }
      table { width:100%; border-collapse:collapse; font-size:11px; margin-top:4px; }
      th { background:#8B5E48; color:#fff; padding:6px; text-align:left; } td { padding:5px 6px; border-bottom:1px solid #E8DDD3; }
      .ft { margin-top:24px; text-align:center; font-size:10px; color:#B47B6B; font-style:italic; }
    </style></head><body>
      <div class="hd"><img src="${LOGO_URL}"/><div><h1>Relatório Financeiro</h1><div class="sub">Período: ${periodoLabel} • Emitido em ${new Date().toLocaleString("pt-BR")}</div></div></div>
      <div class="grid">
        <div class="kpi">A Receber<b>${fmtMoney(aReceber)}</b></div>
        <div class="kpi">Recebido<b>${fmtMoney(fx.total_entradas)}</b></div>
        <div class="kpi">A Pagar<b>${fmtMoney(aPagar)}</b></div>
        <div class="kpi">Pago<b>${fmtMoney(fx.total_saidas)}</b></div>
        <div class="kpi">Saldo de Caixa<b>${fmtMoney(fx.saldo)}</b></div>
      </div>
      <h2>Entradas (Vendas)</h2>
      <table><thead><tr><th>Nº</th><th>Cliente</th><th style="text-align:right">Valor</th><th style="text-align:right">Vencimento</th><th>Status</th></tr></thead><tbody>${linhas(entradas, "E") || '<tr><td colspan="5"><i>Nenhuma</i></td></tr>'}</tbody></table>
      <h2>Saídas (Compras)</h2>
      <table><thead><tr><th>Cód.</th><th>Fornecedor</th><th style="text-align:right">Valor</th><th style="text-align:right">Vencimento</th><th>Status</th></tr></thead><tbody>${linhas(saidas, "S") || '<tr><td colspan="5"><i>Nenhuma</i></td></tr>'}</tbody></table>
      <h2>Fluxo de Caixa por Grupo (Recebido / Pago)</h2>
      <div style="display:flex; gap:14px;">
        <table style="flex:1"><thead><tr><th>Entradas por grupo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${fxLinhas(fx.entradas_por_grupo)}</tbody></table>
        <table style="flex:1"><thead><tr><th>Saídas por grupo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${fxLinhas(fx.saidas_por_grupo)}</tbody></table>
      </div>
      <div class="ft">Produto de uso exclusivo da MM Confeitaria e Eventos</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // Comparativo de saúde financeira (mês atual vs mês anterior)
  const evChart = evolucao.map((e) => ({ ...e, label: MES_LABEL(e.mes) }));
  const ult = evolucao[evolucao.length - 1];
  const penult = evolucao[evolucao.length - 2];
  const deltaSaldo = ult && penult ? ult.saldo - penult.saldo : 0;
  const saudavel = ult ? ult.saldo >= 0 : true;

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Gestão Financeira</h1>
          <p className="text-[#8B5E48] italic text-sm">Entradas, saídas, fluxo de caixa e contas vencidas</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="fin-export-excel" className="mm-btn-3d secondary flex items-center gap-1" onClick={exportarExcel}><FileSpreadsheet size={16} />Excel</button>
          <button data-testid="fin-export-pdf" className="mm-btn-3d secondary flex items-center gap-1" onClick={exportarPDF}><FileText size={16} />PDF</button>
        </div>
      </header>

      {/* Filtro por período */}
      <div className="mm-glass p-3 flex flex-wrap items-end gap-3" data-testid="financeiro-filtro">
        <div className="flex items-center gap-2 text-[#8B5E48] font-semibold text-sm"><Filter size={16} />Período (por vencimento)</div>
        <div><label className="mm-label">Início</label><input data-testid="filtro-inicio" type="date" className="mm-input" style={{ width: 160 }} value={filtro.inicio} onChange={(e) => setFiltro({ ...filtro, inicio: e.target.value })} /></div>
        <div><label className="mm-label">Fim</label><input data-testid="filtro-fim" type="date" className="mm-input" style={{ width: 160 }} value={filtro.fim} onChange={(e) => setFiltro({ ...filtro, fim: e.target.value })} /></div>
        <button data-testid="filtro-aplicar" className="mm-btn-3d" onClick={() => aplicarFiltro(filtro)}>Aplicar</button>
        <button data-testid="filtro-mes-atual" className="mm-btn-3d secondary text-sm" onClick={() => presetMes(0)}>Este mês</button>
        <button data-testid="filtro-mes-anterior" className="mm-btn-3d secondary text-sm" onClick={() => presetMes(-1)}>Mês anterior</button>
        {filtroAtivo && <button data-testid="filtro-limpar" className="mm-btn-3d secondary text-sm" onClick={limparFiltro}>Limpar</button>}
        {filtroAtivo && <span className="text-xs text-[#C8856A] italic">Filtrando {filtro.inicio ? fmtDate(filtro.inicio) : "início"} → {filtro.fim ? fmtDate(filtro.fim) : "fim"}</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard tid="kpi-receber" icon={ArrowDownCircle} label="A Receber" value={fmtMoney(aReceber)} tone="bg-[#FBE9DF] text-[#C8856A]" />
        <KpiCard tid="kpi-recebido" icon={CheckCircle2} label="Recebido" value={fmtMoney(fx.total_entradas)} tone="bg-[#E6F0DF] text-[#6B8E5A]" />
        <KpiCard tid="kpi-pagar" icon={ArrowUpCircle} label="A Pagar" value={fmtMoney(aPagar)} tone="bg-[#F7E4E2] text-[#B85450]" />
        <KpiCard tid="kpi-pago" icon={CheckCircle2} label="Pago" value={fmtMoney(fx.total_saidas)} tone="bg-[#EFE3D6] text-[#8B5E48]" />
        <KpiCard tid="kpi-saldo" icon={Wallet} label="Saldo de Caixa" value={fmtMoney(fx.saldo)} tone={fx.saldo >= 0 ? "bg-[#E6F0DF] text-[#6B8E5A]" : "bg-[#F7E4E2] text-[#B85450]"} />
      </div>

      {/* 3 blocos lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* BLOCO 1 - ENTRADAS */}
        <div className="mm-glass p-4" data-testid="bloco-entradas">
          <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2 mb-3"><ArrowDownCircle size={20} className="text-[#C8856A]" />Entradas (Vendas)</h2>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="mm-table"><thead><tr><th>Nº</th><th>Cliente</th><th className="text-right">Valor</th><th className="text-right">Venc.</th><th>Status</th></tr></thead>
              <tbody>
                {entradas.length === 0 && <tr><td colSpan="5" className="text-center italic py-4 text-[#8B5E48]">Nenhuma venda</td></tr>}
                {entradas.map((e) => (
                  <tr key={e.id} data-testid={`entrada-row-${e.numero}`}>
                    <td className="font-bold">{String(e.numero).padStart(3, "0")}</td><td>{e.cliente}</td>
                    <td className="text-right font-semibold">{fmtMoney(e.valor)}</td><td className="text-right">{fmtDate(e.data_vencimento)}</td>
                    <td><button data-testid={`entrada-toggle-${e.numero}`} onClick={() => togglePedido(e)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${e.status_financeiro === "RECEBIDO" ? "bg-[#E6F0DF] text-[#4E7340]" : "bg-[#FBE9DF] text-[#C8856A]"}`}>{e.status_financeiro === "RECEBIDO" ? <CheckCircle2 size={13} /> : <Circle size={13} />}{e.status_financeiro === "RECEBIDO" ? "Recebido" : "Aberto"}</button></td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        </div>

        {/* BLOCO 2 - SAÍDAS */}
        <div className="mm-glass p-4" data-testid="bloco-saidas">
          <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2 mb-3"><ArrowUpCircle size={20} className="text-[#B85450]" />Saídas (Compras)</h2>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="mm-table"><thead><tr><th>Cód.</th><th>Fornecedor</th><th className="text-right">Valor</th><th className="text-right">Venc.</th><th>Status</th></tr></thead>
              <tbody>
                {saidas.length === 0 && <tr><td colSpan="5" className="text-center italic py-4 text-[#8B5E48]">Nenhuma compra</td></tr>}
                {saidas.map((s) => (
                  <tr key={s.id} data-testid={`saida-row-${s.codigo}`}>
                    <td className="font-bold">{s.codigo}</td><td>{s.fornecedor}</td>
                    <td className="text-right font-semibold">{fmtMoney(s.valor)}</td><td className="text-right">{fmtDate(s.data_vencimento)}</td>
                    <td><button data-testid={`saida-toggle-${s.codigo}`} onClick={() => toggleCompra(s)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${s.status_financeiro === "PAGO" ? "bg-[#E6F0DF] text-[#4E7340]" : "bg-[#F7E4E2] text-[#B85450]"}`}>{s.status_financeiro === "PAGO" ? <CheckCircle2 size={13} /> : <Circle size={13} />}{s.status_financeiro === "PAGO" ? "Pago" : "Aberto"}</button></td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        </div>

        {/* BLOCO 3 - FLUXO DE CAIXA */}
        <div className="mm-glass p-4" data-testid="bloco-fluxo">
          <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2 mb-3"><Wallet size={20} className="text-[#6B8E5A]" />Fluxo de Caixa</h2>
          <p className="text-xs text-[#8B5E48] italic mb-2">Somente Recebido (entradas) e Pago (saídas), por grupo.</p>
          <div className="mb-3">
            <div className="text-xs uppercase text-[#C8856A] font-semibold mb-1">Entradas por grupo</div>
            {fx.entradas_por_grupo.length === 0 && <div className="text-xs italic text-[#8B5E48]">Nada recebido ainda</div>}
            {fx.entradas_por_grupo.map((g) => (
              <div key={g.grupo} className="flex justify-between text-sm py-0.5 border-b border-[#EFE3D6]"><span>{g.grupo}</span><span className="font-semibold text-[#6B8E5A]">{fmtMoney(g.valor)}</span></div>
            ))}
          </div>
          <div className="mb-3">
            <div className="text-xs uppercase text-[#B85450] font-semibold mb-1">Saídas por grupo</div>
            {fx.saidas_por_grupo.length === 0 && <div className="text-xs italic text-[#8B5E48]">Nada pago ainda</div>}
            {fx.saidas_por_grupo.map((g) => (
              <div key={g.grupo} className="flex justify-between text-sm py-0.5 border-b border-[#EFE3D6]"><span>{g.grupo}</span><span className="font-semibold text-[#B85450]">{fmtMoney(g.valor)}</span></div>
            ))}
          </div>
          <div className={`p-3 rounded-xl text-center font-display text-lg ${fx.saldo >= 0 ? "bg-[#E6F0DF] text-[#4E7340]" : "bg-[#F7E4E2] text-[#B85450]"}`} data-testid="fluxo-saldo">Saldo: {fmtMoney(fx.saldo)}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="mm-glass p-4">
          <h3 className="font-display text-lg text-[#3D2817] mb-2">Recebido x Pago</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE3D6" />
              <XAxis dataKey="nome" stroke="#8B5E48" fontSize={12} /><YAxis stroke="#8B5E48" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={i === 0 ? "#6B8E5A" : "#B85450"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mm-glass p-4">
          <h3 className="font-display text-lg text-[#3D2817] mb-2">Entradas por grupo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={fx.entradas_por_grupo} dataKey="valor" nameKey="grupo" cx="50%" cy="50%" outerRadius={80} label={(e) => e.grupo}>
                {fx.entradas_por_grupo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mm-glass p-4">
          <h3 className="font-display text-lg text-[#3D2817] mb-2">Saídas por grupo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={fx.saidas_por_grupo} dataKey="valor" nameKey="grupo" cx="50%" cy="50%" outerRadius={80} label={(e) => e.grupo}>
                {fx.saidas_por_grupo.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparativo de Saúde Financeira (evolução mensal) */}
      <div className="mm-glass p-4" data-testid="bloco-evolucao">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2"><Activity size={20} className="text-[#6B8E5A]" />Comparativo da Saúde Financeira</h2>
          {ult && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${saudavel ? "bg-[#E6F0DF] text-[#4E7340]" : "bg-[#F7E4E2] text-[#B85450]"}`} data-testid="evolucao-status">
              {saudavel ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {MES_LABEL(ult.mes)}: {saudavel ? "Saldo positivo" : "Saldo negativo"} ({fmtMoney(ult.saldo)})
              {penult && <span className="text-xs opacity-80">• {deltaSaldo >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(deltaSaldo))} vs {MES_LABEL(penult.mes)}</span>}
            </div>
          )}
        </div>
        <p className="text-xs text-[#8B5E48] italic mb-2">Recebido x Pago x Saldo por mês (com base na data de vencimento). Não afetado pelo filtro acima.</p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={evChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE3D6" />
            <XAxis dataKey="label" stroke="#8B5E48" fontSize={12} /><YAxis stroke="#8B5E48" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
            <Legend />
            <Bar dataKey="recebido" name="Recebido" fill="#6B8E5A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pago" name="Pago" fill="#B85450" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3D2817" strokeWidth={2.5} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto mt-3"><table className="mm-table text-sm"><thead><tr><th>Mês</th><th className="text-right">Recebido</th><th className="text-right">Pago</th><th className="text-right">Saldo</th><th className="text-right">A Receber</th><th className="text-right">A Pagar</th></tr></thead>
          <tbody>
            {evolucao.map((e) => (
              <tr key={e.mes} data-testid={`evolucao-row-${e.mes}`}>
                <td className="font-semibold">{MES_LABEL(e.mes)}</td>
                <td className="text-right text-[#6B8E5A]">{fmtMoney(e.recebido)}</td>
                <td className="text-right text-[#B85450]">{fmtMoney(e.pago)}</td>
                <td className={`text-right font-bold ${e.saldo >= 0 ? "text-[#4E7340]" : "text-[#B85450]"}`}>{fmtMoney(e.saldo)}</td>
                <td className="text-right">{fmtMoney(e.a_receber)}</td>
                <td className="text-right">{fmtMoney(e.a_pagar)}</td>
              </tr>
            ))}
          </tbody></table></div>
      </div>

      {/* BLOCO 4 - VENCIDOS */}
      {temVencidos && (
        <div className="mm-glass p-4 border-2 border-[#B85450]/40" data-testid="bloco-vencidos">
          <h2 className="font-display text-2xl text-[#B85450] flex items-center gap-2 mb-3"><AlertTriangle size={24} />Contas Vencidas</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-[#C8856A] font-semibold mb-1">Entradas vencidas (a receber)</div>
              <div className="overflow-x-auto"><table className="mm-table"><thead><tr><th>Nº</th><th>Cliente</th><th className="text-right">Valor</th><th className="text-right">Venc.</th><th>Telefone</th></tr></thead>
                <tbody>
                  {vencidos.entradas.length === 0 && <tr><td colSpan="5" className="text-center italic py-3 text-[#8B5E48]">Nenhuma</td></tr>}
                  {vencidos.entradas.map((e) => (
                    <tr key={e.id}><td className="font-bold">{String(e.numero).padStart(3, "0")}</td><td>{e.cliente}</td><td className="text-right font-semibold text-[#B85450]">{fmtMoney(e.valor)}</td><td className="text-right">{fmtDate(e.data_vencimento)}</td><td className="whitespace-nowrap">{e.telefone ? <a className="text-[#25D366] flex items-center gap-1" href={`https://wa.me/55${String(e.telefone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Phone size={13} />{e.telefone}</a> : "—"}</td></tr>
                  ))}
                </tbody></table></div>
            </div>
            <div>
              <div className="text-xs uppercase text-[#B85450] font-semibold mb-1">Saídas vencidas (a pagar)</div>
              <div className="overflow-x-auto"><table className="mm-table"><thead><tr><th>Cód.</th><th>Fornecedor</th><th className="text-right">Valor</th><th className="text-right">Venc.</th><th>Telefone</th></tr></thead>
                <tbody>
                  {vencidos.saidas.length === 0 && <tr><td colSpan="5" className="text-center italic py-3 text-[#8B5E48]">Nenhuma</td></tr>}
                  {vencidos.saidas.map((s) => (
                    <tr key={s.id}><td className="font-bold">{s.codigo}</td><td>{s.fornecedor}</td><td className="text-right font-semibold text-[#B85450]">{fmtMoney(s.valor)}</td><td className="text-right">{fmtDate(s.data_vencimento)}</td><td className="whitespace-nowrap">{s.telefone ? <a className="text-[#25D366] flex items-center gap-1" href={`https://wa.me/55${String(s.telefone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Phone size={13} />{s.telefone}</a> : "—"}</td></tr>
                  ))}
                </tbody></table></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
