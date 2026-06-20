import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, fmtBR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, CartesianGrid, Legend } from "recharts";
import { DollarSign, TrendingUp, Percent, Receipt, Factory, ListChecks, CheckCircle2 } from "lucide-react";

const C = {
  bg: "#031217", panel: "rgba(4,26,37,0.6)", border: "rgba(0,240,255,0.15)",
  cyan: "#00F0FF", cyan2: "#00B4D8", green: "#39FF14", yellow: "#FFEA00", red: "#FF073A",
  text: "#E0FBFC", text2: "#90E0EF", text3: "#48CAE4",
};
const DONUT = ["#00F0FF", "#00B4D8", "#0077B6", "#023E8A"];

const PROD_LABEL = { NA_FILA: "Na fila", EM_PRODUCAO: "Em produção", FINALIZADO: "Finalizado" };
const badgeCls = {
  APROVADO: "text-[#39FF14] border-[#39FF14]/40 bg-[#39FF14]/10",
  ENTREGUE: "text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/10",
  CANCELADO: "text-[#FF073A] border-[#FF073A]/40 bg-[#FF073A]/10",
  NA_FILA: "text-[#FFEA00] border-[#FFEA00]/40 bg-[#FFEA00]/10",
  EM_PRODUCAO: "text-[#00B4D8] border-[#00B4D8]/40 bg-[#00B4D8]/10",
  FINALIZADO: "text-[#39FF14] border-[#39FF14]/40 bg-[#39FF14]/10",
};
const Badge = ({ s }) => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${badgeCls[s] || "text-[#90E0EF] border-[#90E0EF]/30"}`}>{PROD_LABEL[s] || s}</span>;

const Panel = ({ children, className = "", testid }) => (
  <div data-testid={testid} className={`relative rounded-xl backdrop-blur-xl border p-5 overflow-hidden ${className}`} style={{ background: C.panel, borderColor: C.border, boxShadow: "0 0 15px rgba(0,240,255,0.04)" }}>{children}</div>
);
const Title = ({ children }) => <h3 className="text-xs font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: C.text3 }}>{children}</h3>;

const tooltipStyle = { backgroundColor: "rgba(4,26,37,0.92)", borderColor: "rgba(0,240,255,0.3)", borderRadius: 8, color: C.text, fontFamily: "monospace", fontSize: 12 };

export default function Dashboard() {
  const [d, setData] = useState(null);
  const user = JSON.parse(localStorage.getItem("mm_user") || "{}");
  useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)); }, []);
  if (!d) return <div className="text-[#90E0EF] p-6">Carregando...</div>;

  const kpis = [
    { label: "Faturamento (mês)", value: fmtMoney(d.faturamento_mes), icon: DollarSign, tid: "kpi-faturamento" },
    { label: "Lucro Líquido (mês)", value: fmtMoney(d.lucro_liquido_mes), icon: TrendingUp, tid: "kpi-lucro" },
    { label: "Margem Média", value: `${fmtBR(d.margem_media)}%`, icon: Percent, tid: "kpi-margem" },
    { label: "Ticket Médio", value: fmtMoney(d.ticket_medio), icon: Receipt, tid: "kpi-ticket" },
  ];
  const prodStats = [
    { label: "Na Fila", value: d.fila_producao, icon: ListChecks, color: C.yellow },
    { label: "Em Produção", value: d.em_producao, icon: Factory, color: C.cyan2 },
    { label: "Finalizados", value: d.finalizados, icon: CheckCircle2, color: C.green },
  ];

  return (
    <div data-testid="dashboard-hud" className="rounded-2xl -m-6 p-6 lg:p-8 min-h-[calc(100vh-0px)]" style={{ background: `linear-gradient(135deg, #02080B, ${C.bg})` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b" style={{ borderColor: "rgba(0,240,255,0.2)" }}>
        <h1 className="text-2xl lg:text-3xl font-black tracking-widest uppercase flex items-center gap-3" style={{ color: C.cyan, textShadow: "0 0 12px rgba(0,240,255,0.5)" }}>
          <Factory size={28} /> Strategic Confectionery System
        </h1>
        <div className="text-right text-xs font-mono" style={{ color: C.text2 }}>USER<div className="text-sm font-bold" style={{ color: C.cyan }}>{(user.nome || "—").toUpperCase()}</div></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <Panel key={k.tid} testid={`${k.tid}-tile`} className="hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.text2 }}>{k.label}</span>
              <k.icon size={18} style={{ color: C.cyan }} />
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-bold" style={{ color: C.cyan, textShadow: "0 0 8px rgba(0,240,255,0.4)" }} data-testid={`${k.tid}-value`}>{k.value}</div>
          </Panel>
        ))}
      </div>

      {/* P&L */}
      <Panel testid="panel-pl" className="mb-6">
        <Title>Demonstrativo de Resultado (P&L)</Title>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.text3 }}>Receita vs Custos (mês)</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={d.receita_vs_custos} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="#041A25" strokeWidth={2}>
                  {d.receita_vs_custos.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2">
            <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.text3 }}>Lucro Mensal (Bruto vs Líquido)</div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={d.lucro_6m}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,240,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="mes" stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 11 }} />
                <YAxis stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Bruto" dataKey="bruto" fill="url(#cyanGrad)" radius={[4, 4, 0, 0]} />
                <Line name="Líquido" type="monotone" dataKey="liquido" stroke={C.green} strokeWidth={3} dot={{ r: 3, fill: "#02080B", stroke: C.green, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção */}
        <Panel testid="panel-producao">
          <Title>Controle de Produção</Title>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {prodStats.map((s) => (
              <div key={s.label} className="rounded-lg p-3 border" style={{ borderColor: "rgba(0,240,255,0.12)", background: "rgba(0,0,0,0.2)" }}>
                <s.icon size={16} style={{ color: s.color }} />
                <div className="font-mono text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: C.text2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.text3 }}>Top 5 Produtos</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.top_produtos} layout="vertical">
              <XAxis type="number" stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="descricao" type="category" stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 10 }} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="valor" fill={C.cyan2} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Fluxo de Pedidos */}
        <Panel testid="panel-fluxo">
          <Title>Fluxo de Pedidos</Title>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead><tr className="text-left" style={{ color: C.text3 }}>
                <th className="py-1 font-medium">PEDIDO</th><th className="font-medium">CLIENTE</th><th className="font-medium">STATUS</th><th className="font-medium">PRODUÇÃO</th><th className="font-medium text-right">TOTAL</th>
              </tr></thead>
              <tbody style={{ color: C.text }}>
                {d.fluxo_pedidos.length === 0 && <tr><td colSpan="5" className="py-3 text-center italic" style={{ color: C.text3 }}>Sem pedidos</td></tr>}
                {d.fluxo_pedidos.map((p) => (
                  <tr key={p.numero} className="border-t" style={{ borderColor: "rgba(0,240,255,0.08)" }}>
                    <td className="py-1.5 font-mono" style={{ color: C.cyan }}>#{String(p.numero).padStart(3, "0")}</td>
                    <td>{p.cliente_nome}</td>
                    <td><Badge s={p.status_pedido} /></td>
                    <td><Badge s={p.status_producao} /></td>
                    <td className="text-right font-mono">{fmtMoney(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.text3 }}>Volume de Pedidos (6 meses)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={d.volume_6m}>
              <CartesianGrid stroke="rgba(0,240,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 10 }} />
              <YAxis stroke="rgba(144,224,239,0.3)" tick={{ fill: C.text2, fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pedidos" fill={C.cyan} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
