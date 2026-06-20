// Brazilian formatting helpers

export const fmtBR = (n, decimals = 2) => {
  if (n === null || n === undefined || isNaN(n)) n = 0;
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const fmtMoney = (n) => `R$ ${fmtBR(n, 2)}`;
export const fmtPct = (n) => `${fmtBR(n, 2)}%`;
export const fmtQty4 = (n) => fmtBR(n, 4);

export const fmtDate = (d) => {
  if (!d) return "—";
  const part = String(d).length >= 10 ? String(d).slice(0, 10) : String(d);
  const [y, m, dd] = part.split("-");
  return dd ? `${dd}/${m}/${y}` : d;
};

export const parseBR = (s) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/\./g, "").replace(",", ".");
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
};

export const exportCSV = (rows, headers, filename = "export.csv") => {
  const csv = [
    headers.map((h) => `"${h.label}"`).join(";"),
    ...rows.map((r) =>
      headers
        .map((h) => {
          let v = h.value(r);
          if (typeof v === "number") v = String(v).replace(".", ",");
          return `"${v ?? ""}"`;
        })
        .join(";")
    ),
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const exportPDF = (title, headers, rows, opts = {}) => {
  // Simple print-based PDF export
  const w = window.open("", "_blank");
  const styles = `
    <style>
      @media print { @page { size: A4 landscape; margin: 10mm; } }
      body { font-family: 'Georgia', serif; color: #3D2817; padding: 20px; background: #FAF6F2; }
      h1 { color: #8B5E48; border-bottom: 2px solid #C49080; padding-bottom: 8px; font-size: 20px; }
      .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
      .header img { height: 70px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
      th { background: #8B5E48; color: white; padding: 8px; text-align: left; }
      td { padding: 6px 8px; border-bottom: 1px solid #E8DDD3; }
      tr:nth-child(even) td { background: #F5EBE0; }
      .footer { position: fixed; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 10px; color: #B47B6B; font-style: italic; opacity: 0.8; }
      .extra { margin: 12px 0; font-size: 12px; }
    </style>
  `;
  const headerHtml = `
    <div class="header">
      <img src="https://customer-assets.emergentagent.com/job_confeitaria-py/artifacts/1g5frcrf_image.png" />
      <div>
        <h1>${title}</h1>
        <div class="extra">Emitido em ${new Date().toLocaleString("pt-BR")}</div>
      </div>
    </div>
  `;
  const extra = opts.extra ? `<div class="extra">${opts.extra}</div>` : "";
  const tableHtml = `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h.label}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>${headers
                .map((h) => `<td>${h.render ? h.render(r) : h.value(r) ?? ""}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
  w.document.write(`
    <html><head><title>${title}</title>${styles}</head>
    <body>${headerHtml}${extra}${tableHtml}
    <div class="footer">Produto de uso exclusivo da MM Confeitaria e Eventos</div>
    </body></html>
  `);
  w.document.close();
  setTimeout(() => w.print(), 500);
};
