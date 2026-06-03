# 🏗️ Sport Mentor AI — Diretrizes Arquiteturais

> **Documento de governança para manutenção, extensão e evolução do Sport Mentor AI**
> 
> Este arquivo guia decisões arquiteturais, padrões de código e boas práticas para contribuidores.

---

## 📋 Visão Geral da Arquitetura Atual

```
sport-mentor-AI/
├── src/
│   ├── config/          # Configurações (env, constantes)
│   ├── utils/           # Logger, helpers
│   ├── providers/bsd/   # Adapter da API BSD
│   ├── services/        # Match Monitor, Match Service, AI Service
│   ├── engines/         # Conviction Engine, Tips Builder
│   └── ui/              # Dashboard, Screens, State Management
├── logs/                # Arquivo de logs (gitignored)
├── index.js             # Entry point
├── ecosystem.config.cjs # PM2 config
├── package.json         # Dependências
└── README.md            # Documentação do usuário
```

**Stack:** Node.js v26+ (ES Modules), Blessed (TUI), PM2, dotenv

---

## 🎯 10 Melhorias Arquiteturais Prioritárias

### **1. Event-Driven Architecture** ⭐⭐⭐ (V1.1)

**Problema:** Monitor Service e Dashboard estão fortemente acoplados. Mudanças em dados forçam UI refresh desnecessário.

**Solução:** Implementar Event Bus para desacoplamento.

#### Implementação:

```javascript
// src/core/EventBus.js
import EventEmitter from 'events';

export class EventBus extends EventEmitter {
  // Singleton pattern
  static instance = null;

  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event, data) {
    super.emit(event, data);
    logger.debug(`Event emitted: ${event}`, { dataKeys: Object.keys(data) });
  }
}

export const eventBus = EventBus.getInstance();
```

#### Eventos Padrão:

```javascript
// src/core/events.js
export const EVENTS = {
  MATCH_LIST_UPDATED: 'match:list_updated',
  LINEUP_CONFIRMED: 'lineup:confirmed',
  TIP_GENERATED: 'tip:generated',
  ERROR_OCCURRED: 'error:occurred',
  MONITOR_STARTED: 'monitor:started',
  ANALYSIS_COMPLETE: 'analysis:complete'
};
```

#### Uso em Services:

```javascript
// src/services/monitorService.js
import { eventBus, EVENTS } from '../core/index.js';

async function fetchAndBroadcast() {
  const matches = await bsdClient.getMatches();
  eventBus.emit(EVENTS.MATCH_LIST_UPDATED, {
    matches,
    timestamp: Date.now(),
    count: matches.length
  });
}

// Dashboard ouve mudanças
// src/ui/dashboard.js
eventBus.on(EVENTS.MATCH_LIST_UPDATED, ({ matches }) => {
  updateMatchesDisplay(matches);
});
```

**Benefício:** UI reativa sem acoplamento direto a serviços.

---

### **2. Repository Pattern + Data Layer** ⭐⭐⭐ (V1.1)

**Problema:** Estado global em `ui/state.js` sem abstração. Migração de storage (arquivo → BD) seria complexa.

**Solução:** Camada de dados com repositories abstratos.

#### Estrutura:

```
src/data/
├── repositories/
│   ├── MatchRepository.js
│   ├── TipRepository.js
│   ├── LineupRepository.js
│   └── PlayerStatsRepository.js
├── storage/
│   ├── InMemoryStorage.js
│   ├── FileStorage.js
│   └── DatabaseStorage.js (futuro)
└── cache/
    └── CacheManager.js
```

#### Implementação:

```javascript
// src/data/repositories/MatchRepository.js
export class MatchRepository {
  constructor(storage, cache) {
    this.storage = storage;
    this.cache = cache;
  }

  async getAll() {
    const cached = this.cache.get('matches');
    if (cached) return cached;

    const matches = await this.storage.load('matches');
    this.cache.set('matches', matches, 60000); // 1 min TTL
    return matches;
  }

  async save(matches) {
    await this.storage.save('matches', matches);
    this.cache.invalidate('matches');
    eventBus.emit(EVENTS.MATCH_LIST_UPDATED, { matches });
  }

  async getById(id) {
    const matches = await this.getAll();
    return matches.find(m => m.id === id);
  }
}
```

