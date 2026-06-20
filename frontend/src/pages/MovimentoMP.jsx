import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ArrowLeftRight, FileSpreadsheet, FileText } from "lucide-react";
import { fmtBR, fmtMoney, fmtDate, exportCSV, exportPDF } from "@/lib/format";

export default function MovimentoMP() {
  const [mps, setMps] = useState([]);
  const [sel, setSel] = useState("");
  const [params, setParams] = useState({ de: "", ate: "", si_qtd: "", si_val: "" });
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/materias-primas").then((r) => setMps(r.data)); }, []);

  const consultar = async (mid = sel) => {
    if (!mid) return;
    const q = new URLSearchParams({ materia_prima_id: mid });
    if (params.de) q.set("de", params.de);
    if (params.ate) q.set("ate", params.ate);
    if (params.si_qtd !== "") q.set("saldo_inicial_qtd", params.si_qtd);
    if (params.si_val !== "") q.set("saldo_inicial_val", params.si_val);
    const { data } = await api.get(`/movimento-mp?${q.toString()}`);
    setData(data);
  };

  const headers = [
    { label: "Data", value: (r) => fmtDate(r.data) },
    { label: "Qtd Inicial", value: (r) => fmtBR(r.q_inicial, 4) }, { label: "Qtd Entradas", value: (r) => fmtBR(r.q_entrada, 4) },
    { label: "Qtd Saídas", value: (r) => fmtBR(r.q_saida, 4) }, { label: "Qtd Final", value: (r) => fmtBR(r.q_final, 4) },
    { label: "Val Inicial", value: (r) => fmtMoney(r.v_inicial) }, { label: "Val Entradas", value: (r) => fmtMoney(r.v_entrada) },
    { label: "Val Saídas", value: (r) => fmtMoney(r.v_saida) }, { label: "Val Final", value: (r) => fmtMoney(r.v_final) },
  ];

  return (
    <div className="space-y-5">
      <header><h1 className="font-display text-4xl text-[#3D2817] flex items-center gap-2"><ArrowLeftRight size={28} className="text-[#C8856A]" />Movimento de Matéria-Prima</h1><p className="text-[#8B5E48] italic text-sm">Entradas (compras) e saídas (produção) por período</p></header>

      <div className="mm-card-glow flex flex-wrap items-end gap-3">
        <div><label className="mm-label">Matéria-Prima</label><select data-testid="mov-mp-select" className="mm-input" value={sel} onChange={(e) => { setSel(e.target.value); setData(null); }}><option value="">Selecione...</option>{mps.map((m) => <option key={m.id} value={m.id}>{m.codigo} - {m.descricao}</option>)}</select></div>
        <div><label className="mm-label">De</label><input data-testid="mov-de" type="date" className="mm-input" value={params.de} onChange={(e) => setParams({ ...params, de: e.target.value })} /></div>
        <div><label className="mm-label">Até</label><input data-testid="mov-ate" type="date" className="mm-input" value={params.ate} onChange={(e) => setParams({ ...params, ate: e.target.value })} /></div>
        <div><label className="mm-label">Saldo Inicial (qtd)</label><input type="number" step="0.01" className="mm-input text-right" style={{ width: 120 }} value={params.si_qtd} onChange={(e) => setParams({ ...params, si_qtd: e.target.value })} placeholder="auto" /></div>
        <div><label className="mm-label">Saldo Inicial (R$)</label><input type="number" step="0.01" className="mm-input text-right" style={{ width: 120 }} value={params.si_val} onChange={(e) => setParams({ ...params, si_val: e.target.value })} placeholder="auto" /></div>
        <button data-testid="mov-consultar" className="mm-btn-3d" onClick={() => consultar()}>Consultar</button>
      </div>

      {data && (
        <>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-[#3D2817]"><strong>{data.materia_prima.codigo} - {data.materia_prima.descricao}</strong> ({data.materia_prima.unidade}) • Saldo Final: <strong className="text-[#6B8E5A]" data-testid="mov-saldo-final">{fmtBR(data.saldo_final_qtd, 4)} un / {fmtMoney(data.saldo_final_val)}</strong></p>
            <div className="flex gap-2">
              <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportCSV(data.linhas, headers, "movimento-mp.csv")}><FileSpreadsheet size={16} />Excel</button>
              <button className="mm-btn-3d secondary flex items-center gap-1" onClick={() => exportPDF(`Movimento ${data.materia_prima.codigo}`, headers, data.linhas)}><FileText size={16} />PDF</button>
            </div>
          </div>
          <div className="mm-glass overflow-hidden"><div className="overflow-x-auto max-h-[65vh]">
            <table className="mm-table" data-testid="mov-table">
              <thead>
                <tr><th rowSpan="2">Data</th><th colSpan="4" className="text-center bg-[#F5EBE0]">QUANTIDADE</th><th colSpan="4" className="text-center bg-[#EAded0]">VALORES (R$)</th></tr>
                <tr><th className="text-right">Inicial</th><th className="text-right">Entradas</th><th className="text-right">Saídas</th><th className="text-right">Final</th><th className="text-right">Inicial</th><th className="text-right">Entradas</th><th className="text-right">Saídas</th><th className="text-right">Final</th></tr>
              </thead>
              <tbody>
                {data.linhas.length === 0 && <tr><td colSpan="9" className="text-center italic py-6 text-[#8B5E48]">Sem movimentos no período</td></tr>}
                {data.linhas.map((l, i) => (
                  <tr key={i}>
                    <td className="text-right">{fmtDate(l.data)}</td>
                    <td className="text-right">{fmtBR(l.q_inicial, 4)}</td><td className="text-right text-[#6B8E5A]">{fmtBR(l.q_entrada, 4)}</td><td className="text-right text-[#B85450]">{fmtBR(l.q_saida, 4)}</td><td className="text-right font-semibold">{fmtBR(l.q_final, 4)}</td>
                    <td className="text-right">{fmtMoney(l.v_inicial)}</td><td className="text-right text-[#6B8E5A]">{fmtMoney(l.v_entrada)}</td><td className="text-right text-[#B85450]">{fmtMoney(l.v_saida)}</td><td className="text-right font-semibold">{fmtMoney(l.v_final)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </>
      )}
    </div>
  );
}
