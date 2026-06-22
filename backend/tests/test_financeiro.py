"""Backend tests for the Financeiro feature batch:
- PedidoIn.data_vencimento + status_financeiro persistence
- CompraIn.telefone_fornecedor + data_vencimento + status_financeiro persistence
- PATCH /api/pedidos/{id}/financeiro toggle
- PATCH /api/compras/{id}/financeiro toggle
- GET  /api/financeiro: structure, KPIs, fluxo_caixa grouping, vencidos filtering
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------------------------------------------------------- fixtures
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "admin@mm.com", "password": "mm123456"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def primeiro_produto(hdr):
    """Pega um produto existente para criar um pedido válido."""
    r = requests.get(f"{API}/produtos", headers=hdr, timeout=30)
    assert r.status_code == 200
    produtos = r.json()
    assert len(produtos) > 0, "Sem produtos cadastrados"
    return produtos[0]


@pytest.fixture(scope="session")
def primeira_mp(hdr):
    r = requests.get(f"{API}/materias-primas", headers=hdr, timeout=30)
    assert r.status_code == 200
    mps = r.json()
    assert len(mps) > 0
    return mps[0]


# ---------------------------------------------------------------- 1. Pedido com data_vencimento
class TestPedidoVencimento:
    def test_create_pedido_com_data_vencimento_persistence(self, hdr, primeiro_produto):
        payload = {
            "cliente_nome": "TEST_Cliente_Venc",
            "cliente_telefone": "11999990001",
            "data_pedido": "2026-01-15",
            "data_entrega": "2026-02-01",
            "data_vencimento": "2026-02-10",
            "itens": [{"produto_id": primeiro_produto["id"], "quantidade": 1}],
            "outros": [],
        }
        r = requests.post(f"{API}/pedidos", json=payload, headers=hdr, timeout=30)
        assert r.status_code in (200, 201), r.text
        pid = r.json()["id"]
        # GET back
        g = requests.get(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)
        assert g.status_code == 200
        body = g.json()
        assert body["data_vencimento"] == "2026-02-10"
        assert body.get("status_financeiro", "ABERTO") == "ABERTO"
        # cleanup
        requests.delete(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)

    def test_patch_pedido_financeiro_toggle(self, hdr, primeiro_produto):
        payload = {
            "cliente_nome": "TEST_Cliente_Toggle",
            "data_vencimento": "2026-03-01",
            "itens": [{"produto_id": primeiro_produto["id"], "quantidade": 1}],
        }
        r = requests.post(f"{API}/pedidos", json=payload, headers=hdr, timeout=30)
        pid = r.json()["id"]
        # Toggle to RECEBIDO
        p = requests.patch(f"{API}/pedidos/{pid}/financeiro",
                           json={"status_financeiro": "RECEBIDO"}, headers=hdr, timeout=30)
        assert p.status_code == 200, p.text
        g = requests.get(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)
        assert g.json()["status_financeiro"] == "RECEBIDO"
        # Back to ABERTO
        p2 = requests.patch(f"{API}/pedidos/{pid}/financeiro",
                            json={"status_financeiro": "ABERTO"}, headers=hdr, timeout=30)
        assert p2.status_code == 200
        # Invalid value should 400
        p3 = requests.patch(f"{API}/pedidos/{pid}/financeiro",
                            json={"status_financeiro": "FOO"}, headers=hdr, timeout=30)
        assert p3.status_code == 400
        requests.delete(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)


# ---------------------------------------------------------------- 2. Compra com telefone_fornecedor
class TestCompraFinanceiro:
    def test_create_compra_persists_telefone_e_vencimento(self, hdr, primeira_mp):
        payload = {
            "fornecedor": "TEST_Forn_Venc",
            "telefone_fornecedor": "11988880002",
            "data_compra": "2026-01-10",
            "data_vencimento": "2026-02-10",
            "itens": [{"materia_prima_id": primeira_mp["id"], "quantidade": 1, "valor_total": 50.0}],
        }
        r = requests.post(f"{API}/compras", json=payload, headers=hdr, timeout=30)
        assert r.status_code in (200, 201), r.text
        cid = r.json()["id"]
        g = requests.get(f"{API}/compras/{cid}", headers=hdr, timeout=30)
        assert g.status_code == 200
        body = g.json()
        assert body["telefone_fornecedor"] == "11988880002"
        assert body["data_vencimento"] == "2026-02-10"
        assert body.get("status_financeiro", "ABERTO") == "ABERTO"
        requests.delete(f"{API}/compras/{cid}", headers=hdr, timeout=30)

    def test_patch_compra_financeiro_toggle(self, hdr, primeira_mp):
        payload = {
            "fornecedor": "TEST_Forn_Toggle",
            "data_compra": "2026-01-10",
            "data_vencimento": "2026-02-10",
            "itens": [{"materia_prima_id": primeira_mp["id"], "quantidade": 1, "valor_total": 10.0}],
        }
        r = requests.post(f"{API}/compras", json=payload, headers=hdr, timeout=30)
        cid = r.json()["id"]
        p = requests.patch(f"{API}/compras/{cid}/financeiro",
                           json={"status_financeiro": "PAGO"}, headers=hdr, timeout=30)
        assert p.status_code == 200
        g = requests.get(f"{API}/compras/{cid}", headers=hdr, timeout=30)
        assert g.json()["status_financeiro"] == "PAGO"
        # back
        requests.patch(f"{API}/compras/{cid}/financeiro",
                       json={"status_financeiro": "ABERTO"}, headers=hdr, timeout=30)
        # invalid
        p3 = requests.patch(f"{API}/compras/{cid}/financeiro",
                            json={"status_financeiro": "X"}, headers=hdr, timeout=30)
        assert p3.status_code == 400
        requests.delete(f"{API}/compras/{cid}", headers=hdr, timeout=30)


# ---------------------------------------------------------------- 3. GET /financeiro
class TestFinanceiroEndpoint:
    def test_structure(self, hdr):
        r = requests.get(f"{API}/financeiro", headers=hdr, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("entradas", "saidas", "fluxo_caixa", "vencidos"):
            assert k in d
        for k in ("entradas_por_grupo", "saidas_por_grupo", "total_entradas",
                  "total_saidas", "saldo"):
            assert k in d["fluxo_caixa"], f"missing fluxo_caixa.{k}"
        assert "entradas" in d["vencidos"] and "saidas" in d["vencidos"]
        assert isinstance(d["fluxo_caixa"]["entradas_por_grupo"], list)

    def test_vencidos_filter_only_aberto_with_past_due(self, hdr, primeiro_produto, primeira_mp):
        """Create one pedido + one compra with past due date, status Aberto.
        Both should appear in vencidos; after toggling RECEBIDO/PAGO they must disappear.
        """
        # PEDIDO vencido
        ped_r = requests.post(f"{API}/pedidos", headers=hdr, timeout=30, json={
            "cliente_nome": "TEST_Vencido_Cliente",
            "cliente_telefone": "11900001111",
            "data_pedido": "2020-01-01",
            "data_entrega": "2020-01-01",
            "data_vencimento": "2020-01-01",
            "itens": [{"produto_id": primeiro_produto["id"], "quantidade": 1}],
        })
        assert ped_r.status_code in (200, 201), ped_r.text
        pid = ped_r.json()["id"]

        # COMPRA vencida
        com_r = requests.post(f"{API}/compras", headers=hdr, timeout=30, json={
            "fornecedor": "TEST_Forn_Vencido",
            "telefone_fornecedor": "11900002222",
            "data_compra": "2020-01-01",
            "data_vencimento": "2020-01-01",
            "itens": [{"materia_prima_id": primeira_mp["id"], "quantidade": 1, "valor_total": 99.0}],
        })
        assert com_r.status_code in (200, 201), com_r.text
        cid = com_r.json()["id"]

        try:
            d = requests.get(f"{API}/financeiro", headers=hdr, timeout=30).json()
            ids_e = [e["id"] for e in d["vencidos"]["entradas"]]
            ids_s = [s["id"] for s in d["vencidos"]["saidas"]]
            assert pid in ids_e, "Pedido vencido (status ABERTO + data passada) deveria aparecer"
            assert cid in ids_s, "Compra vencida (status ABERTO + data passada) deveria aparecer"

            # Telefone deve estar presente no vencidos
            ent = next(e for e in d["vencidos"]["entradas"] if e["id"] == pid)
            sai = next(s for s in d["vencidos"]["saidas"] if s["id"] == cid)
            assert ent["telefone"] == "11900001111"
            assert sai["telefone"] == "11900002222"

            # Toggle to RECEBIDO/PAGO → desaparece de vencidos
            requests.patch(f"{API}/pedidos/{pid}/financeiro",
                           json={"status_financeiro": "RECEBIDO"}, headers=hdr, timeout=30)
            requests.patch(f"{API}/compras/{cid}/financeiro",
                           json={"status_financeiro": "PAGO"}, headers=hdr, timeout=30)
            d2 = requests.get(f"{API}/financeiro", headers=hdr, timeout=30).json()
            assert pid not in [e["id"] for e in d2["vencidos"]["entradas"]]
            assert cid not in [s["id"] for s in d2["vencidos"]["saidas"]]

            # Fluxo de caixa: entradas/saidas devem ter aumentado, agrupado por grupo do produto/MP
            assert d2["fluxo_caixa"]["total_entradas"] >= d["fluxo_caixa"]["total_entradas"]
            assert d2["fluxo_caixa"]["total_saidas"] >= d["fluxo_caixa"]["total_saidas"]
        finally:
            requests.delete(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)
            requests.delete(f"{API}/compras/{cid}", headers=hdr, timeout=30)

    def test_fluxo_excludes_outros(self, hdr, primeiro_produto):
        """Items 'outros' (frete etc) should NOT be counted in fluxo_caixa.entradas_por_grupo
        (only preco_total of itens é somado)."""
        before = requests.get(f"{API}/financeiro", headers=hdr, timeout=30).json()
        before_total = before["fluxo_caixa"]["total_entradas"]

        ped_r = requests.post(f"{API}/pedidos", headers=hdr, timeout=30, json={
            "cliente_nome": "TEST_Outros_Cliente",
            "data_pedido": "2026-01-15",
            "data_entrega": "2026-02-01",
            "data_vencimento": "2026-02-10",
            "itens": [{"produto_id": primeiro_produto["id"], "quantidade": 1}],
            "outros": [{"descricao": "Frete", "valor": 1000.0}],
        })
        pid = ped_r.json()["id"]
        try:
            # marca RECEBIDO
            requests.patch(f"{API}/pedidos/{pid}/financeiro",
                           json={"status_financeiro": "RECEBIDO"}, headers=hdr, timeout=30)
            after = requests.get(f"{API}/financeiro", headers=hdr, timeout=30).json()
            # diff should be only the produto preco_total (not 1000 of frete)
            diff = after["fluxo_caixa"]["total_entradas"] - before_total
            assert diff < 1000, f"Outros (frete 1000) NÃO deveria entrar no fluxo, mas diff={diff}"
        finally:
            requests.delete(f"{API}/pedidos/{pid}", headers=hdr, timeout=30)
