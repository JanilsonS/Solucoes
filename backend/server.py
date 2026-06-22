from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'mm-confeitaria-secret-key-change-in-prod')
JWT_ALG = 'HS256'
JWT_EXPIRE_HOURS = 24 * 7

app = FastAPI(title="MM Confeitaria & Eventos - Sistema de Gestão")
api = APIRouter(prefix="/api")
security = HTTPBearer()

logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ====================== OBJECT STORAGE ======================
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "mm-confeitaria"
MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ====================== AUTH ======================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nome: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    nome: str


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(uid: str) -> str:
    payload = {"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_user(cred: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload['sub']
    except Exception:
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user


@api.post("/auth/register")
async def register(data: UserCreate):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email já cadastrado")
    user = {"id": new_id(), "email": data.email, "nome": data.nome, "password": hash_pw(data.password), "created_at": now_iso()}
    await db.users.insert_one(user)
    token = make_token(user['id'])
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "nome": user['nome']}}


@api.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_pw(data.password, user['password']):
        raise HTTPException(401, "Credenciais inválidas")
    token = make_token(user['id'])
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "nome": user['nome']}}


@api.get("/auth/me")
async def me(u=Depends(get_user)):
    return u


# ====================== GROUPS ======================
GroupType = Literal["materia_prima", "equipamento", "custo", "produto", "markup_indice", "markup_lucro"]


class GroupIn(BaseModel):
    tipo: GroupType
    nome: str


@api.get("/groups")
async def list_groups(tipo: Optional[str] = None, u=Depends(get_user)):
    q = {"tipo": tipo} if tipo else {}
    return await db.groups.find(q, {"_id": 0}).sort("nome", 1).to_list(1000)


@api.post("/groups")
async def create_group(data: GroupIn, u=Depends(get_user)):
    if await db.groups.find_one({"tipo": data.tipo, "nome": data.nome}):
        raise HTTPException(400, "Grupo já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.groups.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/groups/{gid}")
async def delete_group(gid: str, u=Depends(get_user)):
    g = await db.groups.find_one({"id": gid})
    if not g:
        raise HTTPException(404, "Não encontrado")
    # check usage
    tipo = g['tipo']
    coll_map = {"materia_prima": "materias_primas", "equipamento": "equipamentos", "custo": "custos", "produto": "produtos", "markup_indice": "markups", "markup_lucro": "markups"}
    coll = coll_map.get(tipo)
    if coll and await db[coll].find_one({"grupo_id": gid}):
        raise HTTPException(400, "Grupo em uso, não pode ser excluído")
    await db.groups.delete_one({"id": gid})
    return {"ok": True}


# ====================== MATERIA PRIMA ======================
class MateriaPrimaIn(BaseModel):
    codigo: str
    descricao: str
    unidade: str
    marca: Optional[str] = ""
    fornecedor: Optional[str] = ""
    quantidade: float = 0
    custo_total: float = 0
    estoque_inicial_qtd: Optional[float] = None
    estoque_inicial_val: Optional[float] = None
    grupo_id: Optional[str] = None


def calc_custo_unit(qt: float, ct: float) -> float:
    return (ct / qt) if qt else 0


@api.get("/materias-primas")
async def list_mp(u=Depends(get_user)):
    items = await db.materias_primas.find({}, {"_id": 0}).sort("codigo", 1).to_list(5000)
    for it in items:
        it['custo_unitario'] = calc_custo_unit(it.get('quantidade', 0), it.get('custo_total', 0))
    return items


@api.post("/materias-primas")
async def create_mp(data: MateriaPrimaIn, u=Depends(get_user)):
    if await db.materias_primas.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    if doc.get("estoque_inicial_qtd") is None:
        doc["estoque_inicial_qtd"] = doc.get("quantidade", 0)
        doc["estoque_inicial_val"] = doc.get("custo_total", 0)
    await db.materias_primas.insert_one(doc)
    await recompute_mp_estoque()
    fresh = await db.materias_primas.find_one({"id": doc["id"]}, {"_id": 0})
    fresh['custo_unitario'] = calc_custo_unit(fresh.get('quantidade', 0), fresh.get('custo_total', 0))
    return fresh


