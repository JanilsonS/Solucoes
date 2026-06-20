import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ArrowUpDown, FileText, FileSpreadsheet, MessageCircle } from "lucide-react";
import { fmtBR, fmtMoney, fmtDate, exportPDF, exportCSV } from "@/lib/format";
import { openWhatsapp } from "@/lib/whatsapp";

const ST_PEDIDO = ["APROVADO", "ENTREGUE", "CANCELADO"];
const ST_PROD = ["NA_FILA", "EM_PRODUCAO", "FINALIZADO"];
const PROD_LABEL = { NA_FILA: "Na fila", EM_PRODUCAO: "Em produção", FINALIZADO: "Finalizado" };
const ST_PED_BADGE = { APROVADO: "bg-green-100 text-green-800", ENTREGUE: "bg-blue-100 text-blue-800", CANCELADO: "bg-red-100 text-red-800" };
const ST_PROD_BADGE = { NA_FILA: "bg-yellow-100 text-yellow-800", EM_PRODUCAO: "bg-blue-100 text-blue-800", FINALIZADO: "bg-green-100 text-green-800" };

const COLS = [
  { key: "numero", label: "Nº Pedido" },
  { key: "cliente_nome", label: "Cliente" },
  { key: "total", label: "Valor Total" },
  { key: "status_pedido", label: "Status do Pedido" },
  { key: "status_producao", label: "Status da Produção" },
  { key: "forma_pagamento", label: "Forma de Pagamento" },
  { key: "data_pedido", label: "Data do Pedido" },
  { key: "data_entrega", label: "Data de Entrega" },
];

