# 🎯 Sport Mentor AI — Instruções para GitHub Copilot

> **Contexto Completo do Projeto para IA Assistente**

Este arquivo instrui o GitHub Copilot sobre a arquitetura, padrões, decisões e estado atual do Sport Mentor AI.

---

## 📋 Visão Geral do Projeto

**Sport Mentor** é um sistema de inteligência esportiva em tempo real para análise de futebol e geração de insights de apostas.

### Filosofia Central
```
"O sistema NÃO decide. A decisão é 100% humana."
```
- Sistema informa, analisa, contextualiza e sugere.
- Usuário toma a decisão final.
- Transparência total em cada recomendação.

### Stack Técnico
```javascript
{
  "runtime": "Node.js v26+ (ES Modules)",
  "tui": "blessed (Terminal User Interface)",
  "dataProvider": "BSD (Bzzoiro Sports Data)",
  "aiProviders": ["Groq (LLM)", "Tavily (Search)"],
  "processManager": "PM2",
  "environment": "dotenv",
  "database": "Nenhum (MVP — dados fresh via API)",
  "deploy": "Railway / Docker"
}
```

---

## 🏗️ Arquitetura Modular

```
sport-mentor-AI/
├── src/
│   ├── config/              # Variáveis de ambiente (dotenv)
│   │   └── index.js         # Exporta config centralizada
│   │
│   ├── utils/               # Utilitários compartilhados
│   │   └── logger.js        # Sistema de logs (arquivo + timestamp)
│   │
│   ├── providers/bsd/       # Adaptador da API Bzzoiro Sports Data
│   │   ├── client.js        # Chamadas HTTP brutas
│   │   ├── mapper.js        # Transforma resposta BSD em DTOs
│   │   └── adapter.js       # Orquestra fluxo (client → mapper)
│   │
│   ├── services/            # Lógica de negócio
│   │   ├── matchService.js  # Busca/filtro de partidas
│   │   ├── monitorService.js# Monitora jogos em background
│   │   └── aiService.js     # Integração Groq + Tavily
│   │
│   ├── engines/             # Motores analíticos
│   │   ├── convictionEngine.js # Calcula score 0-100 por jogador
│   │   └── tipsBuilder.js      # Monta sugestões (score >= 70)
│   │
│   └── ui/                  # Interface Terminal (Blessed)
│       ├── dashboard.js     # Orquestrador de telas + menu
│       ├── state.js         # Estado global (tips, cache)
│       └── screens/
│           ├── home.js      # Tela inicial (ASCII art + status)
│           ├── partidas.js  # Lista todos os jogos do dia
│           ├── topPartidas.js # Filtra ligas top
│           ├── analise.js   # Conviction Engine + AI context
│           └── tips.js      # Exibe recomendações finais
│
├── logs/                    # Arquivo de logs (gitignored)
├── index.js                 # Entry point
├── ecosystem.config.cjs     # PM2 config
└── package.json
```

---

## 🔄 Fluxo de Dados (Pipeline Completo)

```
┌─────────────────────────────────────────────┐
│ 1. Monitor Service (background, a cada min) │
│    • getEvents(data) via BSD API            │
│    • Filtra notstarted + inprogress         │
│    • Log para arquivo                       │
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 2. Usuário abre "Análise" (TUI)             │
│    • getMatchesOfDay()                      │
│    • Filtra jogos com status confirmado     │
│    • Busca lineup confirmado via getLineup()│
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 3. Conviction Engine                        │
│    • getPlayerStats(playerId) × N starters │
│    • Calcula score por jogador (0-100)     │
│    • Fatores: volume, xG, position, form   │
│    • Retorna score + factors + explanation │
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 4. AI Service (Groq + Tavily)               │
│    • Tavily.search(homeTeam vs awayTeam)    │
│    • Groq.chat.completions (análise LLM)   │
│    • Retorna contexto textual + sources     │
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 5. Tips Builder                             │
│    • Filtra convictions >= 70               │
│    • Monta JSON de recomendações            │
│    • Salva em globalTips (state.js)         │
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 6. Usuário vê na tela "Tips"                │
│    • Ranking de jogadores                   │
│    • Score + motivo                         │
│    • Pronto para tomar decisão              │
└─────────────────────────────────────────────┘
```

---

## 🎯 Conviction Engine — Lógica de Cálculo

Atribui pontos **0-100** por jogador baseado em 7 fatores:

### Mercado: SHOTS (Chutes)

