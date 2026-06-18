import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText } from "lucide-react";
import { fmtBR, fmtMoney, exportPDF } from "@/lib/format";

export default function DRE() {
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState({ inicio: "", fim: "" });

  const load = async () => {
    const params = {};
    if (periodo.inicio) params.data_inicio = new Date(periodo.inicio).toISOString();
    if (periodo.fim) params.data_fim = new Date(periodo.fim + "T23:59:59").toISOString();
    const { data } = await api.get("/dre", { params });
    setData(data);
  };
  useEffect(() => { load(); }, []);

  const exportarPDF = () => {
    if (!data) return;
    const rows = [];
    rows.push({ a: "RECEITA FATURADA", b: "", c: fmtMoney(data.receita_faturada.total), bold: true });
    Object.entries(data.receita_faturada.produtos_por_grupo).forEach(([grupo, prods]) => {
      rows.push({ a: `  ${grupo}`, b: "", c: "", bold: true });
      Object.entries(prods).forEach(([p, v]) => rows.push({ a: `    ${p}`, b: "", c: fmtMoney(v) }));
    });
    if (data.receita_faturada.receita_comercial_total > 0) {
      rows.push({ a: "  Receita Comercial", b: "", c: fmtMoney(data.receita_faturada.receita_comercial_total), bold: true });
      Object.entries(data.receita_faturada.receita_comercial).forEach(([k, v]) => rows.push({ a: `    ${k}`, b: "", c: fmtMoney(v) }));
    }
    rows.push({ a: "(-) DEDUÇÕES", b: "", c: fmtMoney(-data.deducoes.total), bold: true });
    data.deducoes.detalhe.forEach((d) => rows.push({ a: `    ${d.descricao}`, b: `${fmtBR(d.indice)}%`, c: fmtMoney(-d.valor) }));
    rows.push({ a: "(=) RECEITA LÍQUIDA", b: "", c: fmtMoney(data.receita_liquida), bold: true });
    rows.push({ a: "(-) CPV", b: "", c: fmtMoney(-data.cpv.total), bold: true });
    Object.entries(data.cpv.detalhe).forEach(([k, v]) => rows.push({ a: `    ${k.replace("_", " ")}`, b: "", c: fmtMoney(-v) }));
    rows.push({ a: "(=) RESULTADO BRUTO", b: "", c: fmtMoney(data.resultado_bruto), bold: true });
    const headers = [
      { label: "Descrição", value: (r) => r.bold ? `<b>${r.a}</b>` : r.a, render: (r) => r.bold ? `<b>${r.a}</b>` : r.a },
      { label: "%", value: (r) => r.b },
      { label: "Valor", value: (r) => r.bold ? `<b>${r.c}</b>` : r.c, render: (r) => r.bold ? `<b>${r.c}</b>` : r.c },
    ];
    exportPDF("Demonstrativo de Resultado", headers, rows);
  };

  if (!data) return <div className="text-[#8B5E48]">Carregando...</div>;

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817]">Demonstrativo de Resultado</h1>
          <p className="text-[#8B5E48] italic text-sm">Período • {new Date(data.periodo.inicio).toLocaleDateString("pt-BR")} a {new Date(data.periodo.fim).toLocaleDateString("pt-BR")}</p>
        </div>
        <button data-testid="dre-pdf-btn" className="mm-btn-3d secondary flex items-center gap-1" onClick={exportarPDF}><FileText size={16}/>PDF</button>
      </header>

      <div className="mm-card-glow grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><label className="mm-label">Data Início</label><input data-testid="dre-inicio" type="date" className="mm-input" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} /></div>
        <div><label className="mm-label">Data Fim</label><input data-testid="dre-fim" type="date" className="mm-input" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></div>
        <div className="flex items-end"><button data-testid="dre-buscar-btn" className="mm-btn-3d w-full" onClick={load}>Aplicar Filtro</button></div>
      </div>

      <div className="mm-glass overflow-hidden">
        <table className="mm-table">
          <thead><tr><th>Descrição</th><th style={{ width: 100 }}>%</th><th style={{ width: 180 }} className="text-right">Valor</th></tr></thead>
          <tbody>
            <tr><td className="font-bold text-[#3D2817]">RECEITA FATURADA</td><td></td><td className="font-bold text-right">{fmtMoney(data.receita_faturada.total)}</td></tr>
            {Object.entries(data.receita_faturada.produtos_por_grupo).map(([grupo, prods]) => (
              <>
                <tr key={grupo}><td className="pl-6 font-semibold">{grupo}</td><td></td><td className="text-right">{fmtMoney(Object.values(prods).reduce((a, b) => a + b, 0))}</td></tr>
                {Object.entries(prods).map(([p, v]) => <tr key={`${grupo}-${p}`}><td className="pl-12 text-sm">{p}</td><td></td><td className="text-right text-sm">{fmtMoney(v)}</td></tr>)}
              </>
            ))}
            {data.receita_faturada.receita_comercial_total > 0 && (
              <>
                <tr><td className="pl-6 font-semibold">Receita Comercial</td><td></td><td className="text-right">{fmtMoney(data.receita_faturada.receita_comercial_total)}</td></tr>
                {Object.entries(data.receita_faturada.receita_comercial).map(([k, v]) => <tr key={k}><td className="pl-12 text-sm">{k}</td><td></td><td className="text-right text-sm">{fmtMoney(v)}</td></tr>)}
              </>
            )}
            <tr><td className="font-bold text-[#B85450]">(-) DEDUÇÕES</td><td></td><td className="font-bold text-right text-[#B85450]">-{fmtMoney(data.deducoes.total)}</td></tr>
            {data.deducoes.detalhe.map((d) => <tr key={d.descricao}><td className="pl-6 text-sm">{d.descricao}</td><td className="text-sm">{fmtBR(d.indice)}%</td><td className="text-right text-sm">-{fmtMoney(d.valor)}</td></tr>)}
            <tr style={{ background: "#EFD9C5" }}><td className="font-bold text-[#3D2817]">(=) RECEITA LÍQUIDA</td><td></td><td className="font-bold text-right text-[#3D2817]" data-testid="dre-receita-liq">{fmtMoney(data.receita_liquida)}</td></tr>
            <tr><td className="font-bold text-[#B85450]">(-) CPV (Custo Produtos Vendidos)</td><td></td><td className="font-bold text-right text-[#B85450]">-{fmtMoney(data.cpv.total)}</td></tr>
            {Object.entries(data.cpv.detalhe).map(([k, v]) => <tr key={k}><td className="pl-6 text-sm">{k.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</td><td></td><td className="text-right text-sm">-{fmtMoney(v)}</td></tr>)}
            <tr style={{ background: data.resultado_bruto >= 0 ? "#D4E6C8" : "#F5D1CF" }}><td className="font-bold text-xl text-[#3D2817]">(=) RESULTADO BRUTO</td><td></td><td className="font-bold text-xl text-right" data-testid="dre-resultado">{fmtMoney(data.resultado_bruto)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