@api.put("/materias-primas/{iid}")
async def update_mp(iid: str, data: MateriaPrimaIn, u=Depends(get_user)):
    existing = await db.materias_primas.find_one({"id": iid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    if data.codigo != existing['codigo'] and await db.materias_primas.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    payload = data.model_dump()
    # quantidade e custo_total são calculados pelo Movimento de MP (somente leitura no cadastro)
    payload.pop("quantidade", None)
    payload.pop("custo_total", None)
    if payload.get("estoque_inicial_qtd") is None:
        payload.pop("estoque_inicial_qtd", None)
    if payload.get("estoque_inicial_val") is None:
        payload.pop("estoque_inicial_val", None)
    await db.materias_primas.update_one({"id": iid}, {"$set": payload})
    await recompute_mp_estoque()
    return {"ok": True}


@api.delete("/materias-primas/{iid}")
async def delete_mp(iid: str, u=Depends(get_user)):
    if await db.fichas_tecnicas.find_one({"items.tipo": {"$in": ["materia_prima", "confeito", "saborizacao", "embalagem"]}, "items.ref_id": iid}):
        raise HTTPException(400, "Item em uso em ficha técnica")
    await db.materias_primas.delete_one({"id": iid})
    return {"ok": True}


# ====================== EQUIPAMENTOS ======================
class EquipamentoIn(BaseModel):
    codigo: str
    descricao: str
    unidade: str
    quantidade: float = 0
    valor_compra: float = 0
    meses: float = 0
    horas_mes: float = 0
    grupo_id: Optional[str] = None


def calc_custo_hora_eq(valor: float, meses: float, horas: float) -> float:
    return (valor / meses / horas) if (meses and horas) else 0


@api.get("/equipamentos")
async def list_eq(u=Depends(get_user)):
    items = await db.equipamentos.find({}, {"_id": 0}).sort("codigo", 1).to_list(5000)
    total = 0
    for it in items:
        it['custo_hora'] = calc_custo_hora_eq(it.get('valor_compra', 0), it.get('meses', 0), it.get('horas_mes', 0))
        total += it.get('valor_compra', 0)
    return {"items": items, "total_valor_compra": total}


@api.post("/equipamentos")
async def create_eq(data: EquipamentoIn, u=Depends(get_user)):
    if await db.equipamentos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.equipamentos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/equipamentos/{iid}")
async def update_eq(iid: str, data: EquipamentoIn, u=Depends(get_user)):
    existing = await db.equipamentos.find_one({"id": iid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    if data.codigo != existing['codigo'] and await db.equipamentos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    await db.equipamentos.update_one({"id": iid}, {"$set": data.model_dump()})
    return {"ok": True}


@api.delete("/equipamentos/{iid}")
async def delete_eq(iid: str, u=Depends(get_user)):
    if await db.fichas_tecnicas.find_one({"items.tipo": "tempo_maquina", "items.ref_id": iid}):
        raise HTTPException(400, "Equipamento em uso em ficha técnica")
    await db.equipamentos.delete_one({"id": iid})
    return {"ok": True}


# ====================== CUSTOS ======================
class CustoIn(BaseModel):
    codigo: str
    descricao: str
    valor_mensal: float = 0
    grupo_id: Optional[str] = None


async def get_horas_mes_global() -> float:
    cfg = await db.configuracoes.find_one({"id": "global"}, {"_id": 0})
    return (cfg or {}).get("horas_mes_global", 220) or 0


DEFAULT_WHATSAPP_TEMPLATE = (
    "Olá, {cliente}! 🎂\n"
    "Confirmação do seu pedido nº {numero} — *MM Confeitaria & Eventos*\n"
    "\n"
    "{itens}\n"
    "{outros}"
    "\n"
    "*Total do pedido: {total}*\n"
    "📅 Entrega: {entrega}\n"
    "📍 {endereco}\n"
    "💳 Pagamento: {forma_pagamento}\n"
    "\n"
    "Qualquer dúvida, estou à disposição! 💕"
)


@api.get("/config")
async def get_config(u=Depends(get_user)):
    cfg = await db.configuracoes.find_one({"id": "global"}, {"_id": 0})
    if not cfg:
        cfg = {"id": "global"}
    cfg.setdefault("horas_mes_global", 220)
    cfg.setdefault("whatsapp_template", DEFAULT_WHATSAPP_TEMPLATE)
    return cfg


class ConfigIn(BaseModel):
    horas_mes_global: Optional[float] = None
    whatsapp_template: Optional[str] = None


@api.put("/config")
async def update_config(data: ConfigIn, u=Depends(get_user)):
    upd = {"id": "global"}
    if data.horas_mes_global is not None:
        upd["horas_mes_global"] = data.horas_mes_global
    if data.whatsapp_template is not None:
        upd["whatsapp_template"] = data.whatsapp_template
    await db.configuracoes.update_one({"id": "global"}, {"$set": upd}, upsert=True)
    return {"ok": True}


@api.get("/custos")
async def list_custos(u=Depends(get_user)):
    items = await db.custos.find({}, {"_id": 0}).sort("codigo", 1).to_list(5000)
    hm = await get_horas_mes_global()
    for it in items:
        it['horas_mes'] = hm
        it['custo_hora'] = (it.get('valor_mensal', 0) / hm) if hm else 0
    return items


@api.post("/custos")
async def create_custo(data: CustoIn, u=Depends(get_user)):
    if await db.custos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.custos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/custos/{iid}")
async def update_custo(iid: str, data: CustoIn, u=Depends(get_user)):
    existing = await db.custos.find_one({"id": iid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    if data.codigo != existing['codigo'] and await db.custos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    await db.custos.update_one({"id": iid}, {"$set": data.model_dump()})
    return {"ok": True}


@api.delete("/custos/{iid}")
async def delete_custo(iid: str, u=Depends(get_user)):
    if await db.fichas_tecnicas.find_one({"items.tipo": "custo_indireto", "items.ref_id": iid}):
        raise HTTPException(400, "Custo em uso em ficha técnica")
    await db.custos.delete_one({"id": iid})
    return {"ok": True}


# ====================== PRODUTOS ======================
class ProdutoIn(BaseModel):
    codigo: str
    descricao: str
    unidade: str
    status: Literal["ATIVO", "SUSPENSO"] = "ATIVO"
    grupo_id: Optional[str] = None


@api.get("/produtos")
async def list_produtos(status_f: Optional[str] = None, u=Depends(get_user)):
    q = {"status": status_f} if status_f else {}
    return await db.produtos.find(q, {"_id": 0}).sort("codigo", 1).to_list(5000)


@api.post("/produtos")
async def create_produto(data: ProdutoIn, u=Depends(get_user)):
    if await db.produtos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.produtos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/produtos/{iid}")
async def update_produto(iid: str, data: ProdutoIn, u=Depends(get_user)):
    existing = await db.produtos.find_one({"id": iid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    if data.codigo != existing['codigo'] and await db.produtos.find_one({"codigo": data.codigo}):
        raise HTTPException(400, "Código já existe")
    await db.produtos.update_one({"id": iid}, {"$set": data.model_dump()})
    return {"ok": True}


@api.delete("/produtos/{iid}")
async def delete_produto(iid: str, u=Depends(get_user)):
    if await db.fichas_tecnicas.find_one({"items.tipo": "semi_acabado", "items.ref_id": iid}):
        raise HTTPException(400, "Produto em uso como semi-acabado")
    if await db.pedidos.find_one({"itens.produto_id": iid}):
        raise HTTPException(400, "Produto em uso em pedidos")
    await db.produtos.delete_one({"id": iid})
    await db.fichas_tecnicas.delete_one({"produto_id": iid})
    return {"ok": True}


# ====================== MARKUP ======================
class MarkupIn(BaseModel):
    descricao: str
    indice: float = 0  # percent
    grupo: Literal["INDICE", "LUCRO"]
    lucro1: Optional[float] = 0
    lucro2: Optional[float] = 0
    lucro3: Optional[float] = 0
    lucro4: Optional[float] = 0
    selecionada: Optional[int] = 1  # for LUCRO, which alíquota is active (1-4)


@api.get("/markups")
async def list_markups(u=Depends(get_user)):
    return await db.markups.find({}, {"_id": 0}).sort("grupo", 1).to_list(1000)


@api.post("/markups")
async def create_markup(data: MarkupIn, u=Depends(get_user)):
    if await db.markups.find_one({"descricao": data.descricao}):
        raise HTTPException(400, "Descrição já existe")
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.markups.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/markups/{iid}")
async def update_markup(iid: str, data: MarkupIn, u=Depends(get_user)):
    if not await db.markups.find_one({"id": iid}):
        raise HTTPException(404, "Não encontrado")
    await db.markups.update_one({"id": iid}, {"$set": data.model_dump()})
    return {"ok": True}


@api.delete("/markups/{iid}")
async def delete_markup(iid: str, u=Depends(get_user)):
    await db.markups.delete_one({"id": iid})
    return {"ok": True}


# ====================== FICHA TECNICA ======================
class FichaItemIn(BaseModel):
    tipo: Literal["materia_prima", "confeito", "saborizacao", "embalagem", "semi_acabado", "tempo_maquina", "custo_indireto"]
    ref_id: str
    ref_tipo: Optional[str] = "conta"  # for custo_indireto: 'conta' or 'grupo'
    quantidade: float = 0


class FichaIn(BaseModel):
    produto_id: str
    peso_total: float = 0
    margem_lucro_idx: Optional[int] = 1  # 1-4 from selected LUCRO markup
    markup_lucro_id: Optional[str] = None
    items: List[FichaItemIn] = []


async def compute_ficha_costs(ficha: dict) -> dict:
    """Returns enriched ficha with per-item costs and subtotals."""
    enriched_items = []
    subtotals = {k: 0.0 for k in ["materia_prima", "confeito", "saborizacao", "embalagem", "semi_acabado", "tempo_maquina", "custo_indireto"]}
    hm_global = await get_horas_mes_global()

    for it in ficha.get("items", []):
        tipo = it['tipo']
        ref_id = it['ref_id']
        qtd = it.get('quantidade', 0)
        item_data = {**it, "descricao": "", "unidade": "", "marca": "", "custo_unit": 0, "custo_total": 0}

        if tipo in ("materia_prima", "confeito", "saborizacao", "embalagem"):
            mp = await db.materias_primas.find_one({"id": ref_id}, {"_id": 0})
            if mp:
                cu = calc_custo_unit(mp.get('quantidade', 0), mp.get('custo_total', 0))
                item_data.update({"codigo": mp['codigo'], "descricao": mp['descricao'], "unidade": mp['unidade'], "marca": mp.get('marca', ''), "custo_unit": cu, "custo_total": cu * qtd})
        elif tipo == "semi_acabado":
            prod = await db.produtos.find_one({"id": ref_id}, {"_id": 0})
            if prod:
                # Calcula custo do produto recursivamente
                sub_ficha = await db.fichas_tecnicas.find_one({"produto_id": ref_id}, {"_id": 0})
                sub_cost = 0
                if sub_ficha:
                    sub_enriched = await compute_ficha_costs(sub_ficha)
                    sub_cost = sub_enriched['total_custo']
                    if sub_ficha.get('peso_total', 0) > 0:
                        sub_cost = sub_cost / sub_ficha['peso_total']
                item_data.update({"codigo": prod['codigo'], "descricao": prod['descricao'], "unidade": prod['unidade'], "custo_unit": sub_cost, "custo_total": sub_cost * qtd})
        elif tipo == "tempo_maquina":
            eq = await db.equipamentos.find_one({"id": ref_id}, {"_id": 0})
            if eq:
                ch = calc_custo_hora_eq(eq.get('valor_compra', 0), eq.get('meses', 0), eq.get('horas_mes', 0))
                item_data.update({"codigo": eq['codigo'], "descricao": eq['descricao'], "unidade": eq['unidade'], "custo_unit": ch, "custo_total": ch * qtd})
        elif tipo == "custo_indireto":
            ref_tipo = it.get('ref_tipo', 'conta')
            if ref_tipo == 'conta':
                c = await db.custos.find_one({"id": ref_id}, {"_id": 0})
                if c:
                    ch = (c.get('valor_mensal', 0) / hm_global) if hm_global else 0
                    item_data.update({"codigo": c['codigo'], "descricao": c['descricao'], "unidade": "h", "custo_unit": ch, "custo_total": ch * qtd})
            else:  # grupo
                g = await db.groups.find_one({"id": ref_id}, {"_id": 0})
                if g:
                    items_g = await db.custos.find({"grupo_id": ref_id}, {"_id": 0}).to_list(1000)
                    total_vm = sum(c.get('valor_mensal', 0) for c in items_g)
                    ch = (total_vm / hm_global) if hm_global else 0
                    item_data.update({"codigo": g['id'][:6], "descricao": f"[Grupo] {g['nome']}", "unidade": "h", "custo_unit": ch, "custo_total": ch * qtd})

        subtotals[tipo] += item_data['custo_total']
        enriched_items.append(item_data)

    total_custo = sum(subtotals.values())

    # markup calc
    indices = await db.markups.find({"grupo": "INDICE"}, {"_id": 0}).to_list(1000)
    total_indices = sum(m.get('indice', 0) for m in indices)
    margem_lucro = 0
    idx = ficha.get('margem_lucro_idx', 1) or 1
    lucros_disponiveis = []
    ml = None
    if ficha.get('markup_lucro_id'):
        ml = await db.markups.find_one({"id": ficha['markup_lucro_id']}, {"_id": 0})
    if ml:
        lucros_disponiveis = [ml.get(f'lucro{i}', 0) or 0 for i in range(1, 5)]
    # 5th option: produto individual % lucro from price table
    lucro_individual = 0
    if ficha.get('produto_id'):
        prod_doc = await db.produtos.find_one({"id": ficha['produto_id']}, {"_id": 0})
        if prod_doc:
            lucro_individual = prod_doc.get('lucro_pct_individual', 0) or 0
    if idx == 5:
        margem_lucro = lucro_individual
    elif ml:
        margem_lucro = ml.get(f'lucro{idx}', 0) or 0

    divisor = 1 - (total_indices + margem_lucro) / 100
    preco_recomendado = (total_custo / divisor) if divisor > 0 else 0

    return {
        **ficha,
        "items": enriched_items,
        "subtotals": subtotals,
        "total_custo": total_custo,
        "total_indices_pct": total_indices,
        "margem_lucro_pct": margem_lucro,
        "lucros_disponiveis": lucros_disponiveis,
        "lucro_individual_pct": lucro_individual,
        "markup_divisor": divisor,
        "preco_recomendado": preco_recomendado,
        "custo_por_unidade": (total_custo / ficha.get('peso_total', 0)) if ficha.get('peso_total') else 0,
    }


@api.get("/fichas-tecnicas/{produto_id}")
async def get_ficha(produto_id: str, u=Depends(get_user)):
    ficha = await db.fichas_tecnicas.find_one({"produto_id": produto_id}, {"_id": 0})
    if not ficha:
        ficha = {"produto_id": produto_id, "peso_total": 0, "items": [], "margem_lucro_idx": 1, "markup_lucro_id": None}
    return await compute_ficha_costs(ficha)


@api.put("/fichas-tecnicas/{produto_id}")
async def save_ficha(produto_id: str, data: FichaIn, u=Depends(get_user)):
    doc = data.model_dump()
    doc['produto_id'] = produto_id
    doc['updated_at'] = now_iso()
    await db.fichas_tecnicas.update_one({"produto_id": produto_id}, {"$set": doc}, upsert=True)
    saved = await db.fichas_tecnicas.find_one({"produto_id": produto_id}, {"_id": 0})
    return await compute_ficha_costs(saved)


# ====================== TABELA DE PREÇO ======================
@api.get("/tabela-precos")
async def tabela_precos(u=Depends(get_user)):
    produtos = await db.produtos.find({"status": "ATIVO"}, {"_id": 0}).sort("codigo", 1).to_list(5000)
    indices = await db.markups.find({"grupo": "INDICE"}, {"_id": 0}).to_list(1000)
    total_indices = sum(m.get('indice', 0) for m in indices)
    lucros = await db.markups.find({"grupo": "LUCRO"}, {"_id": 0}).to_list(1000)

    rows = []
    for p in produtos:
        ficha = await db.fichas_tecnicas.find_one({"produto_id": p['id']}, {"_id": 0})
        if not ficha:
            ficha = {"produto_id": p['id'], "items": []}
        enriched = await compute_ficha_costs(ficha)
        sub = enriched['subtotals']
        custo_producao = sub['materia_prima'] + sub['confeito'] + sub['saborizacao'] + sub['embalagem'] + sub['semi_acabado'] + sub['tempo_maquina'] + sub['custo_indireto']
        perda_pct = p.get('perda_pct', 0)
        custo_com_perda = custo_producao / (1 - perda_pct / 100) if perda_pct < 100 else custo_producao

        precos_finais = []
        if lucros:
            ml = lucros[0]
            for i in range(1, 5):
                lucro = ml.get(f'lucro{i}', 0) or 0
                div = 1 - (total_indices + lucro) / 100
                preco = (custo_com_perda / div) if div > 0 else 0
                precos_finais.append({"lucro_pct": lucro, "preco": preco})

        lucro_individual = p.get('lucro_pct_individual', 0)
        div_ind = 1 - (total_indices + lucro_individual) / 100
        preco_tabela_individual = (custo_com_perda / div_ind) if div_ind > 0 else 0
        rows.append({
            "produto_id": p['id'],
            "codigo": p['codigo'],
            "descricao": p['descricao'],
            "unidade": p['unidade'],
            "subtotals": sub,
            "custo_producao": custo_producao,
            "perda_pct": perda_pct,
            "custo_com_perda": custo_com_perda,
            "precos_finais": precos_finais,
            "lucro_pct_individual": lucro_individual,
            "preco_tabela_individual": preco_tabela_individual,
        })
    return {"rows": rows, "total_indices_pct": total_indices}


class ProdutoPerdaIn(BaseModel):
    perda_pct: float


@api.put("/produtos/{pid}/perda")
async def set_perda(pid: str, data: ProdutoPerdaIn, u=Depends(get_user)):
    await db.produtos.update_one({"id": pid}, {"$set": {"perda_pct": data.perda_pct}})
    return {"ok": True}


# ====================== CLIENTES ======================
class ClienteIn(BaseModel):
    nome: str
    telefone: str
    endereco: Optional[str] = ""


@api.get("/clientes")
async def list_clientes(u=Depends(get_user)):
    return await db.clientes.find({}, {"_id": 0}).sort("nome", 1).to_list(5000)


@api.post("/clientes")
async def upsert_cliente(data: ClienteIn, u=Depends(get_user)):
    existing = await db.clientes.find_one({"telefone": data.telefone})
    if existing:
        upd = {"nome": data.nome, "endereco": data.endereco or existing.get("endereco", "")}
        await db.clientes.update_one({"id": existing['id']}, {"$set": upd})
        existing.pop("_id", None)
        return {**existing, **upd}
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.clientes.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ====================== TABELA DE PREÇO DE VENDA (oficial, versionada) ======================
@api.get("/tabela-venda")
async def get_tabela_venda(u=Depends(get_user)):
    doc = await db.tabela_venda.find_one({"id": "current"}, {"_id": 0})
    return doc or {"id": "current", "data_base": None, "data_base_antiga": None, "rows": []}


@api.post("/tabela-venda/atualizar")
async def atualizar_tabela_venda(u=Depends(get_user)):
    total_indices = await get_total_indices()
    produtos = await db.produtos.find({"status": "ATIVO"}, {"_id": 0}).sort("codigo", 1).to_list(5000)
    current = await db.tabela_venda.find_one({"id": "current"}, {"_id": 0}) or {}
    old_rows = {r['produto_id']: r for r in current.get('rows', [])}
    old_data_base = current.get('data_base')
    new_rows = []
    for p in produtos:
        cu, preco = await produto_precos(p, total_indices)
        prev = old_rows.get(p['id'])
        preco_antigo = prev.get('preco_tabela') if prev else None
        variacao = ((preco - preco_antigo) / preco_antigo * 100) if preco_antigo else None
        new_rows.append({
            "produto_id": p['id'], "codigo": p['codigo'], "descricao": p['descricao'],
            "unidade": p['unidade'], "lucro_pct": p.get('lucro_pct_individual', 0),
            "preco_tabela": preco, "preco_antigo": preco_antigo, "variacao_pct": variacao,
        })
    doc = {"id": "current", "data_base": now_iso(), "data_base_antiga": old_data_base, "rows": new_rows}
    await db.tabela_venda.update_one({"id": "current"}, {"$set": doc}, upsert=True)
    return doc


# ====================== FORMAS DE PAGAMENTO ======================
class FormaIn(BaseModel):
    nome: str


@api.get("/formas-pagamento")
async def list_formas(u=Depends(get_user)):
    items = await db.formas_pagamento.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    if not items:
        for n in ["PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Transferência"]:
            await db.formas_pagamento.insert_one({"id": new_id(), "nome": n})
        items = await db.formas_pagamento.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    return items


@api.post("/formas-pagamento")
async def create_forma(data: FormaIn, u=Depends(get_user)):
    if await db.formas_pagamento.find_one({"nome": data.nome}):
        raise HTTPException(400, "Forma já existe")
    doc = {"id": new_id(), "nome": data.nome}
    await db.formas_pagamento.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/formas-pagamento/{fid}")
async def delete_forma(fid: str, u=Depends(get_user)):
    await db.formas_pagamento.delete_one({"id": fid})
    return {"ok": True}


# ====================== PEDIDOS ======================
class PedidoItemIn(BaseModel):
    produto_id: str
    quantidade: float = 0
    custo_unitario: float = 0
    preco_unitario: float = 0


class OutroItemIn(BaseModel):
    descricao: str
    valor: float = 0


class PedidoIn(BaseModel):
    cliente_id: Optional[str] = None
    cliente_nome: str
    cliente_telefone: Optional[str] = ""
    cliente_endereco: Optional[str] = ""
    endereco_entrega: Optional[str] = ""
    ponto_referencia: Optional[str] = ""
    forma_pagamento: Optional[str] = ""
    status_pedido: Literal["CANCELADO", "APROVADO", "ENTREGUE"] = "APROVADO"
    status_producao: Literal["NA_FILA", "EM_PRODUCAO", "FINALIZADO"] = "NA_FILA"
    status_financeiro: Literal["ABERTO", "RECEBIDO"] = "ABERTO"
    desconto_pct: float = 0
    itens: List[PedidoItemIn] = []
    outros: List[OutroItemIn] = []
    observacoes: Optional[str] = ""
    data_pedido: Optional[str] = None
    data_entrega: Optional[str] = None
    data_vencimento: Optional[str] = None
    hora_entrega: Optional[str] = None


async def next_pedido_num() -> int:
    counter = await db.counters.find_one_and_update(
        {"_id": "pedido"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return counter.get('seq', 1) if counter else 1


async def get_total_indices() -> float:
    indices = await db.markups.find({"grupo": "INDICE"}, {"_id": 0}).to_list(1000)
    return sum(m.get('indice', 0) for m in indices)


async def produto_precos(prod: dict, total_indices: float):
    """Retorna (custo_com_perda [col.13], preco_tabela [col.15]) do produto."""
    ficha = await db.fichas_tecnicas.find_one({"produto_id": prod['id']}, {"_id": 0}) or {"produto_id": prod['id'], "items": []}
    enr = await compute_ficha_costs(ficha)
    custo_producao = sum(enr['subtotals'].values())
    perda = prod.get('perda_pct', 0)
    custo_com_perda = custo_producao / (1 - perda / 100) if perda < 100 else custo_producao
    lucro_ind = prod.get('lucro_pct_individual', 0)
    div = 1 - (total_indices + lucro_ind) / 100
    preco_tabela = custo_com_perda / div if div > 0 else 0
    return custo_com_perda, preco_tabela


async def build_pedido_totals(doc: dict) -> dict:
    total_indices = await get_total_indices()
    tv = await db.tabela_venda.find_one({"id": "current"}, {"_id": 0})
    preco_oficial = {r['produto_id']: r.get('preco_tabela', 0) for r in (tv or {}).get('rows', [])}
    for it in doc.get('itens', []):
        prod = await db.produtos.find_one({"id": it['produto_id']}, {"_id": 0})
        if prod:
            cu, pu = await produto_precos(prod, total_indices)
            it['custo_unitario'] = cu
            it['preco_unitario'] = preco_oficial.get(it['produto_id'], pu)
            it['custo_total'] = it['custo_unitario'] * it.get('quantidade', 0)
            it['preco_total'] = it['preco_unitario'] * it.get('quantidade', 0)
    subtotal_produtos = sum(i.get('preco_total', 0) for i in doc.get('itens', []))
    desconto_val = subtotal_produtos * (doc.get('desconto_pct', 0) / 100)
    total_produtos = subtotal_produtos - desconto_val
    total_outros = sum(o.get('valor', 0) for o in doc.get('outros', []))
    total_pedido = total_produtos + total_outros
    custo_produtos = sum(i.get('custo_total', 0) for i in doc.get('itens', []))
    receita_total = total_produtos
    deducoes = receita_total * (total_indices / 100)
    resultado_liquido = receita_total - deducoes - custo_produtos
    margem_pct = (resultado_liquido / receita_total * 100) if receita_total else 0
    doc.update({
        "subtotal_produtos": subtotal_produtos,
        "desconto_valor": desconto_val,
        "total_produtos": total_produtos,
        "total_outros": total_outros,
        "total": total_pedido,
        "custo_produtos": custo_produtos,
        "total_indices_pct": total_indices,
        "dre": {
            "receita_total": receita_total,
            "deducoes": deducoes,
            "custo_produtos": custo_produtos,
            "resultado_liquido": resultado_liquido,
            "margem_pct": margem_pct,
            "total_indices_pct": total_indices,
        },
    })
    return doc


def _enrich_pedido_items(p: dict, produtos_map: dict):
    for it in p.get('itens', []):
        prod = produtos_map.get(it['produto_id'])
        if prod:
            it['descricao'] = prod['descricao']
            it['unidade'] = prod['unidade']
            it['codigo'] = prod['codigo']


@api.get("/pedidos")
async def list_pedidos(u=Depends(get_user)):
    pedidos = await db.pedidos.find({}, {"_id": 0}).sort("numero", -1).to_list(5000)
    prods = await db.produtos.find({}, {"_id": 0}).to_list(5000)
    pmap = {p['id']: p for p in prods}
    for p in pedidos:
        _enrich_pedido_items(p, pmap)
    return pedidos


@api.get("/pedidos/{pid}")
async def get_pedido(pid: str, u=Depends(get_user)):
    p = await db.pedidos.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Não encontrado")
    prods = await db.produtos.find({}, {"_id": 0}).to_list(5000)
    _enrich_pedido_items(p, {x['id']: x for x in prods})
    return p


@api.post("/pedidos")
async def create_pedido(data: PedidoIn, u=Depends(get_user)):
    num = await next_pedido_num()
    if data.cliente_nome:
        await upsert_cliente(ClienteIn(nome=data.cliente_nome, telefone=data.cliente_telefone or "", endereco=data.cliente_endereco or ""), u)
    doc = {"id": new_id(), "numero": num, **data.model_dump(), "created_at": now_iso()}
    doc = await build_pedido_totals(doc)
    await db.pedidos.insert_one(doc)
    await recompute_mp_estoque()
    doc.pop("_id", None)
    return doc


@api.put("/pedidos/{pid}")
async def update_pedido(pid: str, data: PedidoIn, u=Depends(get_user)):
    existing = await db.pedidos.find_one({"id": pid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    doc = data.model_dump()
    doc['numero'] = existing.get('numero')
    doc = await build_pedido_totals(doc)
    await db.pedidos.update_one({"id": pid}, {"$set": doc})
    await recompute_mp_estoque()
    return {"ok": True}


class StatusUpdateIn(BaseModel):
    status_pedido: Optional[str] = None
    status_producao: Optional[str] = None


@api.patch("/pedidos/{pid}/status")
async def update_status(pid: str, data: StatusUpdateIn, u=Depends(get_user)):
    upd = {}
    if data.status_pedido is not None:
        upd['status_pedido'] = data.status_pedido
    if data.status_producao is not None:
        upd['status_producao'] = data.status_producao
    if upd:
        await db.pedidos.update_one({"id": pid}, {"$set": upd})
        await recompute_mp_estoque()
    return {"ok": True}


@api.delete("/pedidos/{pid}")
async def delete_pedido(pid: str, u=Depends(get_user)):
    await db.pedidos.delete_one({"id": pid})
    return {"ok": True}


# ====================== DRE ======================
@api.get("/dre")
async def dre(data_inicio: Optional[str] = None, data_fim: Optional[str] = None, u=Depends(get_user)):
    # default: current month
    now = datetime.now(timezone.utc)
    if not data_inicio:
        data_inicio = now.replace(day=1).isoformat()
    if not data_fim:
        data_fim = now.isoformat()

    pedidos = await db.pedidos.find({
        "status_pedido": {"$in": ["APROVADO", "ENTREGUE"]},
        "created_at": {"$gte": data_inicio, "$lte": data_fim}
    }, {"_id": 0}).to_list(10000)

    # Receita Faturada por grupo > produto
    receita_por_grupo: Dict[str, Dict[str, float]] = {}
    receita_comercial_total = 0.0
    receita_comercial_detalhe: Dict[str, float] = {}

    # CPV subtotals
    cpv = {k: 0.0 for k in ["materia_prima", "confeito", "saborizacao", "embalagem", "semi_acabado", "tempo_maquina", "custo_indireto"]}

    total_faturado_produtos = 0.0
    for ped in pedidos:
        for it in ped.get('itens', []):
            prod = await db.produtos.find_one({"id": it['produto_id']}, {"_id": 0})
            if not prod:
                continue
            grupo_id = prod.get('grupo_id')
            grupo_nome = "Sem grupo"
            if grupo_id:
                g = await db.groups.find_one({"id": grupo_id}, {"_id": 0})
                if g:
                    grupo_nome = g['nome']
            receita_por_grupo.setdefault(grupo_nome, {})
            valor = it['quantidade'] * it['preco_unitario']
            receita_por_grupo[grupo_nome].setdefault(prod['descricao'], 0)
            receita_por_grupo[grupo_nome][prod['descricao']] += valor
            total_faturado_produtos += valor

            # CPV
            ficha = await db.fichas_tecnicas.find_one({"produto_id": prod['id']}, {"_id": 0})
            if ficha:
                enr = await compute_ficha_costs(ficha)
                for k, v in enr['subtotals'].items():
                    cpv[k] += v * it['quantidade']

        for rc in ped.get('outros', []):
            receita_comercial_total += rc['valor']
            receita_comercial_detalhe.setdefault(rc['descricao'], 0)
            receita_comercial_detalhe[rc['descricao']] += rc['valor']

    receita_faturada = total_faturado_produtos + receita_comercial_total

    # Deduções (markup índices)
    indices = await db.markups.find({"grupo": "INDICE"}, {"_id": 0}).to_list(1000)
    deducoes_detalhe = []
    deducoes_total = 0.0
    for idx in indices:
        val = receita_faturada * (idx.get('indice', 0) / 100)
        deducoes_detalhe.append({"descricao": idx['descricao'], "indice": idx['indice'], "valor": val})
        deducoes_total += val

    receita_liquida = receita_faturada - deducoes_total
    cpv_total = sum(cpv.values())
    resultado_bruto = receita_liquida - cpv_total

    return {
        "periodo": {"inicio": data_inicio, "fim": data_fim},
        "receita_faturada": {"total": receita_faturada, "produtos_por_grupo": receita_por_grupo, "receita_comercial": receita_comercial_detalhe, "receita_comercial_total": receita_comercial_total, "produtos_total": total_faturado_produtos},
        "deducoes": {"total": deducoes_total, "detalhe": deducoes_detalhe},
        "receita_liquida": receita_liquida,
        "cpv": {"total": cpv_total, "detalhe": cpv},
        "resultado_bruto": resultado_bruto,
    }


# ====================== COMPRAS & ESTOQUE ======================
def _d(s):
    return (s or "")[:10]


async def mp_usage_map():
    """{produto_id: {mp_id: qtd por unidade do produto}}"""
    fichas = await db.fichas_tecnicas.find({}, {"_id": 0}).to_list(10000)
    mp_ids = {m['id'] for m in await db.materias_primas.find({}, {"id": 1}).to_list(10000)}
    usage = {}
    for f in fichas:
        pid = f.get('produto_id')
        if not pid:
            continue
        d = {}
        for it in f.get('items', []):
            if it.get('tipo') in ("materia_prima", "confeito", "saborizacao", "embalagem") and it.get('ref_id') in mp_ids:
                d[it['ref_id']] = d.get(it['ref_id'], 0) + it.get('quantidade', 0)
        if d:
            usage[pid] = d
    return usage


async def _est_inicial(mp):
    """Garante baseline de estoque inicial (migra valores manuais atuais na 1ª vez)."""
    if mp.get('estoque_inicial_qtd') is None:
        eq = mp.get('quantidade', 0) or 0
        ev = mp.get('custo_total', 0) or 0
        await db.materias_primas.update_one({"id": mp['id']}, {"$set": {"estoque_inicial_qtd": eq, "estoque_inicial_val": ev}})
        return eq, ev
    return mp.get('estoque_inicial_qtd', 0) or 0, mp.get('estoque_inicial_val', 0) or 0


async def _mp_movimentos(mid):
    """Entradas (compras) e saídas (produção) para uma MP, lista de transações {data, tipo, qtd, val}."""
    usage = await mp_usage_map()
    trans = []
    compras = await db.compras.find({}, {"_id": 0}).to_list(20000)
    for c in compras:
        for it in c.get('itens', []):
            if it['materia_prima_id'] == mid:
                trans.append({"data": _d(c.get('data_compra') or c.get('created_at')), "tipo": "E", "qtd": it.get('quantidade', 0), "val": it.get('valor_total', 0)})
    pedidos = await db.pedidos.find({"status_producao": "EM_PRODUCAO", "status_pedido": {"$ne": "CANCELADO"}}, {"_id": 0}).to_list(20000)
    for p in pedidos:
        sq = 0
        for it in p.get('itens', []):
            q = usage.get(it['produto_id'], {}).get(mid, 0)
            sq += q * it.get('quantidade', 0)
        if sq:
            trans.append({"data": _d(p.get('data_pedido') or p.get('created_at')), "tipo": "S", "qtd": sq, "val": 0})
    return trans


async def recompute_mp_estoque():
    """Atualiza quantidade/custo_total de cada MP = estoque inicial + entradas - saídas (custo médio)."""
    usage = await mp_usage_map()
    compras = await db.compras.find({}, {"_id": 0}).to_list(20000)
    pedidos = await db.pedidos.find({"status_producao": "EM_PRODUCAO", "status_pedido": {"$ne": "CANCELADO"}}, {"_id": 0}).to_list(20000)
    ent_q, ent_v, sai_q = {}, {}, {}
    for c in compras:
        for it in c.get('itens', []):
            mid = it['materia_prima_id']
            ent_q[mid] = ent_q.get(mid, 0) + it.get('quantidade', 0)
            ent_v[mid] = ent_v.get(mid, 0) + it.get('valor_total', 0)
    for p in pedidos:
        for it in p.get('itens', []):
            for mid, q in usage.get(it['produto_id'], {}).items():
                sai_q[mid] = sai_q.get(mid, 0) + q * it.get('quantidade', 0)
    mps = await db.materias_primas.find({}, {"_id": 0}).to_list(10000)
    for mp in mps:
        mid = mp['id']
        eiq, eiv = await _est_inicial(mp)
        eq, ev, sq = ent_q.get(mid, 0), ent_v.get(mid, 0), sai_q.get(mid, 0)
        avg = ((eiv + ev) / (eiq + eq)) if (eiq + eq) else 0
        qtd_final = eiq + eq - sq
        val_final = avg * qtd_final
        await db.materias_primas.update_one({"id": mid}, {"$set": {"quantidade": qtd_final, "custo_total": val_final}})


# ---- Pedido de Compras ----
class CompraItemIn(BaseModel):
    materia_prima_id: str
    quantidade: float = 0
    valor_total: float = 0


class CompraIn(BaseModel):
    fornecedor: str = ""
    telefone_fornecedor: Optional[str] = ""
    data_compra: Optional[str] = None
    data_vencimento: Optional[str] = None
    status_financeiro: Literal["ABERTO", "PAGO"] = "ABERTO"
    itens: List[CompraItemIn] = []


async def next_compra_code():
    counter = await db.counters.find_one_and_update({"_id": "compra"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    return f"CP{counter.get('seq', 1):03d}"


async def _enrich_compra(c):
    total = 0
    for it in c.get('itens', []):
        mp = await db.materias_primas.find_one({"id": it['materia_prima_id']}, {"_id": 0})
        if mp:
            it['codigo'] = mp['codigo']; it['descricao'] = mp['descricao']
            it['unidade'] = mp['unidade']; it['marca'] = mp.get('marca', '')
            it['fornecedor'] = mp.get('fornecedor', '')
        total += it.get('valor_total', 0)
    c['total_pedido'] = total
    return c


@api.get("/compras")
async def list_compras(u=Depends(get_user)):
    items = await db.compras.find({}, {"_id": 0}).sort("codigo", -1).to_list(5000)
    for c in items:
        await _enrich_compra(c)
    return items


@api.get("/compras/{cid}")
async def get_compra(cid: str, u=Depends(get_user)):
    c = await db.compras.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Não encontrado")
    return await _enrich_compra(c)


@api.post("/compras")
async def create_compra(data: CompraIn, u=Depends(get_user)):
    code = await next_compra_code()
    doc = {"id": new_id(), "codigo": code, **data.model_dump(), "created_at": now_iso()}
    if not doc.get('data_compra'):
        doc['data_compra'] = now_iso()[:10]
    doc['total_pedido'] = sum(i.get('valor_total', 0) for i in doc['itens'])
    await db.compras.insert_one(doc)
    await recompute_mp_estoque()
    doc.pop("_id", None)
    return await _enrich_compra(doc)


@api.put("/compras/{cid}")
async def update_compra(cid: str, data: CompraIn, u=Depends(get_user)):
    existing = await db.compras.find_one({"id": cid})
    if not existing:
        raise HTTPException(404, "Não encontrado")
    doc = data.model_dump()
    doc['total_pedido'] = sum(i.get('valor_total', 0) for i in doc['itens'])
    await db.compras.update_one({"id": cid}, {"$set": doc})
    await recompute_mp_estoque()
    return {"ok": True}


@api.delete("/compras/{cid}")
async def delete_compra(cid: str, u=Depends(get_user)):
    await db.compras.delete_one({"id": cid})
    await recompute_mp_estoque()
    return {"ok": True}


# ---- Gestão Financeira ----
class FinanceiroStatusIn(BaseModel):
    status_financeiro: str


@api.patch("/pedidos/{pid}/financeiro")
async def set_pedido_financeiro(pid: str, data: FinanceiroStatusIn, u=Depends(get_user)):
    if data.status_financeiro not in ("ABERTO", "RECEBIDO"):
        raise HTTPException(400, "Status inválido")
    res = await db.pedidos.update_one({"id": pid}, {"$set": {"status_financeiro": data.status_financeiro}})
    if res.matched_count == 0:
        raise HTTPException(404, "Pedido não encontrado")
    return {"ok": True}


@api.patch("/compras/{cid}/financeiro")
async def set_compra_financeiro(cid: str, data: FinanceiroStatusIn, u=Depends(get_user)):
    if data.status_financeiro not in ("ABERTO", "PAGO"):
        raise HTTPException(400, "Status inválido")
    res = await db.compras.update_one({"id": cid}, {"$set": {"status_financeiro": data.status_financeiro}})
    if res.matched_count == 0:
        raise HTTPException(404, "Compra não encontrada")
    return {"ok": True}


@api.get("/financeiro")
async def get_financeiro(u=Depends(get_user)):
    hoje = datetime.now(timezone.utc).date().isoformat()
    groups = await db.groups.find({}, {"_id": 0}).to_list(5000)
    gmap = {g['id']: g['nome'] for g in groups}
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(5000)
    pmap = {p['id']: p for p in produtos}
    mps = await db.materias_primas.find({}, {"_id": 0}).to_list(5000)
    mpmap = {m['id']: m for m in mps}

    pedidos = await db.pedidos.find({"status_pedido": {"$ne": "CANCELADO"}}, {"_id": 0}).sort("numero", -1).to_list(20000)
    compras = await db.compras.find({}, {"_id": 0}).sort("codigo", -1).to_list(20000)

    entradas = [{
        "id": p['id'], "numero": p.get('numero'),
        "cliente": p.get('cliente_nome', ''), "telefone": p.get('cliente_telefone', ''),
        "valor": p.get('total', 0), "data_vencimento": p.get('data_vencimento'),
        "status_financeiro": p.get('status_financeiro', 'ABERTO'),
    } for p in pedidos]

    saidas = [{
        "id": c['id'], "codigo": c.get('codigo'),
        "fornecedor": c.get('fornecedor', ''), "telefone": c.get('telefone_fornecedor', ''),
        "valor": c.get('total_pedido', 0) or sum(i.get('valor_total', 0) for i in c.get('itens', [])),
        "data_vencimento": c.get('data_vencimento'),
        "status_financeiro": c.get('status_financeiro', 'ABERTO'),
    } for c in compras]

    fluxo_entradas: Dict[str, float] = {}
    for p in pedidos:
        if p.get('status_financeiro') != 'RECEBIDO':
            continue
        for it in p.get('itens', []):
            prod = pmap.get(it.get('produto_id'))
            gnome = (gmap.get(prod.get('grupo_id')) if prod else None) or "Sem grupo"
            fluxo_entradas[gnome] = fluxo_entradas.get(gnome, 0) + it.get('preco_total', 0)

    fluxo_saidas: Dict[str, float] = {}
    for c in compras:
        if c.get('status_financeiro') != 'PAGO':
            continue
        for it in c.get('itens', []):
            mp = mpmap.get(it.get('materia_prima_id'))
            gnome = (gmap.get(mp.get('grupo_id')) if mp else None) or "Sem grupo"
            fluxo_saidas[gnome] = fluxo_saidas.get(gnome, 0) + it.get('valor_total', 0)

    total_entradas = sum(fluxo_entradas.values())
    total_saidas = sum(fluxo_saidas.values())

    venc_entradas = [e for e in entradas if e['status_financeiro'] == 'ABERTO' and e['data_vencimento'] and e['data_vencimento'] < hoje]
    venc_saidas = [s for s in saidas if s['status_financeiro'] == 'ABERTO' and s['data_vencimento'] and s['data_vencimento'] < hoje]

    return {
        "entradas": entradas,
        "saidas": saidas,
        "fluxo_caixa": {
            "entradas_por_grupo": [{"grupo": k, "valor": v} for k, v in sorted(fluxo_entradas.items(), key=lambda x: -x[1])],
            "saidas_por_grupo": [{"grupo": k, "valor": v} for k, v in sorted(fluxo_saidas.items(), key=lambda x: -x[1])],
            "total_entradas": total_entradas, "total_saidas": total_saidas,
            "saldo": total_entradas - total_saidas,
        },
        "vencidos": {"entradas": venc_entradas, "saidas": venc_saidas},
    }


# ---- Movimento de Matéria-Prima ----
@api.get("/movimento-mp")
async def movimento_mp(materia_prima_id: str = Query(...), de: Optional[str] = Query(None), ate: Optional[str] = Query(None),
                       saldo_inicial_qtd: Optional[float] = Query(None), saldo_inicial_val: Optional[float] = Query(None), u=Depends(get_user)):
    mp = await db.materias_primas.find_one({"id": materia_prima_id}, {"_id": 0})
    if not mp:
        raise HTTPException(404, "MP não encontrada")
    eiq, eiv = await _est_inicial(mp)
    q_saldo = saldo_inicial_qtd if saldo_inicial_qtd is not None else eiq
    v_saldo = saldo_inicial_val if saldo_inicial_val is not None else eiv
    trans = await _mp_movimentos(materia_prima_id)
    # filtro por período
    if de:
        trans = [t for t in trans if t['data'] >= de]
    if ate:
        trans = [t for t in trans if t['data'] <= ate]
    # agrupar por data
    datas = sorted({t['data'] for t in trans if t['data']})
    linhas = []
    for dt in datas:
        eq = sum(t['qtd'] for t in trans if t['data'] == dt and t['tipo'] == 'E')
        evv = sum(t['val'] for t in trans if t['data'] == dt and t['tipo'] == 'E')
        sq = sum(t['qtd'] for t in trans if t['data'] == dt and t['tipo'] == 'S')
        q_ini, v_ini = q_saldo, v_saldo
        avg = ((v_ini + evv) / (q_ini + eq)) if (q_ini + eq) else 0
        sv = avg * sq
        q_fim = q_ini + eq - sq
        v_fim = v_ini + evv - sv
        linhas.append({"data": dt, "q_inicial": q_ini, "q_entrada": eq, "q_saida": sq, "q_final": q_fim,
                       "v_inicial": v_ini, "v_entrada": evv, "v_saida": sv, "v_final": v_fim})
        q_saldo, v_saldo = q_fim, v_fim
    return {"materia_prima": {"codigo": mp['codigo'], "descricao": mp['descricao'], "unidade": mp['unidade']},
            "saldo_inicial_qtd": eiq, "saldo_inicial_val": eiv, "linhas": linhas,
            "saldo_final_qtd": q_saldo, "saldo_final_val": v_saldo}


# ---- Gestão de Estoques ----
@api.get("/estoques")
async def gestao_estoques(modo: str = Query("todos"), u=Depends(get_user)):
    await recompute_mp_estoque()
    usage = await mp_usage_map()
    filtro = {"status_pedido": {"$nin": ["CANCELADO"]}}
    if modo == "producao":
        filtro["status_producao"] = "EM_PRODUCAO"
    pedidos = await db.pedidos.find(filtro, {"_id": 0}).to_list(20000)
    necessidade = {}
    for p in pedidos:
        for it in p.get('itens', []):
            for mid, q in usage.get(it['produto_id'], {}).items():
                necessidade[mid] = necessidade.get(mid, 0) + q * it.get('quantidade', 0)
    mps = await db.materias_primas.find({}, {"_id": 0}).sort("codigo", 1).to_list(10000)
    rows = []
    for mp in mps:
        estoque = mp.get('quantidade', 0) or 0
        nec = necessidade.get(mp['id'], 0)
        rows.append({"id": mp['id'], "codigo": mp['codigo'], "descricao": mp['descricao'], "unidade": mp['unidade'],
                     "estoque_atual": estoque, "necessidade": nec, "saldo": estoque - nec})
    return {"modo": modo, "rows": rows}


# ====================== DASHBOARD ======================
@api.get("/dashboard")
async def dashboard(u=Depends(get_user)):
    now = datetime.now(timezone.utc)
    inicio_mes = now.replace(day=1).isoformat()

    total_pedidos = await db.pedidos.count_documents({})
    all_pedidos = await db.pedidos.find({}, {"_id": 0}).to_list(20000)
    validos = [p for p in all_pedidos if p.get('status_pedido') in ('APROVADO', 'ENTREGUE')]
    validos_mes = [p for p in validos if (p.get('created_at') or '') >= inicio_mes]

    faturamento_mes = sum(p.get('total', 0) for p in validos_mes)
    lucro_liquido_mes = sum((p.get('dre') or {}).get('resultado_liquido', 0) for p in validos_mes)
    custo_mes = sum((p.get('dre') or {}).get('custo_produtos', 0) for p in validos_mes)
    deducoes_mes = sum((p.get('dre') or {}).get('deducoes', 0) for p in validos_mes)
    receita_produtos_mes = sum(p.get('total_produtos', 0) for p in validos_mes)
    qtd_validos_mes = len(validos_mes)
    ticket_medio = (faturamento_mes / qtd_validos_mes) if qtd_validos_mes else 0
    margem_media = (lucro_liquido_mes / receita_produtos_mes * 100) if receita_produtos_mes else 0

    fila = await db.pedidos.count_documents({"status_producao": "NA_FILA", "status_pedido": "APROVADO"})
    em_producao = await db.pedidos.count_documents({"status_producao": "EM_PRODUCAO", "status_pedido": "APROVADO"})
    finalizados = await db.pedidos.count_documents({"status_producao": "FINALIZADO"})

    # Top produtos
    pipeline_top = [
        {"$match": {"status_pedido": {"$in": ["APROVADO", "ENTREGUE"]}}},
        {"$unwind": "$itens"},
        {"$group": {"_id": "$itens.produto_id", "qtd": {"$sum": "$itens.quantidade"}, "valor": {"$sum": "$itens.preco_total"}}},
        {"$sort": {"valor": -1}},
        {"$limit": 5},
    ]
    top_raw = await db.pedidos.aggregate(pipeline_top).to_list(10)
    top_produtos = []
    for t in top_raw:
        prod = await db.produtos.find_one({"id": t['_id']}, {"_id": 0})
        if prod:
            top_produtos.append({"descricao": prod['descricao'], "qtd": t['qtd'], "valor": t['valor'] or 0})

    # Lucro mensal (bruto vs líquido) + volume, últimos 6 meses
    lucro_6m = []
    volume_6m = []
    for i in range(5, -1, -1):
        ref = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        ini = ref.isoformat()
        fim = (ref + timedelta(days=32)).replace(day=1).isoformat()
        peds = [p for p in validos if ini <= (p.get('created_at') or '') < fim]
        receita = sum(p.get('total_produtos', 0) for p in peds)
        custo = sum((p.get('dre') or {}).get('custo_produtos', 0) for p in peds)
        liquido = sum((p.get('dre') or {}).get('resultado_liquido', 0) for p in peds)
        mes_lbl = ref.strftime("%b/%y")
        lucro_6m.append({"mes": mes_lbl, "bruto": receita - custo, "liquido": liquido, "faturamento": sum(p.get('total', 0) for p in peds)})
        volume_6m.append({"mes": mes_lbl, "pedidos": len(peds)})

    # Receita vs custos (donut, mês corrente)
    receita_vs_custos = [
        {"name": "Lucro Líquido", "value": max(lucro_liquido_mes, 0)},
        {"name": "Custo Produtos", "value": custo_mes},
        {"name": "Deduções", "value": deducoes_mes},
    ]

    # Fluxo de pedidos (recentes)
    recentes = sorted(all_pedidos, key=lambda x: x.get('numero', 0), reverse=True)[:6]
    fluxo = [{
        "numero": p.get('numero'),
        "cliente_nome": p.get('cliente_nome'),
        "status_pedido": p.get('status_pedido'),
        "status_producao": p.get('status_producao'),
        "total": p.get('total', 0),
    } for p in recentes]

    total_produtos = await db.produtos.count_documents({"status": "ATIVO"})
    total_clientes = await db.clientes.count_documents({})

    return {
        "faturamento_mes": faturamento_mes,
        "lucro_liquido_mes": lucro_liquido_mes,
        "margem_media": margem_media,
        "ticket_medio": ticket_medio,
        "pedidos_mes": qtd_validos_mes,
        "fila_producao": fila,
        "em_producao": em_producao,
        "finalizados": finalizados,
        "total_pedidos": total_pedidos,
        "total_produtos": total_produtos,
        "total_clientes": total_clientes,
        "top_produtos": top_produtos,
        "lucro_6m": lucro_6m,
        "volume_6m": volume_6m,
        "receita_vs_custos": receita_vs_custos,
        "fluxo_pedidos": fluxo,
    }


@api.get("/next-code/{tipo}")
async def next_code(tipo: str, u=Depends(get_user)):
    prefix_map = {"materia_prima": ("MP", "materias_primas"), "equipamento": ("EQ", "equipamentos"), "custo": ("CT", "custos"), "markup": ("MK", "markups"), "produto": ("PD", "produtos")}
    if tipo not in prefix_map:
        raise HTTPException(400, "Tipo inválido")
    prefix, coll = prefix_map[tipo]
    items = await db[coll].find({"codigo": {"$regex": f"^{prefix}\\d{{3}}$"}}, {"codigo": 1, "_id": 0}).to_list(5000)
    nums = [int(it['codigo'][2:]) for it in items if it.get('codigo', '').startswith(prefix)]
    next_num = (max(nums) + 1) if nums else 1
    return {"codigo": f"{prefix}{next_num:03d}"}


class ProdutoLucroIn(BaseModel):
    lucro_pct_individual: float


@api.put("/produtos/{pid}/lucro-individual")
async def set_lucro_ind(pid: str, data: ProdutoLucroIn, u=Depends(get_user)):
    await db.produtos.update_one({"id": pid}, {"$set": {"lucro_pct_individual": data.lucro_pct_individual}})
    return {"ok": True}


# ====================== CONTROLE DE PRODUÇÃO ======================
@api.get("/producao")
async def controle_producao(u=Depends(get_user)):
    """Consolida produtos a produzir de pedidos não cancelados, agrupados por data de entrega."""
    pedidos = await db.pedidos.find({"status_pedido": {"$nin": ["CANCELADO", "ENTREGUE"]}}, {"_id": 0}).to_list(10000)
    prods_all = await db.produtos.find({}, {"_id": 0}).to_list(5000)
    pmap = {pr['id']: pr for pr in prods_all}
    ordens = []
    for p in pedidos:
        itens = []
        for it in p.get('itens', []):
            prod = pmap.get(it['produto_id'])
            if prod:
                itens.append({
                    "codigo": prod['codigo'],
                    "descricao": prod['descricao'],
                    "unidade": prod['unidade'],
                    "quantidade": it.get('quantidade', 0),
                })
        if not itens:
            continue
        ordens.append({
            "pedido_id": p['id'],
            "numero": p.get('numero'),
            "cliente_nome": p.get('cliente_nome'),
            "cliente_telefone": p.get('cliente_telefone'),
            "cliente_endereco": p.get('endereco_entrega') or p.get('cliente_endereco', ''),
            "data_entrega": p.get('data_entrega'),
            "hora_entrega": p.get('hora_entrega'),
            "producao": p.get('status_producao'),
            "aprovacao": p.get('status_pedido'),
            "itens": itens,
        })
    # consolidado por produto
    consolidado = {}
    for o in ordens:
        for it in o['itens']:
            key = it['codigo']
            consolidado.setdefault(key, {"codigo": it['codigo'], "descricao": it['descricao'], "unidade": it['unidade'], "quantidade": 0})
            consolidado[key]['quantidade'] += it['quantidade']
    ordens.sort(key=lambda x: (x['data_entrega'] or "9999", x['hora_entrega'] or "99:99"))
    return {"ordens": ordens, "consolidado": sorted(consolidado.values(), key=lambda x: x['descricao'])}


# ====================== FICHA DETALHADA (CÓSMICA) ======================
class NutrienteIn(BaseModel):
    label: str
    valor: float
    unidade: str = "g"
    max_ref: float = 100


class CamadaIn(BaseModel):
    nome: str
    nivel: float = 50


class ProdutoDetalhesIn(BaseModel):
    descricao_pt: Optional[str] = ""
    descricao_en: Optional[str] = ""
    foto_path: Optional[str] = ""
    local: Optional[str] = ""
    ingredientes_chave: List[str] = []
    nutricionais: List[NutrienteIn] = []
    estrutura: List[CamadaIn] = []
    crocancia: float = 50
    cremor: float = 50
    suavidade: float = 50
    tempo_preparo: Optional[str] = ""
    temp_assamento: Optional[str] = ""
    rendimento: Optional[str] = ""
    armazenamento: Optional[str] = ""
    validade_dias: Optional[str] = ""
    alergenos: List[str] = []
    sugestao_servico: List[str] = []


@api.get("/produtos/{pid}/detalhes")
async def get_detalhes(pid: str, u=Depends(get_user)):
    prod = await db.produtos.find_one({"id": pid}, {"_id": 0})
    if not prod:
        raise HTTPException(404, "Produto não encontrado")
    det = await db.produto_detalhes.find_one({"produto_id": pid}, {"_id": 0})
    if not det:
        det = ProdutoDetalhesIn().model_dump()
        det['produto_id'] = pid
    det['produto'] = {"codigo": prod['codigo'], "descricao": prod['descricao'], "unidade": prod['unidade']}
    return det


@api.put("/produtos/{pid}/detalhes")
async def save_detalhes(pid: str, data: ProdutoDetalhesIn, u=Depends(get_user)):
    if not await db.produtos.find_one({"id": pid}):
        raise HTTPException(404, "Produto não encontrado")
    doc = data.model_dump()
    doc['produto_id'] = pid
    doc['updated_at'] = now_iso()
    await db.produto_detalhes.update_one({"produto_id": pid}, {"$set": doc}, upsert=True)
    return {"ok": True}


# ====================== UPLOAD ======================
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), u=Depends(get_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in MIME_TYPES:
        raise HTTPException(400, "Formato de imagem inválido (use jpg, png, webp ou gif)")
    path = f"{APP_NAME}/uploads/{u['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": new_id(), "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"path": result["path"]}


@api.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(401, "Não autorizado")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(404, "Arquivo não encontrado")
    content, content_type = get_object(path)
    return Response(content=content, media_type=record.get("content_type", content_type))


@api.get("/")
async def root():
    return {"app": "MM Confeitaria & Eventos - Sistema de Gestão", "status": "online"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup_storage():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
