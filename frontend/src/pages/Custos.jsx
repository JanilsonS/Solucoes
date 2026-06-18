import { useEffect, useState } from "react";
import api from "@/lib/api";
import CrudShell from "./CrudShell";

export default function Custos() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);

  const load = async () => {
    const [{ data }, { data: gr }] = await Promise.all([
      api.get("/custos"),
      api.get("/groups?tipo=custo"),
    ]);
    setItems(data);
    setGroups(gr);
  };
  useEffect(() => { load(); }, []);

  const fields = [
    { name: "codigo", label: "Código" },
    { name: "descricao", label: "Descrição", colSpan: 2 },
    { name: "valor_mensal", label: "Valor Mensal (R$)", type: "number", decimals: 2 },
    { name: "horas_mes", label: "Horas/Mês", type: "number", decimals: 2 },
    { name: "grupo_id", label: "Grupo" },
  ];

  return (
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
      computedCols={[{ label: "Custo Hora (R$)", value: (r) => r.custo_hora || 0, decimals: 2 }]}
    />
  );
}
