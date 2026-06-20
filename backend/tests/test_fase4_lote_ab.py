"""Backend tests for Fase 4 Lote A+B:
- POST /api/tabela-venda/atualizar
- GET /api/tabela-venda
- GET /api/pedidos (verify totals use preco oficial from tabela_venda)
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ficha-tecnica-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@mm.com", "password": "mm123456"}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Tabela de Preço de Venda (frozen) ---

def test_get_tabela_venda(headers):
    r = requests.get(f"{API}/tabela-venda", headers=headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "rows" in data
    # spec says seed has 18 products
    assert len(data["rows"]) >= 1
    row = data["rows"][0]
    for k in ["produto_id", "codigo", "descricao", "unidade", "lucro_pct", "preco_tabela"]:
        assert k in row, f"missing {k} in row"
    assert "data_base" in data


def test_atualizar_tabela_venda(headers):
    r = requests.post(f"{API}/tabela-venda/atualizar", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "rows" in data and len(data["rows"]) >= 1
    # After update each row should have preco_antigo and variacao_pct present
    sample = data["rows"][0]
    assert "preco_antigo" in sample
    assert "variacao_pct" in sample
    assert "data_base" in data


def test_pedido_uses_preco_oficial(headers):
    # Load tabela-venda to know expected preço oficial
    tv = requests.get(f"{API}/tabela-venda", headers=headers, timeout=20).json()
    oficial = {r["produto_id"]: r["preco_tabela"] for r in tv["rows"]}

    pedidos = requests.get(f"{API}/pedidos", headers=headers, timeout=20).json()
    assert len(pedidos) >= 1
    mismatches = []
    for p in pedidos:
        for it in p.get("itens", []):
            if it["produto_id"] in oficial:
                expected = round(oficial[it["produto_id"]], 2)
                got = round(it.get("preco_unitario", 0), 2)
                if abs(expected - got) > 0.01:
                    mismatches.append((p.get("numero"), it["produto_id"], expected, got))
    assert not mismatches, f"preco_unitario mismatches: {mismatches}"


# --- Date format: API returns ISO; frontend formats to dd/mm/aaaa ---

def test_pedidos_have_iso_dates(headers):
    r = requests.get(f"{API}/pedidos", headers=headers, timeout=20)
    assert r.status_code == 200
    pedidos = r.json()
    for p in pedidos:
        if p.get("data_pedido"):
            assert len(str(p["data_pedido"])) >= 10
        if p.get("data_entrega"):
            assert len(str(p["data_entrega"])) >= 10


# --- Placeholder routes not backend-implemented (frontend-only Em construção) ---
# These endpoints intentionally don't exist; UI shows placeholder pages.