```javascript
// src/data/repositories/TipRepository.js
export class TipRepository {
  constructor(storage) {
    this.storage = storage;
  }

  async getAll() {
    return await this.storage.load('tips') || [];
  }

  async add(tip) {
    const tips = await this.getAll();
    const newTip = {
      ...tip,
      id: `tip_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    tips.push(newTip);
    await this.storage.save('tips', tips);
    eventBus.emit(EVENTS.TIP_GENERATED, { tip: newTip });
    return newTip;
  }

  async clear() {
    await this.storage.save('tips', []);
  }
}
```

#### Storage Abstrato:

```javascript
// src/data/storage/InMemoryStorage.js
export class InMemoryStorage {
  constructor() {
    this.data = {};
  }

  async load(key) {
    return this.data[key];
  }

  async save(key, value) {
    this.data[key] = value;
  }

  async delete(key) {
    delete this.data[key];
  }
}

// src/data/storage/FileStorage.js
import fs from 'fs/promises';
import path from 'path';

export class FileStorage {
  constructor(baseDir = './data') {
    this.baseDir = baseDir;
  }

  async load(key) {
    try {
      const filePath = path.join(this.baseDir, `${key}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  async save(key, value) {
    const filePath = path.join(this.baseDir, `${key}.json`);
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
  }
}
```

---

### **3. Dependency Injection Container** ⭐⭐ (V1.2)

**Problema:** Acoplamento direto a instâncias (BSD Client, Groq, Tavily).

**Solução:** DI Container centralizando resolução de dependências.

```javascript
// src/core/DIContainer.js
export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, factory, options = {}) {
    this.services.set(name, { factory, ...options });
  }

  resolve(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service not registered: ${name}`);
    }

    const { factory, singleton } = this.services.get(name);

    if (singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, factory(this));
      }
      return this.singletons.get(name);
    }

    return factory(this);
  }
}

// src/bootstrap.js
import { DIContainer } from './core/DIContainer.js';
import { config } from './config/index.js';
import { BSDClient } from './providers/bsd/client.js';
import { MatchService } from './services/matchService.js';

export function bootstrap() {
  const container = new DIContainer();

  // Registrar services
  container.register('config', () => config, { singleton: true });
  
  container.register('bsdClient', (c) => 
    new BSDClient(c.resolve('config')), 
    { singleton: true }
  );

  container.register('matchService', (c) =>
    new MatchService(c.resolve('bsdClient')),
    { singleton: true }
  );

  container.register('matchRepository', (c) =>
    new MatchRepository(c.resolve('storage'), c.resolve('cache')),
    { singleton: true }
  );

  return container;
}
```

#### Uso:

```javascript
// index.js
import { bootstrap } from './bootstrap.js';

const container = bootstrap();
const matchService = container.resolve('matchService');
const matchRepository = container.resolve('matchRepository');
```

---

### **4. Estratégia de Cache Inteligente** ⭐⭐⭐ (V1.0.1)

**Problema:** Sem caching → múltiplas chamadas desnecessárias à BSD API.

```javascript
// src/data/cache/CacheManager.js
export class CacheManager {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.strategies = {
      MATCH_LIST: 60 * 1000,        // 1 min
      LINEUP_CONFIRMED: 3600 * 1000, // 1 hora
      PLAYER_STATS: 300 * 1000,      // 5 min
      MATCH_DETAIL: 120 * 1000       // 2 min
    };
  }

  set(key, value, ttl = null) {
    this.store.set(key, value);
    
    if (ttl) {
      // Limpar entrada anterior se existir
      if (this.ttls.has(key)) {
        clearTimeout(this.ttls.get(key));
      }

      const timer = setTimeout(() => {
        this.invalidate(key);
      }, ttl);

      this.ttls.set(key, timer);
    }
  }

  get(key) {
    return this.store.get(key);
  }

  invalidate(key) {
    this.store.delete(key);
    clearTimeout(this.ttls.get(key));
    this.ttls.delete(key);
  }

  invalidatePattern(pattern) {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.invalidate(key);
      }
    }
  }

  clear() {
    for (const timer of this.ttls.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.ttls.clear();
  }
}
```

#### Uso em Repositories:

```javascript
// src/data/repositories/MatchRepository.js
async getMatchesWithCache(forceRefresh = false) {
  const cacheKey = 'matches:all';
  
  if (!forceRefresh) {
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit: matches:all');
      return cached;
    }
  }

  const matches = await this.bsdClient.getMatches();
  this.cache.set(
    cacheKey, 
    matches, 
    this.cache.strategies.MATCH_LIST
  );
  return matches;
}
```

---

### **5. Error Handling Centralizado** ⭐⭐ (V1.0.1)

**Problema:** Sem tratamento consistente de erros.

```javascript
// src/core/errors/AppError.js
export class AppError extends Error {
  constructor(message, code, statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class APIError extends AppError {
  constructor(message, statusCode = 500, context = {}) {
    super(message, 'API_ERROR', statusCode, context);
    this.name = 'APIError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}
```

#### Error Middleware:

```javascript
// src/core/middleware/errorHandler.js
export function setupErrorHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise: promise.toString()
    });
    eventBus.emit(EVENTS.ERROR_OCCURRED, {
      type: 'unhandledRejection',
      reason,
      fatal: true
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.toString() });
    eventBus.emit(EVENTS.ERROR_OCCURRED, {
      type: 'uncaughtException',
      error,
      fatal: true
    });
    process.exit(1);
  });
}

