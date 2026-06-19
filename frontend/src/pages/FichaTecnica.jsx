import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, FileText, FileSpreadsheet, Eraser } from "lucide-react";
import { fmtBR, fmtMoney, exportPDF, exportCSV } from "@/lib/format";

const TIPOS = [
  { key: "materia_prima", label: "Matéria-Prima", source: "mp" },
  { key: "confeito", label: "Confeitos", source: "mp" },
  { key: "saborizacao", label: "Saborização", source: "mp" },
  { key: "embalagem", label: "Embalagens", source: "mp" },
  { key: "semi_acabado", label: "Semiacabados", source: "produto" },
  { key: "tempo_maquina", label: "Tempo Máquina", source: "equip" },
  { key: "custo_indireto", label: "Custos Indiretos", source: "custo" },
];

export default function FichaTecnica() {
  const [produtos, setProdutos] = useState([]);
  const [selProd, setSelProd] = useState("");
  const [ficha, setFicha] = useState(null);
  const [tab, setTab] = useState("materia_prima");
  const [mp, setMp] = useState([]);
  const [equip, setEquip] = useState([]);
  const [custos, setCustos] = useState([]);
  const [groupsCusto, setGroupsCusto] = useState([]);
  const [markupsLucro, setMarkupsLucro] = useState([]);
  const [newItem, setNewItem] = useState({ ref_id: "", quantidade: 0, ref_tipo: "conta" });

  const loadBase = async () => {
    const [p, m, e, c, gc, ml] = await Promise.all([
      api.get("/produtos?status_f=ATIVO"),
      api.get("/materias-primas"),
      api.get("/equipamentos"),
      api.get("/custos"),
      api.get("/groups?tipo=custo"),
      api.get("/markups"),
    ]);
    setProdutos(p.data); setMp(m.data); setEquip(e.data.items); setCustos(c.data); setGroupsCusto(gc.data);
    setMarkupsLucro(ml.data.filter((x) => x.grupo === "LUCRO"));
  };
  useEffect(() => { loadBase(); }, []);

  const loadFicha = async (pid) => {
    if (!pid) { setFicha(null); return; }
    const { data } = await api.get(`/fichas-tecnicas/${pid}`);
    setFicha(data);
  };

  const addItem = async () => {
    if (!selProd || !newItem.ref_id) return toast.error("Selecione produto e item");
    const items = (ficha?.items || []).map((i) => ({ tipo: i.tipo, ref_id: i.ref_id, ref_tipo: i.ref_tipo, quantidade: i.quantidade }));
    items.push({ tipo: tab, ref_id: newItem.ref_id, ref_tipo: tab === "custo_indireto" ? newItem.ref_tipo : "conta", quantidade: Number(newItem.quantidade) });
    await save(items);
    setNewItem({ ref_id: "", quantidade: 0, ref_tipo: "conta" });
  };

  const save = async (items, extra = {}) => {
    const payload = {
      produto_id: selProd,
      peso_total: ficha?.peso_total || 0,
      margem_lucro_idx: ficha?.margem_lucro_idx || 1,
      markup_lucro_id: ficha?.markup_lucro_id || null,
      items,
      ...extra,
    };
    const { data } = await api.put(`/fichas-tecnicas/${selProd}`, payload);
    setFicha(data);
    toast.success("Salvo!");
  };

  const removeItem = async (idx) => {
    const items = ficha.items.filter((_, i) => i !== idx).map((i) => ({ tipo: i.tipo, ref_id: i.ref_id, ref_tipo: i.ref_tipo, quantidade: i.quantidade }));
    await save(items);
  };

  const updateMeta = async (field, value) => {
    const items = ficha.items.map((i) => ({ tipo: i.tipo, ref_id: i.ref_id, ref_tipo: i.ref_tipo, quantidade: i.quantidade }));
    await save(items, { [field]: value });
  };

  const sourceOptions = () => {
    if (tab === "semi_acabado") return produtos.filter((p) => p.id !== selProd).map((p) => ({ value: p.id, label: `${p.codigo} - ${p.descricao}` }));
    if (tab === "tempo_maquina") return equip.map((p) => ({ value: p.id, label: `${p.codigo} - ${p.descricao}` }));
    if (tab === "custo_indireto") {
      const opts = newItem.ref_tipo === "grupo"
        ? groupsCusto.map((g) => ({ value: g.id, label: `[Grupo] ${g.nome}` }))
        : custos.map((c) => ({ value: c.id, label: `${c.codigo} - ${c.descricao}` }));
      return opts;
    }
    return mp.map((p) => ({ value: p.id, label: `${p.codigo} - ${p.descricao}` }));
  };

  const itemsTab = ficha?.items?.filter((i) => i.tipo === tab) || [];
  const prodSelecionado = produtos.find((p) => p.id === selProd);

  const exportFichaPDF = () => {
    if (!ficha || !prodSelecionado) return;
    const rows = [];
    TIPOS.forEach((t) => {
      const subItems = ficha.items.filter((i) => i.tipo === t.key);
      if (subItems.length === 0) return;
      rows.push({ group: t.label, code: "", desc: "", unit: "", qty: "", cunit: "", ctot: "" });
      subItems.forEach((i) => rows.push({ group: "", code: i.codigo || "", desc: i.descricao, unit: i.unidade, qty: fmtBR(i.quantidade, 4), cunit: fmtBR(i.custo_unit, 4), ctot: fmtMoney(i.custo_total) }));
      rows.push({ group: "Subtotal", code: "", desc: "", unit: "", qty: "", cunit: "", ctot: fmtMoney(ficha.subtotals[t.key]) });
    });
    const headers = [
      { label: "Grupo", value: (r) => r.group },
      { label: "Código", value: (r) => r.code },
      { label: "Descrição", value: (r) => r.desc },
      { label: "Unid.", value: (r) => r.unit },
      { label: "Qtd", value: (r) => r.qty },
      { label: "Custo Unit", value: (r) => r.cunit },
      { label: "Custo Total", value: (r) => r.ctot },
    ];
    const extra = `<strong>Produto:</strong> ${prodSelecionado.codigo} - ${prodSelecionado.descricao}<br/>
      <strong>Peso Total:</strong> ${fmtBR(ficha.peso_total, 4)} ${prodSelecionado.unidade}<br/>
      <strong>Custo Total:</strong> ${fmtMoney(ficha.total_custo)}<br/>
      <strong>Custo por Unidade:</strong> ${fmtMoney(ficha.custo_por_unidade)}<br/>
      <strong>Preço Recomendado:</strong> ${fmtMoney(ficha.preco_recomendado)}`;
    exportPDF(`Ficha Técnica - ${prodSelecionado.descricao}`, headers, rows, { extra });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Ficha Técnica</h1>
          <p className="text-[#8B5E48] italic text-sm">Insumos e processos por produto</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="ficha-export-pdf" className="mm-btn-3d secondary flex items-center gap-1" onClick={exportFichaPDF}><FileText size={16}/>PDF</button>
        </div>
      </header>

      <div className="mm-card-glow grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="mm-label">Produto</label>
          <select data-testid="ficha-produto-select" className="mm-input" value={selProd} onChange={(e) => { setSelProd(e.target.value); loadFicha(e.target.value); }}>
            <option value="">Selecione...</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo} - {p.descricao}</option>)}
          </select>
        </div>
        {ficha && (
          <>
            <div>
              <label className="mm-label">Peso Total</label>
              <input data-testid="ficha-peso-total" type="number" step="0.0001" className="mm-input" value={ficha.peso_total} onChange={(e) => setFicha({ ...ficha, peso_total: Number(e.target.value) })} onBlur={(e) => updateMeta("peso_total", Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mm-label">Markup Lucro</label>
                <select className="mm-input" value={ficha.markup_lucro_id || ""} onChange={(e) => { const v = e.target.value || null; setFicha({ ...ficha, markup_lucro_id: v }); updateMeta("markup_lucro_id", v); }}>
                  <option value="">--</option>
                  {markupsLucro.map((m) => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="mm-label">Margem</label>
                <select className="mm-input" value={ficha.margem_lucro_idx} onChange={(e) => { const v = Number(e.target.value); setFicha({ ...ficha, margem_lucro_idx: v }); updateMeta("margem_lucro_idx", v); }}>
                  {[1, 2, 3, 4].map((i) => (
                    <option key={i} value={i}>{`Lucro ${i} (${fmtBR(ficha.lucros_disponiveis?.[i - 1] || 0)}%)`}</option>
                  ))}
                  <option value="5">{`Tabela de Preço (${fmtBR(ficha.lucro_individual_pct || 0)}%)`}</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {ficha && (
        <>
          <div className="mm-card-glow grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div><div className="text-xs text-[#8B5E48] uppercase">Custo Total</div><div className="text-lg font-bold text-[#3D2817]" data-testid="ficha-custo-total">{fmtMoney(ficha.total_custo)}</div></div>
            <div><div className="text-xs text-[#8B5E48] uppercase">Custo/Unid</div><div className="text-lg font-bold text-[#3D2817]">{fmtMoney(ficha.custo_por_unidade)}</div></div>
            <div><div className="text-xs text-[#8B5E48] uppercase">% Índices</div><div className="text-lg font-bold text-[#3D2817]">{fmtBR(ficha.total_indices_pct)}%</div></div>
            <div><div className="text-xs text-[#8B5E48] uppercase">% Margem</div><div className="text-lg font-bold text-[#3D2817]">{fmtBR(ficha.margem_lucro_pct)}%</div></div>
            <div><div className="text-xs text-[#8B5E48] uppercase">Preço Recomendado</div><div className="text-lg font-bold text-[#6B8E5A]" data-testid="ficha-preco-recomendado">{fmtMoney(ficha.preco_recomendado)}</div></div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button key={t.key} data-testid={`ficha-tab-${t.key}`} className={`mm-btn-3d ${tab === t.key ? "" : "secondary"}`} onClick={() => { setTab(t.key); setNewItem({ ref_id: "", quantidade: 0, ref_tipo: "conta" }); }}>
                {t.label} ({fmtMoney(ficha.subtotals[t.key])})
              </button>
            ))}
          </div>

          <div className="mm-card-glow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {tab === "custo_indireto" && (
                <div>
                  <label className="mm-label">Tipo</label>
                  <select className="mm-input" value={newItem.ref_tipo} onChange={(e) => setNewItem({ ...newItem, ref_tipo: e.target.value, ref_id: "" })}>
                    <option value="conta">Conta</option><option value="grupo">Grupo</option>
                  </select>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mm-label">Item</label>
                <select data-testid="ficha-item-select" className="mm-input" value={newItem.ref_id} onChange={(e) => setNewItem({ ...newItem, ref_id: e.target.value })}>
                  <option value="">--</option>
                  {sourceOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mm-label">{tab === "tempo_maquina" || tab === "custo_indireto" ? "Tempo (h)" : "Quantidade"}</label>
                <input data-testid="ficha-item-qty" type="number" step="0.0001" className="mm-input" value={newItem.quantidade} onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })} />
              </div>
            </div>
            <button data-testid="ficha-add-item" className="mm-btn-3d mt-3" onClick={addItem}><Plus size={16} className="inline mr-1"/>Adicionar</button>
          </div>

          <div className="mm-glass overflow-hidden">
            <table className="mm-table">
              <thead><tr><th>Código</th><th>Descrição</th><th>Unid.</th><th>Marca</th><th>Quantidade</th><th>Custo Unit</th><th>Custo Total</th><th></th></tr></thead>
              <tbody>
                {itemsTab.length === 0 && <tr><td colSpan="8" className="text-center italic py-6 text-[#8B5E48]">Nenhum item</td></tr>}
                {itemsTab.map((i, idx) => {
                  const realIdx = ficha.items.indexOf(i);
                  return (
                    <tr key={idx}>
                      <td>{i.codigo}</td><td>{i.descricao}</td><td>{i.unidade}</td><td>{i.marca || "—"}</td>
                      <td>{fmtBR(i.quantidade, 4)}</td>
                      <td>{fmtBR(i.custo_unit, 4)}</td>
                      <td>{fmtMoney(i.custo_total)}</td>
                      <td><button onClick={() => removeItem(realIdx)} className="text-[#B85450]"><Trash2 size={16}/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