export default function ControlePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: "numero", dir: "desc" });
  const [expanded, setExpanded] = useState({});
  const [waTemplate, setWaTemplate] = useState("");
  const [range, setRange] = useState({ ped_de: "", ped_ate: "", ent_de: "", ent_ate: "" });

  const load = async () => {
    const [{ data }, { data: cfg }] = await Promise.all([api.get("/pedidos"), api.get("/config")]);
    setPedidos(data); setWaTemplate(cfg.whatsapp_template || "");
  };
  useEffect(() => { load(); }, []);

  const distinct = (key) => [...new Set(pedidos.map((p) => (p[key] ?? "").toString()).filter(Boolean))].sort();

  const inRange = (d, de, ate) => {
    if (!d) return !de && !ate;
    const v = String(d).slice(0, 10);
    if (de && v < de) return false;
    if (ate && v > ate) return false;
    return true;
  };

  const setStatus = async (id, field, value) => {
    await api.patch(`/pedidos/${id}/status`, { [field]: value });
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    toast.success("Status atualizado");
  };

  const filtered = useMemo(() => {
    let rows = pedidos.filter((p) => {
      for (const c of COLS) {
        const f = (filters[c.key] || "").toString().toLowerCase().trim();
        if (!f) continue;
        const v = (p[c.key] ?? "").toString().toLowerCase();
        if (!v.includes(f)) return false;
      }
      if (!inRange(p.data_pedido, range.ped_de, range.ped_ate)) return false;
      if (!inRange(p.data_entrega, range.ent_de, range.ent_ate)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sort.key] ?? "", bv = b[sort.key] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : av.toString().localeCompare(bv.toString());
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [pedidos, filters, sort, range]);

  const totalValor = filtered.reduce((s, p) => s + (p.total || 0), 0);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const exportData = () => {
    const headers = [
      { label: "Nº", value: (r) => String(r.numero).padStart(3, "0") },
      { label: "Cliente", value: (r) => r.cliente_nome },
      { label: "Valor Total", value: (r) => r.total },
      { label: "Status Pedido", value: (r) => r.status_pedido },
      { label: "Status Produção", value: (r) => PROD_LABEL[r.status_producao] || "" },
      { label: "Forma Pgto", value: (r) => r.forma_pagamento },
      { label: "Data Pedido", value: (r) => fmtDate(r.data_pedido) },
      { label: "Data Entrega", value: (r) => fmtDate(r.data_entrega) },
      { label: "Hora", value: (r) => r.hora_entrega || "" },
    ];
    return headers;
  };

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Controle de Pedidos</h1>
          <p className="text-[#8B5E48] italic text-sm">{filtered.length} pedido(s) • Total: <strong className="text-[#6B8E5A]" data-testid="cp-total">{fmtMoney(totalValor)}</strong></p>
        </div>
        <div className="flex gap-2">
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(filtered, exportData(), "controle-pedidos.csv")}><FileSpreadsheet size={16} />Excel</button>
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF("Controle de Pedidos", exportData(), filtered, { extra: `<strong>Total: ${fmtMoney(totalValor)}</strong>` })}><FileText size={16} />PDF</button>
        </div>
      </header>

      <div className="mm-card-glow flex flex-wrap items-end gap-3" data-testid="cp-range-bar">
        <div className="text-sm font-semibold text-[#3D2817]">Período:</div>
        <div><label className="mm-label">Pedido — De</label><input data-testid="cp-range-ped-de" type="date" className="mm-input" value={range.ped_de} onChange={(e) => setRange({ ...range, ped_de: e.target.value })} /></div>
        <div><label className="mm-label">Pedido — Até</label><input data-testid="cp-range-ped-ate" type="date" className="mm-input" value={range.ped_ate} onChange={(e) => setRange({ ...range, ped_ate: e.target.value })} /></div>
        <div><label className="mm-label">Entrega — De</label><input data-testid="cp-range-ent-de" type="date" className="mm-input" value={range.ent_de} onChange={(e) => setRange({ ...range, ent_de: e.target.value })} /></div>
        <div><label className="mm-label">Entrega — Até</label><input data-testid="cp-range-ent-ate" type="date" className="mm-input" value={range.ent_ate} onChange={(e) => setRange({ ...range, ent_ate: e.target.value })} /></div>
        <button className="mm-btn-3d secondary text-sm" onClick={() => { setRange({ ped_de: "", ped_ate: "", ent_de: "", ent_ate: "" }); setFilters({}); }}>Limpar</button>
      </div>

      <div className="mm-glass overflow-hidden">
        {COLS.map((c) => (
          <datalist key={c.key} id={`cp-dl-${c.key}`}>
            {distinct(c.key).map((v) => <option key={v} value={c.key === "data_pedido" || c.key === "data_entrega" ? v : v} />)}
          </datalist>
        ))}
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="mm-table">
            <thead>
              <tr>
                <th></th>
                {COLS.map((c) => (
                  <th key={c.key}>
                    <button data-testid={`cp-sort-${c.key}`} className="flex items-center gap-1 hover:text-[#C8856A]" onClick={() => toggleSort(c.key)}>
                      {c.label}<ArrowUpDown size={12} className={sort.key === c.key ? "text-[#C8856A]" : "opacity-40"} />
                    </button>
                  </th>
                ))}
                <th>Hora</th>
              </tr>
              <tr>
                <th></th>
                {COLS.map((c) => (
                  <th key={c.key}>
                    <input data-testid={`cp-filter-${c.key}`} list={`cp-dl-${c.key}`} className="mm-input text-right" style={{ padding: "3px 6px", fontSize: 12 }} placeholder="filtrar" value={filters[c.key] || ""} onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })} />
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={COLS.length + 2} className="text-center italic py-8 text-[#8B5E48]">Nenhum pedido</td></tr>}
              {filtered.map((p) => {
                const prodDisabled = p.status_pedido === "CANCELADO" || p.status_pedido === "ENTREGUE";
                const open = expanded[p.id];
                return (
                  <React.Fragment key={p.id}>
                    <tr data-testid={`cp-row-${p.numero}`}>
                      <td><div className="flex items-center gap-1"><button data-testid={`cp-expand-${p.numero}`} onClick={() => setExpanded({ ...expanded, [p.id]: !open })} className="text-[#8B5E48]">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button><button data-testid={`cp-whats-${p.numero}`} title="Enviar no WhatsApp" onClick={() => openWhatsapp(p, waTemplate)} className="text-[#25D366]"><MessageCircle size={16} /></button></div></td>
                      <td className="font-bold">{String(p.numero).padStart(3, "0")}</td>
                      <td>{p.cliente_nome}</td>
                      <td className="font-bold text-right">{fmtMoney(p.total)}</td>
                      <td>
                        <select data-testid={`cp-status-pedido-${p.numero}`} className={`px-2 py-1 rounded text-xs font-semibold border-0 ${ST_PED_BADGE[p.status_pedido] || ""}`} value={p.status_pedido} onChange={(e) => setStatus(p.id, "status_pedido", e.target.value)}>
                          {ST_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <select data-testid={`cp-status-prod-${p.numero}`} disabled={prodDisabled} className={`px-2 py-1 rounded text-xs font-semibold border-0 ${prodDisabled ? "bg-gray-100 text-gray-400" : ST_PROD_BADGE[p.status_producao] || ""}`} value={p.status_producao} onChange={(e) => setStatus(p.id, "status_producao", e.target.value)}>
                          {ST_PROD.map((s) => <option key={s} value={s}>{PROD_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td>{p.forma_pagamento || "—"}</td>
                      <td className="text-right">{fmtDate(p.data_pedido)}</td>
                      <td className="text-right">{fmtDate(p.data_entrega)}</td>
                      <td className="text-right">{p.hora_entrega || "—"}</td>
                    </tr>
                    {open && (
                      <tr className="bg-[#FBF6F0]">
                        <td colSpan={COLS.length + 2} className="p-0">
                          <table className="mm-table">
                            <thead><tr><th>Código</th><th>Produto</th><th>Un</th><th className="text-right">Qtd</th><th className="text-right">Preço Unit</th><th className="text-right">Preço Total</th></tr></thead>
                            <tbody>
                              {(p.itens || []).map((it, i) => (
                                <tr key={i}><td>{it.codigo}</td><td>{it.descricao}</td><td>{it.unidade}</td><td className="text-right">{fmtBR(it.quantidade, 2)}</td><td className="text-right">{fmtMoney(it.preco_unitario)}</td><td className="text-right">{fmtMoney(it.preco_total)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5EBE0] font-bold">
                <td colSpan="3" className="text-right">TOTAL</td>
                <td className="text-right text-[#6B8E5A]">{fmtMoney(totalValor)}</td>
                <td colSpan={COLS.length - 2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
