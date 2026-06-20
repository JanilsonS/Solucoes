import { fmtMoney, fmtBR } from "./format";

const DDI = "55"; // Brasil

export const DEFAULT_TEMPLATE =
  "Olá, {cliente}! 🎂\n" +
  "Confirmação do seu pedido nº {numero} — *MM Confeitaria & Eventos*\n" +
  "\n" +
  "{itens}\n" +
  "{outros}" +
  "\n" +
  "*Total do pedido: {total}*\n" +
  "📅 Entrega: {entrega}\n" +
  "📍 {endereco}\n" +
  "💳 Pagamento: {forma_pagamento}\n" +
  "\n" +
  "Qualquer dúvida, estou à disposição! 💕";

const fmtDataBR = (d) => {
  if (!d) return "";
  const part = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, dd] = part.split("-");
  return dd ? `${dd}/${m}/${y}` : d;
};

export const buildMessage = (p, template = DEFAULT_TEMPLATE) => {
  const itens = (p.itens || []).map((i) => `• ${fmtBR(i.quantidade, 0)}x ${i.descricao}`).join("\n");
  const outrosArr = (p.outros || []).filter((o) => Number(o.valor) > 0).map((o) => `• ${o.descricao}: ${fmtMoney(o.valor)}`);
  const outros = outrosArr.length ? `*Outros:*\n${outrosArr.join("\n")}\n` : "";
  const entrega = [fmtDataBR(p.data_entrega), p.hora_entrega ? `às ${p.hora_entrega}` : ""].filter(Boolean).join(" ");
  const endereco = p.endereco_entrega || p.cliente_endereco || "";

  const map = {
    "{cliente}": p.cliente_nome || "cliente",
    "{numero}": String(p.numero || "").padStart(3, "0"),
    "{itens}": itens || "—",
    "{outros}": outros,
    "{total}": fmtMoney(p.total || 0),
    "{entrega}": entrega || "a combinar",
    "{endereco}": endereco || "a combinar",
    "{forma_pagamento}": p.forma_pagamento || "—",
  };
  let msg = template || DEFAULT_TEMPLATE;
  for (const [k, v] of Object.entries(map)) msg = msg.split(k).join(v);
  return msg;
};

export const openWhatsapp = (p, template) => {
  const digits = (p.cliente_telefone || "").replace(/\D/g, "");
  const phone = digits ? (digits.startsWith(DDI) ? digits : DDI + digits) : "";
  const texto = encodeURIComponent(buildMessage(p, template));
  window.open(phone ? `https://wa.me/${phone}?text=${texto}` : `https://wa.me/?text=${texto}`, "_blank");
};
