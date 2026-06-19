"""Tests for FASE 2: Pedidos detalhado/DRE, Produção, Ficha Detalhada Cósmica."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ficha-tecnica-3.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@mm.com", "password": "mm123456"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def hdrs(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- AUTH ---
def test_auth_login_ok():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@mm.com", "password": "mm123456"}, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "token" in data and "user" in data and data["user"]["email"] == "admin@mm.com"


# --- PRODUCAO ---
def test_producao_returns_ordens_consolidado(hdrs):
    r = requests.get(f"{API}/producao", headers=hdrs, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "ordens" in data and "consolidado" in data
    assert isinstance(data["ordens"], list) and isinstance(data["consolidado"], list)
    # Should NOT include CANCELADO
    for o in data["ordens"]:
        assert o.get("aprovacao") != "CANCELADO"


def test_producao_existing_order_2(hdrs):
    r = requests.get(f"{API}/producao", headers=hdrs, timeout=30).json()
    nums = [o["numero"] for o in r["ordens"]]
    # The seed order #2 mentioned in the request
    assert 2 in nums, f"Expected order #2 in producao ordens, got {nums}"
    ord2 = next(o for o in r["ordens"] if o["numero"] == 2)
    assert ord2["cliente_nome"] == "Cliente Teste"
    assert ord2["data_entrega"] == "2026-07-01"
    assert ord2["hora_entrega"] == "14:30"
    # has Pipoca
    descs = [it["descricao"] for it in ord2["itens"]]
    assert any("Pipoca" in d for d in descs), descs


# --- PEDIDOS DRE ---
def test_pedido_dre_order_2(hdrs):
    pedidos = requests.get(f"{API}/pedidos", headers=hdrs, timeout=30).json()
    p2 = next((p for p in pedidos if p.get("numero") == 2), None)
    assert p2 is not None, "Order #2 not found"
    r = requests.get(f"{API}/pedidos/{p2['id']}", headers=hdrs, timeout=30)
    assert r.status_code == 200
    full = r.json()
    assert "dre" in full
    dre = full["dre"]
    for k in ("receita_total", "deducoes", "custo_produtos", "resultado_liquido", "margem_pct"):
        assert k in dre, f"Missing {k} in dre: {dre}"
    # Expected: receita_total ~120, resultado_liquido ~103.15
    assert abs(dre["receita_total"] - 120) < 1, dre
    assert dre["resultado_liquido"] > 0


# --- TABELA DE PRECOS (preco_tabela_individual) ---
def test_tabela_precos_has_preco_individual(hdrs):
    r = requests.get(f"{API}/tabela-precos", headers=hdrs, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "rows" in data and len(data["rows"]) > 0
    row = data["rows"][0]
    assert "preco_tabela_individual" in row
    assert "lucro_pct_individual" in row


# --- CLIENTES ---
def test_clientes_have_endereco(hdrs):
    r = requests.get(f"{API}/clientes", headers=hdrs, timeout=30)
    assert r.status_code == 200
    clientes = r.json()
    assert isinstance(clientes, list)
    # Cliente Teste should exist (from seed order #2)
    nomes = [c.get("nome") for c in clientes]
    assert "Cliente Teste" in nomes, nomes
    ct = next(c for c in clientes if c["nome"] == "Cliente Teste")
    assert "endereco" in ct


# --- PRODUTO DETALHES (cosmic) ---
def test_produto_detalhes_get_and_put(hdrs):
    produtos = requests.get(f"{API}/produtos", headers=hdrs, timeout=30).json()
    assert produtos
    pid = produtos[0]["id"]
    # GET (will create default if absent)
    r = requests.get(f"{API}/produtos/{pid}/detalhes", headers=hdrs, timeout=30)
    assert r.status_code == 200
    det = r.json()
    for k in ("descricao_pt", "ingredientes_chave", "nutricionais", "estrutura"):
        assert k in det
    assert "produto" in det

    # PUT
    payload = {
        "descricao_pt": "TEST_desc_pt",
        "descricao_en": "TEST_desc_en",
        "foto_path": "",
        "local": "Confeitaria MM",
        "ingredientes_chave": ["leite", "açúcar"],
        "nutricionais": [{"label": "Carbs", "valor": 25.0, "unidade": "g", "max_ref": 100}],
        "estrutura": [{"nome": "Base", "nivel": 80}],
        "crocancia": 60, "cremor": 70, "suavidade": 50,
        "tempo_preparo": "30min", "temp_assamento": "180C",
        "rendimento": "10 porções", "armazenamento": "Geladeira",
        "validade_dias": "5", "alergenos": ["leite"], "sugestao_servico": ["servir frio"]
    }
    r2 = requests.put(f"{API}/produtos/{pid}/detalhes", headers=hdrs, json=payload, timeout=30)
    assert r2.status_code == 200, r2.text
    # Verify persistence
    r3 = requests.get(f"{API}/produtos/{pid}/detalhes", headers=hdrs, timeout=30).json()
    assert r3["descricao_pt"] == "TEST_desc_pt"
    assert r3["ingredientes_chave"] == ["leite", "açúcar"]
    assert r3["nutricionais"][0]["label"] == "Carbs"


# --- UPLOAD ---
def test_upload_file(hdrs, token):
    # Tiny PNG (1x1)
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000d49444154789c63f8cf00000003000180d80f5e0000000049454e44ae426082"
    )
    files = {"file": ("t.png", png, "image/png")}
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{API}/upload", headers=headers, files=files, timeout=60)
    assert r.status_code == 200, r.text
    p = r.json()["path"]
    assert p.startswith("mm-confeitaria/uploads/")
    # GET via /api/files?auth=
    r2 = requests.get(f"{API}/files/{p}?auth={token}", timeout=60)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/")
