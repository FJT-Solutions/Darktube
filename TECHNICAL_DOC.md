# Documentação Técnica Completa: Sistema DarkTube Miner

## 1. Visão Geral do Sistema
**DarkTube Miner** é uma plataforma de coleta de inteligência e otimização de fluxo de trabalho para criadores do YouTube focados em "Canais Dark" (conteúdo sem rosto). O sistema automatiza:
- Análise de lucratividade de nicho via Assistente de Descoberta.
- Extração de metadados de canais e vídeos em tempo real.
- Projeção de receita baseada em CPMs específicos de nicho e heurísticas de atividade de audiência.
- Monitoramento contínuo de concorrentes e rastreamento de desempenho.

---

## 2. Arquitetura e Stack Tecnológica

### Arquitetura Frontend
- **Framework**: Next.js 15 (App Router).
- **Estratégia de Renderização**: 
  - **Server Components**: Usados para layouts estáticos e estruturas iniciais de página.
  - **Client Components**: Amplamente utilizados para recursos interativos (Busca, Assistente, Tracker, Gráficos).
- **Gerenciamento de Estado**: Hooks `useState`/`useCallback` combinados com `localStorage` do navegador para rastreamento persistente.
- **Estilização**: Tailwind CSS com um tema personalizado "Premium Dark" usando variáveis HSL para temas dinâmicos.

### Backend e API
- **Rotas**: Rotas de API do Next.js (`/app/api/`) atuam como um proxy entre o cliente e os dados internos do YouTube.
- **Integrações**: 
  - `lib/official-youtube.ts`: Integração nativa com a YouTube Data API v3 para estatísticas de vídeo (views, likes, durações ISO).
  - `lib/youtube.ts`: Scraper paralelo de alta performance para extração de dados de múltiplas abas (/videos, /shorts, /streams).
  - `youtube-sr`: Motor de busca auxiliar.

---

## 3. Módulos Principais

### 3.1 Assistente de Mineração (`/minerar`)
Um motor de decisão interativo de 3 etapas para identificar nichos lucrativos.
- **Etapa 1 (Objetivo)**: Filtra por `revenuePotential` (Lucro) ou `growthPotential` (Crescimento).
- **Etapa 2 (Esforço)**: Filtra por índice de `difficulty` (Dificuldade) (1-10).
- **Etapa 3 (Recomendações)**: Exibe cards de `lib/constants.ts` enriquecidos com fluxos de trabalho de produção de IA do mundo real.

### 3.2 Busca de Canais e Monitoramento (`/api/youtube/search`)
O motor de busca processa consultas e retorna objetos `YouTubeChannel` enriquecidos.
- **Ordenação por Monetização**: Resultados são ordenados no backend usando o valor de `estimatedMonetization` calculado em tempo real.
- **Motor de Scraping Multi-Aba**: `lib/youtube.ts` agora executa requisições paralelas para buscar conteúdos de diferentes formatos (Shorts/Live/Vídeos), consolidando tudo em uma única resposta consistente.

### 3.3 Página de Detalhes do Canal (`/canal/[id]`)
Interface de análise profunda de desempenho.
- **Sub-Tabs de Conteúdo**: Utiliza `useMemo` para categorizar o estado de `videos` em 3 grupos: `video`, `shorts`, e `live`.
- **CORS Image Handling**: Imagens de banner e avatar carregadas sem o atributo `crossOrigin` para compatibilidade total com os headers de segurança do YouTube.
- **Handle Sanitization**: Lógica para prevenir o prefixo `@@` garantindo uma apresentação visual limpa.

### 3.3 Dashboard (`/`)
Hub central para gerenciamento de canais.
- **Métricas Agregadas**: Calcula o total de inscritos, visualizações e receita em todos os canais rastreados.
- **Feed de Tendências**: Busca dados de `/api/youtube/trending` para mostrar oportunidades virais atuais.

### 3.4 Tracker (`/tracker`)
Camada de persistência no lado do cliente.
- **Estratégia de Armazenamento**: Usa `localStorage` via `lib/storage.ts`.
- **Recursos**: Notas personalizadas, tags, ordenação por múltiplas chaves.

---

## 4. Heurísticas e Fórmulas Proprietárias

### 4.1 Rendimento Mensal Fiel (RMF)
Calcula o desempenho mensal realista a partir de dados históricos estáticos.
- **Fórmula**: `(Visualizações Totais * 0.02 / 1000) * CPM do Nicho`
- **Racional**: A maioria dos canais dark é descoberta tardiamente em seu ciclo de vida. Uma proporção de 2% de visualizações mensais sobre o total é usada para estimar a atividade atual da audiência "ativa".

### 4.2 Heurística de Classificação de Shorts
- **Critério**: Vídeos com duração bruta inferior a 61 segundos são automaticamente classificados como `shorts`, independentemente da aba em que foram encontrados.

### 4.2 Dark Score
Uma classificação baseada em métricas (0-100) que determina a "saúde" e a adequação de um canal para replicação via IA.
- **Componentes**: Proporção Inscritos-por-Visualização, Recência de Conteúdo e Afinidade de Palavras-chave.

---

### `YouTubeChannel`
```typescript
interface YouTubeChannel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  estimatedMonthlyViews?: number;
}
```

### `YouTubeVideo`
```typescript
interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  duration: string;
  type?: 'video' | 'shorts' | 'live';
  url: string;
}
```

---

## 6. Segurança e Variáveis de Ambiente
O projeto segue as melhores práticas de segurança do Next.js para proteger credenciais de API.

### 6.1 Proteção de Dados
- **.gitignore**: Configurado para excluir estritamente `.env`, `.env.local` e outros arquivos sensíveis do controle de versão.
- **Exposição no Lado do Cliente**: Apenas variáveis prefixadas com `NEXT_PUBLIC_` são expostas ao navegador.

### 6.2 Modelo de Configuração
O sistema utiliza as seguintes variáveis (armazenadas em `.env.local`):
- `GOOGLE_CLIENT_ID`: Identificador OAuth 2.0.
- `GOOGLE_CLIENT_SECRET`: Chave Privada OAuth 2.0.
- `YOUTUBE_API_KEY`: Para requisições de alta quota na API v3.
