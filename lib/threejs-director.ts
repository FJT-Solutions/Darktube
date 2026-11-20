import { callFlowLLM, FLOW_PROVIDERS, type FlowProvider } from '@/lib/flow-llm';
import { getUserApiKey } from '@/lib/database';
import { listLocal3dModels } from '@/lib/threejs-asset-hub';
import {
  compileThreeJsStoryboard,
  type CompileThreeJsResult,
  type ThreeJsEstilo,
  type ThreeJsQuality,
  type ThreeJsStoryboard,
  type ThreeJsViralCaptionsConfig,
} from '@/lib/threejs-scene-compiler';

export interface GenerateThreeJsDirectionInput {
  userId: string;
  topic: string;
  durationSec?: number;
  kind?: 'single_scene' | 'full_video';
  estilo?: ThreeJsEstilo;
  aspect?: '9:16' | '16:9' | '1:1';
  quality?: ThreeJsQuality;
  isDraft?: boolean;
  provider?: FlowProvider;
  captions?: ThreeJsViralCaptionsConfig;
}

export interface GenerateThreeJsDirectionResult {
  providerUsed: FlowProvider;
  spokenScript: string;
  compiled: CompileThreeJsResult;
  usedGlbModels: string[];
}

const PROCEDURAL_CATALOG_SUMMARY = `
ASSETS PROCEDURAIS PRONTOS (use EXATAMENTE estes nomes em "asset"):
- Construcao/Obra: casa_obra (etapa 0..1), predio_estrutura (etapa 0..1), rua_camadas (etapa 0..1), corte_terreno (etapa 0..1), guindaste (etapa 0..1)
- Predios/Infraestrutura: ponte_viga (com rio embaixo!), galpao, loja (variantes: padaria, mercado), predio_apartamentos (variantes: azul, rosa, alto), arranha_ceu (variantes: verde, escuro, alto)
- Casas: casa_simples (variantes: verde, azul, amarela), casa_colonial (rosa, azul), sobrado (cinza, salmao), casa_moderna (escura, quente)
- Ruas/Terreno: rua_reta (com_faixa, larga, sem_calcada), cruzamento, chao (grama, terra, areia, concreto, asfalto), campo_futebol
- Veiculos/Maquinas: escavadeira (laranja, rapida), vibroacabadora (laranja, azul), rolo_compressor (laranja, azul), espargidor (jorrando, vermelho), caminhao_cacamba (amarelo, azul, levantada; etapa 0..1), betoneira (verde, azul), carro_sedan (azul, branco, taxi, verde), carro_hatch (vermelho, amarelo, preto), onibus (vermelho, azul, verde)
- Processos/Industria: fabrica_processo (graos, areia), esteira (subindo, graos, areia), tanque (agua, leite, oleo, grao; etapa 0..1), misturador (tinta, concreto, massa), monte (areia, terra, grao, pequeno; etapa 0..1), engrenagem (prata, vermelha), helice (turbina, ventilador), tubo (vermelho, azul, cobre; params: { pontos: [[x,y,z],...], raio: 0.28 }), forma (caixa, cilindro, esfera, cone, toro, capsula; params: { tipo, tamanho, cor, brilho, emissivo })
- Objetos/Arvores: arvore_redonda (clara, escura, grande, outono), arvore_frutifera, arvore_pinheiro (clara, alta, nevada), palmeira, arbusto, poste_luz, semaforo, bueiro, cone, barreira, pilha_tijolos, saco_cimento, carrinho_mao, banco, muro, hidrante, lixeira

PERSONAGENS (preset): construtor, engenheiro, engenheira, servente, homem, mulher, velhinho, velhinha, crianca, menina
CLIPS DE ANIMACAO: idle, walk, run, talk (fala: true), point (params: { dir: 'down'|'forward'|'side'|'up' }), wave, nod, cheer, surprised, crouch, dig
FLUXOS DE PARTICULAS (material): agua, eletricidade, luz, fagulha, fogo, pedra, brita, areia, terra, concreto, asfalto, fumaca, vapor, poeira, ar, bolha, neve
AMBIENTE: fundo ('campo'|'cidade'|'floresta'|'deserto'|'litoral'|'industrial'|'interior'), horario ('dia'|'tarde'|'nublado'), chao ('grama'|'terra'|'areia'|'concreto'|'asfalto'|'madeira'|'piso'), clima ('limpo'|'chuva')
ELEMENTOS 2D: { tipo: 'seta', direcao: 'baixo'|'direita'|'esquerda'|'cima', ancora: 'id', de, ate }, { tipo: 'etiqueta', texto, ancora: 'id', ponto: '#ffd60a', de, ate }, { tipo: 'icone', icone: 'raio'|'lampada'|'alerta'|'v'|'x', pos: [0.5, 0.25], de, ate }
`.trim();

