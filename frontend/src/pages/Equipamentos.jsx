import { useEffect, useState } from "react";
import api from "@/lib/api";
import CrudShell from "./CrudShell";
import { fmtMoney } from "@/lib/format";

export default function Equipamentos() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);

  const load = async () => {
    const [{ data }, { data: gr }] = await Promise.all([
      api.get("/equipamentos"),
      api.get("/groups?tipo=equipamento"),
    ]);
    setItems(data.items);
    setTotal(data.total_valor_compra);
    setGroups(gr);
  };
  useEffect(() => { load(); }, []);

  const fields = [
    { name: "codigo", label: "Código" },
    { name: "descricao", label: "Descrição", colSpan: 2 },
    { name: "unidade", label: "Unidade" },
    { name: "quantidade", label: "Quantidade", type: "number", decimals: 2 },
    { name: "valor_compra", label: "Valor Compra (R$)", type: "number", decimals: 2 },
    { name: "meses", label: "Meses", type: "number", decimals: 0 },
    { name: "horas_mes", label: "Horas/Mês", type: "number", decimals: 0 },
    { name: "grupo_id", label: "Grupo" },
  ];

  const summary = (
    <div className="mm-card-glow flex items-center gap-3">
      <span className="text-sm uppercase font-bold text-[#8B5E48]">Total Valor de Compra:</span>
      <span className="text-2xl font-bold text-[#3D2817]" data-testid="eq-total-compra">{fmtMoney(total)}</span>
    </div>
  );

  return (
    <CrudShell
      title="Equipamentos"
      testIdPrefix="eq"
      items={items}
      fields={fields}
      groups={groups}
      onCreateGroup={async (nome) => { await api.post("/groups", { tipo: "equipamento", nome }); await load(); }}
      onSave={async (payload, id) => id ? api.put(`/equipamentos/${id}`, payload) : api.post("/equipamentos", payload)}
      onDelete={(id) => api.delete(`/equipamentos/${id}`)}
      onReload={load}
      autoCodeType="equipamento"
      computedCols={[{ label: "Custo Hora (R$)", value: (r) => r.custo_hora || 0, decimals: 2 }]}
      extraSummary={summary}
    />
  );
}
