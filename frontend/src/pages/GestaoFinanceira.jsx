import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, CheckCircle2, Circle, Phone } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#C8856A", "#8B5E48", "#6B8E5A", "#D4A373", "#A87C5F", "#9C6B4A", "#E8C9A0", "#B85450"];

const KpiCard = ({ icon: Icon, label, value, tone, tid }) => (
  <div className="mm-glass p-4 flex items-center gap-3" data-testid={tid}>
    <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}><Icon size={22} /></div>
    <div><div className="text-[11px] uppercase tracking-wide text-[#8B5E48]">{label}</div><div className="font-display text-xl text-[#3D2817]">{value}</div></div>
  </div>
);

const tooltipStyle = { backgroundColor: "#FFF8F1", border: "1px solid #E8DDD3", borderRadius: 10, color: "#3D2817" };

export default function GestaoFinanceira() {
  const [data, setData] = useState(null);

  const load = async () => { const { data } = await api.get("/financeiro"); setData(data); };
  useEffect(() => { load(); }, []);

  const togglePedido = async (e) => {
    const novo = e.status_financeiro === "RECEBIDO" ? "ABERTO" : "RECEBIDO";
    await api.patch(`/pedidos/${e.id}/financeiro`, { status_financeiro: novo });
    toast.success(`Venda Nº ${String(e.numero).padStart(3, "0")} → ${novo}`); load();
  };
  const toggleCompra = async (s) => {
    const novo = s.status_financeiro === "PAGO" ? "ABERTO" : "PAGO";
    await api.patch(`/compras/${s.id}/financeiro`, { status_financeiro: novo });
    toast.success(`Compra ${s.codigo} → ${novo}`); load();
  };

  if (!data) return <div className="text-[#8B5E48] italic p-6">Carregando gestão financeira...</div>;

  const { entradas, saidas, fluxo_caixa: fx, vencidos } = data;
  const aReceber = entradas.filter((e) => e.status_financeiro === "ABERTO").reduce((s, e) => s + e.valor, 0);
  const aPagar = saidas.filter((s) => s.status_financeiro === "ABERTO").reduce((a, s) => a + s.valor, 0);
  const temVencidos = vencidos.entradas.length + vencidos.saidas.length > 0;
  const barData = [{ nome: "Recebido", valor: fx.total_entradas }, { nome: "Pago", valor: fx.total_saidas }];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl text-[#3D2817]">Gestão Financeira</h1>
        <p className="text-[#8B5E48] italic text-sm">Entradas, saídas, fluxo de caixa e contas vencidas</p>
      </header>

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
