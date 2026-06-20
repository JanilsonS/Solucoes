import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Boxes, ArrowUpDown, FileSpreadsheet, FileText } from "lucide-react";
import { fmtBR, exportCSV, exportPDF } from "@/lib/format";

export default function Estoques() {
  const [modo, setModo] = useState("todos");
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState({ key: "saldo", dir: "asc" });

  const load = async (m = modo) => { const { data } = await api.get(`/estoques?modo=${m}`); setRows(data.rows); };
  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const headers = [
    { label: "Código", value: (r) => r.codigo }, { label: "Descrição", value: (r) => r.descricao }, { label: "Un", value: (r) => r.unidade },
    { label: "Estoque Atual", value: (r) => fmtBR(r.estoque_atual, 4) }, { label: "Necessidade", value: (r) => fmtBR(r.necessidade, 4) }, { label: "Saldo", value: (r) => fmtBR(r.saldo, 4) },
  ];

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="font-display text-4xl text-[#3D2817] flex items-center gap-2"><Boxes size={28} className="text-[#C8856A]" />Gestão de Estoques</h1><p className="text-[#8B5E48] italic text-sm">Estoque atual x necessidade dos pedidos</p></div>
        <div className="flex gap-2">
          <select data-testid="est-modo" className="mm-input" value={modo} onChange={(e) => { setModo(e.target.value); load(e.target.value); }}>
            <option value="todos">Todos os pedidos</option>
            <option value="producao">Apenas em produção</option>
          </select>
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(sorted, headers, "estoques.csv")}><FileSpreadsheet size={16} />Excel</button>
          <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF("Gestão de Estoques", headers, sorted)}><FileText size={16} />PDF</button>
        </div>
      </header>

      <div className="mm-glass overflow-hidden"><div className="overflow-x-auto max-h-[75vh]">
        <table className="mm-table" data-testid="est-table">
          <thead><tr>
            <th>Código</th><th>Descrição</th><th>Un</th>
            <th className="text-right">Estoque Atual</th><th className="text-right">Necessidade</th>
            <th className="text-right"><button data-testid="est-sort-saldo" className="flex items-center gap-1 ml-auto hover:text-[#C8856A]" onClick={() => toggleSort("saldo")}>Saldo <ArrowUpDown size={12} className={sort.key === "saldo" ? "text-[#C8856A]" : "opacity-40"} /></button></th>
          </tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan="6" className="text-center italic py-8 text-[#8B5E48]">Sem dados</td></tr>}
            {sorted.map((r) => (
              <tr key={r.id} data-testid={`est-row-${r.codigo}`}>
                <td className="font-bold">{r.codigo}</td><td>{r.descricao}</td><td>{r.unidade}</td>
                <td className="text-right">{fmtBR(r.estoque_atual, 4)}</td>
                <td className="text-right">{fmtBR(r.necessidade, 4)}</td>
                <td className={`text-right font-bold ${r.saldo < 0 ? "text-white" : "text-[#6B8E5A]"}`} style={r.saldo < 0 ? { background: "#B85450" } : {}}>{fmtBR(r.saldo, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
