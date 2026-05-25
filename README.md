# 🎯 Sport Mentor AI — Concierge Analítico de Apostas Esportivas

> **Inteligência esportiva always-on rodando no terminal.** Um sistema que monitora, analisa e sugere — mas nunca decide.

![Version](https://img.shields.io/badge/version-1.0.0-green) ![Node](https://img.shields.io/badge/node-v26+-blue) ![Status](https://img.shields.io/badge/status-MVP%20Pronto-brightgreen)

---

## 📖 O que é Sport Mentor?

Sport Mentor é um **sistema de inteligência esportiva** focado em futebol que:

- 🔍 **Monitora** jogos em tempo real
- 📊 **Analisa** convictions (0-100) de jogadores por mercado
- 💡 **Sugere** tips com base em dados (conviction >= 70)
- ⚠️ **Explica** cada recomendação (transparência total)
- 🖥️ **Roda no terminal** (TUI — Terminal User Interface)
- ⏰ **Funciona 24/7** (always-on)

### Filosofia

```
"O sistema NÃO decide. A decisão é 100% humana."
```

Sport Mentor informa, organiza, contextualiza e sugere — mas você decide.

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** v26+
- **npm** ou **yarn**
- **Chave API BSD** (Bzzoiro Sports Data)
- **Linux/Mac** (ou WSL no Windows)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/erickviniusf/sport-mentor-AI.git
cd sport-mentor-AI

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
nano .env  # preencha BSD_API_KEY e BSD_BASE_URL

# 4. Rode localmente
node index.js

# 5. Navegue no terminal
# ↑↓ ou j/k para selecionar menu
# Enter para abrir tela
# Q para sair
```

---

## 📱 Interface — 5 Telas Principais

### 🏠 **HOME**
- ASCII art estilizado "SPORT MENTOR"
- Status do sistema (Monitor, Jogos, Lineups, Tips)
- Indicador de status

### ⚽ **PARTIDAS**
- Lista todos os jogos do dia
- Indicadores de status (○ em breve, ● ao vivo, ✓ encerrado)
- Horários e placar em tempo real

### 🏆 **TOP PARTIDAS**
- Filtra apenas grandes ligas:
  - Premier League
  - La Liga
  - Serie A
  - Brasileirão

### 🔍 **ANÁLISE**
- Busca automaticamente jogo com lineup confirmado
- Calcula conviction (0-100) para cada jogador
- Exibe ranking com [TIP] destacado para score >= 70
- Mostra fatores que influenciaram cada score

### 💡 **TIPS**
- Exibe tips gerados na Análise
- Formatação clara: jogador | mercado | score
- Atualiza em tempo real

---

## 🛠️ Stack Tecnológico

```javascript
{
  "runtime": "Node.js v26+ (ES Modules)",
  "tui": "blessed",
  "dataProvider": "BSD (Bzzoiro Sports Data)",
  "processManager": "PM2",
  "environment": "dotenv",
  "database": "Sem banco (MVP)",
  "deploy": "Railway / Docker"
}
```

### Arquitetura

```
sport-mentor-AI/
├── src/
│   ├── config/          # Configurações (env, constantes)
│   ├── utils/           # Logger, helpers
│   ├── providers/bsd/   # Adapter da API BSD
│   ├── services/        # Match Monitor, Match Service
│   ├── engines/         # Conviction Engine, Tips Builder
│   └── ui/              # Dashboard, Screens, State
├── logs/                # Arquivo de logs (gitignored)
├── index.js             # Entry point
├── ecosystem.config.cjs # PM2 config
├── package.json         # Dependências
└── README.md           # Este arquivo
```

---

## 🎯 Como Funciona — Fluxo

```
┌─────────────────────────────────────────────────────┐
│ 1. Monitor Service (background)                     │
│    • Busca 50+ jogos do dia a cada minuto          │
│    • Filtra por status (notstarted, inprogress)    │
│    • Log para arquivo                              │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 2. Você abre Análise (TUI)                          │
│    • Filtra jogos ativos                           │
│    • Busca lineup confirmado                       │
│    • Encontra primeiro com escalação              │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 3. Conviction Engine                                │
│    • Calcula score (0-100) por jogador             │
│    • Fatores: volume, xG, posição, formação      │
│    • Retorna score + factors + explanation        │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 4. Tips Builder                                     │
│    • Filtra convictions >= 70                      │
│    • Monta sugestões de apostas                    │
│    • Salva em estado global                        │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 5. Você vê na tela Tips                            │
│    • Jogadores com score >= 70                     │
│    • Ranking ordenado                              │
│    • Pronto para tomar decisão                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Conviction Engine — Como Calcula

O Conviction Engine atribui pontos (0-100) baseado em:

### Para Mercado **SHOTS**:

| Fator | Peso | Pontos |
|-------|------|--------|
| Starter confirmado | Alto | +15 |
| Volume histórico (L5) | Alto | +5 a +25 |
| Consistência (L5) | Médio | +0 a +20 |
| xG (expected goals) | Médio | +5 a +15 |
| Minutos jogados | Baixo | +0 a +10 |
| Posição/Formação | Médio | +0 a +15 |
| **Penalidades:** Defensores/Goleiros | - | -30 |

**Exemplo real:**
```
Y. Alberto (atacante)
+ starter confirmado       +15
+ média 3.2 shots L5      +25
+ consistência 5/5 jogos  +20
+ xG elevado (0.58)       +15
+ formação ofensiva       +10
───────────────────────────────
= 85/100 [TIP] ✅
```

---

## 🚀 Deploy na Railway (Gratuito)

### Passo 1: Preparar Dockerfile

```dockerfile
FROM node:26-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Passo 2: Criar .dockerignore

```
node_modules
logs
.env
.git
```

### Passo 3: Railway Setup

1. Acesse [railway.app](https://railway.app)
2. Conecte com GitHub
3. Selecione repositório `sport-mentor-AI`
4. Railway detecta Node.js automaticamente
5. Configure variáveis de ambiente no painel
6. Deploy automático a cada git push!

---

## 📝 Variáveis de Ambiente

```bash
# .env
BSD_API_KEY=sua_chave_aqui
BSD_BASE_URL=https://sports.bzzoiro.com/api/
```

⚠️ **NUNCA** commite `.env` no Git. Use `.env.example` como referência.

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
node index.js              # Rodar localmente

# PM2 (Production)
npm install -g pm2        # Instalar PM2 globalmente
pm2 start ecosystem.config.cjs
pm2 logs sport-mentor
pm2 stop sport-mentor
pm2 restart sport-mentor
pm2 startup
pm2 save

# Git
git add .
git commit -m "feat: descrição"
git push

# Logs
tail -f logs/app.log       # Ver logs em tempo real
```

---

## 📈 Roadmap V2 (Pós MVP)

- [ ] Corner Engine completo
- [ ] API GraphQL para dados
- [ ] WebSocket para atualizações em tempo real
- [ ] Banco de dados (PostgreSQL)
- [ ] Dashboard web (React/Vue)
- [ ] Integração com casas de apostas
- [ ] Análise de clima/condições do jogo
- [ ] Backtest de histórico

---

## 🐛 Troubleshooting

### "Nenhum jogo com lineup confirmado"
- Lineups são confirmadas ~1-2h antes do jogo
- Tente mais tarde ou busque jogos notstarted

### "Erro ao conectar BSD API"
- Verifique se `BSD_API_KEY` está correta em `.env`
- Confirme acesso à internet
- Cheque logs: `tail -f logs/app.log`

### "Linha fantasma na TUI"
- Já foi corrigido no v1.0.0
- Se persistir, abra issue no GitHub

---

## 📞 Suporte

- 📧 Issues: [GitHub Issues](https://github.com/erickviniusf/sport-mentor-AI/issues)
- 💬 Discussões: [GitHub Discussions](https://github.com/erickviniusf/sport-mentor-AI/discussions)

---

## 📜 Licença

MIT License — Veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Créditos

- **Desenvolvedor:** erickviniusf
- **Data Provider:** Bzzoiro Sports Data (BSD)
- **TUI Library:** Blessed
- **Process Manager:** PM2

---

## 🎓 Arquitetura & Decisões

### Por que ES Modules?
- Moderno, padrão do JavaScript
- Melhor tree-shaking
- Compatível com Node.js v26+

### Por que Blessed (TUI)?
- Terminal-first é a filosofia
- Leve e eficiente
- Roda em qualquer servidor Linux

### Por que sem banco de dados?
- MVP precisa ser lean
- Dados são buscados fresh da BSD a cada análise
- Escalabilidade vem depois

### Por que PM2?
- Gerenciamento de processo profissional
- Auto-restart em caso de crash
- Logs centralizados
- Modo daemon integrado

---

## 📊 Estatísticas do Projeto

```
├── Linguagem: JavaScript (ES Modules)
├── Linhas de código: ~1500+
├── Módulos: 8 (M0-M7)
├── Telas: 5 (Home, Partidas, Top Partidas, Análise, Tips)
├── Engines: 2 (Conviction, Tips Builder)
├── APIs integradas: 1 (BSD)
├── Status: MVP 100% funcional ✅
└── Pronto para produção: Sim 🚀
```

---

<div align="center">

**Sport Mentor v1.0.0** — Inteligência esportiva always-on

*"Explicar antes de recomendar. Informar antes de decidir."*

![Made with Node.js](https://img.shields.io/badge/made%20with-Node.js-339933?style=flat-square&logo=node.js)
![Blessed TUI](https://img.shields.io/badge/interface-Blessed%20TUI-green?style=flat-square)
![ES Modules](https://img.shields.io/badge/modules-ES%20Modules-yellow?style=flat-square)

</div>