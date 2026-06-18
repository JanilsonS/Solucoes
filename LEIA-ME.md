# 🍰 MM Confeitaria - Instalação no Notebook (Windows)

Olá! Este guia vai te ajudar a rodar o **Sistema MM Confeitaria & Eventos** no notebook. É só seguir os passos com calma!

---

## 📋 O que você vai precisar instalar (apenas 1 vez)

### 1️⃣ Python 3.11 ou superior
- Baixe em: **https://www.python.org/downloads/**
- ⚠️ **IMPORTANTE**: na tela de instalação, marque a caixa **"Add Python to PATH"** antes de clicar em Install

### 2️⃣ Node.js (versão LTS)
- Baixe em: **https://nodejs.org/**
- Clique no botão verde "LTS" e instale normalmente (next, next, finish)

### 3️⃣ MongoDB Community Server
- Baixe em: **https://www.mongodb.com/try/download/community**
- Escolha: Version atual, Platform Windows, Package MSI
- Durante a instalação, marque **"Install MongoDB as a Service"** (deixa funcionando sozinho)

### 4️⃣ Yarn (gerenciador de pacotes)
Depois de instalar Node.js, abra o **Prompt de Comando** (Win+R → digite `cmd`) e cole:
```
npm install -g yarn
```

---

## 🚀 Passo a passo para usar o sistema

### Primeira vez (instalação dos pacotes):
1. Abra a pasta do projeto
2. **Clique duas vezes em `instalar.bat`** e aguarde terminar (5-10 minutos)

### Para usar o sistema todos os dias:
1. **Clique duas vezes em `iniciar.bat`**
2. Aguarde abrir 2 janelas pretas (backend e frontend) — **não feche essas janelas**
3. O navegador abre automaticamente em `http://localhost:3000`
4. Faça login com:
   - **Email**: admin@mm.com
   - **Senha**: mm123456

### Para fechar o sistema:
- Feche as 2 janelas pretas (backend e frontend)

---

## ❓ Problemas comuns

| Problema | Solução |
|----------|---------|
| "python não é reconhecido" | Desinstale e reinstale Python marcando "Add to PATH" |
| "yarn não é reconhecido" | Rode `npm install -g yarn` no cmd como administrador |
| "MongoDB não conecta" | Reinicie o PC e tente de novo (o serviço inicia sozinho) |
| Página não abre | Aguarde 30 segundos após rodar `iniciar.bat`, depois recarregue |

---

## 💾 Onde ficam os dados?

Todos os dados (cadastros, pedidos, fichas técnicas) ficam **dentro do MongoDB no seu próprio notebook**. Nada vai pra internet. ☁️❌

**Recomendação**: faça backup do MongoDB de vez em quando, especialmente antes de formatar o PC.

---

## 🎨 Pronto pra começar!

Boa sorte e parabéns pelo sistema! Qualquer dúvida, é só me chamar. 💗

— Equipe MM Confeitaria & Eventos