export function handleAsyncError(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(`[${error.code}] ${error.message}`, error.context);
      } else {
        logger.error('Unexpected error', { error: error.toString() });
      }
      eventBus.emit(EVENTS.ERROR_OCCURRED, { error });
      throw error;
    }
  };
}
```

#### Uso:

```javascript
// src/services/matchService.js
import { handleAsyncError, ValidationError } from '../core/index.js';

export class MatchService {
  async analyzeMatch = handleAsyncError(async (matchId) => {
    const match = await this.matchRepository.getById(matchId);
    if (!match) {
      throw new NotFoundError('Match', matchId);
    }

    if (!match.lineup) {
      throw new ValidationError('Match has no confirmed lineup', { matchId });
    }

    return await this.convictionEngine.analyze(match);
  });
}
```

---

### **6. Separação de Concerns: Domain ↔ Infrastructure ↔ UI** ⭐⭐⭐ (V1.2)

**Problema:** Lógica de negócio espalhada entre services e UI.

**Nova Estrutura:**

```
src/
├── domain/                  # Regras de negócio (0 dependências externas)
│   ├── entities/
│   │   ├── Match.js
│   │   ├── Player.js
│   │   └── Tip.js
│   ├── services/
│   │   ├── ConvictionCalculator.js
│   │   └── TipsGenerator.js
│   └── value-objects/
│       ├── Position.js
│       └── Conviction.js
├── application/             # Use cases (orquestra domain + infrastructure)
│   ├── AnalyzeMatchUseCase.js
│   ├── FetchMatchesUseCase.js
│   └── GenerateTipsUseCase.js
├── infrastructure/          # Adapters externos
│   ├── providers/
│   ├── repositories/
│   └── persistence/
└── ui/                      # Apresentação (slim & dumb)
    ├── screens/
    └── state-sync/
```

#### Exemplo Domain Service:

```javascript
// src/domain/services/ConvictionCalculator.js
export class ConvictionCalculator {
  calculate(player, lineup, stats) {
    let score = 0;
    const factors = [];

    // Regra 1: Starter confirmado
    if (this.isStarter(player, lineup)) {
      score += 15;
      factors.push({ factor: 'starter_confirmed', value: 15 });
    }

    // Regra 2: Volume histórico (L5)
    const avgShots = this.averageLastN(stats, 'total_shots', 5);
    const volumePoints = this.calculateVolumePoints(avgShots);
    score += volumePoints;
    factors.push({ factor: 'volume_l5', value: volumePoints, metric: avgShots });

    // Regra 3: Consistência (L5)
    const consistency = this.calculateConsistency(stats, 5);
    const consistencyPoints = consistency * 4; // 0-20 pontos
    score += consistencyPoints;
    factors.push({ factor: 'consistency', value: consistencyPoints });

    // Regra 4: xG
    const xG = stats.expected_goals || 0;
    const xgPoints = Math.min(xG * 25, 15);
    score += xgPoints;
    factors.push({ factor: 'expected_goals', value: xgPoints, metric: xG });

    // Penalidades
    if (this.isDefenderOrGK(player.position)) {
      score -= 30;
      factors.push({ factor: 'position_penalty', value: -30 });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      isTip: score >= 70,
      explanation: this.buildExplanation(player, factors)
    };
  }

  private isStarter(player, lineup) {
    return lineup.home.starters.includes(player) || 
           lineup.away.starters.includes(player);
  }

