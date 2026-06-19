import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Eraser, FileSpreadsheet, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { fmtBR, exportCSV, exportPDF } from "@/lib/format";

/**
 * Reusable CRUD shell page.
 * fields: [{name, label, type, decimals, options, readonly}]
 * compute(item): optional computed columns
 * onSave(item): persist
 * onDelete(id)
 */
export default function CrudShell({
  title,
  testIdPrefix,
  items,
  fields,
  onSave,
  onDelete,
  onReload,
  groups,
  groupType,
  onCreateGroup,
  computedCols = [],
  extraSummary = null,
  autoCodeType = null,
}) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [colFilters, setColFilters] = useState({});
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Auto-fetch next code when starting new
  const fetchNextCode = async () => {
    if (!autoCodeType) return;
    try {
      const api = (await import("@/lib/api")).default;
      const { data } = await api.get(`/next-code/${autoCodeType}`);
      setForm((f) => ({ ...f, codigo: data.codigo }));
    } catch {}
  };

  useEffect(() => {
    if (!editingId && autoCodeType && !form.codigo) fetchNextCode();
  }, [editingId, items.length]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((it) => Object.values(it).some((v) => String(v ?? "").toLowerCase().includes(s)));
    }
    Object.entries(colFilters).forEach(([k, v]) => {
      if (v) {
        const sv = v.toLowerCase();
        result = result.filter((it) => {
          let val = it[k];
          if (k === "grupo_id" && groups) val = groups.find((g) => g.id === val)?.nome || "";
          return String(val ?? "").toLowerCase().includes(sv);
        });
      }
    });
    return result;
  }, [items, search, colFilters, groups]);

  const clearForm = async () => {
    setForm({});
    setEditingId(null);
    if (autoCodeType) await fetchNextCode();
  };

  const handleSubmit = async () => {
    try {
      // Build payload converting types
      const payload = {};
      for (const f of fields) {
        let v = form[f.name];
        if (f.type === "number") v = v === "" || v === undefined ? 0 : Number(v);
        payload[f.name] = v;
      }
      await onSave(payload, editingId);
      toast.success(editingId ? "Atualizado!" : "Adicionado!");
      clearForm();
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir item?")) return;
    try {
      await onDelete(id);
      toast.success("Excluído!");
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir");
    }
  };

  const handleEdit = (it) => {
    setForm({ ...it });
    setEditingId(it.id);
  };

  const exportHeaders = [
    ...fields.filter((f) => !f.hideInTable).map((f) => ({
      label: f.label,
      value: (r) => {
        let v = r[f.name];
        if (f.type === "number") v = fmtBR(v, f.decimals ?? 2);
        if (f.options) v = f.options.find((o) => o.value === v)?.label || v;
        if (f.name === "grupo_id" && groups) v = groups.find((g) => g.id === v)?.nome || "";
        return v;
      },
    })),
    ...computedCols.map((c) => ({ label: c.label, value: (r) => fmtBR(c.value(r), c.decimals ?? 2) })),
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">{title}</h1>
          <p className="text-[#8B5E48] italic text-sm">Cadastro e gestão</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5E48]" />
            <input
              data-testid={`${testIdPrefix}-search`}
              className="mm-input pl-9 w-64"
              placeholder="Pesquisa rápida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            data-testid={`${testIdPrefix}-export-excel`}
            className="mm-btn-3d secondary flex items-center gap-1"
            onClick={() => exportCSV(filtered, exportHeaders, `${title}.csv`)}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            data-testid={`${testIdPrefix}-export-pdf`}
            className="mm-btn-3d secondary flex items-center gap-1"
            onClick={() => exportPDF(title, exportHeaders, filtered)}
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </header>

      {/* Form */}
      <div className="mm-card-glow">
        <h3 className="font-display text-xl text-[#3D2817] mb-3">
          {editingId ? "Editar Item" : "Novo Item"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fields.map((f) => (
            <div key={f.name} className={f.colSpan ? `lg:col-span-${f.colSpan}` : ""}>
              <label className="mm-label">{f.label}</label>
              {f.options ? (
                <select
                  data-testid={`${testIdPrefix}-input-${f.name}`}
                  className="mm-input"
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                >
                  <option value="">--</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.name === "grupo_id" && groups ? (
                <div className="flex gap-1">
                  <select
                    data-testid={`${testIdPrefix}-input-grupo_id`}
                    className="mm-input"
                    value={form.grupo_id ?? ""}
                    onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
                  >
                    <option value="">--</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                  <button
                    type="button"
                    data-testid={`${testIdPrefix}-add-group-btn`}
                    onClick={() => setShowGroupModal(true)}
                    className="mm-btn-3d secondary text-xs px-2"
                    title="Novo grupo"
                  >+</button>
                </div>
              ) : (
                <input
                  data-testid={`${testIdPrefix}-input-${f.name}`}
                  type={f.type === "number" ? "number" : "text"}
                  step={f.type === "number" ? (f.decimals === 4 ? "0.0001" : "0.01") : undefined}
                  className="mm-input"
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button data-testid={`${testIdPrefix}-add-btn`} className="mm-btn-3d" onClick={handleSubmit}>
            <Plus size={16} className="inline mr-1" />{editingId ? "Atualizar" : "Adicionar"}
          </button>
          <button data-testid={`${testIdPrefix}-clear-btn`} className="mm-btn-3d secondary" onClick={clearForm}>
            <Eraser size={16} className="inline mr-1" />Limpar
          </button>
        </div>
      </div>

      {extraSummary}

      {/* Table */}
      <div className="mm-glass overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="mm-table">
            <thead>
              <tr>
                {fields.filter((f) => !f.hideInTable).map((f) => <th key={f.name}>{f.label}</th>)}
                {computedCols.map((c) => <th key={c.label}>{c.label}</th>)}
                <th style={{ width: 110 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={fields.length + computedCols.length + 1} className="text-center italic py-8 text-[#8B5E48]">Nenhum item cadastrado</td></tr>
              )}
              {filtered.map((it) => (
                <tr key={it.id} data-testid={`${testIdPrefix}-row-${it.id}`}>
                  {fields.filter((f) => !f.hideInTable).map((f) => (
                    <td key={f.name} className={f.type === "number" ? "num" : ""}>
                      {(() => {
                        let v = it[f.name];
                        if (f.type === "number") return fmtBR(v, f.decimals ?? 2);
                        if (f.options) return f.options.find((o) => o.value === v)?.label || v;
                        if (f.name === "grupo_id" && groups) return groups.find((g) => g.id === v)?.nome || "—";
                        return v ?? "";
                      })()}
                    </td>
                  ))}
                  {computedCols.map((c) => <td key={c.label} className="num">{fmtBR(c.value(it), c.decimals ?? 2)}</td>)}
                  <td>
                    <button
                      data-testid={`${testIdPrefix}-edit-${it.id}`}
                      onClick={() => handleEdit(it)}
                      className="text-[#8B5E48] hover:text-[#3D2817] mr-2"
                    ><Pencil size={16} /></button>
                    <button
                      data-testid={`${testIdPrefix}-delete-${it.id}`}
                      onClick={() => handleDelete(it.id)}
                      className="text-[#B85450] hover:text-red-800"
                    ><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="mm-glass p-6 w-96">
            <h3 className="font-display text-xl text-[#3D2817] mb-3">Novo Grupo</h3>
            <input
              className="mm-input mb-3"
              data-testid={`${testIdPrefix}-group-name-input`}
              placeholder="Nome do grupo"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="mm-btn-3d secondary" onClick={() => { setShowGroupModal(false); setNewGroupName(""); }}>Cancelar</button>
              <button
                className="mm-btn-3d"
                data-testid={`${testIdPrefix}-group-save-btn`}
                onClick={async () => {
                  if (!newGroupName) return;
                  await onCreateGroup(newGroupName);
                  setShowGroupModal(false);
                  setNewGroupName("");
                }}
              >Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