| Fator | Peso | Pontos | Descrição |
|-------|------|--------|-----------|
| Starter confirmado | Alto | +15 | Está na escalação como titular |
| Volume L5 (média) | Alto | +5 a +25 | Média de chutes últimos 5 jogos |
| Consistência L5 | Médio | +0 a +20 | Quantos dos 5 últimos teve shot |
| xG (Expected Goals) | Médio | +5 a +15 | Qualidade de chutes (posição) |
| Minutos jogados | Baixo | +0 a +10 | Exposição no jogo |
| Posição/Formação | Médio | +0 a +15 | Atacantes ganham mais |
| **Penalidades** | - | -30 | Defensores/Goleiros excluídos |

### Exemplo Real
```
Y. Alberto (Atacante do Flamengo)
+ Starter confirmado              +15 pts
+ Volume L5: 3.2 shots/jogo      +25 pts
+ Consistência: 5/5 jogos        +20 pts
+ xG elevado (0.58)              +15 pts
+ Formação ofensiva              +10 pts
───────────────────────────────────────
= 85/100 [TIP] ✅
```

**Regra de Ouro:**
- Score >= 70 → Entra em TIPS
- Score < 70 → Descartado

---

## 🛠️ Padrões de Código & Convenções

### 1. Imports & Module System
```javascript
// ✅ CORRETO: ES Modules
import { logger } from '../utils/logger.js';
import blessed from 'blessed';

// ❌ ERRADO: CommonJS
const blessed = require('blessed');
```

### 2. Funções Async/Await com Try-Catch
```javascript
// ✅ PADRÃO
export async function renderPartidas(content, screen) {
    try {
        // Lógica aqui
        const data = await fetchData();
        return data;
    } catch (error) {
        logger.error('Erro descritivo', error);
        // Fallback ou rethrow
    }
}
```

### 3. Logger (Nunca console.log)
```javascript
// ✅ CORRETO
logger.info('Iniciando monitor...');
logger.warn('Lineup não confirmado');
logger.error('Erro ao buscar dados', err);

// ❌ ERRADO
console.log('Data:', data);
```

### 4. Timezone: America/Sao_Paulo
```javascript
// ✅ SEMPRE use timeZone BR
const hoje = new Date().toLocaleDateString('pt-BR', { 
    timeZone: 'America/Sao_Paulo' 
});

// Função helper padrão (veja partidas.js)
function formatBR(date) {
    return date
        .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split('/')
        .reverse()
        .join('-'); // Retorna 'YYYY-MM-DD'
}
```

### 5. Filtragem de Data (Janela Extra)
**Problema:** UTC vs BR timezone causa perda de jogos.  
**Solução:** Busque 3 datas (anterior, alvo, seguinte) e filtre localmente.

```javascript
async function getJogosComJanelaExtra(dataYYYYMMDD) {
    // dataYYYYMMDD: "2026-05-28"
    const dateObj = new Date(dataYYYYMMDD + 'T12:00:00-03:00');
    const anterior = new Date(dateObj); anterior.setDate(anterior.getDate() - 1);
    const seguinte = new Date(dateObj); seguinte.setDate(seguinte.getDate() + 1);
    const format = d => d.toISOString().slice(0,10);

    const resultados = [];
    for (const dt of [anterior, dateObj, seguinte]) {
        const res = await getEvents(format(dt));
        if (res?.results) resultados.push(...res.results);
    }
    return resultados;
}

// Depois, filtrar por fuso BR
const matchesHoje = matchesRaw.filter(match => {
    const eventDateObj = new Date(match.event_date);
    const diabr = formatBR(eventDateObj);
    return diabr === hojeBR;
});
```

### 6. Blessed TUI — Estrutura Padrão
```javascript
// ✅ PADRÃO
const screen = blessed.screen({
    smartCSR: true,
    title: 'Sport Mentor v1.0.0',
    fullUnicode: true
});

const box = blessed.box({
    top: 0, left: 0, width: '100%', height: '100%',
    tags: true,
    border: { type: 'line' },
    style: {
        fg: 'white', bg: 'black',
        border: { fg: 'green' }
    }
});

screen.key(['q', 'C-c'], () => process.exit(0));
```

### 7. Variáveis de Ambiente
```javascript
// ✅ No config/index.js
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const config = {
    bsd: {
        apiKey: process.env.BSD_API_KEY,
        baseUrl: process.env.BSD_BASE_URL,
    },
    tavily: {
        apiKey: process.env.TAVILY_API_KEY,
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY,
    }
};
```

---

## 🚨 Problemas Conhecidos & Soluções

### 1. Jogos Desaparecem por Timezone
**Sintoma:** Jogo das 21h30 BR não aparece quando busca por data.  
**Causa:** API retorna em UTC; filtro por data local falha.  
**Solução:** Use `getJogosComJanelaExtra()` (busca 3 datas) + filtro por timeZone BR.

