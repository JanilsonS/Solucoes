import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Eraser, FileText, FileSpreadsheet } from "lucide-react";
import { fmtBR, exportCSV, exportPDF } from "@/lib/format";

export default function Markup() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ grupo: "INDICE", indice: 0, lucro1: 0, lucro2: 0, lucro3: 0, lucro4: 0, selecionada: 1 });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/markups");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const fetchNextCode = async () => {
    try {
      const { data } = await api.get("/next-code/markup");
      setForm((f) => ({ ...f, descricao: f.descricao || data.codigo }));
    } catch {}
  };
  useEffect(() => { if (!editId && !form.descricao) fetchNextCode(); }, [editId, items.length]);

  const submit = async () => {
    try {
      const payload = { ...form };
      ["indice", "lucro1", "lucro2", "lucro3", "lucro4"].forEach((k) => (payload[k] = Number(payload[k] || 0)));
      payload.selecionada = Number(payload.selecionada || 1);
      if (editId) await api.put(`/markups/${editId}`, payload);
      else await api.post("/markups", payload);
      toast.success("Salvo!");
      setForm({ grupo: "INDICE", indice: 0, lucro1: 0, lucro2: 0, lucro3: 0, lucro4: 0, selecionada: 1 });
      setEditId(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const del = async (id) => {
    if (!confirm("Excluir?")) return;
    await api.delete(`/markups/${id}`);
    load();
  };

  const indices = items.filter((i) => i.grupo === "INDICE");
  const lucros = items.filter((i) => i.grupo === "LUCRO");
  const totalIndices = indices.reduce((s, i) => s + (i.indice || 0), 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl text-[#3D2817]">Markup</h1>
        <p className="text-[#8B5E48] italic text-sm">Índices de deduções e margens de lucro</p>
      </header>

      <div className="mm-card-glow">
        <h3 className="font-display text-xl text-[#3D2817] mb-3">{editId ? "Editar" : "Novo"} Markup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="mm-label">Grupo</label>
            <select className="mm-input" data-testid="markup-grupo" value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })}>
              <option value="INDICE">1. Índice</option>
              <option value="LUCRO">2. Lucro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mm-label">Descrição</label>
            <input data-testid="markup-desc" className="mm-input" value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          {form.grupo === "INDICE" ? (
            <div>
              <label className="mm-label">Índice (%)</label>
              <input data-testid="markup-indice" type="number" step="0.01" className="mm-input" value={form.indice} onChange={(e) => setForm({ ...form, indice: e.target.value })} />
            </div>
          ) : (
            <>
              <div><label className="mm-label">Lucro 1 (%)</label><input type="number" step="0.01" className="mm-input" value={form.lucro1} onChange={(e) => setForm({ ...form, lucro1: e.target.value })} /></div>
              <div><label className="mm-label">Lucro 2 (%)</label><input type="number" step="0.01" className="mm-input" value={form.lucro2} onChange={(e) => setForm({ ...form, lucro2: e.target.value })} /></div>
              <div><label className="mm-label">Lucro 3 (%)</label><input type="number" step="0.01" className="mm-input" value={form.lucro3} onChange={(e) => setForm({ ...form, lucro3: e.target.value })} /></div>
              <div><label className="mm-label">Lucro 4 (%)</label><input type="number" step="0.01" className="mm-input" value={form.lucro4} onChange={(e) => setForm({ ...form, lucro4: e.target.value })} /></div>
              <div>
                <label className="mm-label">Margem Selecionada</label>
                <select className="mm-input" value={form.selecionada} onChange={(e) => setForm({ ...form, selecionada: e.target.value })}>
                  <option value="1">Lucro 1</option><option value="2">Lucro 2</option><option value="3">Lucro 3</option><option value="4">Lucro 4</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button data-testid="markup-add-btn" className="mm-btn-3d" onClick={submit}><Plus size={16} className="inline mr-1" />{editId ? "Atualizar" : "Adicionar"}</button>
          <button className="mm-btn-3d secondary" onClick={() => { setForm({ grupo: "INDICE", indice: 0, lucro1: 0, lucro2: 0, lucro3: 0, lucro4: 0, selecionada: 1 }); setEditId(null); }}><Eraser size={16} className="inline mr-1" />Limpar</button>
        </div>
      </div>

      {/* Indices */}
      <div className="mm-glass overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8DDD3] flex items-center justify-between">
          <h3 className="font-display text-xl text-[#3D2817]">1. Índices (Deduções)</h3>
          <div className="text-sm font-bold text-[#8B5E48]">Total: {fmtBR(totalIndices)}%</div>
        </div>
        <div className="overflow-x-auto">
          <table className="mm-table">
            <thead><tr><th>Descrição</th><th>Índice (%)</th><th>Ações</th></tr></thead>
            <tbody>
              {indices.length === 0 && <tr><td colSpan="3" className="text-center italic py-6 text-[#8B5E48]">Nenhum</td></tr>}
              {indices.map((it) => (
                <tr key={it.id}>
                  <td>{it.descricao}</td>
                  <td>{fmtBR(it.indice)}%</td>
                  <td>
                    <button onClick={() => { setForm(it); setEditId(it.id); }} className="text-[#8B5E48] mr-2"><Pencil size={16}/></button>
                    <button onClick={() => del(it.id)} className="text-[#B85450]"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lucros */}
      <div className="mm-glass overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8DDD3]">
          <h3 className="font-display text-xl text-[#3D2817]">2. Margens de Lucro</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="mm-table">
            <thead><tr><th>Descrição</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>Selecionada</th><th>Ações</th></tr></thead>
            <tbody>
              {lucros.length === 0 && <tr><td colSpan="7" className="text-center italic py-6 text-[#8B5E48]">Nenhum</td></tr>}
              {lucros.map((it) => (
                <tr key={it.id}>
                  <td>{it.descricao}</td>
                  <td>{fmtBR(it.lucro1)}%</td>
                  <td>{fmtBR(it.lucro2)}%</td>
                  <td>{fmtBR(it.lucro3)}%</td>
                  <td>{fmtBR(it.lucro4)}%</td>
                  <td>L{it.selecionada}</td>
                  <td>
                    <button onClick={() => { setForm(it); setEditId(it.id); }} className="text-[#8B5E48] mr-2"><Pencil size={16}/></button>
                    <button onClick={() => del(it.id)} className="text-[#B85450]"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