function extractJsonBlock(raw: string): any {
  const cleaned = String(raw || '').trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : cleaned;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error('A LLM não retornou um JSON válido de storyboard 3D.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

async function resolveDirectorLlm(userId: string, preferred?: FlowProvider): Promise<{ provider: FlowProvider; apiKey: string }> {
  const order: FlowProvider[] = [];
  if (preferred && FLOW_PROVIDERS.includes(preferred)) order.push(preferred);
  for (const p of FLOW_PROVIDERS) if (!order.includes(p)) order.push(p);
  for (const p of order) {
    const key = await getUserApiKey(userId, p).catch(() => '');
    if (key) return { provider: p, apiKey: key };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }
  throw new Error('Nenhuma chave de LLM (Gemini, OpenAI, Claude ou OpenRouter) configurada em Credenciais.');
}

/**
 * Diretor de Roteiro 3D com LLM:
 * Converte qualquer tema/ideia em um spokenScript PT-BR + storyboard Three.js válido,
 * aproveitando tanto o catálogo procedural quanto modelos .glb CC0 salvos no cache local.
 */
export async function generateThreeJsDirection(input: GenerateThreeJsDirectionInput): Promise<GenerateThreeJsDirectionResult> {
  const { provider, apiKey } = await resolveDirectorLlm(input.userId, input.provider);
  const kind = input.kind || 'full_video';
  const durationSec = kind === 'single_scene'
    ? Math.min(12, Math.max(4, Number(input.durationSec || 6)))
    : Math.min(90, Math.max(15, Number(input.durationSec || 60)));
  const targetScenes = kind === 'single_scene' ? 1 : Math.min(12, Math.max(4, Math.round(durationSec / 6)));
  const targetWords = Math.round(durationSec * 2.55);

  const localGlbs = listLocal3dModels();
  const glbSection = localGlbs.length
    ? `\nMODELOS 3D .GLB REAIS DISPONÍVEIS NO CACHE LOCAL (prefira usar estes via { "id": "...", "glb": "<glbUrl>", "altura": 4.0, "pos": [x,0,z] } quando combinarem com o tema!):\n${localGlbs
        .map((m) => `- ${m.name} -> glb: "${m.glbUrl}" (tags: ${m.tags.join(', ')})`)
        .join('\n')}`
    : '\n(Nenhum modelo .glb externo no cache local ainda; use apenas os assets procedurais listados acima.)';

  const estilo: ThreeJsEstilo = input.estilo || '3d';
  const is25d = estilo === '2.5d_cartoon';
  const estiloRules = is25d
    ? `
MODO ESTILO 2.5D CARTOON (#05/#19 ATIVO):
- Personagens são desenhos 2D em traço nanquim grosso dentro de mundo 3D pintado com contorno de tinta preta.
- Use horario "dia" na abertura e "dourado" (Golden Hour) nos momentos de clímax ou virada emocional; use chao "paralelepipedo" ou "grama" conforme o cenário.
- Enquadre personagens SEMPRE de corpo inteiro (com pés apoiados no chão em plano "medio" ou "geral") ou close intencional onde o rosto ocupe 30% a 40% da altura ("close").
- Troque expressões (smile, grin, laugh, shock, worried, angry, stern, dazed, thinking) e adereços ("prop": "moeda"|"livro"|"carta"|"lupa"|"martelo") nas palavras-chave, nunca deixando trocas a menos de 0.7s do fim da cena.`
    : '';

  const systemPrompt = `Você é o Diretor de Roteiro e Arte 3D do DarkTube (motor Three.js procedural + GLTFLoader).
Sua missão é criar um roteiro didático viral em português do Brasil (pt-BR) e o JSON completo de cenas 3D.

${PROCEDURAL_CATALOG_SUMMARY}
${glbSection}
${estiloRules}

REGRAS OBRIGATÓRIAS DE DIREÇÃO:
1. Retorne APENAS JSON puro com a estrutura:
   {
     "titulo": "Título curto",
     "spokenScript": "Texto completo falado em PT-BR sem símbolos especiais, com aproximadamente ${targetWords} palavras.",
     "cenas": [ ... exatas ${targetScenes} cenas cobrindo de 0 até ${durationSec} segundos sem lacunas ... ]
   }
2. NUNCA invente nomes de "asset" que não estejam na lista acima. Se precisar de um modelo .glb da lista local, use a chave "glb" no objeto (em vez de "asset") com "altura" em metros.
3. NUNCA use "etapa" em objetos que devem aparecer prontos na cena! Só use "etapa" quando a narração estiver explicitamente mostrando algo sendo construído, enchendo ou erodindo.
4. REGRA ANTI-OCLUSÃO: Se houver corte subterrâneo (corte_terreno ou rua_camadas) com tubo/cano, coloque o bloco de corte em z=-1.2 com opacidade=0.35 e o tubo na frente em z=2.8..3.2 com raio>=0.32.
5. ENQUADRAMENTO E CENÁRIO 3D: Mantenha personagens próximos ao centro horizontal (|x| <= 2.2) em planos "medio" e "close"; NUNCA coloque paredes, edifícios ou caixas grandes entre a câmera e o sujeito (mantenha deriva entre -18 e +18 graus); use ambiente.fundo="interior" + chao="piso" para cenas internas de banco/cofre/quarto, nunca jogando blocos soltos no meio do asfalto.
6. Cada cena precisa de: inicio, fim, ambiente, objetos (cada um com id único), camera ({ tipo: "enquadrar", alvo: "<id existente na cena>", plano: "geral"|"medio"|"close", angulo, elevacao, deriva }), e opcionalmente personagens, fluxos, elementos, textos.
7. Nunca cite em camera.alvo ou elementos.ancora um id que não exista em objetos ou personagens daquela mesma cena.`;

  const userPrompt = `Tema do vídeo: ${input.topic}
Estilo visual: ${is25d ? '2.5D Cartoon (personagens 2D nanquim em mundo 3D pintado)' : '3D Low-Poly / Diorama'}
Modo: ${kind === 'single_scene' ? '1 cena de teste demonstrativa' : `Vídeo completo explicativo de ${durationSec} segundos (${targetScenes} cenas)`}
Formato: ${input.aspect || '9:16'}
Crie agora o JSON completo com spokenScript envolvente e cenas ricas e coerentes.`;

  const raw = await callFlowLLM(provider, apiKey, systemPrompt, userPrompt);
  const parsed = extractJsonBlock(raw);
  const spokenScript = String(parsed?.spokenScript || parsed?.roteiro || input.topic).trim();
  const cenas = Array.isArray(parsed?.cenas) ? parsed.cenas : [];
  if (!cenas.length) {
    throw new Error('O Diretor 3D não retornou nenhuma cena válida.');
  }

  const usedGlbModels = new Set<string>();
  for (const c of cenas) {
    for (const o of c?.objetos || []) {
      if (o?.glb) usedGlbModels.add(String(o.glb));
    }
  }

  const compiled = compileThreeJsStoryboard({
    kind,
    preset: 'custom_storyboard',
    estilo,
    title: String(parsed?.titulo || input.topic),
    aspect: input.aspect || '9:16',
    isDraft: input.isDraft ?? (input.quality === 'basica'),
    captions: input.captions,
    storyboard: {
      titulo: String(parsed?.titulo || input.topic),
      estilo,
      qualidade: input.quality || (input.isDraft ? 'basica' : 'media'),
      duracao: durationSec,
      cenas,
    },
  });
  compiled.spokenScript = spokenScript;

  return {
    providerUsed: provider,
    spokenScript,
    compiled,
    usedGlbModels: Array.from(usedGlbModels),
  };
}
