import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, FileText, FileSpreadsheet } from "lucide-react";
import { fmtBR, fmtMoney, fmtDate, exportPDF, exportCSV } from "@/lib/format";

const novo = () => ({ fornecedor: "", data_compra: new Date().toISOString().slice(0, 10), data_vencimento: "", itens: [] });

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [mps, setMps] = useState([]);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([api.get("/compras"), api.get("/materias-primas")]);
    setCompras(c); setMps(m);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (id) => { const { data } = await api.get(`/compras/${id}`); setEditing({ ...novo(), ...data }); setShow(true); };

  const addItem = (mid) => {
    const mp = mps.find((m) => m.id === mid);
    if (!mp || editing.itens.some((i) => i.materia_prima_id === mid)) return;
    setEditing({ ...editing, itens: [...editing.itens, { materia_prima_id: mid, codigo: mp.codigo, descricao: mp.descricao, unidade: mp.unidade, marca: mp.marca, fornecedor: mp.fornecedor, quantidade: 1, valor_total: 0 }] });
  };
  const upItem = (idx, field, v) => { const it = [...editing.itens]; it[idx] = { ...it[idx], [field]: Number(v) || 0 }; setEditing({ ...editing, itens: it }); };
  const rmItem = (idx) => setEditing({ ...editing, itens: editing.itens.filter((_, i) => i !== idx) });

  const total = (editing?.itens || []).reduce((s, i) => s + Number(i.valor_total || 0), 0);

  const save = async () => {
    const payload = { fornecedor: editing.fornecedor, data_compra: editing.data_compra, data_vencimento: editing.data_vencimento, itens: editing.itens.map((i) => ({ materia_prima_id: i.materia_prima_id, quantidade: Number(i.quantidade), valor_total: Number(i.valor_total) })) };
    if (editing.id) await api.put(`/compras/${editing.id}`, payload); else await api.post("/compras", payload);
    toast.success("Compra salva! Estoque atualizado."); setShow(false); setEditing(null); load();
  };
  const del = async (id) => { if (!window.confirm("Excluir compra?")) return; await api.delete(`/compras/${id}`); load(); };

  const headers = [
    { label: "Código", value: (r) => r.codigo }, { label: "Fornecedor", value: (r) => r.fornecedor },
    { label: "Data", value: (r) => fmtDate(r.data_compra) }, { label: "Vencimento", value: (r) => fmtDate(r.data_vencimento) },
    { label: "Total", value: (r) => fmtMoney(r.total_pedido) },
  ];

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="font-display text-4xl text-[#3D2817]">Pedido de Compras</h1><p className="text-[#8B5E48] italic text-sm">Registre as compras de matéria-prima</p></div>
        <div className="flex gap-2">
          <button data-testid="compra-novo-btn" className="mm-btn-3d" onClick={() => { setEditing(novo()); setShow(true); }}><Plus size={16} className="inline mr-1" />Nova Compra</button>
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(compras, headers, "compras.csv")}><FileSpreadsheet size={16} />Excel</button>
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF("Pedidos de Compra", headers, compras)}><FileText size={16} />PDF</button>
        </div>
      </header>

      <div className="mm-glass overflow-hidden"><div className="overflow-x-auto max-h-[70vh]">
        <table className="mm-table"><thead><tr><th>Código</th><th>Fornecedor</th><th className="text-right">Data</th><th className="text-right">Vencimento</th><th>Itens</th><th className="text-right">Total</th><th>Ações</th></tr></thead>
          <tbody>
            {compras.length === 0 && <tr><td colSpan="7" className="text-center italic py-8 text-[#8B5E48]">Nenhuma compra</td></tr>}
            {compras.map((c) => (
              <tr key={c.id} data-testid={`compra-row-${c.codigo}`}>
                <td className="font-bold">{c.codigo}</td><td>{c.fornecedor}</td>
                <td className="text-right">{fmtDate(c.data_compra)}</td><td className="text-right">{fmtDate(c.data_vencimento)}</td>
                <td>{(c.itens || []).length} item(s)</td><td className="text-right font-bold">{fmtMoney(c.total_pedido)}</td>
                <td className="whitespace-nowrap"><button onClick={() => openEdit(c.id)} className="text-[#8B5E48] mr-2"><Pencil size={16} /></button><button onClick={() => del(c.id)} className="text-[#B85450]"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody></table>
      </div></div>

      {show && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="mm-glass w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="font-display text-2xl text-[#3D2817]">{editing.id ? `Compra ${editing.codigo}` : "Nova Compra"}</h2><button onClick={() => { setShow(false); setEditing(null); }} className="text-[#8B5E48]"><X size={24} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div><label className="mm-label">Fornecedor</label><input data-testid="compra-fornecedor" className="mm-input" value={editing.fornecedor} onChange={(e) => setEditing({ ...editing, fornecedor: e.target.value })} /></div>
              <div><label className="mm-label">Data da Compra</label><input type="date" className="mm-input" value={editing.data_compra || ""} onChange={(e) => setEditing({ ...editing, data_compra: e.target.value })} /></div>
              <div><label className="mm-label">Vencimento do Pagamento</label><input data-testid="compra-vencimento" type="date" className="mm-input" value={editing.data_vencimento || ""} onChange={(e) => setEditing({ ...editing, data_vencimento: e.target.value })} /></div>
            </div>
            <select data-testid="compra-add-mp" className="mm-input mb-3" onChange={(e) => { if (e.target.value) { addItem(e.target.value); e.target.value = ""; } }}>
              <option value="">+ Adicionar matéria-prima...</option>
              {mps.map((m) => <option key={m.id} value={m.id}>{m.codigo} - {m.descricao}</option>)}
            </select>
            <div className="overflow-x-auto"><table className="mm-table mb-3"><thead><tr><th>Código</th><th>Descrição</th><th>Un</th><th>Marca</th><th>Fornecedor</th><th>Qtd</th><th className="text-right">Valor Total</th><th></th></tr></thead>
              <tbody>
                {editing.itens.length === 0 && <tr><td colSpan="8" className="text-center italic py-3 text-[#8B5E48]">Adicione itens</td></tr>}
                {editing.itens.map((i, idx) => (
                  <tr key={idx}><td>{i.codigo}</td><td>{i.descricao}</td><td>{i.unidade}</td><td>{i.marca}</td><td>{i.fornecedor}</td>
                    <td><input data-testid={`compra-item-qtd-${idx}`} type="number" step="0.01" className="mm-input text-right" style={{ width: 90, padding: "4px 8px" }} value={i.quantidade} onChange={(e) => upItem(idx, "quantidade", e.target.value)} /></td>
                    <td><input data-testid={`compra-item-valor-${idx}`} type="number" step="0.01" className="mm-input text-right" style={{ width: 110, padding: "4px 8px" }} value={i.valor_total} onChange={(e) => upItem(idx, "valor_total", e.target.value)} /></td>
                    <td><button onClick={() => rmItem(idx)} className="text-[#B85450]"><Trash2 size={16} /></button></td></tr>
                ))}
              </tbody></table></div>
            <div className="p-4 bg-[#F5EBE0] rounded-xl text-xl text-[#6B8E5A] mb-4"><strong>TOTAL DO PEDIDO: <span data-testid="compra-total">{fmtMoney(total)}</span></strong></div>
            <div className="flex gap-2 justify-end"><button className="mm-btn-3d secondary" onClick={() => { setShow(false); setEditing(null); }}>Cancelar</button><button data-testid="compra-save" className="mm-btn-3d" onClick={save}>Salvar Compra</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
