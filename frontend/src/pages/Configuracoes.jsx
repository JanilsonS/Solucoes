import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Save, RotateCcw, MessageCircle } from "lucide-react";
import { buildMessage, DEFAULT_TEMPLATE } from "@/lib/whatsapp";

const TOKENS = [
  ["{cliente}", "Nome do cliente"],
  ["{numero}", "Nº do pedido (001)"],
  ["{itens}", "Lista de produtos"],
  ["{outros}", "Itens 'Outros' (taxa, etc.)"],
  ["{total}", "Total do pedido"],
  ["{entrega}", "Data e hora de entrega"],
  ["{endereco}", "Endereço de entrega"],
  ["{forma_pagamento}", "Forma de pagamento"],
];

const SAMPLE = {
  cliente_nome: "Maria Silva", numero: 1, cliente_telefone: "47999990000",
  forma_pagamento: "PIX", data_entrega: "2026-07-05", hora_entrega: "15:00",
  endereco_entrega: "Rua das Flores, 123 - Centro", total: 185.5,
  itens: [{ descricao: "Bolo de Chocolate", quantidade: 1 }, { descricao: "Brigadeiro Gourmet", quantidade: 50 }],
  outros: [{ descricao: "Taxa de Entrega", valor: 20 }],
};

export default function Configuracoes() {
  const [template, setTemplate] = useState("");

  const load = async () => { const { data } = await api.get("/config"); setTemplate(data.whatsapp_template || DEFAULT_TEMPLATE); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    await api.put("/config", { whatsapp_template: template });
    toast.success("Mensagem do WhatsApp salva!");
  };
  const reset = () => { setTemplate(DEFAULT_TEMPLATE); toast.info("Modelo padrão restaurado (clique em Salvar para aplicar)"); };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl text-[#3D2817]">Configurações</h1>
        <p className="text-[#8B5E48] italic text-sm">Personalize as mensagens e parâmetros do sistema</p>
      </header>

      <div className="mm-card-glow">
        <h2 className="font-display text-xl text-[#3D2817] flex items-center gap-2 mb-1"><MessageCircle size={20} className="text-[#25D366]" /> Mensagem do WhatsApp</h2>
        <p className="text-[#8B5E48] text-sm mb-4">Edite o texto enviado ao clicar no botão WhatsApp dos pedidos. Use os marcadores abaixo — eles são substituídos automaticamente pelos dados de cada pedido.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="mm-label">Modelo da mensagem</label>
            <textarea data-testid="wa-template-input" className="mm-input font-mono text-sm" rows={14} value={template} onChange={(e) => setTemplate(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button data-testid="wa-save-btn" className="mm-btn-3d flex items-center gap-1" onClick={save}><Save size={16} /> Salvar</button>
              <button data-testid="wa-reset-btn" className="mm-btn-3d secondary flex items-center gap-1" onClick={reset}><RotateCcw size={16} /> Restaurar padrão</button>
            </div>
            <div className="mt-4">
              <div className="mm-label mb-1">Marcadores disponíveis:</div>
              <div className="flex flex-wrap gap-2">
                {TOKENS.map(([t, desc]) => (
                  <button key={t} title={desc} className="text-xs bg-[#F5EBE0] hover:bg-[#EAD9C5] border border-[#E0C9B0] rounded-full px-2 py-1 font-mono text-[#8B5E48]" onClick={() => setTemplate((prev) => prev + t)}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mm-label">Pré-visualização</label>
            <div data-testid="wa-preview" className="rounded-2xl p-4 whitespace-pre-wrap text-sm" style={{ background: "#E5DDD5", minHeight: 360 }}>
              <div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-3 shadow-sm text-[#1f2c33] max-w-[95%] ml-auto">{buildMessage(SAMPLE, template)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
