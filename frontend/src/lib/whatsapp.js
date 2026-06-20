import { fmtMoney, fmtBR } from "./format";

const DDI = "55"; // Brasil

const fmtDataBR = (d) => {
  if (!d) return "";
  const part = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, dd] = part.split("-");
  return dd ? `${dd}/${m}/${y}` : d;
};

export const buildWhatsappLink = (p) => {
  const digits = (p.cliente_telefone || "").replace(/\D/g, "");
  const phone = digits ? (digits.startsWith(DDI) ? digits : DDI + digits) : "";

  const numero = String(p.numero || "").padStart(3, "0");
  const itens = (p.itens || []).map((i) => `• ${fmtBR(i.quantidade, 0)}x ${i.descricao}`).join("\n");
  const outros = (p.outros || [])
    .filter((o) => Number(o.valor) > 0)
    .map((o) => `• ${o.descricao}: ${fmtMoney(o.valor)}`)
    .join("\n");

  const entrega = [fmtDataBR(p.data_entrega), p.hora_entrega ? `às ${p.hora_entrega}` : ""].filter(Boolean).join(" ");
  const endereco = p.endereco_entrega || p.cliente_endereco || "";

  const linhas = [
    `Olá, ${p.cliente_nome || "cliente"}! 🎂`,
    `Confirmação do seu pedido nº ${numero} — *MM Confeitaria & Eventos*`,
    "",
    itens || "—",
  ];
  if (outros) { linhas.push("", "*Outros:*", outros); }
  linhas.push("", `*Total do pedido: ${fmtMoney(p.total || 0)}*`);
  if (entrega) linhas.push(`📅 Entrega: ${entrega}`);
  if (endereco) linhas.push(`📍 ${endereco}`);
  if (p.forma_pagamento) linhas.push(`💳 Pagamento: ${p.forma_pagamento}`);
  linhas.push("", "Qualquer dúvida, estou à disposição! 💕");

  const texto = encodeURIComponent(linhas.join("\n"));
  return phone ? `https://wa.me/${phone}?text=${texto}` : `https://wa.me/?text=${texto}`;
};

export const openWhatsapp = (p) => {
  window.open(buildWhatsappLink(p), "_blank");
};
