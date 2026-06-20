import { useEffect, useState } from "react";
import api from "@/lib/api";
import CrudShell from "./CrudShell";

export default function MateriaPrima() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);

  const load = async () => {
    const [{ data: mp }, { data: gr }] = await Promise.all([
      api.get("/materias-primas"),
      api.get("/groups?tipo=materia_prima"),
    ]);
    setItems(mp);
    setGroups(gr);
  };
  useEffect(() => { load(); }, []);

  const fields = [
    { name: "codigo", label: "Código" },
    { name: "descricao", label: "Descrição", colSpan: 2 },
    { name: "unidade", label: "Unidade" },
    { name: "marca", label: "Marca" },
    { name: "fornecedor", label: "Fornecedor" },
    { name: "estoque_inicial_qtd", label: "Estoque Inicial (Qtd)", type: "number", decimals: 2 },
    { name: "estoque_inicial_val", label: "Valor Inicial (R$)", type: "number", decimals: 2 },
    { name: "grupo_id", label: "Grupo" },
  ];

  return (
    <CrudShell
      title="Matéria-Prima"
      testIdPrefix="mp"
      items={items}
      fields={fields}
      groups={groups}
      groupType="materia_prima"
      onCreateGroup={async (nome) => { await api.post("/groups", { tipo: "materia_prima", nome }); await load(); }}
      onSave={async (payload, id) => id ? api.put(`/materias-primas/${id}`, payload) : api.post("/materias-primas", payload)}
      onDelete={(id) => api.delete(`/materias-primas/${id}`)}
      onReload={load}
      autoCodeType="materia_prima"
      computedCols={[
        { label: "Qtd Estoque", value: (r) => r.quantidade || 0, decimals: 2 },
        { label: "Custo Total", value: (r) => r.custo_total || 0, decimals: 2 },
        { label: "Custo Unit.", value: (r) => r.custo_unitario || 0, decimals: 4 },
      ]}
    />
  );
}
