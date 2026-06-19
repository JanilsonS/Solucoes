"""Backend tests for MM Confeitaria & Eventos"""
import os, requests, pytest, uuid

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://ficha-tecnica-3.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@mm.com", "password": "mm123456"})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def H(token):
    return {"Authorization": f"Bearer {token}"}

def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "x@y.com", "password": "bad"})
    assert r.status_code == 401

def test_auth_me(H):
    r = requests.get(f"{API}/auth/me", headers=H)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@mm.com"

def test_dashboard(H):
    r = requests.get(f"{API}/dashboard", headers=H)
    assert r.status_code == 200
    d = r.json()
    for k in ["faturamento_mes", "pedidos_mes", "ticket_medio", "top_produtos", "faturamento_6m", "status_producao"]:
        assert k in d

def test_groups_crud(H):
    suf = uuid.uuid4().hex[:6]
    r = requests.post(f"{API}/groups", json={"tipo": "materia_prima", "nome": f"TEST_MP_{suf}"}, headers=H)
    assert r.status_code == 200, r.text
    gid = r.json()["id"]
    r = requests.get(f"{API}/groups?tipo=materia_prima", headers=H)
    assert r.status_code == 200 and any(g["id"] == gid for g in r.json())
    requests.delete(f"{API}/groups/{gid}", headers=H)

def test_materia_prima_crud(H):
    suf = uuid.uuid4().hex[:6]
    payload = {"codigo": f"TEST{suf}", "descricao": "Farinha", "unidade": "kg", "quantidade": 2, "custo_total": 10}
    r = requests.post(f"{API}/materias-primas", json=payload, headers=H)
    assert r.status_code == 200, r.text
    mp = r.json()
    assert mp["custo_unitario"] == 5.0
    iid = mp["id"]
    # GET list contains
    r = requests.get(f"{API}/materias-primas", headers=H)
    assert any(x["id"] == iid for x in r.json())
    # update
    payload["custo_total"] = 20
    r = requests.put(f"{API}/materias-primas/{iid}", json=payload, headers=H)
    assert r.status_code == 200
    r = requests.get(f"{API}/materias-primas", headers=H)
    item = next(x for x in r.json() if x["id"] == iid)
    assert item["custo_unitario"] == 10.0
    requests.delete(f"{API}/materias-primas/{iid}", headers=H)

def test_equipamentos(H):
    suf = uuid.uuid4().hex[:6]
    r = requests.post(f"{API}/equipamentos", json={"codigo": f"EQ{suf}", "descricao": "Forno", "unidade": "h", "valor_compra": 1000, "meses": 10, "horas_mes": 100}, headers=H)
    assert r.status_code == 200
    iid = r.json()["id"]
    r = requests.get(f"{API}/equipamentos", headers=H)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total_valor_compra" in data
    item = next(x for x in data["items"] if x["id"] == iid)
    assert abs(item["custo_hora"] - 1.0) < 0.001
    requests.delete(f"{API}/equipamentos/{iid}", headers=H)

def test_custos(H):
    suf = uuid.uuid4().hex[:6]
    r = requests.post(f"{API}/custos", json={"codigo": f"C{suf}", "descricao": "Luz", "valor_mensal": 200, "horas_mes": 100}, headers=H)
    assert r.status_code == 200
    iid = r.json()["id"]
    r = requests.get(f"{API}/custos", headers=H)
    item = next(x for x in r.json() if x["id"] == iid)
    assert item["custo_hora"] == 2.0
    requests.delete(f"{API}/custos/{iid}", headers=H)

def test_produtos_markup_ficha_tabela(H):
    suf = uuid.uuid4().hex[:6]
    # Create produto
    r = requests.post(f"{API}/produtos", json={"codigo": f"P{suf}", "descricao": "Bolo TEST", "unidade": "un", "status": "ATIVO"}, headers=H)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # Create MP
    r = requests.post(f"{API}/materias-primas", json={"codigo": f"MP{suf}", "descricao": "Acucar", "unidade": "kg", "quantidade": 1, "custo_total": 5}, headers=H)
    mp_id = r.json()["id"]
    # Markup INDICE
    r = requests.post(f"{API}/markups", json={"descricao": f"IMP_{suf}", "indice": 10, "grupo": "INDICE"}, headers=H)
    assert r.status_code == 200, r.text
    idx_id = r.json()["id"]
    # Markup LUCRO
    r = requests.post(f"{API}/markups", json={"descricao": f"LUC_{suf}", "grupo": "LUCRO", "lucro1": 20, "lucro2": 30, "lucro3": 40, "lucro4": 50}, headers=H)
    assert r.status_code == 200, r.text
    luc_id = r.json()["id"]
    # Ficha
    r = requests.put(f"{API}/fichas-tecnicas/{pid}", json={
        "produto_id": pid, "peso_total": 1, "margem_lucro_idx": 1, "markup_lucro_id": luc_id,
        "items": [{"tipo": "materia_prima", "ref_id": mp_id, "quantidade": 2}]
    }, headers=H)
    assert r.status_code == 200, r.text
    f = r.json()
    assert f["total_custo"] == 10.0
    assert f["preco_recomendado"] > 10
    # Tabela
    r = requests.get(f"{API}/tabela-precos", headers=H)
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert any(row["produto_id"] == pid for row in rows)
    row = next(row for row in rows if row["produto_id"] == pid)
    assert len(row["precos_finais"]) == 4
    # Perda
    r = requests.put(f"{API}/produtos/{pid}/perda", json={"perda_pct": 5}, headers=H)
    assert r.status_code == 200

    # Pedido
    r = requests.post(f"{API}/pedidos", json={
        "cliente_nome": "TEST Cliente", "cliente_telefone": f"119{suf}", "forma_pagamento": "PIX",
        "aprovacao": "APROVADO", "itens": [{"produto_id": pid, "quantidade": 2, "preco_unitario": 50}],
        "receita_comercial": [{"descricao": "frete", "valor": 10}], "desconto_pct": 10
    }, headers=H)
    assert r.status_code == 200, r.text
    ped = r.json()
    assert ped["subtotal"] == 100
    assert ped["receita_comercial_total"] == 10
    assert abs(ped["desconto_valor"] - 11) < 0.01
    assert abs(ped["total"] - 99) < 0.01
    assert ped["numero"] >= 1
    ped_id = ped["id"]
    # Get pedido
    r = requests.get(f"{API}/pedidos/{ped_id}", headers=H)
    assert r.status_code == 200
    # DRE
    r = requests.get(f"{API}/dre", headers=H)
    assert r.status_code == 200
    dre = r.json()
    assert dre["receita_faturada"]["total"] > 0
    assert "deducoes" in dre and "cpv" in dre

    # cleanup
    requests.delete(f"{API}/pedidos/{ped_id}", headers=H)
    requests.delete(f"{API}/produtos/{pid}", headers=H)
    requests.delete(f"{API}/materias-primas/{mp_id}", headers=H)
    requests.delete(f"{API}/markups/{idx_id}", headers=H)
    requests.delete(f"{API}/markups/{luc_id}", headers=H)
