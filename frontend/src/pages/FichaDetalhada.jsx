import { useEffect, useState, useRef } from "react";
import api, { API } from "@/lib/api";
import { toast } from "sonner";
import { Home, Settings, Clock, CalendarCheck, AlertTriangle, Coffee, Upload, Save, Pencil, Eye, Plus, Trash2, Sparkles } from "lucide-react";
import { fmtBR } from "@/lib/format";

const emptyDet = () => ({
  descricao_pt: "", descricao_en: "", foto_path: "", local: "",
  ingredientes_chave: [], nutricionais: [], estrutura: [],
  crocancia: 50, cremor: 50, suavidade: 50,
  tempo_preparo: "", temp_assamento: "", rendimento: "",
  armazenamento: "", validade_dias: "", alergenos: [], sugestao_servico: [],
});

const token = () => localStorage.getItem("mm_token");

export default function FichaDetalhada() {
  const [produtos, setProdutos] = useState([]);
  const [selProd, setSelProd] = useState("");
  const [det, setDet] = useState(null);
  const [prodInfo, setProdInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get("/produtos?status_f=ATIVO").then(({ data }) => setProdutos(data));
  }, []);

  const loadDet = async (pid) => {
    if (!pid) { setDet(null); setProdInfo(null); return; }
    const { data } = await api.get(`/produtos/${pid}/detalhes`);
    const { produto, produto_id, updated_at, ...rest } = data;
    setProdInfo(produto);
    setDet({ ...emptyDet(), ...rest });
  };

  const save = async () => {
    try {
      await api.put(`/produtos/${selProd}/detalhes`, det);
      toast.success("Ficha detalhada salva!");
      setEditMode(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDet({ ...det, foto_path: data.path });
      toast.success("Foto enviada!");
    } catch (err) { toast.error("Falha no upload"); }
    finally { setUploading(false); }
  };

  // list helpers (textarea, one item per line)
  const listToText = (arr) => (arr || []).join("\n");
  const textToList = (txt) => txt.split("\n").map((s) => s.trim()).filter(Boolean);

  const fotoUrl = det?.foto_path ? `${API}/files/${det.foto_path}?auth=${token()}` : null;

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[#3D2817] flex items-center gap-2"><Sparkles size={28} className="text-[#C8856A]" />Ficha Detalhada Cósmica</h1>
          <p className="text-[#8B5E48] italic text-sm">Rótulo visual do produto</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select data-testid="detalhe-produto-select" className="mm-input" value={selProd} onChange={(e) => { setSelProd(e.target.value); setEditMode(false); loadDet(e.target.value); }}>
            <option value="">Selecione o produto...</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo} - {p.descricao}</option>)}
          </select>
          {det && (
            <>
              <button data-testid="detalhe-toggle-edit" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => setEditMode(!editMode)}>
                {editMode ? <><Eye size={16} />Visualizar</> : <><Pencil size={16} />Editar</>}
              </button>
              {editMode && <button data-testid="detalhe-save" className="mm-btn-3d flex items-center gap-1" onClick={save}><Save size={16} />Salvar</button>}
            </>
          )}
        </div>
      </header>

      {!det && <div className="mm-card-glow text-center italic text-[#8B5E48] py-10">Selecione um produto para ver ou criar a ficha detalhada.</div>}

      {det && editMode && (
        <div className="mm-card-glow space-y-4" data-testid="detalhe-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="mm-label">Descrição (PT)</label><textarea className="mm-input" rows={2} value={det.descricao_pt} onChange={(e) => setDet({ ...det, descricao_pt: e.target.value })} /></div>
            <div><label className="mm-label">Descrição (EN)</label><textarea className="mm-input" rows={2} value={det.descricao_en} onChange={(e) => setDet({ ...det, descricao_en: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="mm-label">Local</label><input className="mm-input" value={det.local} onChange={(e) => setDet({ ...det, local: e.target.value })} placeholder="Cidade, Estado" /></div>
            <div className="md:col-span-2">
              <label className="mm-label">Foto do Produto</label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
                <button data-testid="detalhe-upload-btn" className="mm-btn-3d secondary flex items-center gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload size={16} />{uploading ? "Enviando..." : "Enviar foto"}</button>
                {fotoUrl && <img src={fotoUrl} alt="produto" className="h-12 w-12 object-cover rounded-lg border border-[#E0C9B0]" />}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="mm-label">Ingredientes-chave (um por linha)</label><textarea className="mm-input" rows={5} value={listToText(det.ingredientes_chave)} onChange={(e) => setDet({ ...det, ingredientes_chave: textToList(e.target.value) })} /></div>
            <div><label className="mm-label">Alérgenos (um por linha)</label><textarea className="mm-input" rows={5} value={listToText(det.alergenos)} onChange={(e) => setDet({ ...det, alergenos: textToList(e.target.value) })} /></div>
          </div>

          {/* Nutricionais */}
          <div>
            <div className="flex items-center justify-between mb-1"><label className="mm-label">Valores Nutricionais (por porção)</label>
              <button className="mm-btn-3d secondary text-xs" onClick={() => setDet({ ...det, nutricionais: [...det.nutricionais, { label: "", valor: 0, unidade: "g", max_ref: 100 }] })}><Plus size={12} className="inline" /> Nutriente</button></div>
            {det.nutricionais.map((n, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input className="mm-input flex-1" placeholder="Nutriente" value={n.label} onChange={(e) => { const a = [...det.nutricionais]; a[i] = { ...n, label: e.target.value }; setDet({ ...det, nutricionais: a }); }} />
                <input type="number" className="mm-input" style={{ width: 90 }} placeholder="Valor" value={n.valor} onChange={(e) => { const a = [...det.nutricionais]; a[i] = { ...n, valor: Number(e.target.value) }; setDet({ ...det, nutricionais: a }); }} />
                <input className="mm-input" style={{ width: 70 }} placeholder="Un" value={n.unidade} onChange={(e) => { const a = [...det.nutricionais]; a[i] = { ...n, unidade: e.target.value }; setDet({ ...det, nutricionais: a }); }} />
                <input type="number" className="mm-input" style={{ width: 90 }} placeholder="Máx ref" value={n.max_ref} onChange={(e) => { const a = [...det.nutricionais]; a[i] = { ...n, max_ref: Number(e.target.value) }; setDet({ ...det, nutricionais: a }); }} />
                <button className="text-[#B85450] px-1" onClick={() => setDet({ ...det, nutricionais: det.nutricionais.filter((_, x) => x !== i) })}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>

          {/* Estrutura */}
          <div>
            <div className="flex items-center justify-between mb-1"><label className="mm-label">Estrutura / Camadas</label>
              <button className="mm-btn-3d secondary text-xs" onClick={() => setDet({ ...det, estrutura: [...det.estrutura, { nome: "", nivel: 50 }] })}><Plus size={12} className="inline" /> Camada</button></div>
            {det.estrutura.map((c, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input className="mm-input flex-1" placeholder="Camada" value={c.nome} onChange={(e) => { const a = [...det.estrutura]; a[i] = { ...c, nome: e.target.value }; setDet({ ...det, estrutura: a }); }} />
                <input type="number" className="mm-input" style={{ width: 90 }} placeholder="Nível %" value={c.nivel} onChange={(e) => { const a = [...det.estrutura]; a[i] = { ...c, nivel: Number(e.target.value) }; setDet({ ...det, estrutura: a }); }} />
                <button className="text-[#B85450] px-1" onClick={() => setDet({ ...det, estrutura: det.estrutura.filter((_, x) => x !== i) })}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="mm-label">Crocância (%)</label><input type="number" className="mm-input" value={det.crocancia} onChange={(e) => setDet({ ...det, crocancia: Number(e.target.value) })} /></div>
            <div><label className="mm-label">Cremosidade (%)</label><input type="number" className="mm-input" value={det.cremor} onChange={(e) => setDet({ ...det, cremor: Number(e.target.value) })} /></div>
            <div><label className="mm-label">Suavidade (%)</label><input type="number" className="mm-input" value={det.suavidade} onChange={(e) => setDet({ ...det, suavidade: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="mm-label">Tempo de Preparo</label><input className="mm-input" value={det.tempo_preparo} onChange={(e) => setDet({ ...det, tempo_preparo: e.target.value })} placeholder="2.5h" /></div>
            <div><label className="mm-label">Temp. de Assamento</label><input className="mm-input" value={det.temp_assamento} onChange={(e) => setDet({ ...det, temp_assamento: e.target.value })} placeholder="190°C (12 min)" /></div>
            <div><label className="mm-label">Rendimento</label><input className="mm-input" value={det.rendimento} onChange={(e) => setDet({ ...det, rendimento: e.target.value })} placeholder="12 unidades" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="mm-label">Armazenamento</label><input className="mm-input" value={det.armazenamento} onChange={(e) => setDet({ ...det, armazenamento: e.target.value })} placeholder="Conservar em local fresco (< 8°C)" /></div>
            <div><label className="mm-label">Validade (dias)</label><input className="mm-input" value={det.validade_dias} onChange={(e) => setDet({ ...det, validade_dias: e.target.value })} placeholder="3" /></div>
          </div>
          <div><label className="mm-label">Sugestão de Serviço (uma por linha)</label><textarea className="mm-input" rows={2} value={listToText(det.sugestao_servico)} onChange={(e) => setDet({ ...det, sugestao_servico: textToList(e.target.value) })} /></div>
        </div>
      )}

      {det && !editMode && <CosmicSheet det={det} produto={prodInfo} fotoUrl={fotoUrl} />}
    </div>
  );
}

const Bar = ({ pct, color }) => (
  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }} /></div>
);

const SectionTitle = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 text-[#E8C9A0] font-semibold tracking-wide text-sm uppercase mb-2"><Icon size={16} className="text-[#7FE3D6]" />{children}</div>
);

function CosmicSheet({ det, produto, fotoUrl }) {
  return (
    <div
      data-testid="cosmic-sheet"
      className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden"
      style={{ background: "radial-gradient(circle at 20% 10%, #2a2150 0%, #140f2e 45%, #0a0820 100%)", boxShadow: "0 0 60px rgba(120,90,220,0.25) inset, 0 20px 50px rgba(0,0,0,0.4)" }}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 90%, rgba(127,227,214,0.18), transparent 40%)" }} />
      <div className="relative flex justify-between items-start mb-6 flex-wrap gap-2">
        <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white">
          FICHA TÉCNICA: <span className="text-[#7FE3D6]">{produto?.descricao?.toUpperCase()}</span>
        </h2>
        {det.local && <span className="text-xs text-[#C8A4E0] border border-[#7FE3D6]/30 px-3 py-1 rounded-full">{det.local}</span>}
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-5">
          <div>
            <SectionTitle icon={Home}>Descrição do Produto</SectionTitle>
            <p className="text-sm text-white/90">{det.descricao_pt || "—"}</p>
            {det.descricao_en && <p className="text-xs text-[#C8A4E0] italic mt-1">{det.descricao_en}</p>}
          </div>
          <div>
            <SectionTitle icon={Settings}>Ingredientes-chave</SectionTitle>
            <ul className="text-sm text-white/90 space-y-1">
              {(det.ingredientes_chave || []).map((ing, i) => <li key={i} className="flex gap-2"><span className="text-[#7FE3D6]">•</span>{ing}</li>)}
              {(det.ingredientes_chave || []).length === 0 && <li className="text-white/40 italic">—</li>}
            </ul>
          </div>
        </div>

        {/* Middle */}
        <div className="space-y-5">
          <div>
            <SectionTitle icon={Sparkles}>Valores Nutricionais (por porção)</SectionTitle>
            <div className="space-y-2">
              {(det.nutricionais || []).map((n, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-white/80"><span>{n.label}</span><span className="text-[#E8C9A0] font-semibold">{fmtBR(n.valor, 0)}{n.unidade}</span></div>
                  <Bar pct={(n.valor / (n.max_ref || 100)) * 100} color="linear-gradient(90deg,#7FE3D6,#9b7bff)" />
                </div>
              ))}
              {(det.nutricionais || []).length === 0 && <div className="text-white/40 italic text-sm">—</div>}
            </div>
          </div>
          {fotoUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/10" style={{ boxShadow: "0 0 30px rgba(127,227,214,0.2)" }}>
              <img src={fotoUrl} alt={produto?.descricao} className="w-full h-48 object-cover" />
            </div>
          )}
          <div>
            <SectionTitle icon={Settings}>Estrutura</SectionTitle>
            <div className="space-y-2">
              {(det.estrutura || []).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-white/80"><span>{c.nome}</span></div>
                  <Bar pct={c.nivel} color="linear-gradient(90deg,#9b7bff,#e0a4ff)" />
                </div>
              ))}
              {(det.estrutura || []).length === 0 && <div className="text-white/40 italic text-sm">—</div>}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[["Crocância", det.crocancia], ["Cremor", det.cremor], ["Suavidade", det.suavidade]].map(([lab, v]) => (
                <div key={lab}><div className="text-[10px] text-[#C8A4E0] uppercase mb-1">{lab}</div><Bar pct={v} color="#7FE3D6" /></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          <div>
            <SectionTitle icon={Clock}>Parâmetros de Produção</SectionTitle>
            <div className="text-sm text-white/90 space-y-1">
              <div className="flex justify-between"><span className="text-white/60">Tempo de Preparo</span><span>{det.tempo_preparo || "—"}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Temp. Assamento</span><span>{det.temp_assamento || "—"}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Rendimento</span><span>{det.rendimento || "—"}</span></div>
            </div>
          </div>
          <div>
            <SectionTitle icon={CalendarCheck}>Validade e Armazenamento</SectionTitle>
            <p className="text-sm text-white/90">{det.armazenamento || "—"}</p>
            {det.validade_dias && <p className="text-xs text-[#E8C9A0] mt-1">Validade: {det.validade_dias} dias</p>}
          </div>
          <div>
            <SectionTitle icon={AlertTriangle}>Alérgenos</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {(det.alergenos || []).map((a, i) => <span key={i} className="text-xs bg-[#9b7bff]/20 border border-[#9b7bff]/40 px-2 py-1 rounded-full text-white/90">{a}</span>)}
              {(det.alergenos || []).length === 0 && <span className="text-white/40 italic text-sm">—</span>}
            </div>
          </div>
          <div>
            <SectionTitle icon={Coffee}>Sugestão de Serviço</SectionTitle>
            <ul className="text-sm text-white/90 space-y-1">
              {(det.sugestao_servico || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-[#7FE3D6]">•</span>{s}</li>)}
              {(det.sugestao_servico || []).length === 0 && <li className="text-white/40 italic">—</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative mt-6 pt-4 border-t border-white/10 text-center text-[10px] text-white/40">
        © 2026 MM Confeitaria & Eventos • Sistema de propriedade e uso exclusivo
      </div>
    </div>
  );
}
