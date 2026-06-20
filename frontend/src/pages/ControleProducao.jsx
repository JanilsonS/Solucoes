import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ChefHat, CalendarClock, MapPin, Phone, Package2 } from "lucide-react";
import { fmtBR } from "@/lib/format";

const PROD_BADGE = {
  FINALIZADO: "bg-green-100 text-green-800",
  EM_PRODUCAO: "bg-blue-100 text-blue-800",
  NA_FILA: "bg-yellow-100 text-yellow-800",
};

const PROD_LABEL = { NA_FILA: "Na fila", EM_PRODUCAO: "Em produção", FINALIZADO: "Finalizado" };

const fmtData = (d) => {
  if (!d) return "Sem data";
  const part = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, dd] = part.split("-");
  return dd ? `${dd}/${m}/${y}` : d;
};

export default function ControleProducao() {
  const [data, setData] = useState(null);

  const load = async () => {
    const { data } = await api.get("/producao");
    setData(data);
  };
  useEffect(() => { load(); }, []);

  if (!data) return <div className="text-[#8B5E48]">Carregando...</div>;

  return (
    <div className="space-y-5" data-testid="producao-page">
      <header>
        <h1 className="font-display text-4xl text-[#3D2817]">Controle de Produção</h1>
        <p className="text-[#8B5E48] italic text-sm">Pedidos não cancelados • {data.ordens.length} ordens de produção</p>
      </header>

      {/* Consolidado */}
      <div className="mm-card-glow">
        <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2 mb-3"><Package2 size={20} /> Resumo de Produção (consolidado)</h2>
        <div className="overflow-x-auto">
          <table className="mm-table">
            <thead><tr><th>Código</th><th>Produto</th><th>Unid.</th><th className="text-right">Qtd. Total</th></tr></thead>
            <tbody>
              {data.consolidado.length === 0 && <tr><td colSpan="4" className="text-center italic py-6 text-[#8B5E48]">Nenhum produto a produzir</td></tr>}
              {data.consolidado.map((c) => (
                <tr key={c.codigo} data-testid={`prod-consol-${c.codigo}`}>
                  <td>{c.codigo}</td>
                  <td className="font-semibold">{c.descricao}</td>
                  <td>{c.unidade}</td>
                  <td className="text-right font-bold text-[#6B8E5A]">{fmtBR(c.quantidade, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ordens por entrega */}
      <h2 className="font-display text-2xl text-[#3D2817] flex items-center gap-2"><CalendarClock size={22} /> Agenda de Entregas</h2>
      {data.ordens.length === 0 && <div className="mm-card-glow text-center italic text-[#8B5E48] py-8">Nenhuma ordem de produção</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.ordens.map((o) => (
          <div key={o.pedido_id} className="mm-card-glow" data-testid={`prod-ordem-${o.numero}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-display text-lg text-[#3D2817]">Pedido #{o.numero} • {o.cliente_nome}</div>
                <div className="text-xs text-[#8B5E48] flex items-center gap-1"><Phone size={12} /> {o.cliente_telefone || "—"}</div>
                {o.cliente_endereco && <div className="text-xs text-[#8B5E48] flex items-center gap-1"><MapPin size={12} /> {o.cliente_endereco}</div>}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${PROD_BADGE[o.producao] || "bg-gray-100"}`}>{PROD_LABEL[o.producao] || "—"}</span>
            </div>
            <div className="text-sm text-[#3D2817] mb-2 flex items-center gap-1 font-semibold">
              <CalendarClock size={14} className="text-[#C8856A]" /> {fmtData(o.data_entrega)}{o.hora_entrega ? ` às ${o.hora_entrega}` : ""}
            </div>
            <table className="mm-table">
              <thead><tr><th>Produto</th><th>Un</th><th className="text-right">Qtd</th></tr></thead>
              <tbody>
                {o.itens.map((it, i) => (
                  <tr key={i}>
                    <td className="flex items-center gap-1"><ChefHat size={13} className="text-[#C8856A]" />{it.descricao}</td>
                    <td>{it.unidade}</td>
                    <td className="text-right font-semibold">{fmtBR(it.quantidade, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
