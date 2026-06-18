import { useEffect, useState } from "react";
import api from "@/lib/api";
import CrudShell from "./CrudShell";

export default function Produtos() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);

  const load = async () => {
    const [{ data }, { data: gr }] = await Promise.all([
      api.get("/produtos"),
      api.get("/groups?tipo=produto"),
    ]);
    setItems(data);
    setGroups(gr);
  };
  useEffect(() => { load(); }, []);

  const fields = [
    { name: "codigo", label: "Código" },
    { name: "descricao", label: "Descrição", colSpan: 2 },
    { name: "unidade", label: "Unidade" },
    { name: "status", label: "Status", options: [{ value: "ATIVO", label: "Ativo" }, { value: "SUSPENSO", label: "Suspenso" }] },
    { name: "grupo_id", label: "Grupo" },
  ];

  return (
    <CrudShell
      title="Produtos"
      testIdPrefix="prod"
      items={items}
      fields={fields}
      groups={groups}
      onCreateGroup={async (nome) => { await api.post("/groups", { tipo: "produto", nome }); await load(); }}
      onSave={async (payload, id) => id ? api.put(`/produtos/${id}`, payload) : api.post("/produtos", payload)}
      onDelete={(id) => api.delete(`/produtos/${id}`)}
      onReload={load}
    />
  );
}
