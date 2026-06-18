import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, fmtBR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { DollarSign, ShoppingBag, Users, TrendingUp, Factory, AlertCircle } from "lucide-react";

const COLORS = ["#8B5E48", "#C49080", "#C8A47A", "#6B8E5A", "#D49A5C"];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-[#8B5E48]">Carregando...</div>;

  const cards = [
    { label: "Faturamento (mês)", value: fmtMoney(data.faturamento_mes), icon: DollarSign, color: "from-[#8B5E48] to-[#5B3A26]" },
    { label: "Pedidos no mês", value: data.pedidos_mes, icon: ShoppingBag, color: "from-[#C49080] to-[#B47B6B]" },
    { label: "Ticket Médio", value: fmtMoney(data.ticket_medio), icon: TrendingUp, color: "from-[#C8A47A] to-[#A88457]" },
    { label: "Em Produção", value: data.em_producao, icon: Factory, color: "from-[#6B8E5A] to-[#4F6C42]" },
    { label: "À Receber", value: data.em_aberto, icon: AlertCircle, color: "from-[#D49A5C] to-[#B07D3F]" },
    { label: "Clientes", value: data.total_clientes, icon: Users, color: "from-[#3D2817] to-[#2A1A0D]" },
  ];

  const statusData = Object.entries(data.status_producao || {}).map(([k, v]) => ({ name: k.replace("_", " "), value: v }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl text-[#3D2817]">Dashboard Gerencial</h1>
        <p className="text-[#8B5E48] italic">Visão estratégica do seu negócio</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <div key={i} data-testid={`dash-card-${i}`} className="mm-card-glow flex flex-col gap-2">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white`}>
              <c.icon size={20} />
            </div>
            <div className="text-xs uppercase tracking-wider text-[#8B5E48] font-semibold">{c.label}</div>
            <div className="text-xl font-bold text-[#3D2817]">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="mm-card-glow lg:col-span-2">
          <h3 className="font-display text-xl text-[#3D2817] mb-3">Faturamento (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.faturamento_6m}>
              <CartesianGrid stroke="#E8DDD3" />
              <XAxis dataKey="mes" stroke="#8B5E48" />
              <YAxis stroke="#8B5E48" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "#FAF6F2", border: "1px solid #C49080" }} />
              <Line type="monotone" dataKey="valor" stroke="#8B5E48" strokeWidth={3} dot={{ fill: "#C49080", r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mm-card-glow">
          <h3 className="font-display text-xl text-[#3D2817] mb-3">Status de Produção</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mm-card-glow">
        <h3 className="font-display text-xl text-[#3D2817] mb-3">Top 5 Produtos</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.top_produtos} layout="vertical">
            <CartesianGrid stroke="#E8DDD3" />
            <XAxis type="number" stroke="#8B5E48" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <YAxis dataKey="descricao" type="category" stroke="#8B5E48" width={150} />
            <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "#FAF6F2", border: "1px solid #C49080" }} />
            <Bar dataKey="valor" fill="#8B5E48" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
