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

---

## 🛡️ Backup e Restauração (MUITO IMPORTANTE!)

### 📦 Para fazer BACKUP dos dados:
1. **Dois cliques em `backup.bat`**
2. Vai gerar um arquivo `.zip` na pasta `backups/` com a data e hora
3. **Copie esse .zip para o OneDrive / Google Drive / Pen Drive** para guardar seguro

⚠️ **Você precisa instalar uma vez as "MongoDB Database Tools"**:
- Baixe em: https://www.mongodb.com/try/download/database-tools
- Escolha Windows e baixe o MSI
- Instale normalmente (next, next, finish)

**Dica**: faça backup pelo menos 1 vez por semana, e sempre antes de formatar o PC ou trocar de máquina.

### ♻️ Para RESTAURAR um backup:
1. **Dois cliques em `restaurar.bat`**
2. Confirme que deseja substituir os dados
3. Selecione o arquivo `.zip` do backup desejado
4. Pronto! Os dados são restaurados

⚠️ **Atenção**: a restauração apaga os dados atuais e coloca os do backup no lugar. Use com cuidado!

### 🔄 Levando seus dados pra outro PC:
1. No PC antigo: rode `backup.bat` → gera o .zip
2. Copie o .zip pro novo PC (pen drive, e-mail, drive)
3. No PC novo: instale tudo normalmente (Python, Node, MongoDB, Mongo Tools)
4. Rode `instalar.bat`
5. Rode `restaurar.bat` e escolha o .zip
6. Use normalmente com todos seus dados!

---

## 🎨 Pronto pra começar!

Boa sorte e parabéns pelo sistema! Qualquer dúvida, é só me chamar. 💗

— Equipe MM Confeitaria & Eventos