  private averageLastN(stats, field, n) {
    if (!stats.results || stats.results.length === 0) return 0;
    const recent = stats.results.slice(0, n);
    const sum = recent.reduce((acc, r) => acc + (r[field] || 0), 0);
    return (sum / recent.length).toFixed(2);
  }

  private calculateVolumePoints(avgShots) {
    if (avgShots >= 3.2) return 25;
    if (avgShots >= 2.5) return 20;
    if (avgShots >= 1.8) return 15;
    if (avgShots >= 1.0) return 10;
    return 5;
  }

  private calculateConsistency(stats, lastGames) {
    if (!stats.results) return 0;
    const recent = stats.results.slice(0, lastGames);
    const withShots = recent.filter(r => r.total_shots > 0).length;
    return (withShots / lastGames);
  }

  private isDefenderOrGK(position) {
    return ['DEF', 'GK', 'CB', 'LB', 'RB'].includes(position);
  }

  private buildExplanation(player, factors) {
    return factors
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .map(f => `${f.factor.replace(/_/g, ' ')}: ${f.value > 0 ? '+' : ''}${f.value}`)
      .join(', ');
  }
}
```

#### Use Case (orquestra domain + infra):

```javascript
// src/application/AnalyzeMatchUseCase.js
export class AnalyzeMatchUseCase {
  constructor(
    matchRepository,
    playerStatsRepository,
    convictionCalculator,
    tipsGenerator,
    eventBus
  ) {
    this.matchRepository = matchRepository;
    this.playerStatsRepository = playerStatsRepository;
    this.convictionCalculator = convictionCalculator;
    this.tipsGenerator = tipsGenerator;
    this.eventBus = eventBus;
  }

  async execute(matchId) {
    const match = await this.matchRepository.getById(matchId);
    if (!match || !match.lineup) {
      throw new ValidationError('Match not ready for analysis');
    }

    const players = [
      ...match.lineup.home.starters,
      ...match.lineup.away.starters
    ];

    const convictions = await Promise.all(
      players.map(async (player) => {
        const stats = await this.playerStatsRepository.getPlayerStats(
          player.id,
          player.teamId
        );

        return {
          player,
          conviction: this.convictionCalculator.calculate(
            player,
            match.lineup,
            stats
          )
        };
      })
    );

    const tips = this.tipsGenerator.generate(convictions);

    this.eventBus.emit(EVENTS.ANALYSIS_COMPLETE, {
      matchId,
      convictions,
      tips,
      timestamp: Date.now()
    });

    return { convictions, tips };
  }
}
```

---

### **7. Validação de Entrada com Zod** ⭐⭐ (V1.0.1)

**Problema:** Sem validação de dados da BSD API.

```javascript
// src/domain/schemas/index.js
import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  position: z.enum(['ST', 'CM', 'DEF', 'GK', 'CB', 'LB', 'RB', 'CAM']),
  shirt_number: z.number().optional(),
  team_id: z.number().positive()
});

export const LineupSchema = z.object({
  match_id: z.number().positive(),
  home: z.object({
    team_id: z.number(),
    formation: z.string(),
    starters: z.array(PlayerSchema),
    confirmed: z.boolean()
  }),
  away: z.object({
    team_id: z.number(),
    formation: z.string(),
    starters: z.array(PlayerSchema),
    confirmed: z.boolean()
  })
});

export const MatchSchema = z.object({
  id: z.number().positive(),
  home_team: z.object({
    id: z.number(),
    name: z.string(),
    logo: z.string().url().optional()
  }),
  away_team: z.object({
    id: z.number(),
    name: z.string(),
    logo: z.string().url().optional()
  }),
  status: z.enum(['notstarted', 'inprogress', 'finished']),
  start_time: z.string().datetime().optional(),
  venue: z.string().optional(),
  lineup: LineupSchema.optional()
});
```

#### Uso:

```javascript
// src/providers/bsd/adapter.js
export class BSDAdapter {
  validateMatch(rawData) {
    try {
      return MatchSchema.parse(rawData);
    } catch (error) {
      logger.error('Invalid match data from BSD', {
        errors: error.errors,
        rawData: JSON.stringify(rawData).substring(0, 200)
      });
      throw new ValidationError('Invalid match data', { source: 'BSD' });
    }
  }

