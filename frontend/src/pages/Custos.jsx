import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";
import CrudShell from "./CrudShell";

export default function Custos() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [horasMes, setHorasMes] = useState(220);

  const load = async () => {
    const [{ data }, { data: gr }, { data: cfg }] = await Promise.all([
      api.get("/custos"),
      api.get("/groups?tipo=custo"),
      api.get("/config"),
    ]);
    setItems(data);
    setGroups(gr);
    setHorasMes(cfg.horas_mes_global ?? 220);
  };
  useEffect(() => { load(); }, []);

  const saveHoras = async () => {
    if (horasMes === "" || isNaN(Number(horasMes)) || Number(horasMes) <= 0) {
      return toast.error("Informe um valor válido de Horas/Mês");
    }
    await api.put("/config", { horas_mes_global: Number(horasMes) });
    toast.success("Horas/Mês global atualizado");
    load();
  };

  const fields = [
    { name: "codigo", label: "Código" },
    { name: "descricao", label: "Descrição", colSpan: 2 },
    { name: "valor_mensal", label: "Valor Mensal (R$)", type: "number", decimals: 2 },
    { name: "grupo_id", label: "Grupo" },
  ];

  return (
    <div className="space-y-4">
      <div className="mm-card-glow flex items-end gap-3 flex-wrap" data-testid="custos-config-horas">
        <div>
          <label className="mm-label flex items-center gap-1"><Clock size={14} /> Horas/Mês (global)</label>
          <input
            data-testid="custos-horas-mes-input"
            type="number"
            step="0.01"
            className="mm-input"
            style={{ width: 140 }}
            value={horasMes}
            onChange={(e) => setHorasMes(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveHoras(); }}
          />
        </div>
        <button data-testid="custos-horas-mes-save" className="mm-btn-3d flex items-center gap-1" onClick={saveHoras}>
          <Save size={16} /> Salvar
        </button>
        <p className="text-[#8B5E48] italic text-xs flex-1 min-w-[200px]">
          Este valor é usado para todas as contas. O Custo/Hora = Valor Mensal ÷ Horas/Mês global.
        </p>
      </div>

      <CrudShell
        title="Contas de Custos"
        testIdPrefix="custos"
        items={items}
        fields={fields}
        groups={groups}
        onCreateGroup={async (nome) => { await api.post("/groups", { tipo: "custo", nome }); await load(); }}
        onSave={async (payload, id) => id ? api.put(`/custos/${id}`, payload) : api.post("/custos", payload)}
        onDelete={(id) => api.delete(`/custos/${id}`)}
        onReload={load}
        autoCodeType="custo"
        computedCols={[{ label: "Custo Hora (R$)", value: (r) => r.custo_hora || 0, decimals: 2 }]}
      />
    </div>
  );
}
