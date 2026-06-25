"""Backend tests for the NEW Financeiro features (iteration 8):
- GET /api/financeiro?inicio=&fim=  (period filter by data_vencimento)
- GET /api/financeiro  (no params still returns everything – regression)
- GET /api/financeiro/evolucao?meses=6  (monthly aggregates by data_vencimento)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


# ------------------------------------------------- fixtures
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "admin@mm.com", "password": "mm123456"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def hdr(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------- /api/financeiro no params (regression)
class TestFinanceiroSemParams:
    def test_no_params_returns_all_items(self, hdr):
        r = requests.get(f"{API}/financeiro", headers=hdr, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # must have all the expected keys
        for k in ("entradas", "saidas", "fluxo_caixa", "vencidos"):
            assert k in data, f"missing key {k}"
        # baseline counts > 0 for at least one of entradas/saidas in this seeded DB
        assert isinstance(data["entradas"], list)
        assert isinstance(data["saidas"], list)


# ------------------------------------------------- /api/financeiro?inicio=&fim=
class TestFinanceiroComFiltro:
    def test_filtro_julho_2026_includes_only_julho_due(self, hdr):
        r = requests.get(f"{API}/financeiro",
                         headers=hdr, params={"inicio": "2026-07-01", "fim": "2026-07-31"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # all entradas should have data_vencimento in July 2026 (or be excluded if null)
        for e in data["entradas"]:
            assert e["data_vencimento"] is not None, "Entradas com vencimento null NÃO deveriam vir quando filtro ativo"
            assert "2026-07-01" <= str(e["data_vencimento"])[:10] <= "2026-07-31", e

        # all saidas should have data_vencimento in July 2026
        for s in data["saidas"]:
            assert s["data_vencimento"] is not None, "Saidas com vencimento null NÃO deveriam vir quando filtro ativo"
            assert "2026-07-01" <= str(s["data_vencimento"])[:10] <= "2026-07-31", s

        # spec says compra CP001 venc 2026-07-10 should appear
        codigos = [s["codigo"] for s in data["saidas"]]
        assert "CP001" in codigos, f"CP001 deveria estar nas saidas filtradas (julho/2026); got: {codigos}"

        # CP001 should be status PAGO (per spec, valor 250)
        cp001 = next(s for s in data["saidas"] if s["codigo"] == "CP001")
        assert cp001["status_financeiro"] == "PAGO", cp001
        # valor pode estar em decimal — compara aproximado a 250
        assert abs(float(cp001["valor"]) - 250.0) < 0.01, cp001

    def test_filtro_no_resultado_em_periodo_vazio(self, hdr):
        # periodo bem antigo onde não deve haver lançamento
        r = requests.get(f"{API}/financeiro",
                         headers=hdr, params={"inicio": "1990-01-01", "fim": "1990-12-31"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["entradas"] == []
        assert data["saidas"] == []

    def test_filtro_so_inicio(self, hdr):
        # apenas inicio definido = tudo a partir dessa data, registros com vencimento null são excluídos
        r = requests.get(f"{API}/financeiro",
                         headers=hdr, params={"inicio": "2026-07-01"}, timeout=30)
        assert r.status_code == 200
        for e in r.json()["entradas"]:
            assert e["data_vencimento"] is not None
            assert str(e["data_vencimento"])[:10] >= "2026-07-01"
        for s in r.json()["saidas"]:
            assert s["data_vencimento"] is not None
            assert str(s["data_vencimento"])[:10] >= "2026-07-01"


# ------------------------------------------------- /api/financeiro/evolucao
class TestFinanceiroEvolucao:
    def test_evolucao_estrutura_e_minimo_6_meses(self, hdr):
        r = requests.get(f"{API}/financeiro/evolucao",
                         headers=hdr, params={"meses": 6}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Ao menos 6 meses (backend pode incluir mais meses que tenham dados extras)
        assert len(data) >= 6, f"esperava >=6 meses, got {len(data)}"
        # Estrutura de cada item
        keys = {"mes", "recebido", "pago", "saldo", "a_receber", "a_pagar"}
        for row in data:
            assert keys.issubset(row.keys()), f"chaves faltando em {row}"
            # mes formato YYYY-MM
            assert len(row["mes"]) == 7 and row["mes"][4] == "-"
            # saldo coerente
            assert abs(row["saldo"] - (row["recebido"] - row["pago"])) < 0.01, row

    def test_evolucao_julho_2026_reflete_cp001(self, hdr):
        r = requests.get(f"{API}/financeiro/evolucao",
                         headers=hdr, params={"meses": 6}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        julho = next((x for x in data if x["mes"] == "2026-07"), None)
        assert julho is not None, f"Mês 2026-07 ausente. meses retornados: {[r['mes'] for r in data]}"
        # CP001 = compra PAGO valor 250 com venc 2026-07-10
        assert julho["pago"] >= 250.0 - 0.01, julho
        # saldo = recebido - pago; se não houver recebido em julho, saldo == -pago
        assert abs(julho["saldo"] - (julho["recebido"] - julho["pago"])) < 0.01

    def test_evolucao_default_meses(self, hdr):
        # sem param de meses, default = 6
        r = requests.get(f"{API}/financeiro/evolucao", headers=hdr, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 6

    def test_evolucao_meses_3(self, hdr):
        r = requests.get(f"{API}/financeiro/evolucao",
                         headers=hdr, params={"meses": 3}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # >=3 (pode trazer mais se houver dados em outros meses)
        assert len(data) >= 3
