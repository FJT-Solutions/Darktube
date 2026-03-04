# Documentação Técnica: DarkTube Miner

**DarkTube Miner** é uma plataforma de inteligência de mercado de alto desempenho construída com Next.js 15, otimizada para mineração de nichos e estimativa de receita no ecossistema de canais dark (conteúdo automatizado).

## 🏗️ Arquitetura e Stack

### Framework Principal
- **Next.js 15 (App Router)**: Utilizando React Server Components (RSC) para busca inicial de dados e Client Components para UI interativa (Wizard, Filtros de Busca).
- **TypeScript**: Definições de tipo estritas para respostas da API do YouTube e modelos de domínio internos (`lib/types.ts`).

### Motor de UI/UX
- **Tailwind CSS**: Sistema de design personalizado focado em estética "Premium Dark", utilizando esquemas de cores baseados em variáveis HSL.
- **Framer Motion**: Gatilhos de animação para transições de estado suaves no Assistente de Descoberta.
- **Radix UI**: Componentes acessíveis baseados em primitivos (Dialog, ScrollArea, Tooltip).
- **Shadcn/ui**: Biblioteca de componentes para desenvolvimento ágil de interface e consistência visual.

### Camada de Dados
- **SQLite + Prisma**: Motor de persistência local para canais, vídeos e inteligência de nicho.
- **YouTube Data API v3**: Fonte primária para dados precisos de canais e estatísticas reais de vídeos.
- **Scraper Customizado (`lib/youtube.ts`)**: Motor de extração paralela que processa múltiplas abas (/videos, /shorts, /shorts) para garantir a separação completa de tipos de conteúdo.
- **youtube-sr**: Wrapper secundário usado para busca rápida e autocompletar.

### Inteligência Artificial
- **IA de Visão (Gemini 1.5 Flash/Pro)**: Validação técnica de produção (IA vs Banco de Estoque vs Edição Manual).
- **Processamento de Frames (ffmpeg + yt-dlp)**: Motor de baixo nível para extração de frames e análise visual profunda.
- **Análise de Transcrição**: Decomposição de conteúdo para identificar padrões de viralização.

---

## 🎯 Transformação Organizacional (Core v2)

A plataforma foi recentemente refatorada para um modelo de **Organização Pessoal**, garantindo isolamento total de dados e configurações customizadas:

### 🔐 Autenticação & Conta
- Login via **Google/YouTube NextAuth**.
- Vinculação de canais e vídeos ao ID do usuário autenticado.

### ⚙️ Configurações & Chaves Pessoais
- Painel de controle para chaves de API individuais (**GEMINI_API_KEY**).
- Armazenamento seguro e criptografado no banco de dados local.

### 🍱 Isolamento Multi-tenant
- Dashboard e Tracker exibem apenas dados pertencentes ao usuário logado.
- Ambiente 100% privado e persistente.

---

## 🔬 Detalhes de Implementação Técnica

### 1. Heurísticas de Monetização
A plataforma evita o uso de "Visualizações Totais" para projeções de ganhos, pois elas não representam a saúde atual do canal. Em vez disso, implementa o modelo de **Rendimento Mensal Fiel (RMF)**:

$$ \text{Receita Mensal Estimada} = \left( \frac{\text{Visualizações Totais} \times 0.02}{1000} \right) \times \text{CPM do Nicho} $$

- **Coeficiente 0.02**: Uma heurística conservadora assumindo que um canal ativo gera ~2% de suas visualizações históricas totais por mês.
- **Vetores de CPM**: Definidos estaticamente em `lib/constants.ts`, variando de $4 (Entretenimento Geral) a $15+ (Finanças/Investimentos).

### 2. Lógica do Assistente de Descoberta
O `MiningWizard` (`components/mining/mining-wizard.tsx`) gerencia o estado multi-etapas usando um padrão de máquina de estados finitos:
- **Etapas**: `goal` (objetivo) ➔ `effort` (esforço) ➔ `recommendations` (recomendações).
- **Algoritmo de Filtragem**: 
  - `revenue`: Ordena por `estimatedCpm` DESC.
  - `growth`: Ordena por `growthPotential` DESC.
  - `effort`: Filtra por limite de `difficulty` (Baixo: $\le 5$, Alto: $\ge 7$).

### 3. Automação de Busca e Ranking
- **Gatilhos Instantâneos**: O `MiningWizard` e as sugestões de nichos disparam buscas automáticas imediatamente após a seleção, eliminando cliques manuais redundantes.
- **Ordenação por Lucratividade**: Resultados da busca de canais são ordenados dinamicamente por `estimatedMonetization` DESC, priorizando as melhores oportunidades de negócio.

### 4. Categorização de Conteúdo (Shorts/Live/Vídeos)
- **Heurísticas de Duração**: Classificação automática de vídeos < 60s como Shorts, mesmo quando listados na aba de vídeos longos.
- **Detecção de Live**: Identificação de transmissões ao vivo via metadados da API e status de visualização em tempo real.
- **Interface Multi-Aba**: Sub-tabs dedicadas na página do canal para organizar conteúdos por formato.

---

## 🛠️ Desenvolvimento e Implantação

### Pré-requisitos
- Node.js 18.x ou superior.
- `npm` ou `pnpm`.

### Instalação
```bash
npm install
```

### Build e Otimização
O projeto utiliza o **Turbopack** para velocidade de desenvolvimento local e otimização padrão de build do Next.js para produção:
```bash
npm run build
```

---

## 📈 Próximos Passos e Expansões
- [x] Integração com a API Google Cloud YouTube v3 para métricas precisas.
- [x] Separação de vídeos por tipo (Shorts, Long-form, Live).
- [x] Persistência local com SQLite e Prisma.
- [x] Autenticação Google e Isolamento de Usuário.
- [x] Validação Visual Inteligente com Gemini Vision Pro.
- [ ] Gerador de roteiros baseado em IA dentro do `MiningWizard`.