### 2. Nenhum Jogo Com Lineup Confirmado
**Sintoma:** Tela "Análise" vazia.  
**Causa:** Lineups são confirmadas ~1-2h antes do jogo.  
**Solução:** Tente mais tarde ou busque jogos em `notstarted` + `inprogress`.

### 3. Erros de Autenticação (BSD API, Groq, Tavily)
**Solução:** Verifique `.env` — todas as 3 chaves devem estar preenchidas.

### 4. Modo Focus em Lista (Modal não fecha)
**Sintoma:** Usuário pressiona ESC mas lista fica presa.  
**Solução:** Confirme que `setFocoNaLista(false)` está sendo chamado no handler ESC.

---

## 📊 Estatísticas do Projeto

```
├── Linguagem: JavaScript (ES Modules)
├── Linhas de código: ~1500+
├── Módulos: 8 (config, utils, providers, services, engines, ui)
├── Telas: 5 (Home, Partidas, Top Partidas, Análise, Tips)
├── Engines: 2 (Conviction, Tips Builder)
├── APIs integradas: 3 (BSD, Groq, Tavily)
├── Status: MVP 100% funcional ✅
└── Pronto para produção: Sim 🚀
```

---

## 🎓 Decisões Arquiteturais

### Por que ES Modules?
- Moderno e padrão do JavaScript (ECMAScript).
- Melhor tree-shaking e otimização.
- Compatível com Node.js v26+.

### Por que Blessed (TUI)?
- Terminal-first é a filosofia do projeto.
- Leve, eficiente, roda em qualquer servidor Linux.
- Melhor que web para processos always-on.

### Por que sem banco de dados?
- MVP precisa ser lean e rápido.
- Dados são buscados fresh da BSD a cada análise.
- Escalabilidade (PostgreSQL) vem na V2.

### Por que PM2?
- Gerenciamento profissional de processos.
- Auto-restart em crash.
- Logs centralizados.
- Suporta modo daemon.

### Por que Groq + Tavily (não só OpenAI)?
- Groq é mais barato e rápido para LLM.
- Tavily traz contexto web/notícias relevante.
- Combinação oferece análise rápida + contextualizada.

---

## 🔗 Integrações Externas

### BSD API (Bzzoiro Sports Data)
- **Endpoint:** `https://sports.bzzoiro.com/api/`
- **Chave:** `BSD_API_KEY` (no .env)
- **Funções principais:**
  - `getEvents(date)` → Jogos do dia
  - `getLineup(eventId)` → Escalação
  - `getPlayerStats(playerId)` → Stats do jogador

### Groq LLM (Análise de Texto)
- **Chave:** `GROQ_API_KEY`
- **Modelo:** `llama-3.3-70b-versatile`
- **Uso:** Análise contextual de jogo (momento, tática, tendências)

### Tavily Search (Notícias Esportivas)
- **Chave:** `TAVILY_API_KEY`
- **Uso:** Buscar notícias + contexto sobre times antes de mandar ao Groq

---

## 📈 Roadmap V2 (Próximas Features)

- [ ] Corner Engine completo (analisa cruzamentos/escanteios)
- [ ] API GraphQL para dados (cliente web/mobile)
- [ ] WebSocket para live updates
- [ ] Banco de dados PostgreSQL (histórico/backtest)
- [ ] Dashboard web responsivo (React/Vue)
- [ ] Integração com casas de apostas (Bet365, etc)
- [ ] Análise de clima/condições do jogo
- [ ] Backtest de histórico de recomendações

---

## 🎯 Como o Copilot Deve Ajudar

### Ao sugerir código:
1. **Sempre** use ES Modules (`import/export`)
2. **Sempre** use try-catch para funções async
3. **Sempre** use `logger` em vez de `console.log`
4. **Sempre** considere timezone `America/Sao_Paulo` em datas
5. **Nunca** comita `.env`; crie `.env.example`

### Ao refatorar:
1. Mantenha a separação de responsabilidades (config → utils → providers → services → engines → ui)
2. Se tocar em filtragem de data, lembre da "janela extra" de 3 datas
3. Se tocar em Blessed, preserva a estrutura de menu/content dual-pane

### Ao debugar:
1. Sempre olhe `logs/app.log` para histórico
2. Teste timezone BR com: `new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })`
3. Verifique `.env` antes de culpar integração (BSD, Groq, Tavily)

---

## 📞 Contato & Suporte

- **GitHub Issues:** [sport-mentor-AI/issues](https://github.com/erickviniciusf/sport-mentor-AI/issues)
- **Desenvolvedor:** erickviniusf
- **Versão:** v1.0.0 (MVP)

---

<div align="center">

**Sport Mentor AI v1.0.0**

*"Explicar antes de recomendar. Informar antes de decidir."*

</div>
