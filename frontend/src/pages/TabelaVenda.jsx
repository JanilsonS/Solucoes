import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText, FileSpreadsheet, ArrowUp, ArrowDown, Minus, Tags } from "lucide-react";
import { fmtBR, fmtMoney, fmtDate, exportPDF, exportCSV } from "@/lib/format";

export default function TabelaVenda() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/tabela-venda").then((r) => setData(r.data)); }, []);
  if (!data) return <div className="text-[#8B5E48]">Carregando...</div>;

  const baseAtual = data.data_base ? fmtDate(data.data_base) : "—";
  const baseAntiga = data.data_base_antiga ? fmtDate(data.data_base_antiga) : "—";

  const headers = [
    { label: "Código", value: (r) => r.codigo },
    { label: "Descrição", value: (r) => r.descricao },
    { label: "Un", value: (r) => r.unidade },
    { label: "% Lucro", value: (r) => `${fmtBR(r.lucro_pct)}%` },
    { label: `Preço Tabela (${baseAtual})`, value: (r) => fmtMoney(r.preco_tabela) },
    { label: `Tabela Antiga (${baseAntiga})`, value: (r) => (r.preco_antigo != null ? fmtMoney(r.preco_antigo) : "—") },
    { label: "Variação", value: (r) => (r.variacao_pct != null ? `${fmtBR(r.variacao_pct)}%` : "—") },
  ];

  const Var = ({ v }) => {
    if (v == null) return <span className="text-[#8B5E48]">—</span>;
    const up = v > 0.001, down = v < -0.001;
    const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
    const cls = up ? "text-[#B85450]" : down ? "text-[#6B8E5A]" : "text-[#8B5E48]";
    return <span className={`inline-flex items-center justify-end gap-1 font-semibold ${cls}`}><Icon size={14} />{fmtBR(Math.abs(v))}%</span>;
  };

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817] flex items-center gap-2"><Tags size={28} className="text-[#C8856A]" />Tabela de Preço de Venda</h1>
          <p className="text-[#8B5E48] italic text-sm">Tabela oficial vigente • Data base: <strong>{baseAtual}</strong>{data.data_base_antiga ? ` • Anterior: ${baseAntiga}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="tv-export-excel" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(data.rows, headers, "tabela-preco-venda.csv")}><FileSpreadsheet size={16} />Excel</button>
          <button data-testid="tv-export-pdf" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF("Tabela de Preço de Venda", headers, data.rows, { extra: `<strong>Data base:</strong> ${baseAtual}` })}><FileText size={16} />PDF</button>
        </div>
      </header>

      {data.rows.length === 0 ? (
        <div className="mm-card-glow text-center italic text-[#8B5E48] py-10" data-testid="tv-empty">
          Nenhuma tabela gerada ainda. Vá em <strong>Precificação</strong> e clique em <strong>"Atualizar Tabela de Venda"</strong>.
        </div>
      ) : (
        <div className="mm-glass overflow-hidden">
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="mm-table" data-testid="tv-table">
              <thead>
                <tr>
                  <th>Código</th><th>Descrição</th><th>Un</th>
                  <th className="text-right">% Lucro</th>
                  <th className="text-right">Preço Tabela<div className="text-[10px] font-normal text-[#C8A47A]">{baseAtual}</div></th>
                  <th className="text-right">Tabela Antiga<div className="text-[10px] font-normal text-[#C8A47A]">{baseAntiga}</div></th>
                  <th className="text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.produto_id} data-testid={`tv-row-${r.codigo}`}>
                    <td className="font-bold">{r.codigo}</td>
                    <td>{r.descricao}</td>
                    <td>{r.unidade}</td>
                    <td className="text-right">{fmtBR(r.lucro_pct)}%</td>
                    <td className="text-right font-semibold text-[#6B8E5A]">{fmtMoney(r.preco_tabela)}</td>
                    <td className="text-right text-[#8B5E48]">{r.preco_antigo != null ? fmtMoney(r.preco_antigo) : "—"}</td>
                    <td className="text-right"><Var v={r.variacao_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
