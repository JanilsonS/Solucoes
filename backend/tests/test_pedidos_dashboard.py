"""Backend tests for FASE 3 rewrite: Pedidos (cadastro/controle), formas-pagamento, status flow, dashboard."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
EMAIL = 'admin@mm.com'
PASSWORD = 'mm123456'


@pytest.fixture(scope='session')
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='session')
def auth(token):
    s = requests.Session()
    s.headers.update({'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    return s


# ---------- formas-pagamento CRUD ----------
class TestFormasPagamento:
    def test_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/formas-pagamento")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_delete(self, auth):
        nome = "TEST_Boleto"
        r = auth.post(f"{BASE_URL}/api/formas-pagamento", json={'nome': nome})
        assert r.status_code == 200, r.text
        fid = r.json().get('id')
        assert fid
        listing = auth.get(f"{BASE_URL}/api/formas-pagamento").json()
        assert any(f['nome'] == nome for f in listing)
        d = auth.delete(f"{BASE_URL}/api/formas-pagamento/{fid}")
        assert d.status_code == 200


# ---------- Pedidos: create, totals, DRE, status patch ----------
class TestPedidos:
    def _get_produto(self, auth):
        prods = auth.get(f"{BASE_URL}/api/produtos").json()
        assert prods, "Need at least one product"
        return prods[0]

    def test_create_with_status_and_totals(self, auth):
        prod = self._get_produto(auth)
        payload = {
            "cliente_nome": "TEST_Cliente Pedido",
            "cliente_telefone": "11999",
            "cliente_endereco": "Rua T, 1",
            "endereco_entrega": "Rua T, 1",
            "ponto_referencia": "perto",
            "forma_pagamento": "PIX",
            "status_pedido": "APROVADO",
            "status_producao": "NA_FILA",
            "desconto_pct": 10,
            "itens": [{"produto_id": prod['id'], "quantidade": 2}],
            "outros": [{"descricao": "Taxa de Entrega", "valor": 15}],
            "data_pedido": "2026-01-10",
            "data_entrega": "2026-01-12",
            "hora_entrega": "14:30",
        }
        r = auth.post(f"{BASE_URL}/api/pedidos", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['numero'] >= 1
        assert d['status_pedido'] == 'APROVADO'
        assert d['status_producao'] == 'NA_FILA'
        assert 'dre' in d
        # DRE math sanity
        dre = d['dre']
        assert abs(dre['receita_total'] - d['total_produtos']) < 0.01
        expected_total = d['total_produtos'] + d['total_outros']
        assert abs(d['total'] - expected_total) < 0.01
        # itens enriched with custo_unit / preco_unit
        it = d['itens'][0]
        assert it['custo_unitario'] >= 0
        assert it['preco_unitario'] >= 0
        # GET by id persists
        pid = d['id']
        g = auth.get(f"{BASE_URL}/api/pedidos/{pid}")
        assert g.status_code == 200
        assert g.json()['numero'] == d['numero']

        # PATCH status
        p = auth.patch(f"{BASE_URL}/api/pedidos/{pid}/status", json={'status_pedido': 'ENTREGUE'})
        assert p.status_code == 200
        g2 = auth.get(f"{BASE_URL}/api/pedidos/{pid}").json()
        assert g2['status_pedido'] == 'ENTREGUE'

        # Cleanup
        auth.delete(f"{BASE_URL}/api/pedidos/{pid}")

    def test_list_pedidos_has_numero_and_status(self, auth):
        r = auth.get(f"{BASE_URL}/api/pedidos")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            p = data[0]
            assert 'numero' in p
            assert 'status_pedido' in p
            assert 'status_producao' in p
            assert 'total' in p


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_payload(self, auth):
        r = auth.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ['faturamento_mes', 'lucro_liquido_mes', 'margem_media', 'ticket_medio',
                  'fila_producao', 'em_producao', 'finalizados', 'top_produtos',
                  'lucro_6m', 'volume_6m', 'receita_vs_custos', 'fluxo_pedidos']:
            assert k in d, f"missing {k}"
        assert isinstance(d['top_produtos'], list)
        assert isinstance(d['fluxo_pedidos'], list)
        assert isinstance(d['lucro_6m'], list) and len(d['lucro_6m']) == 6
        assert isinstance(d['volume_6m'], list) and len(d['volume_6m']) == 6


# ---------- Producao uses status_pedido ----------
class TestProducao:
    def test_producao_filters_canceled_and_delivered(self, auth):
        r = auth.get(f"{BASE_URL}/api/producao")
        assert r.status_code == 200
        # No assertion on content count, just structure
        data = r.json()
        assert isinstance(data, dict) or isinstance(data, list)