  validateLineup(rawData) {
    try {
      return LineupSchema.parse(rawData);
    } catch (error) {
      throw new ValidationError('Invalid lineup data', { errors: error.errors });
    }
  }
}
```

---

### **8. Logging Estruturado** ⭐ (V1.0.1)

**Problema:** Logger atual não é estruturado.

```javascript
// src/utils/logger.js (refatorado)
import fs from 'fs/promises';
import path from 'path';

export class StructuredLogger {
  constructor(logFile = 'logs/app.log') {
    this.logFile = logFile;
    this.queue = [];
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private async ensureDir() {
    const dir = path.dirname(this.logFile);
    await fs.mkdir(dir, { recursive: true });
  }

  debug(message, context = {}) {
    this.log('DEBUG', message, context);
  }

  info(message, context = {}) {
    this.log('INFO', message, context);
  }

  warn(message, context = {}) {
    this.log('WARN', message, context);
  }

  error(message, context = {}) {
    this.log('ERROR', message, context);
  }

  private log(level, message, context) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid
    };

    // Console (desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.format(entry));
    }

    // Fila para escrita em arquivo
    this.queue.push(entry);
  }

  private format(entry) {
    const { timestamp, level, message, context } = entry;
    const ctx = Object.keys(context).length ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${ctx}`;
  }

  async flush() {
    if (this.queue.length === 0) return;

    try {
      await this.ensureDir();
      const lines = this.queue.map(e => this.format(e)).join('\n');
      await fs.appendFile(this.logFile, lines + '\n');
      this.queue = [];
    } catch (err) {
      console.error('Failed to flush logs:', err);
    }
  }

  async close() {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}

export const logger = new StructuredLogger();
```

#### Uso:

```javascript
// src/services/monitorService.js
logger.info('Monitor cycle started', {
  timestamp: Date.now(),
  provider: 'BSD'
});

logger.info('Matches fetched', {
  count: matches.length,
  statuses: matches.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {})
});

logger.debug('Match analyzed', {
  matchId: 123,
  playersWithTips: 5,
  avgConviction: 72.4
});

logger.error('Failed to fetch lineup', {
  matchId: 123,
  error: err.message,
  retryCount: 3
});
```

---

### **9. Configuração Multi-Ambiente** ⭐ (V1.0.1)

**Problema:** Apenas .env simples, sem variação por ambiente.

```javascript
// src/config/index.js
import dotenv from 'dotenv';
dotenv.config();

const env = process.env.NODE_ENV || 'development';

const envConfigs = {
  development: {
    logLevel: 'debug',
    bsdClient: {
      timeout: 10000,
      retries: 3,
      batchSize: 10
    },
    monitor: {
      checkInterval: 30000, // 30 segundos
      logVerbose: true
    },
    cache: {
      enabled: true,
      matchListTTL: 30000
    }
  },

  production: {
    logLevel: 'warn',
    bsdClient: {
      timeout: 15000,
      retries: 5,
      batchSize: 50
    },
    monitor: {
      checkInterval: 60000, // 1 minuto
      logVerbose: false
    },
    cache: {
      enabled: true,
      matchListTTL: 60000
    }
  },

  test: {
    logLevel: 'error',
    bsdClient: {
      timeout: 5000,
      retries: 1,
      batchSize: 5,
      mock: true
    },
    monitor: {
      checkInterval: 1000,
      logVerbose: false
    },
    cache: {
      enabled: false
    }
  }
};

export const config = {
  env,
  ...envConfigs[env],
  bsd: {
    apiKey: process.env.BSD_API_KEY,
    baseUrl: process.env.BSD_BASE_URL
  },
  apis: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY
    }
  }
};

// Validação de variáveis obrigatórias
const required = ['BSD_API_KEY', 'BSD_BASE_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0 && env === 'production') {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}
```

---

### **10. Testes (Unit + Integration)** ⭐⭐⭐ (V1.0.1)

**Problema:** Sem testes — `npm test` retorna erro.

#### Setup:

```bash
npm install --save-dev vitest @vitest/ui happy-dom
```

#### Estrutura:

```
tests/
├── unit/
│   ├── domain/
│   │   └── services/
│   │       ├── ConvictionCalculator.test.js
│   │       └── TipsGenerator.test.js
│   └── application/
│       └── AnalyzeMatchUseCase.test.js
├── integration/
│   ├── services/
│   │   └── MonitorService.test.js
│   └── providers/
│       └── BSDAdapter.test.js
├── fixtures/
│   ├── mockMatches.js
│   ├── mockPlayers.js
│   └── mockStats.js
└── setup.js
```

#### Exemplo Unit Test:

```javascript
// tests/unit/domain/services/ConvictionCalculator.test.js
import { describe, it, expect } from 'vitest';
import { ConvictionCalculator } from '../../../../src/domain/services/ConvictionCalculator.js';
import { mockPlayer, mockLineup, mockStats } from '../../../fixtures/index.js';

describe('ConvictionCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new ConvictionCalculator();
  });

  describe('calculate', () => {
    it('should award 15 points for confirmed starter', () => {
      const player = mockPlayer({ position: 'ST' });
      const lineup = mockLineup({ homeStarters: [player] });
      const stats = mockStats({ totalShots: 0 });

      const result = calculator.calculate(player, lineup, stats);

      expect(result.score).toBeGreaterThanOrEqual(15);
      expect(result.factors).toContainEqual(
        expect.objectContaining({ factor: 'starter_confirmed', value: 15 })
      );
    });

    it('should penalize defenders with -30 points', () => {
      const player = mockPlayer({ position: 'DEF' });
      const lineup = mockLineup({ homeStarters: [player] });
      const stats = mockStats();

      const result = calculator.calculate(player, lineup, stats);

      expect(result.score).toBeLessThan(0);
      expect(result.factors).toContainEqual(
        expect.objectContaining({ factor: 'position_penalty', value: -30 })
      );
    });

    it('should generate tip if conviction >= 70', () => {
      const player = mockPlayer({ position: 'ST' });
      const lineup = mockLineup({ homeStarters: [player] });
      const stats = mockStats({ totalShots: 4, expectedGoals: 0.8 });

      const result = calculator.calculate(player, lineup, stats);

      if (result.score >= 70) {
        expect(result.isTip).toBe(true);
      }
    });
  });
});
```

#### Exemplo Integration Test:

```javascript
// tests/integration/services/MonitorService.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitorService } from '../../../src/services/monitorService.js';
import { InMemoryStorage } from '../../../src/data/storage/InMemoryStorage.js';
import { MatchRepository } from '../../../src/data/repositories/MatchRepository.js';
import { mockBSDClient } from '../../fixtures/mocks.js';

describe('MonitorService', () => {
  let service;
  let mockClient;
  let repository;

  beforeEach(() => {
    mockClient = mockBSDClient();
    const storage = new InMemoryStorage();
    repository = new MatchRepository(storage);
    service = new MonitorService(mockClient, repository);
  });

  afterEach(() => {
    service.stop();
  });

  it('should fetch and broadcast matches', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emit');

    await service.run();

    expect(emitSpy).toHaveBeenCalledWith(
      EVENTS.MATCH_LIST_UPDATED,
      expect.objectContaining({
        matches: expect.any(Array),
        count: expect.any(Number)
      })
    );
  });

  it('should cache results for configured TTL', async () => {
    await service.run();
    const matches1 = await repository.getAll();

    // Simular passagem de tempo sem invalidar cache
    vi.useFakeTimers();
    vi.advanceTimersByTime(30000); // Menos que TTL padrão

    const matches2 = await repository.getAll();
    expect(matches1).toBe(matches2); // Mesma referência (cache hit)

    vi.useRealTimers();
  });
});
```

#### Fixtures:

```javascript
// tests/fixtures/mockMatches.js
export function mockMatch(overrides = {}) {
  return {
    id: 12345,
    home_team: {
      id: 1,
      name: 'Home Team',
      logo: 'https://example.com/home.png'
    },
    away_team: {
      id: 2,
      name: 'Away Team',
      logo: 'https://example.com/away.png'
    },
    status: 'notstarted',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    venue: 'Stadium Name',
    ...overrides
  };
}

export function mockLineup(overrides = {}) {
  const homeStarters = overrides.homeStarters || [];
  const awayStarters = overrides.awayStarters || [];

  return {
    match_id: 12345,
    home: {
      team_id: 1,
      formation: '4-3-3',
      starters: homeStarters,
      confirmed: true
    },
    away: {
      team_id: 2,
      formation: '4-2-3-1',
      starters: awayStarters,
      confirmed: true
    }
  };
}

export function mockStats(overrides = {}) {
  return {
    total_shots: overrides.totalShots ?? 2.5,
    expected_goals: overrides.expectedGoals ?? 0.42,
    results: Array(10).fill(null).map((_, i) => ({
      total_shots: Math.random() * 5,
      expected_goals: Math.random() * 1
    })),
    ...overrides
  };
}
```

#### package.json scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## 📐 Padrões de Código

### Naming Conventions

```javascript
// Classes (PascalCase)
class ConvictionCalculator { }
class MatchRepository { }

// Functions (camelCase)
function fetchMatches() { }
async function analyzePlayer() { }

// Constants (UPPER_SNAKE_CASE)
const MAX_CONVICTION = 100;
const DEFAULT_TTL = 60000;

// Private methods/properties (prefixo _)
_calculateVolume() { }
this._cache = new Map();

// Events (kebab-case)
emit('match:updated', data);
emit('lineup:confirmed', data);

// File names (kebab-case.js)
conviction-calculator.js
match-repository.js
```

### File Organization

```javascript
// 1. Imports
import { logger } from '../utils/logger.js';
import { AppError } from '../core/errors/AppError.js';

// 2. Type definitions / Schemas (se houver)
const ConfigSchema = z.object({ /* ... */ });

// 3. Constants
const DEFAULT_TTL = 60000;

// 4. Class/Function principal
export class MyService {
  constructor() { }
  
  public method() { }
  
  private _privateMethod() { }
}

// 5. Exports adicionais (se houver)
export const someUtil = () => { };
```

### Error Handling

```javascript
// ✅ Bom
try {
  const data = await fetchData();
  return data;
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Invalid data', { error: error.message });
    throw error;
  }
  logger.error('Unexpected error', { error: error.toString() });
  throw new AppError('Failed to fetch data', 'FETCH_ERROR');
}

// ❌ Evitar
try {
  const data = await fetchData();
} catch (e) {
  console.log(e);
}
```

---

## 🔄 Fluxo de Desenvolvimento

### Ao implementar uma feature:

1. **Criar domain logic** (sem dependências externas)
   ```javascript
   // src/domain/services/MyService.js
   ```

2. **Criar repository/adapter** (se precisar de dados externos)
   ```javascript
   // src/data/repositories/MyRepository.js
   ```

3. **Criar use case** (orquestra domain + infra)
   ```javascript
   // src/application/MyUseCase.js
   ```

4. **Emitir eventos** (notify listeners)
   ```javascript
   eventBus.emit(EVENTS.MY_EVENT, data);
   ```

5. **Atualizar UI** (subscribe to events)
   ```javascript
   // src/ui/screens/MyScreen.js
   eventBus.on(EVENTS.MY_EVENT, handle);
   ```

6. **Escrever testes** (unit + integration)
   ```javascript
   // tests/unit/domain/services/MyService.test.js
   // tests/integration/application/MyUseCase.test.js
   ```

---

## ✅ Checklist de Code Review

- [ ] Código segue naming conventions
- [ ] Sem console.log() (usar logger)
- [ ] Erros tratados com AppError / subclasses
- [ ] Domain logic sem dependências externas
- [ ] Use cases orquestram domain + infra
- [ ] Events emitidos para mudanças importantes
- [ ] Testes unitários para domain logic
- [ ] Testes integração para use cases
- [ ] Documentação JSDoc em métodos públicos
- [ ] Não viola princípios SOLID

---

## 📚 Referências

- **DDD (Domain-Driven Design):** [martinfowler.com/bliki/DomainDrivenDesign.html](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- **Clean Architecture:** Robert C. Martin
- **Event-Driven Architecture:** [martinfowler.com/articles/201701-event-driven.html](https://martinfowler.com/articles/201701-event-driven.html)
- **Zod Validation:** [zod.dev](https://zod.dev)
- **Vitest:** [vitest.dev](https://vitest.dev)

---

## 🚀 Próximas Etapas

**V1.0.1 (Stabilization)**
- [ ] Implementar caching inteligente (#4)
- [ ] Adicionar validação com Zod (#7)
- [ ] Setup de testes com Vitest (#10)
- [ ] Logging estruturado (#8)
- [ ] Multi-environment config (#9)

**V1.1 (Refactoring)**
- [ ] Event-driven architecture (#1)
- [ ] Repository pattern (#2)
- [ ] Error handling centralizado (#5)

**V1.2 (Architecture)**
- [ ] Dependency injection (#3)
- [ ] Clean architecture domain/infra/ui (#6)

---

<div align="center">

**Sport Mentor AI — Arquitetura Escalável**

*Padrões e convenções para crescimento sustentável* 🚀

</div>
