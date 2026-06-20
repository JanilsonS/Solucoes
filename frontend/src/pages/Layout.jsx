import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LOGO_URL } from "@/lib/api";
import {
  LayoutDashboard, Package, Wrench, Receipt, Cake, Calculator,
  FileText, Tags, ShoppingCart, TrendingUp, LogOut, Factory, Sparkles,
  ClipboardList, Settings, ChevronDown, FolderOpen, ListChecks, TrendingDown,
  ShoppingBag, ArrowLeftRight, Boxes, BookOpen,
} from "lucide-react";

const GROUPS = [
  {
    label: "Análise", icon: TrendingUp, items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
      { to: "/dre", label: "DRE", icon: TrendingDown, tid: "nav-dre" },
    ],
  },
  {
    label: "Cadastros", icon: FolderOpen, items: [
      { to: "/materia-prima", label: "Matéria-Prima", icon: Package, tid: "nav-mp" },
      { to: "/equipamentos", label: "Equipamentos", icon: Wrench, tid: "nav-eq" },
      { to: "/custos", label: "Custos", icon: Receipt, tid: "nav-custos" },
      { to: "/produtos", label: "Produtos", icon: Cake, tid: "nav-produtos" },
      { to: "/markup", label: "Markup", icon: Calculator, tid: "nav-markup" },
    ],
  },
  {
    label: "Precificação", icon: Tags, items: [
      { to: "/ficha-tecnica", label: "Ficha Técnica", icon: FileText, tid: "nav-ficha" },
      { to: "/ficha-detalhada", label: "Ficha Detalhada", icon: Sparkles, tid: "nav-ficha-detalhada" },
      { to: "/tabela-preco", label: "Precificação", icon: Calculator, tid: "nav-tabela" },
      { to: "/tabela-venda", label: "Tabela de Preço de Venda", icon: Tags, tid: "nav-tabela-venda" },
    ],
  },
  {
    label: "Compras & Estoque", icon: Boxes, items: [
      { to: "/compras", label: "Pedido de Compras", icon: ShoppingBag, tid: "nav-compras" },
      { to: "/movimento-mp", label: "Movimento de MP", icon: ArrowLeftRight, tid: "nav-movimento" },
      { to: "/estoques", label: "Gestão de Estoques", icon: Boxes, tid: "nav-estoques" },
    ],
  },
  {
    label: "Vendas", icon: ShoppingCart, items: [
      { to: "/pedidos", label: "Cadastro de Pedidos", icon: ShoppingCart, tid: "nav-pedidos" },
      { to: "/controle-pedidos", label: "Controle de Pedidos", icon: ClipboardList, tid: "nav-controle-pedidos" },
      { to: "/producao", label: "Controle de Produção", icon: Factory, tid: "nav-producao" },
    ],
  },
  {
    label: "Sistema", icon: Settings, items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings, tid: "nav-config" },
      { to: "/manual", label: "Manual do Usuário", icon: BookOpen, tid: "nav-manual" },
    ],
  },
];

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = JSON.parse(localStorage.getItem("mm_user") || "{}");
  const activeGroup = GROUPS.findIndex((g) => g.items.some((i) => loc.pathname.startsWith(i.to)));
  const [open, setOpen] = useState(() => ({ [activeGroup === -1 ? 0 : activeGroup]: true }));

  const logout = () => {
    localStorage.removeItem("mm_token");
    localStorage.removeItem("mm_user");
    nav("/login");
  };

  return (
    <div className="min-h-screen mm-bg-pattern mm-watermark flex">
      <aside className="w-64 bg-gradient-to-b from-[#3D2817] to-[#5B3A26] text-white flex flex-col fixed h-screen">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <img src={LOGO_URL} alt="MM" className="h-14 w-14 rounded-full bg-white p-1 object-contain" />
          <div>
            <div className="font-display text-xl leading-tight">MM Confeitaria</div>
            <div className="text-[10px] tracking-widest text-[#C8A47A]">& EVENTOS</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {GROUPS.map((g, gi) => {
            const isOpen = !!open[gi];
            const hasActive = g.items.some((i) => loc.pathname.startsWith(i.to));
            return (
              <div key={g.label}>
                <button
                  data-testid={`navgroup-${g.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
                  onClick={() => setOpen((o) => ({ ...o, [gi]: !o[gi] }))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${hasActive ? "text-[#E8C9A0]" : "text-white/80 hover:text-white"}`}
                >
                  <span className="flex items-center gap-2"><g.icon size={16} />{g.label}</span>
                  <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div className={`overflow-hidden transition-all ${isOpen ? "max-h-96" : "max-h-0"}`}>
                  <div className="pl-2 py-1 space-y-0.5">
                    {g.items.map(({ to, label, icon: Icon, tid }) => (
                      <NavLink key={to} to={to} data-testid={tid} className={({ isActive }) => `mm-sidebar-link text-sm ${isActive ? "active" : ""}`}>
                        <Icon size={16} /><span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-[#C8A47A] px-3 mb-2">{user.nome}</div>
          <button data-testid="logout-btn" onClick={logout} className="mm-sidebar-link w-full"><LogOut size={18} /> Sair</button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-6 pb-16 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
