import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/index.css";
import Login from "@/pages/Login";
import Layout from "@/pages/Layout";
import Dashboard from "@/pages/Dashboard";
import MateriaPrima from "@/pages/MateriaPrima";
import Equipamentos from "@/pages/Equipamentos";
import Custos from "@/pages/Custos";
import Produtos from "@/pages/Produtos";
import Markup from "@/pages/Markup";
import FichaTecnica from "@/pages/FichaTecnica";
import TabelaPreco from "@/pages/TabelaPreco";
import Pedidos from "@/pages/Pedidos";
import ControlePedidos from "@/pages/ControlePedidos";
import DRE from "@/pages/DRE";
import Configuracoes from "@/pages/Configuracoes";
import TabelaVenda from "@/pages/TabelaVenda";
import Compras from "@/pages/Compras";
import MovimentoMP from "@/pages/MovimentoMP";
import Estoques from "@/pages/Estoques";
import ControleProducao from "@/pages/ControleProducao";
import FichaDetalhada from "@/pages/FichaDetalhada";
import Manual from "@/pages/Manual";

const Protected = ({ children }) => {
  const token = localStorage.getItem("mm_token");
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="materia-prima" element={<MateriaPrima />} />
            <Route path="equipamentos" element={<Equipamentos />} />
            <Route path="custos" element={<Custos />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="markup" element={<Markup />} />
            <Route path="ficha-tecnica" element={<FichaTecnica />} />
            <Route path="tabela-preco" element={<TabelaPreco />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="controle-pedidos" element={<ControlePedidos />} />
            <Route path="producao" element={<ControleProducao />} />
            <Route path="ficha-detalhada" element={<FichaDetalhada />} />
            <Route path="dre" element={<DRE />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="tabela-venda" element={<TabelaVenda />} />
            <Route path="compras" element={<Compras />} />
            <Route path="movimento-mp" element={<MovimentoMP />} />
            <Route path="estoques" element={<Estoques />} />
            <Route path="manual" element={<Manual />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
