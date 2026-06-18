import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LOGO_URL } from "@/lib/api";
import {
  LayoutDashboard, Package, Wrench, Receipt, Cake, Calculator,
  FileText, Tags, ShoppingCart, TrendingUp, LogOut,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
  { to: "/materia-prima", label: "Matéria-Prima", icon: Package, tid: "nav-mp" },
  { to: "/equipamentos", label: "Equipamentos", icon: Wrench, tid: "nav-eq" },
  { to: "/custos", label: "Custos", icon: Receipt, tid: "nav-custos" },
  { to: "/produtos", label: "Produtos", icon: Cake, tid: "nav-produtos" },
  { to: "/markup", label: "Markup", icon: Calculator, tid: "nav-markup" },
  { to: "/ficha-tecnica", label: "Ficha Técnica", icon: FileText, tid: "nav-ficha" },
  { to: "/tabela-preco", label: "Tabela de Preço", icon: Tags, tid: "nav-tabela" },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingCart, tid: "nav-pedidos" },
  { to: "/dre", label: "DRE", icon: TrendingUp, tid: "nav-dre" },
];

export default function Layout() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem("mm_user") || "{}");

  const logout = () => {
    localStorage.removeItem("mm_token");
    localStorage.removeItem("mm_user");
    nav("/login");
  };

  return (
    <div className="min-h-screen mm-bg-pattern mm-watermark flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#3D2817] to-[#5B3A26] text-white flex flex-col fixed h-screen">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <img src={LOGO_URL} alt="MM" className="h-14 w-14 rounded-full bg-white p-1 object-contain" />
          <div>
            <div className="font-display text-xl leading-tight">MM Confeitaria</div>
            <div className="text-[10px] tracking-widest text-[#C8A47A]">& EVENTOS</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, tid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={tid}
              className={({ isActive }) => `mm-sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-[#C8A47A] px-3 mb-2">{user.nome}</div>
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="mm-sidebar-link w-full"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-6 pb-16 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
