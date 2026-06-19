import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { FileText, FileSpreadsheet } from "lucide-react";
import { fmtBR, fmtMoney, exportPDF, exportCSV } from "@/lib/format";

export default function TabelaPreco() {
  const [data, setData] = useState(null);
  const [perda, setPerda] = useState({});
  const [lucroInd, setLucroInd] = useState({});

  const load = async () => {
    const { data } = await api.get("/tabela-precos");
    setData(data);
    const map = {};
    const lucroMap = {};
    data.rows.forEach((r) => { map[r.produto_id] = r.perda_pct; lucroMap[r.produto_id] = r.lucro_pct_individual; });
    setPerda(map);
    setLucroInd(lucroMap);
  };
  useEffect(() => { load(); }, []);

  const updatePerda = async (pid, val) => {
    await api.put(`/produtos/${pid}/perda`, { perda_pct: Number(val) });
    load();
  };

  const updateLucroInd = async (pid, val) => {
    await api.put(`/produtos/${pid}/lucro-individual`, { lucro_pct_individual: Number(val) });
    toast.success("Lucro atualizado");
    load();
  };

  if (!data) return <div className="text-[#8B5E48]">Carregando...</div>;

  const headers = [
    { label: "Código", value: (r) => r.codigo },
    { label: "Descrição", value: (r) => r.descricao },
    { label: "Un", value: (r) => r.unidade },
    { label: "M.Prima", value: (r) => fmtMoney(r.subtotals.materia_prima) },
    { label: "Semi", value: (r) => fmtMoney(r.subtotals.semi_acabado) },
    { label: "Confeito", value: (r) => fmtMoney(r.subtotals.confeito) },
    { label: "Saboriz.", value: (r) => fmtMoney(r.subtotals.saborizacao) },
    { label: "Embal.", value: (r) => fmtMoney(r.subtotals.embalagem) },
    { label: "Equip.", value: (r) => fmtMoney(r.subtotals.tempo_maquina) },
    { label: "Custos", value: (r) => fmtMoney(r.subtotals.custo_indireto) },
    { label: "Total Prod.", value: (r) => fmtMoney(r.custo_producao) },
    { label: "% Perda", value: (r) => `${fmtBR(r.perda_pct)}%` },
    { label: "Custo c/Perda", value: (r) => fmtMoney(r.custo_com_perda) },
    { label: "% Lucro", value: (r) => `${fmtBR(r.lucro_pct_individual)}%` },
    { label: "Preço Tabela", value: (r) => fmtMoney(r.preco_tabela_individual) },
    { label: "Preço L1", value: (r) => fmtMoney(r.precos_finais[0]?.preco || 0) },
    { label: "Preço L2", value: (r) => fmtMoney(r.precos_finais[1]?.preco || 0) },
    { label: "Preço L3", value: (r) => fmtMoney(r.precos_finais[2]?.preco || 0) },
    { label: "Preço L4", value: (r) => fmtMoney(r.precos_finais[3]?.preco || 0) },
  ];

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Tabela de Preço de Venda</h1>
          <p className="text-[#8B5E48] italic text-sm">Apenas produtos ativos • Índices total: {fmtBR(data.total_indices_pct)}%</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="tp-export-excel" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(data.rows, headers, "tabela-precos.csv")}><FileSpreadsheet size={16}/>Excel</button>
          <button data-testid="tp-export-pdf" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF("Tabela de Preço de Venda", headers, data.rows)}><FileText size={16}/>PDF</button>
        </div>
      </header>

      <div className="mm-glass overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="mm-table">
            <thead>
              <tr>
                {headers.map((h) => <th key={h.label}>{h.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && <tr><td colSpan={headers.length} className="text-center italic py-8 text-[#8B5E48]">Nenhum produto ativo</td></tr>}
              {data.rows.map((r) => (
                <tr key={r.produto_id} data-testid={`tp-row-${r.produto_id}`}>
                  <td>{r.codigo}</td>
                  <td>{r.descricao}</td>
                  <td>{r.unidade}</td>
                  <td>{fmtMoney(r.subtotals.materia_prima)}</td>
                  <td>{fmtMoney(r.subtotals.semi_acabado)}</td>
                  <td>{fmtMoney(r.subtotals.confeito)}</td>
                  <td>{fmtMoney(r.subtotals.saborizacao)}</td>
                  <td>{fmtMoney(r.subtotals.embalagem)}</td>
                  <td>{fmtMoney(r.subtotals.tempo_maquina)}</td>
                  <td>{fmtMoney(r.subtotals.custo_indireto)}</td>
                  <td className="font-semibold">{fmtMoney(r.custo_producao)}</td>
                  <td>
                    <input
                      data-testid={`tp-perda-${r.produto_id}`}
                      type="number"
                      step="0.01"
                      className="mm-input"
                      style={{ width: 70, padding: "4px 8px" }}
                      value={perda[r.produto_id] ?? 0}
                      onChange={(e) => setPerda({ ...perda, [r.produto_id]: e.target.value })}
                      onBlur={(e) => updatePerda(r.produto_id, e.target.value)}
                    />
                  </td>
                  <td>{fmtMoney(r.custo_com_perda)}</td>
                  <td>
                    <input
                      data-testid={`tp-lucro-${r.produto_id}`}
                      type="number"
                      step="0.01"
                      className="mm-input"
                      style={{ width: 70, padding: "4px 8px" }}
                      value={lucroInd[r.produto_id] ?? 0}
                      onChange={(e) => setLucroInd({ ...lucroInd, [r.produto_id]: e.target.value })}
                      onBlur={(e) => updateLucroInd(r.produto_id, e.target.value)}
                    />
                  </td>
                  <td className="text-[#8B5E48] font-bold">{fmtMoney(r.preco_tabela_individual)}</td>
                  {r.precos_finais.map((p, i) => <td key={i} className="text-[#6B8E5A] font-semibold">{fmtMoney(p.preco)}</td>)}
                  {Array.from({ length: 4 - r.precos_finais.length }).map((_, i) => <td key={`e${i}`}>—</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
