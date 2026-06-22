import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, FileText, FileSpreadsheet, Pencil, X, UserPlus, MessageCircle } from "lucide-react";
import { fmtBR, fmtMoney, fmtDate, exportPDF, exportCSV } from "@/lib/format";
import { openWhatsapp } from "@/lib/whatsapp";

const ST_PEDIDO = ["APROVADO", "ENTREGUE", "CANCELADO"];
const ST_PROD = ["NA_FILA", "EM_PRODUCAO", "FINALIZADO"];
const PROD_LABEL = { NA_FILA: "Na fila", EM_PRODUCAO: "Em produção", FINALIZADO: "Finalizado" };

const novo = () => ({
  cliente_id: null, cliente_nome: "", cliente_telefone: "", cliente_endereco: "",
  endereco_entrega: "", ponto_referencia: "", forma_pagamento: "",
  status_pedido: "APROVADO", status_producao: "NA_FILA", desconto_pct: 0,
  itens: [], outros: [{ descricao: "Taxa de Entrega", valor: 0 }, { descricao: "Carrinho Gourmet", valor: 0 }, { descricao: "Outros", valor: 0 }],
  observacoes: "", data_pedido: new Date().toISOString().slice(0, 10), data_entrega: "", hora_entrega: "",
});

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [tabela, setTabela] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [formas, setFormas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [waTemplate, setWaTemplate] = useState("");
  const [precoOficial, setPrecoOficial] = useState({});

  const load = async () => {
    const [{ data: p }, { data: t }, { data: c }, { data: f }, { data: cfg }, { data: tv }] = await Promise.all([
      api.get("/pedidos"), api.get("/tabela-precos"), api.get("/clientes"), api.get("/formas-pagamento"), api.get("/config"), api.get("/tabela-venda"),
    ]);
    setPedidos(p); setTabela(t); setClientes(c); setFormas(f); setWaTemplate(cfg.whatsapp_template || "");
    const pm = {}; (tv.rows || []).forEach((r) => { pm[r.produto_id] = r.preco_tabela; });
    setPrecoOficial(pm);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(novo()); setShowForm(true); };
  const openEdit = async (id) => { const { data } = await api.get(`/pedidos/${id}`); setEditing({ ...novo(), ...data }); setShowForm(true); };

  const selectCliente = (id) => {
    if (!id) return setEditing({ ...editing, cliente_id: null });
    const c = clientes.find((x) => x.id === id);
    if (c) setEditing({ ...editing, cliente_id: c.id, cliente_nome: c.nome, cliente_telefone: c.telefone, cliente_endereco: c.endereco || "" });
  };

  const addCliente = async () => {
    if (!editing.cliente_nome) return toast.error("Informe o nome do cliente");
    const { data } = await api.post("/clientes", { nome: editing.cliente_nome, telefone: editing.cliente_telefone, endereco: editing.cliente_endereco });
    toast.success("Cliente cadastrado");
    const { data: c } = await api.get("/clientes"); setClientes(c);
    setEditing({ ...editing, cliente_id: data.id });
  };

  const addForma = async () => {
    const nome = window.prompt("Nova forma de pagamento:");
    if (!nome) return;
    await api.post("/formas-pagamento", { nome });
    const { data } = await api.get("/formas-pagamento"); setFormas(data);
    setEditing({ ...editing, forma_pagamento: nome });
    toast.success("Forma adicionada");
  };

  const addItem = (produto_id) => {
    const row = tabela.rows.find((r) => r.produto_id === produto_id);
    if (!row) return;
    if (editing.itens.some((i) => i.produto_id === produto_id)) return toast.error("Produto já adicionado");
    const preco = precoOficial[produto_id] != null ? precoOficial[produto_id] : row.preco_tabela_individual;
    setEditing({ ...editing, itens: [...editing.itens, { produto_id, codigo: row.codigo, descricao: row.descricao, unidade: row.unidade, quantidade: 1, custo_unitario: row.custo_com_perda, preco_unitario: preco }] });
  };
  const updateQtd = (idx, value) => {
    const itens = [...editing.itens]; itens[idx] = { ...itens[idx], quantidade: Number(value) }; setEditing({ ...editing, itens });
  };
  const removeItem = (idx) => setEditing({ ...editing, itens: editing.itens.filter((_, i) => i !== idx) });

  const updateOutro = (idx, field, value) => {
    const outros = [...editing.outros]; outros[idx] = { ...outros[idx], [field]: field === "valor" ? Number(value) : value }; setEditing({ ...editing, outros });
  };
  const addOutro = () => setEditing({ ...editing, outros: [...editing.outros, { descricao: "", valor: 0 }] });
  const removeOutro = (idx) => setEditing({ ...editing, outros: editing.outros.filter((_, i) => i !== idx) });

  const calc = () => {
    const subtotal = (editing?.itens || []).reduce((s, i) => s + i.preco_unitario * i.quantidade, 0);
    const desc = subtotal * (Number(editing?.desconto_pct || 0) / 100);
    const totalProd = subtotal - desc;
    const totalOutros = (editing?.outros || []).reduce((s, o) => s + Number(o.valor || 0), 0);
    const custoProd = (editing?.itens || []).reduce((s, i) => s + i.custo_unitario * i.quantidade, 0);
    const ind = tabela?.total_indices_pct || 0;
    const receita = totalProd;
    const deducoes = receita * (ind / 100);
    const resultado = receita - deducoes - custoProd;
    const margem = receita ? (resultado / receita) * 100 : 0;
    return { subtotal, desc, totalProd, totalOutros, total: totalProd + totalOutros, custoProd, ind, receita, deducoes, resultado, margem };
  };

  const save = async () => {
    try {
      const payload = {
        ...editing,
        desconto_pct: Number(editing.desconto_pct || 0),
        itens: editing.itens.map((i) => ({ produto_id: i.produto_id, quantidade: Number(i.quantidade) })),
        outros: editing.outros.filter((o) => o.descricao).map((o) => ({ descricao: o.descricao, valor: Number(o.valor || 0) })),
      };
      if (editing.id) await api.put(`/pedidos/${editing.id}`, payload);
      else await api.post("/pedidos", payload);
      toast.success("Pedido salvo!");
      setShowForm(false); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
  };

  const del = async (id) => { if (!window.confirm("Excluir pedido?")) return; await api.delete(`/pedidos/${id}`); toast.success("Excluído"); load(); };

  const exportPDF_ = async (id) => {
    const { data } = await api.get(`/pedidos/${id}`);
    const headers = [
      { label: "Código", value: (r) => r.codigo },
      { label: "Descrição", value: (r) => r.descricao },
      { label: "Un", value: (r) => r.unidade },
      { label: "Qtd", value: (r) => fmtBR(r.quantidade, 2) },
      { label: "Custo Unit", value: (r) => fmtMoney(r.custo_unitario) },
      { label: "Preço Unit", value: (r) => fmtMoney(r.preco_unitario) },
      { label: "Preço Total", value: (r) => fmtMoney(r.preco_total) },
    ];
    const outros = (data.outros || []).map((o) => `${o.descricao}: ${fmtMoney(o.valor)}`).join(" • ") || "—";
    const extra = `<strong>Pedido Nº:</strong> ${String(data.numero).padStart(3, "0")}<br/>
      <strong>Cliente:</strong> ${data.cliente_nome} • <strong>Fone:</strong> ${data.cliente_telefone || "—"}<br/>
      <strong>Entrega:</strong> ${data.endereco_entrega || data.cliente_endereco || "—"} ${data.ponto_referencia ? "(" + data.ponto_referencia + ")" : ""}<br/>
      <strong>Data Pedido:</strong> ${fmtDate(data.data_pedido)} • <strong>Entrega:</strong> ${fmtDate(data.data_entrega)} ${data.hora_entrega || ""}<br/>
      <strong>Forma Pagamento:</strong> ${data.forma_pagamento || "—"}<br/>
      <strong>Total Produtos:</strong> ${fmtMoney(data.total_produtos)} • <strong>Outros:</strong> ${outros} (${fmtMoney(data.total_outros)})<br/>
      <strong style="font-size:16px;color:#6B8E5A;">TOTAL DO PEDIDO: ${fmtMoney(data.total)}</strong>`;
    exportPDF(`Pedido Nº ${String(data.numero).padStart(3, "0")}`, headers, data.itens, { extra });
  };

  const exportExcel_ = async (id) => {
    const { data } = await api.get(`/pedidos/${id}`);
    const headers = [
      { label: "Código", value: (r) => r.codigo }, { label: "Descrição", value: (r) => r.descricao },
      { label: "Un", value: (r) => r.unidade }, { label: "Qtd", value: (r) => r.quantidade },
      { label: "Custo Unit", value: (r) => r.custo_unitario }, { label: "Preço Unit", value: (r) => r.preco_unitario },
      { label: "Custo Total", value: (r) => r.custo_total }, { label: "Preço Total", value: (r) => r.preco_total },
    ];
    exportCSV(data.itens, headers, `pedido-${String(data.numero).padStart(3, "0")}.csv`);
  };

  const c = editing ? calc() : null;

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Cadastro de Pedidos</h1>
          <p className="text-[#8B5E48] italic text-sm">Monte o pedido do cliente</p>
        </div>
        <button data-testid="pedidos-novo-btn" className="mm-btn-3d" onClick={startNew}><Plus size={16} className="inline mr-1" />Novo Pedido</button>
      </header>

      <div className="mm-glass overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="mm-table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Entrega</th><th>Status</th><th>Produção</th><th className="text-right">Total</th><th>Ações</th></tr></thead>
            <tbody>
              {pedidos.length === 0 && <tr><td colSpan="7" className="text-center italic py-8 text-[#8B5E48]">Nenhum pedido</td></tr>}
              {pedidos.map((p) => (
                <tr key={p.id} data-testid={`ped-row-${p.numero}`}>
                  <td className="font-bold">{String(p.numero).padStart(3, "0")}</td>
                  <td>{p.cliente_nome}</td>
                  <td className="text-right">{fmtDate(p.data_entrega)} {p.hora_entrega || ""}</td>
                  <td>{p.status_pedido}</td>
                  <td>{PROD_LABEL[p.status_producao] || "—"}</td>
                  <td className="text-right font-bold">{fmtMoney(p.total)}</td>
                  <td className="whitespace-nowrap">
                    <button data-testid={`ped-edit-${p.numero}`} onClick={() => openEdit(p.id)} className="text-[#8B5E48] mr-2"><Pencil size={16} /></button>
                    <button data-testid={`ped-whats-${p.numero}`} title="Enviar no WhatsApp" onClick={() => openWhatsapp(p, waTemplate)} className="text-[#25D366] mr-2"><MessageCircle size={16} /></button>
                    <button onClick={() => exportPDF_(p.id)} className="text-[#8B5E48] mr-2"><FileText size={16} /></button>
                    <button onClick={() => exportExcel_(p.id)} className="text-[#8B5E48] mr-2"><FileSpreadsheet size={16} /></button>
                    <button onClick={() => del(p.id)} className="text-[#B85450]"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="mm-glass w-full max-w-6xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-2xl text-[#3D2817]">{editing.id ? `Pedido Nº ${String(editing.numero).padStart(3, "0")}` : "Novo Pedido"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#8B5E48]"><X size={24} /></button>
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="mm-label">Cliente Cadastrado</label>
                <select data-testid="ped-cliente-select" className="mm-input" value={editing.cliente_id || ""} onChange={(e) => selectCliente(e.target.value)}>
                  <option value="">— Novo / digitar —</option>
                  {clientes.map((cl) => <option key={cl.id} value={cl.id}>{cl.nome} • {cl.telefone}</option>)}
                </select>
              </div>
              <div>
                <label className="mm-label">Cliente</label>
                <div className="flex gap-1">
                  <input data-testid="ped-cliente-nome" className="mm-input" value={editing.cliente_nome} onChange={(e) => setEditing({ ...editing, cliente_nome: e.target.value, cliente_id: null })} />
                  <button title="Cadastrar cliente" className="mm-btn-3d secondary px-2" onClick={addCliente}><UserPlus size={16} /></button>
                </div>
              </div>
              <div><label className="mm-label">Telefone/Whats</label><input data-testid="ped-cliente-fone" className="mm-input" value={editing.cliente_telefone} onChange={(e) => setEditing({ ...editing, cliente_telefone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <div><label className="mm-label">Endereço</label><input data-testid="ped-cliente-endereco" className="mm-input" value={editing.cliente_endereco} onChange={(e) => setEditing({ ...editing, cliente_endereco: e.target.value })} /></div>
              <div><label className="mm-label">Endereço de Entrega</label><input data-testid="ped-endereco-entrega" className="mm-input" value={editing.endereco_entrega} onChange={(e) => setEditing({ ...editing, endereco_entrega: e.target.value })} /></div>
              <div><label className="mm-label">Ponto de Referência</label><input className="mm-input" value={editing.ponto_referencia} onChange={(e) => setEditing({ ...editing, ponto_referencia: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
              <div><label className="mm-label">Data do Pedido</label><input type="date" className="mm-input" value={editing.data_pedido || ""} onChange={(e) => setEditing({ ...editing, data_pedido: e.target.value })} /></div>
              <div><label className="mm-label">Data da Entrega</label><input data-testid="ped-data-entrega" type="date" className="mm-input" value={editing.data_entrega || ""} onChange={(e) => setEditing({ ...editing, data_entrega: e.target.value })} /></div>
              <div><label className="mm-label">Hora da Entrega</label><input data-testid="ped-hora-entrega" type="time" className="mm-input" value={editing.hora_entrega || ""} onChange={(e) => setEditing({ ...editing, hora_entrega: e.target.value })} /></div>
              <div>
                <label className="mm-label">Forma de Pagamento</label>
                <div className="flex gap-1">
                  <select data-testid="ped-forma-select" className="mm-input" value={editing.forma_pagamento} onChange={(e) => setEditing({ ...editing, forma_pagamento: e.target.value })}>
                    <option value="">--</option>
                    {formas.map((f) => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                  </select>
                  <button title="Nova forma" className="mm-btn-3d secondary px-2" onClick={addForma}><Plus size={16} /></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div><label className="mm-label">Status do Pedido</label><select className="mm-input" value={editing.status_pedido} onChange={(e) => setEditing({ ...editing, status_pedido: e.target.value })}>{ST_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="mm-label">Status da Produção</label><select className="mm-input" value={editing.status_producao} onChange={(e) => setEditing({ ...editing, status_producao: e.target.value })}>{ST_PROD.map((s) => <option key={s} value={s}>{PROD_LABEL[s]}</option>)}</select></div>
              <div><label className="mm-label">Data de Vencimento</label><input data-testid="ped-data-vencimento" type="date" className="mm-input" value={editing.data_vencimento || ""} onChange={(e) => setEditing({ ...editing, data_vencimento: e.target.value })} /></div>
              <div><label className="mm-label">Desconto (%)</label><input data-testid="ped-desconto" type="number" step="0.01" className="mm-input" value={editing.desconto_pct} onChange={(e) => setEditing({ ...editing, desconto_pct: e.target.value })} /></div>
            </div>

            {/* Produtos */}
            <h3 className="font-display text-xl text-[#3D2817] mb-2">Produtos</h3>
            <select data-testid="ped-add-produto-select" className="mm-input mb-3" onChange={(e) => { if (e.target.value) { addItem(e.target.value); e.target.value = ""; } }}>
              <option value="">+ Adicionar produto...</option>
              {tabela?.rows.map((r) => <option key={r.produto_id} value={r.produto_id}>{r.codigo} - {r.descricao}</option>)}
            </select>
            <div className="overflow-x-auto">
              <table className="mm-table mb-2">
                <thead><tr><th>Código</th><th>Descrição</th><th>Un</th><th>Qtd</th><th className="text-right">Custo Unit</th><th className="text-right">Preço Unit</th><th className="text-right">Custo Total</th><th className="text-right">Preço Total</th><th></th></tr></thead>
                <tbody>
                  {editing.itens.length === 0 && <tr><td colSpan="9" className="text-center italic py-4 text-[#8B5E48]">Adicione produtos</td></tr>}
                  {editing.itens.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.codigo}</td><td>{i.descricao}</td><td>{i.unidade}</td>
                      <td><input data-testid={`ped-item-qtd-${idx}`} type="number" step="0.01" className="mm-input" style={{ width: 70, padding: "4px 8px" }} value={i.quantidade} onChange={(e) => updateQtd(idx, e.target.value)} /></td>
                      <td className="text-right">{fmtMoney(i.custo_unitario)}</td>
                      <td className="text-right">{fmtMoney(i.preco_unitario)}</td>
                      <td className="text-right">{fmtMoney(i.custo_unitario * i.quantidade)}</td>
                      <td className="text-right font-semibold">{fmtMoney(i.preco_unitario * i.quantidade)}</td>
                      <td><button onClick={() => removeItem(idx)} className="text-[#B85450]"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <div>Subtotal Produtos: <strong>{fmtMoney(c.subtotal)}</strong></div>
              <div>Desconto ({fmtBR(editing.desconto_pct || 0)}%): <strong>-{fmtMoney(c.desc)}</strong></div>
              <div className="text-[#6B8E5A]">Total Produtos: <strong data-testid="ped-total-produtos">{fmtMoney(c.totalProd)}</strong></div>
            </div>

            {/* Outros */}
            <h3 className="font-display text-xl text-[#3D2817] mb-2">Outros (não produtos)</h3>
            {editing.outros.map((o, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input className="mm-input flex-1" placeholder="Descrição" value={o.descricao} onChange={(e) => updateOutro(idx, "descricao", e.target.value)} />
                <input data-testid={`ped-outro-valor-${idx}`} type="number" step="0.01" className="mm-input" style={{ width: 140 }} placeholder="Valor" value={o.valor} onChange={(e) => updateOutro(idx, "valor", e.target.value)} />
                <button onClick={() => removeOutro(idx)} className="text-[#B85450] px-2"><Trash2 size={16} /></button>
              </div>
            ))}
            <button className="mm-btn-3d secondary text-sm mb-2" onClick={addOutro}><Plus size={14} className="inline mr-1" />Adicionar item</button>
            <div className="text-sm mb-4">Total de Outros: <strong>{fmtMoney(c.totalOutros)}</strong></div>

            <div className="p-4 bg-[#F5EBE0] rounded-xl text-xl text-[#6B8E5A] mb-3"><strong>TOTAL DO PEDIDO: <span data-testid="ped-total-pedido">{fmtMoney(c.total)}</span></strong></div>

            {/* DRE */}
            <div className="p-4 rounded-xl bg-[#3D2817] text-white mb-4" data-testid="ped-dre-panel">
              <h3 className="font-display text-lg mb-2 text-[#E8C9A0]">Resultado do Pedido (DRE)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><div className="text-[#C8A47A] text-xs uppercase">Receita Total</div><div className="font-bold" data-testid="ped-dre-receita">{fmtMoney(c.receita)}</div></div>
                <div><div className="text-[#C8A47A] text-xs uppercase">Deduções ({fmtBR(c.ind)}%)</div><div className="font-bold text-[#E8A0A0]">-{fmtMoney(c.deducoes)}</div></div>
                <div><div className="text-[#C8A47A] text-xs uppercase">Custo Produtos</div><div className="font-bold text-[#E8A0A0]">-{fmtMoney(c.custoProd)}</div></div>
                <div><div className="text-[#C8A47A] text-xs uppercase">Resultado Líquido</div><div className={`font-bold ${c.resultado >= 0 ? "text-[#9FD89F]" : "text-[#E8A0A0]"}`} data-testid="ped-dre-resultado">{fmtMoney(c.resultado)}</div></div>
                <div><div className="text-[#C8A47A] text-xs uppercase">Margem</div><div className={`font-bold ${c.margem >= 0 ? "text-[#9FD89F]" : "text-[#E8A0A0]"}`}>{fmtBR(c.margem)}%</div></div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button className="mm-btn-3d secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
              <button data-testid="ped-save-btn" className="mm-btn-3d" onClick={save}>Salvar Pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
