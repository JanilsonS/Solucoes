import { useEffect, useState } from "react";
import api, { LOGO_URL } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Pencil, X, Eye } from "lucide-react";
import { fmtBR, fmtMoney, exportPDF } from "@/lib/format";

const STATUS_APR = ["PENDENTE", "APROVADO", "CANCELADO"];
const STATUS_PROD = ["PENDENTE", "EM_PRODUCAO", "ENTREGUE"];
const STATUS_PAG = ["ABERTO", "PAGO"];

const novoPedido = () => ({
  cliente_nome: "", cliente_telefone: "", forma_pagamento: "",
  aprovacao: "PENDENTE", producao: "PENDENTE", pagamento: "ABERTO",
  desconto_pct: 0, itens: [], receita_comercial: [], observacoes: "", data_evento: "",
});

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [tabela, setTabela] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ aprovacao: "", producao: "", pagamento: "", cliente: "" });

  const load = async () => {
    const [{ data: p }, { data: t }] = await Promise.all([api.get("/pedidos"), api.get("/tabela-precos")]);
    setPedidos(p); setTabela(t);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(novoPedido()); setShowForm(true); };

  const openEdit = async (id) => {
    const { data } = await api.get(`/pedidos/${id}`);
    setEditing(data);
    setShowForm(true);
  };

  const addItemFromTabela = (produto_id) => {
    const row = tabela.rows.find((r) => r.produto_id === produto_id);
    if (!row) return;
    const preco = row.precos_finais[0]?.preco || 0;
    setEditing({ ...editing, itens: [...editing.itens, { produto_id, codigo: row.codigo, descricao: row.descricao, unidade: row.unidade, quantidade: 1, preco_unitario: preco, margem_lucro_pct: row.precos_finais[0]?.lucro_pct || 0 }] });
  };

  const updateItem = (idx, field, value) => {
    const itens = [...editing.itens];
    itens[idx] = { ...itens[idx], [field]: field === "quantidade" || field === "preco_unitario" || field === "margem_lucro_pct" ? Number(value) : value };
    setEditing({ ...editing, itens });
  };

  const removeItem = (idx) => setEditing({ ...editing, itens: editing.itens.filter((_, i) => i !== idx) });

  const addRC = () => setEditing({ ...editing, receita_comercial: [...editing.receita_comercial, { descricao: "", valor: 0 }] });
  const updateRC = (idx, field, value) => {
    const rc = [...editing.receita_comercial];
    rc[idx] = { ...rc[idx], [field]: field === "valor" ? Number(value) : value };
    setEditing({ ...editing, receita_comercial: rc });
  };
  const removeRC = (idx) => setEditing({ ...editing, receita_comercial: editing.receita_comercial.filter((_, i) => i !== idx) });

  const calcTotals = () => {
    const sub = (editing?.itens || []).reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
    const rc = (editing?.receita_comercial || []).reduce((s, r) => s + Number(r.valor || 0), 0);
    const desc = (sub + rc) * (Number(editing?.desconto_pct || 0) / 100);
    return { sub, rc, desc, total: sub + rc - desc };
  };

  const save = async () => {
    try {
      const payload = {
        ...editing,
        desconto_pct: Number(editing.desconto_pct || 0),
        itens: editing.itens.map((i) => ({ produto_id: i.produto_id, quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario), margem_lucro_pct: Number(i.margem_lucro_pct || 0) })),
        receita_comercial: editing.receita_comercial.map((r) => ({ descricao: r.descricao, valor: Number(r.valor) })),
      };
      if (editing.id) await api.put(`/pedidos/${editing.id}`, payload);
      else await api.post("/pedidos", payload);
      toast.success("Pedido salvo!");
      setShowForm(false); setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const del = async (id) => {
    if (!confirm("Excluir pedido?")) return;
    await api.delete(`/pedidos/${id}`);
    toast.success("Excluído");
    load();
  };

  const filtered = pedidos.filter((p) => {
    if (filters.aprovacao && p.aprovacao !== filters.aprovacao) return false;
    if (filters.producao && p.producao !== filters.producao) return false;
    if (filters.pagamento && p.pagamento !== filters.pagamento) return false;
    if (filters.cliente && !p.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    return true;
  });

  const exportPedidoPDF = async (id) => {
    const { data } = await api.get(`/pedidos/${id}`);
    const headers = [
      { label: "Descrição", value: (r) => r.descricao },
      { label: "Unid.", value: (r) => r.unidade },
      { label: "Qtd", value: (r) => fmtBR(r.quantidade, 2) },
      { label: "Preço Unit.", value: (r) => fmtMoney(r.preco_unitario) },
      { label: "Subtotal", value: (r) => fmtMoney(r.quantidade * r.preco_unitario) },
    ];
    const rcText = data.receita_comercial.map((r) => `${r.descricao}: ${fmtMoney(r.valor)}`).join(" • ") || "—";
    const extra = `
      <strong>Pedido Nº:</strong> ${data.numero}<br/>
      <strong>Cliente:</strong> ${data.cliente_nome} • <strong>Fone:</strong> ${data.cliente_telefone}<br/>
      <strong>Forma de Pagamento:</strong> ${data.forma_pagamento}<br/>
      ${data.data_evento ? `<strong>Data do Evento:</strong> ${data.data_evento}<br/>` : ""}
      <strong>Receita Comercial:</strong> ${rcText}<br/>
      <strong>Subtotal:</strong> ${fmtMoney(data.subtotal)} • <strong>Receita Comercial:</strong> ${fmtMoney(data.receita_comercial_total)}<br/>
      <strong>Desconto:</strong> ${fmtBR(data.desconto_pct)}% (${fmtMoney(data.desconto_valor)})<br/>
      <strong style="font-size:16px;color:#6B8E5A;">TOTAL: ${fmtMoney(data.total)}</strong><br/><br/>
      <em>Olá ${data.cliente_nome}, segue o orçamento do seu pedido. Estamos à disposição! Atenciosamente, MM Confeitaria e Eventos.</em>
    `;
    exportPDF(`Pedido Nº ${data.numero}`, headers, data.itens, { extra });
  };

  const totals = editing ? calcTotals() : null;

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Pedidos</h1>
          <p className="text-[#8B5E48] italic text-sm">Gestão de encomendas</p>
        </div>
        <button data-testid="pedidos-novo-btn" className="mm-btn-3d" onClick={startNew}><Plus size={16} className="inline mr-1"/>Novo Pedido</button>
      </header>

      {/* Filters */}
      <div className="mm-card-glow grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><label className="mm-label">Cliente</label><input data-testid="ped-filter-cliente" className="mm-input" value={filters.cliente} onChange={(e) => setFilters({ ...filters, cliente: e.target.value })} /></div>
        <div><label className="mm-label">Aprovação</label><select className="mm-input" value={filters.aprovacao} onChange={(e) => setFilters({ ...filters, aprovacao: e.target.value })}><option value="">Todos</option>{STATUS_APR.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="mm-label">Produção</label><select className="mm-input" value={filters.producao} onChange={(e) => setFilters({ ...filters, producao: e.target.value })}><option value="">Todos</option>{STATUS_PROD.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="mm-label">Pagamento</label><select className="mm-input" value={filters.pagamento} onChange={(e) => setFilters({ ...filters, pagamento: e.target.value })}><option value="">Todos</option>{STATUS_PAG.map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>

      <div className="mm-glass overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="mm-table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Fone</th><th>Pgto</th><th>Aprov.</th><th>Produção</th><th>Pago</th><th>Total</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="9" className="text-center italic py-8 text-[#8B5E48]">Nenhum pedido</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} data-testid={`ped-row-${p.id}`}>
                  <td className="font-bold">#{p.numero}</td>
                  <td>{p.cliente_nome}</td>
                  <td>{p.cliente_telefone}</td>
                  <td>{p.forma_pagamento}</td>
                  <td><span className={`px-2 py-1 rounded text-xs font-semibold ${p.aprovacao === "APROVADO" ? "bg-green-100 text-green-800" : p.aprovacao === "CANCELADO" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{p.aprovacao}</span></td>
                  <td><span className={`px-2 py-1 rounded text-xs font-semibold ${p.producao === "ENTREGUE" ? "bg-green-100 text-green-800" : p.producao === "EM_PRODUCAO" ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}>{p.producao.replace("_", " ")}</span></td>
                  <td><span className={`px-2 py-1 rounded text-xs font-semibold ${p.pagamento === "PAGO" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{p.pagamento}</span></td>
                  <td className="font-bold">{fmtMoney(p.total)}</td>
                  <td className="whitespace-nowrap">
                    <button data-testid={`ped-edit-${p.id}`} onClick={() => openEdit(p.id)} className="text-[#8B5E48] mr-2"><Pencil size={16}/></button>
                    <button data-testid={`ped-pdf-${p.id}`} onClick={() => exportPedidoPDF(p.id)} className="text-[#8B5E48] mr-2"><FileText size={16}/></button>
                    <button onClick={() => del(p.id)} className="text-[#B85450]"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="mm-glass w-full max-w-6xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-2xl text-[#3D2817]">{editing.id ? `Pedido #${editing.numero}` : "Novo Pedido"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#8B5E48]"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div><label className="mm-label">Nome Cliente</label><input data-testid="ped-cliente-nome" className="mm-input" value={editing.cliente_nome} onChange={(e) => setEditing({ ...editing, cliente_nome: e.target.value })} /></div>
              <div><label className="mm-label">Fone/Whats</label><input data-testid="ped-cliente-fone" className="mm-input" value={editing.cliente_telefone} onChange={(e) => setEditing({ ...editing, cliente_telefone: e.target.value })} /></div>
              <div><label className="mm-label">Forma Pagamento</label><input className="mm-input" value={editing.forma_pagamento} onChange={(e) => setEditing({ ...editing, forma_pagamento: e.target.value })} placeholder="PIX, Cartão..." /></div>
              <div><label className="mm-label">Aprovação</label><select className="mm-input" value={editing.aprovacao} onChange={(e) => setEditing({ ...editing, aprovacao: e.target.value })}>{STATUS_APR.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="mm-label">Produção</label><select className="mm-input" value={editing.producao} onChange={(e) => setEditing({ ...editing, producao: e.target.value })}>{STATUS_PROD.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="mm-label">Pagamento</label><select className="mm-input" value={editing.pagamento} onChange={(e) => setEditing({ ...editing, pagamento: e.target.value })}>{STATUS_PAG.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="mm-label">Data do Evento</label><input type="date" className="mm-input" value={editing.data_evento || ""} onChange={(e) => setEditing({ ...editing, data_evento: e.target.value })} /></div>
              <div><label className="mm-label">Desconto (%)</label><input type="number" step="0.01" className="mm-input" value={editing.desconto_pct} onChange={(e) => setEditing({ ...editing, desconto_pct: e.target.value })} /></div>
            </div>

            <h3 className="font-display text-xl text-[#3D2817] mb-2">Itens</h3>
            <div className="flex gap-2 mb-3">
              <select data-testid="ped-add-produto-select" className="mm-input" onChange={(e) => { if (e.target.value) { addItemFromTabela(e.target.value); e.target.value = ""; } }}>
                <option value="">+ Adicionar produto...</option>
                {tabela?.rows.map((r) => <option key={r.produto_id} value={r.produto_id}>{r.codigo} - {r.descricao}</option>)}
              </select>
            </div>
            <table className="mm-table mb-4">
              <thead><tr><th>Código</th><th>Descrição</th><th>Un</th><th>Qtd</th><th>Margem %</th><th>Preço Unit</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {editing.itens.length === 0 && <tr><td colSpan="8" className="text-center italic py-4 text-[#8B5E48]">Adicione produtos</td></tr>}
                {editing.itens.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.codigo}</td>
                    <td>{i.descricao}</td>
                    <td>{i.unidade}</td>
                    <td><input type="number" step="0.01" className="mm-input" style={{ width: 70, padding: "4px 8px" }} value={i.quantidade} onChange={(e) => updateItem(idx, "quantidade", e.target.value)} /></td>
                    <td><input type="number" step="0.01" className="mm-input" style={{ width: 70, padding: "4px 8px" }} value={i.margem_lucro_pct} onChange={(e) => updateItem(idx, "margem_lucro_pct", e.target.value)} /></td>
                    <td><input type="number" step="0.01" className="mm-input" style={{ width: 100, padding: "4px 8px" }} value={i.preco_unitario} onChange={(e) => updateItem(idx, "preco_unitario", e.target.value)} /></td>
                    <td className="font-semibold">{fmtMoney(i.quantidade * i.preco_unitario)}</td>
                    <td><button onClick={() => removeItem(idx)} className="text-[#B85450]"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-display text-xl text-[#3D2817] mb-2">Receita Comercial</h3>
            <button className="mm-btn-3d secondary mb-3 text-sm" onClick={addRC}><Plus size={14} className="inline mr-1"/>Adicionar</button>
            {editing.receita_comercial.map((r, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input className="mm-input flex-1" placeholder="Descrição (ex: Taxa de entrega)" value={r.descricao} onChange={(e) => updateRC(idx, "descricao", e.target.value)} />
                <input type="number" step="0.01" className="mm-input" style={{ width: 130 }} placeholder="Valor" value={r.valor} onChange={(e) => updateRC(idx, "valor", e.target.value)} />
                <button onClick={() => removeRC(idx)} className="text-[#B85450] px-2"><Trash2 size={16}/></button>
              </div>
            ))}

            <div className="mt-4 grid grid-cols-2 gap-3 p-4 bg-[#F5EBE0] rounded-xl">
              <div>Subtotal: <strong>{fmtMoney(totals.sub)}</strong></div>
              <div>Receita Comercial: <strong>{fmtMoney(totals.rc)}</strong></div>
              <div>Desconto ({fmtBR(editing.desconto_pct || 0)}%): <strong>-{fmtMoney(totals.desc)}</strong></div>
              <div className="text-xl text-[#6B8E5A]"><strong>TOTAL: {fmtMoney(totals.total)}</strong></div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button className="mm-btn-3d secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
              <button data-testid="ped-save-btn" className="mm-btn-3d" onClick={save}>Salvar Pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
