import type { VoiceWord } from '@/lib/voice-resolver';
import { validateTimelineClockAndCuts } from '@/lib/visual-critic';

export interface ThreeJsViralCaptionsConfig {
  ativo?: boolean;
  palavrasPorBloco?: number;
  maiusculas?: boolean;
  corDestaque?: string;
  tamanho?: number;
  posicaoY?: number;
}

export type ThreeJsQuality = 'alta' | 'media' | 'basica';

export type ThreeJsEstilo = '3d' | '2.5d_cartoon';

export interface ThreeJsStoryboard {
  versao: number;
  titulo: string;
  estilo?: ThreeJsEstilo;
  qualidade?: ThreeJsQuality;
  formato: { largura: number; altura: number; fps: number };
  duracao: number;
  audio?: string;
  palavras?: string;
  mouthCues?: string;
  legendas?: ThreeJsViralCaptionsConfig;
  ambiente?: { fundo?: string; horario?: string; chao?: string; clima?: string; nuvens?: boolean };
  cenas: any[];
}

export interface CompileThreeJsInput {
  kind?: 'single_scene' | 'full_video';
  preset?: 'curiosidade_cratera' | 'cartoon_25d_demo' | 'custom_storyboard';
  estilo?: ThreeJsEstilo;
  title?: string;
  aspect?: '9:16' | '16:9' | '1:1';
  fps?: number;
  isDraft?: boolean;
  storyboard?: Partial<ThreeJsStoryboard>;
  captions?: ThreeJsViralCaptionsConfig;
  audioDurationSec?: number;
}

export interface CompileThreeJsResult {
  storyboard: ThreeJsStoryboard;
  spokenScript: string;
  sceneCount: number;
  auditFixes: string[];
}

export const DEFAULT_VIRAL_CAPTIONS: Required<ThreeJsViralCaptionsConfig> = {
  ativo: true,
  palavrasPorBloco: 2,
  maiusculas: true,
  corDestaque: '#ffd60a',
  tamanho: 1.32,
  posicaoY: 0.74,
};

const CRATERA_SPOKEN_SCRIPT = [
  'Por que uma rua firme abre uma cratera gigante e engole um carro inteiro do nada?',
  'O culpado não está em cima do asfalto, e sim escondido bem debaixo dos seus pés.',
  'Quando chove forte, a água desce pelas frestas e procura o caminho mais rápido.',
  'Se um cano antigo vazar lá embaixo, essa água começa a lavar a terra devagar.',
  'Primeiro vai embora a areia fina, depois a argila, formando uma caverna oca e escura.',
  'Você passa todo dia por cima e nem imagina que não existe mais chão ali.',
  'Mas o asfalto engana, porque ele funciona como uma casca rígida e fina no topo.',
  'Basta um ônibus pesado passar na hora errada para a casca quebrar de uma vez.',
  'Para consertar direito, a equipe abre o buraco e troca o cano quebrado primeiro.',
  'Depois espalha camadas de pedra brita, compacta tudo com rolo pesado e refaz o asfalto.',
  'Sem o vazio por baixo, a pista aguenta anos. Você já viu uma cratera na sua rua?',
].join(' ');

function buildRefinedCrateraScenes(): any[] {
  return [
    {
      inicio: 0.0,
      fim: 4.7,
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'com_faixa', params: { length: 26 } },
        { id: 'loja1', asset: 'loja', pos: [-9.5, 0, -5], giro: 90, variante: 'mercado' },
        { id: 'arv1', asset: 'arvore_redonda', pos: [7.5, 0, -5.5], params: { seed: 4 } },
        { id: 'poste1', asset: 'poste_luz', pos: [-4.4, 0, 4.5] },
        { id: 'buraco', asset: 'forma', pos: [1.3, 0.05, 1.2], aparece: 2.3, params: { tipo: 'cilindro', tamanho: [3.2, 0.14, 3.8], cor: '#181412' } },
        {
          id: 'carro',
          asset: 'carro_sedan',
          pos: [1.3, 0.06, -5.5],
          movimentos: [{ de: 0.0, ate: 2.4, para: [1.3, 1.2] }],
          anim: { pos: [[2.4, [1.3, 0.06, 1.2]], [4.4, [1.3, -0.9, 1.2]]], giro: [[2.4, 0], [4.4, 22]], eixo: 'x' },
        },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [-2.6, 0.2, 4.4],
          giro: 0,
          viraPara: [{ em: 0.0, alvo: 'camera' }],
          acoes: [
            { clip: 'talk', de: 0.1, ate: 2.4, fala: true, expressao: 'worried' },
            { clip: 'surprised', de: 2.5, ate: 4.7, expressao: 'surprised' },
          ],
        },
      ],
      fluxos: [{ material: 'poeira', origem: [1.3, 0.15, 1.2], destino: [1.3, 2.2, 1.2], taxa: 38, de: 2.4, ate: 4.6 }],
      efeitos: [{ tipo: 'tremor', de: 2.5, ate: 4.1, intensidade: 0.55 }],
      textos: [{ texto: 'POR QUE A RUA ABRE CRATERA?', de: 0.2, ate: 4.4, estilo: 'titulo' }],
      camera: { tipo: 'enquadrar', alvo: 'carro', plano: 'geral', angulo: 30, elevacao: 18, deriva: -12, aproxima: 0.9 },
    },
    {
      inicio: 4.7,
      fim: 10.4,
      transicao: 'flash',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'concreto' },
      objetos: [
        { id: 'camadas', asset: 'rua_camadas', pos: [0, 0, -1.2], opacidade: 0.35 },
        {
          id: 'cano',
          asset: 'tubo',
          pos: [-3.4, 0.65, 3.2],
          opacidade: 0.35,
          variante: 'azul',
          params: { pontos: [[0, 0, 0], [3.4, 0, 0], [6.8, 0, 0]], raio: 0.34 },
        },
        { id: 'casa', asset: 'casa_simples', pos: [-7.5, 0, -9.5], variante: 'azul' },
        { id: 'loja_bg', asset: 'loja', pos: [9.0, 0, -7.5], giro: -90, variante: 'padaria' },
        { id: 'arv2', asset: 'arvore_redonda', pos: [6.8, 0, -4.5], params: { seed: 2 } },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [1.4, 0, 4.4],
          giro: 0,
          viraPara: [{ em: 4.8, alvo: 'camera' }],
          acoes: [
            { clip: 'point', de: 5.0, ate: 10.3, params: { dir: 'down' } },
            { clip: 'talk', de: 5.2, ate: 10.1, fala: true, camada: 1, mascara: ['head', 'face', 'armL'] },
          ],
        },
      ],
      fluxos: [{ material: 'agua', caminho: [[-3.4, 0.65, 3.2], [0, 0.65, 3.2], [3.4, 0.65, 3.2]], taxa: 44, velocidade: 3.0 }],
      elementos: [{ tipo: 'seta', direcao: 'baixo', ancora: 'cano', alturaRel: 0.8, y: 1.0, tamanho: 0.18, pulsa: true, de: 5.4, ate: 10.1 }],
      camera: { tipo: 'enquadrar', alvo: 'cano', plano: 'medio', angulo: 20, elevacao: 20, deriva: -12, aproxima: 0.92 },
    },
    {
      inicio: 10.4,
      fim: 15.3,
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'nublado', clima: 'chuva', chao: 'asfalto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], params: { length: 24 } },
        { id: 'bueiro', asset: 'bueiro', pos: [2.8, 0.06, 1.5] },
        { id: 'pred', asset: 'predio_apartamentos', pos: [-13, 0, -8], variante: 'azul', params: { floors: 4 } },
        { id: 'poste', asset: 'poste_luz', pos: [-4.4, 0, -2.5] },
        {
          id: 'fresta',
          asset: 'forma',
          pos: [0, 0.08, 1.2],
          params: { tipo: 'caixa', tamanho: [3.2, 0.05, 0.24], cor: '#111215' },
          anim: { escala: [[10.5, 0.7], [15.1, 1.35]] },
        },
      ],
      personagens: [
        {
          id: 'morador',
          preset: 'homem',
          pos: [-4.4, 0.2, 3.5],
          movimentos: [{ de: 10.5, ate: 14.8, para: [-4.4, -3.5], clip: 'run' }],
        },
      ],
      fluxos: [{ material: 'agua', origem: [0, 2.8, 1.2], destino: [0, 0.06, 1.2], taxa: 55, dispersao: 0.7 }],
      camera: { tipo: 'enquadrar', alvo: 'fresta', plano: 'close', angulo: 32, elevacao: 18, deriva: -18, aproxima: 0.82 },
    },
    {
      inicio: 15.3,
      fim: 20.5,
      transicao: 'flash',
      ambiente: { fundo: 'cidade', horario: 'nublado', chao: 'terra' },
      objetos: [
        { id: 'terreno', asset: 'corte_terreno', pos: [0, 0, -1.2], opacidade: 0.82, etapa: [[15.3, 1.0], [20.4, 0.7]] },
        {
          id: 'cano',
          asset: 'tubo',
          pos: [-3.2, 1.05, 2.8],
          opacidade: 0.35,
          variante: 'vermelho',
          params: { pontos: [[0, 0, 0], [3.2, 0, 0], [6.4, 0, 0]], raio: 0.32 },
        },
        { id: 'rachadura', asset: 'forma', pos: [0, 1.05, 2.8], params: { tipo: 'toro', tamanho: [0.55, 0.55, 0.55], cor: '#ef4444', emissivo: true }, anim: { pulsa: 0.16 } },
        { id: 'monte1', asset: 'monte', pos: [0.3, 0, 3.4], variante: 'terra', etapa: [[15.4, 0.9], [20.4, 0.3]] },
        { id: 'casa_bg', asset: 'casa_simples', pos: [-8.5, 0, -8.0], variante: 'verde' },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [2.5, 0, 4.4],
          giro: -20,
          acoes: [
            { clip: 'crouch', de: 15.4, ate: 20.4, expressao: 'worried' },
            { clip: 'talk', de: 15.7, ate: 20.1, fala: true, camada: 1, mascara: ['head', 'face'] },
          ],
        },
      ],
      fluxos: [
        { material: 'agua', caminho: [[-3.2, 1.05, 2.8], [0, 1.05, 2.8]], taxa: 42, velocidade: 2.6 },
        { material: 'agua', origem: [0, 1.05, 2.8], destino: [0.3, 0.1, 3.4], taxa: 54, dispersao: 0.35 },
        { material: 'terra', origem: [0.3, 0.35, 3.4], destino: [2.6, 0.05, 4.4], taxa: 34 },
      ],
      elementos: [{ tipo: 'icone', icone: 'x', pos: [0.34, 0.34], tamanho: 0.18, de: 16.0, ate: 20.0 }],
      camera: { tipo: 'enquadrar', alvo: 'cano', plano: 'medio', angulo: 20, elevacao: 18, deriva: 12, aproxima: 0.9 },
    },
    {
      inicio: 20.5,
      fim: 26.3,
      transicao: 'corte',
      ambiente: { fundo: 'campo', horario: 'tarde', chao: 'terra' },
      objetos: [
        { id: 'terreno', asset: 'corte_terreno', pos: [0, 0, -0.4], etapa: [[20.5, 0.72], [26.2, 0.32]] },
        {
          id: 'caverna',
          asset: 'forma',
          pos: [0, 0.9, 2.5],
          params: { tipo: 'esfera', tamanho: [2.8, 1.4, 2.0], cor: '#181310' },
          anim: { escala: [[20.6, 0.4], [26.0, 1.35]] },
        },
        { id: 'areia1', asset: 'monte', pos: [3.2, 0, 3.0], variante: 'areia', etapa: [[20.6, 0.95], [26.0, 0.15]] },
        { id: 'arv3', asset: 'arvore_redonda', pos: [-7.5, 0, -5], variante: 'outono' },
      ],
      fluxos: [
        { material: 'areia', origem: [0, 1.1, 2.5], destino: [3.2, 0.15, 3.0], taxa: 45 },
        { material: 'agua', origem: [-1.4, 1.2, 2.3], destino: [1.8, 0.05, 3.6], taxa: 32 },
      ],
      elementos: [{ tipo: 'etiqueta', texto: 'vazio oculto', ancora: 'caverna', alturaRel: 0.85, ponto: '#ff4d4f', de: 21.3, ate: 25.9 }],
      textos: [{ texto: 'CAVERNA OCA POR BAIXO', de: 21.0, ate: 25.8, estilo: 'destaque' }],
      camera: { tipo: 'travelling', de: { pos: [5.5, 3.0, 8.6], olha: 'caverna' }, para: { pos: [-3.6, 2.3, 6.4], olha: 'caverna' } },
    },
    {
      inicio: 26.3,
      fim: 31.2,
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'com_faixa', params: { length: 24 } },
        { id: 'loja2', asset: 'loja', pos: [-10, 0, -2], giro: 90, variante: 'padaria' },
        { id: 'arv4', asset: 'arvore_redonda', pos: [8.5, 0, 2], params: { seed: 7 } },
        { id: 'hatch', asset: 'carro_hatch', pos: [-1.6, 0.06, -6.5], variante: 'amarelo', movimentos: [{ de: 26.3, ate: 31.1, para: [-1.6, 8.5] }] },
        { id: 'taxi', asset: 'carro_sedan', pos: [1.6, 0.06, 7.5], giro: 180, variante: 'taxi', movimentos: [{ de: 26.3, ate: 31.1, para: [1.6, -7.5] }] },
        { id: 'vazio_ind', asset: 'forma', pos: [0, 0.03, 0], params: { tipo: 'cilindro', tamanho: [3.5, 0.05, 3.5], cor: '#ff4d4f', emissivo: true }, opacidade: 0.45, anim: { pulsa: 0.14 } },
      ],
      personagens: [
        {
          id: 'morador',
          preset: 'homem',
          pos: [4.3, 0.2, -1.8],
          movimentos: [{ de: 26.4, ate: 30.8, para: [4.3, 3.8], clip: 'walk' }],
          acoes: [{ clip: 'wave', de: 26.8, ate: 30.5, camada: 1, mascara: ['armR'] }],
        },
      ],
      camera: { tipo: 'enquadrar', alvo: 'morador', plano: 'geral', angulo: 28, elevacao: 22, deriva: -14 },
    },
    {
      inicio: 31.2,
      fim: 36.5,
      transicao: 'flash',
      ambiente: { fundo: 'cidade', horario: 'tarde', chao: 'concreto' },
      objetos: [
        { id: 'camadas', asset: 'rua_camadas', pos: [0, 0, -0.4], opacidade: 0.78, etapa: [[31.2, 0.95], [36.2, 0.8]] },
        { id: 'casca', asset: 'forma', pos: [0, 1.32, 0], params: { tipo: 'caixa', tamanho: [6.8, 0.22, 6.8], cor: '#2a2d32' }, anim: { oscila: { eixo: 'y', amp: 0.05, freq: 1.6 } } },
        { id: 'oca', asset: 'forma', pos: [0, 0.5, 0.5], params: { tipo: 'cilindro', tamanho: [4.6, 0.9, 4.6], cor: '#120f0e' }, anim: { escala: [[31.3, 0.65], [36.2, 1.18]] } },
        { id: 'arv_t', asset: 'arvore_redonda', pos: [-7.5, 0, -5.5], variante: 'clara' },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [2.8, 0, 4.3],
          giro: 0,
          viraPara: [{ em: 31.3, alvo: 'camera' }],
          acoes: [
            { clip: 'point', de: 31.5, ate: 36.4, params: { dir: 'forward' } },
            { clip: 'talk', de: 31.6, ate: 36.1, fala: true, camada: 1, mascara: ['head', 'face', 'armL'] },
          ],
        },
      ],
      fluxos: [{ material: 'poeira', origem: [0, 1.15, 1.2], destino: [0, 0.1, 1.2], taxa: 28 }],
      camera: { tipo: 'enquadrar', alvo: 'casca', plano: 'geral', angulo: 24, elevacao: 14, deriva: -16, aproxima: 0.9 },
    },
    {
      inicio: 36.5,
      fim: 41.5,
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'nublado', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], params: { length: 24 } },
        {
          id: 'bus',
          asset: 'onibus',
          pos: [1.6, 0.06, -5.5],
          variante: 'azul',
          movimentos: [{ de: 36.5, ate: 38.7, para: [1.6, 0.6] }],
          anim: { pos: [[38.7, [1.6, 0.06, 0.6]], [40.9, [1.6, -1.25, 0.6]]], giro: [[38.7, 0], [40.9, 18]], eixo: 'x' },
        },
        { id: 'cratera', asset: 'forma', pos: [1.6, 0.05, 0.6], aparece: 38.5, params: { tipo: 'cilindro', tamanho: [3.8, 0.14, 6.8], cor: '#141110' } },
        { id: 'barreira', asset: 'barreira', pos: [-2.6, 0.06, 4.8], aparece: 39.8 },
        { id: 'cone1', asset: 'cone', pos: [0.4, 0.06, 4.9], aparece: 39.8 },
      ],
      personagens: [
        { id: 'morador', preset: 'homem', pos: [-3.5, 0.2, 2.5], giro: 70, acoes: [{ clip: 'surprised', de: 38.5, ate: 41.5, expressao: 'surprised' }] },
      ],
      fluxos: [{ material: 'pedra', origem: [1.6, 0.15, 0.6], destino: [1.6, 2.4, 0.6], taxa: 48, de: 38.5, ate: 41.2 }],
      efeitos: [{ tipo: 'pretoebranco', de: 38.3, ate: 41.2, zoom: 1.15 }],
      textos: [{ texto: 'A CASCA QUEBRA DE VEZ', de: 36.9, ate: 41.2, estilo: 'destaque' }],
      camera: { tipo: 'enquadrar', alvo: 'bus', plano: 'geral', angulo: 42, elevacao: 18, deriva: -16 },
    },
    {
      inicio: 41.5,
      fim: 46.5,
      transicao: 'flash',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], params: { length: 24 } },
        { id: 'esc', asset: 'escavadeira', pos: [1.4, 0.06, -3.5], variante: 'laranja', params: { fase: -41.5, ciclo: 4.8 } },
        { id: 'monte2', asset: 'monte', pos: [-3.6, 0.06, -3.5], variante: 'terra', etapa: [[41.5, 0.25], [46.3, 1.0]] },
        {
          id: 'tubo_novo',
          asset: 'tubo',
          pos: [-1.2, 0.3, 2.5],
          variante: 'azul',
          aparece: 43.2,
          params: { pontos: [[0, 0, 0], [3.4, 0, 0]], raio: 0.3 },
          anim: { pos: [[43.2, [-1.2, 1.9, 2.5]], [45.2, [-1.2, 0.3, 2.5]]] },
        },
        { id: 'barreira', asset: 'barreira', pos: [0, 0.06, 6.2] },
        { id: 'cone2', asset: 'cone', pos: [-2.2, 0.06, 6.2] },
      ],
      personagens: [
        { id: 'ajudante', preset: 'servente', pos: [3.2, 0.06, 2.8], giro: -75, acoes: [{ clip: 'dig', de: 41.6, ate: 46.5 }] },
        { id: 'guia', preset: 'engenheira', pos: [-3.4, 0.2, 3.8], giro: 0, viraPara: [{ em: 41.6, alvo: 'camera' }], acoes: [{ clip: 'talk', de: 41.9, ate: 46.1, fala: true }] },
      ],
      fluxos: [{ material: 'poeira', origem: [1.4, 0.8, 0.5], destino: [-3.6, 0.6, -3.5], taxa: 24 }],
      camera: { tipo: 'enquadrar', alvo: 'esc', plano: 'geral', angulo: -32, elevacao: 22, deriva: 18 },
    },
    {
      inicio: 46.5,
      fim: 52.7,
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'asfalto' },
      objetos: [
        { id: 'camadas', asset: 'rua_camadas', pos: [-4.0, 0, 2.5], etapa: [[46.6, 0.2], [52.4, 1.0]] },
        { id: 'cam', asset: 'caminhao_cacamba', pos: [-4.0, 0, -5.8], giro: 0, etapa: [[46.6, 0.0], [49.2, 1.0]] },
        { id: 'rolo', asset: 'rolo_compressor', pos: [2.2, 0.06, -4.5], movimentos: [{ de: 47.6, ate: 52.5, para: [2.2, 5.5] }] },
        { id: 'pav', asset: 'vibroacabadora', pos: [2.2, 0.06, -11.5], movimentos: [{ de: 48.0, ate: 52.5, para: [2.2, -2.5] }] },
      ],
      personagens: [
        {
          id: 'mestre',
          preset: 'construtor',
          pos: [4.6, 0, 2.2],
          giro: -65,
          acoes: [
            { clip: 'point', de: 46.8, ate: 52.6, params: { dir: 'forward' } },
            { clip: 'talk', de: 47.0, ate: 52.2, fala: true, camada: 1, mascara: ['head', 'face'] },
          ],
        },
      ],
      fluxos: [{ material: 'brita', origem: { ancora: 'cam', desloca: [0, 1.6, 4.2] }, destino: [-4.0, 0.8, 2.5], taxa: 48, de: 46.7, ate: 49.5 }],
      rastros: [{ seguir: 'pav', largura: 3.2, altura: 0.07, cor: '#1e2024', recuo: 2.6, de: 48.0, ate: 52.5 }],
      elementos: [{ tipo: 'icone', icone: 'v', pos: [0.76, 0.34], tamanho: 0.18, de: 49.0, ate: 52.5 }],
      camera: { tipo: 'enquadrar', alvo: 'rolo', plano: 'geral', angulo: 42, elevacao: 24, deriva: -14 },
    },
    {
      inicio: 52.7,
      fim: 56.4,
      transicao: 'flash',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'com_faixa', params: { length: 24 } },
        { id: 'arv5', asset: 'arvore_redonda', pos: [-7.5, 0, 2], params: { seed: 9 } },
        { id: 'loja3', asset: 'loja', pos: [10, 0, -3], giro: -90, variante: 'padaria' },
        { id: 'sedan', asset: 'carro_sedan', pos: [-1.6, 0.06, -7.0], variante: 'verde', movimentos: [{ de: 52.7, ate: 56.4, para: [-1.6, 7.0] }] },
        { id: 'bus2', asset: 'onibus', pos: [1.6, 0.06, 8.0], giro: 180, variante: 'verde', movimentos: [{ de: 52.7, ate: 56.4, para: [1.6, -6.5] }] },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [3.8, 0.2, 3.0],
          giro: 0,
          viraPara: [{ em: 52.8, alvo: 'camera' }],
          acoes: [
            { clip: 'nod', de: 53.0, ate: 54.4, expressao: 'happy' },
            { clip: 'talk', de: 53.1, ate: 56.0, fala: true, camada: 1, mascara: ['head', 'face'] },
          ],
        },
      ],
      fluxos: [{ material: 'vapor', origem: [0, 0.08, 0], destino: [0, 1.4, 0], taxa: 14 }],
      camera: { tipo: 'enquadrar', alvo: 'sedan', plano: 'medio', angulo: -28, elevacao: 16, deriva: 14 },
    },
    {
      inicio: 56.4,
      fim: 60.0,
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'tarde', chao: 'concreto' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'com_faixa', params: { length: 24 } },
        { id: 'camadas', asset: 'rua_camadas', pos: [-6.0, 0, -2.5], etapa: [[56.4, 1.0]] },
        { id: 'carro', asset: 'carro_sedan', pos: [1.5, 0.06, -5.0], variante: 'branco', movimentos: [{ de: 56.4, ate: 60.0, para: [1.5, 7.5] }] },
      ],
      personagens: [
        {
          id: 'guia',
          preset: 'engenheira',
          pos: [-2.2, 0.2, 4.8],
          giro: 0,
          viraPara: [{ em: 56.4, alvo: 'camera' }],
          acoes: [
            { clip: 'wave', de: 56.5, ate: 58.1, expressao: 'happy' },
            { clip: 'cheer', de: 58.2, ate: 60.0, expressao: 'happy' },
            { clip: 'talk', de: 56.7, ate: 58.9, fala: true, camada: 1, mascara: ['head', 'face'] },
          ],
        },
      ],
      textos: [{ texto: 'JÁ VIU UMA CRATERA NA SUA RUA?', de: 56.5, ate: 60.0, estilo: 'pergunta' }],
      camera: { tipo: 'enquadrar', alvo: 'guia', plano: 'medio', angulo: 0, elevacao: 10, deriva: 8, aproxima: 0.9 },
    },
  ];
}

/**
 * Compila e audita um storyboard 3D garantindo:
 * 1) Regra Anti-Oclusao: tubos/elementos subterraneos ficam sempre visiveis na frente do corte;
 * 2) Set Bible Continuo: cenario real ao fundo sem chao vazio isolado;
 * 3) Enquadramento de personagens + suporte a pedido de 1 cena ou video completo;
 * 4) Legendas virais Word-by-Word em #ffd60a.
 */
const CARTOON_25D_SPOKEN_SCRIPT = [
  'Em mil novecentos e vinte e cinco, um homem conseguiu vender a Torre Eiffel.',
  'E o mais absurdo é que um mês depois ele voltou a Paris e vendeu tudo de novo.',
  'Com um documento falso na mão, o golpista convenceu o comprador com um simples aperto de mão.',
  'A vítima teve tanta vergonha do golpe que nunca foi à polícia.',
].join(' ');

function buildCartoon25dDemoScenes(): any[] {
  return [
    {
      inicio: 0.0,
      fim: 4.5,
      estilo: '2.5d_cartoon',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'paralelepipedo' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'sem_calcada', params: { length: 28 } },
        { id: 'casa_l', asset: 'casa_colonial', pos: [-6.5, 0, -3.5], giro: 90, variante: 'rosa' },
        { id: 'loja_r', asset: 'loja', pos: [6.8, 0, -4.5], giro: -90, variante: 'padaria' },
        { id: 'arv1', asset: 'arvore_redonda', pos: [5.0, 0, -9.0], params: { seed: 7 } },
        { id: 'arv2', asset: 'arvore_redonda', pos: [-5.2, 0, -10.5], params: { seed: 3 } },
      ],
      personagens: [
        {
          id: 'lustig',
          estilo: '2.5d_cartoon',
          preset: 'homem',
          pos: [0, 0, 2.2],
          acoes: [
            { clip: 'talk', de: 0.1, ate: 2.3, fala: true, expressao: 'grin', prop: 'carta' },
            { clip: 'wave', de: 2.4, ate: 3.7, expressao: 'laugh' },
          ],
        },
      ],
      textos: [{ texto: 'PARIS MIL NOVECENTOS E VINTE E CINCO', de: 0.15, ate: 3.7, estilo: 'titulo' }],
      camera: { tipo: 'enquadrar', alvo: 'lustig', plano: 'medio', angulo: 8, elevacao: 6, deriva: -6, aproxima: 0.92 },
    },
    {
      inicio: 4.5,
      fim: 9.2,
      estilo: '2.5d_cartoon',
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'dia', chao: 'paralelepipedo' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'sem_calcada', params: { length: 28 } },
        { id: 'casa_l', asset: 'casa_colonial', pos: [-6.5, 0, -3.5], giro: 90, variante: 'azul' },
        { id: 'loja_r', asset: 'loja', pos: [6.8, 0, -4.5], giro: -90, variante: 'mercado' },
        { id: 'arv1', asset: 'arvore_redonda', pos: [-4.8, 0, -8.5], params: { seed: 9 } },
      ],
      personagens: [
        {
          id: 'lustig',
          estilo: '2.5d_cartoon',
          preset: 'homem',
          pos: [-0.65, 0, 2.35],
          acoes: [
            { clip: 'talk', de: 4.6, ate: 8.3, fala: true, expressao: 'smile', prop: 'carta' },
          ],
        },
        {
          id: 'comprador',
          estilo: '2.5d_cartoon',
          preset: 'velhinho',
          pos: [0.65, 0, 2.25],
          acoes: [
            { clip: 'point', de: 5.0, ate: 6.5, expressao: 'shock', params: { dir: 'side' } },
            { clip: 'talk', de: 6.6, ate: 8.4, expressao: 'grin', prop: 'moeda' },
          ],
        },
      ],
      elementos: [{ tipo: 'icone', icone: 'dinheiro', ancora: 'comprador', alturaRel: 1.18, de: 5.2, ate: 8.4 }],
      camera: { tipo: 'enquadrar', alvo: 'comprador', olhaDesloca: [-0.62, 0, 0], plano: 'geral', angulo: -8, elevacao: 7, deriva: 8, aproxima: 0.94 },
    },
    {
      inicio: 9.2,
      fim: 15.0,
      estilo: '2.5d_cartoon',
      transicao: 'corte',
      ambiente: { fundo: 'cidade', horario: 'dourado', chao: 'paralelepipedo' },
      objetos: [
        { id: 'rua', asset: 'rua_reta', pos: [0, 0, 0], variante: 'sem_calcada', params: { length: 28 } },
        { id: 'casa_l', asset: 'casa_colonial', pos: [-6.5, 0, -3.5], giro: 90, variante: 'rosa' },
        { id: 'arv1', asset: 'arvore_redonda', pos: [5.5, 0, -7.5], params: { seed: 2 } },
      ],
      personagens: [
        {
          id: 'comprador',
          estilo: '2.5d_cartoon',
          preset: 'velhinho',
          pos: [0, 0, 2.5],
          acoes: [
            { clip: 'surprised', de: 9.4, ate: 11.4, expressao: 'shock' },
            { clip: 'idle', de: 11.5, ate: 14.2, expressao: 'worried' },
          ],
        },
      ],
      elementos: [{ tipo: 'icone', icone: 'exclamacao', ancora: 'comprador', alturaRel: 1.2, de: 9.5, ate: 12.8 }],
      textos: [{ texto: 'NUNCA DENUNCIOU O GOLPE', de: 9.5, ate: 14.1, estilo: 'destaque' }],
      camera: { tipo: 'enquadrar', alvo: 'comprador', plano: 'close', angulo: 6, elevacao: 4, deriva: -8, aproxima: 0.88 },
    },
  ];
}

export function compileThreeJsStoryboard(input: CompileThreeJsInput): CompileThreeJsResult {
  const aspect = input.aspect || '9:16';
  const dims =
    aspect === '16:9'
      ? { largura: 1920, altura: 1080 }
      : aspect === '1:1'
        ? { largura: 1080, altura: 1080 }
        : { largura: 1080, altura: 1920 };
  const fps = input.fps || (input.isDraft ? 24 : 30);

  const custom = input.storyboard;
  const useCartoonDemo = input.preset === 'cartoon_25d_demo' && !(Array.isArray(custom?.cenas) && custom.cenas.length > 0);
  const resolvedEstilo: ThreeJsEstilo =
    input.estilo || custom?.estilo || (useCartoonDemo ? '2.5d_cartoon' : '3d');
  let cenas: any[] =
    Array.isArray(custom?.cenas) && custom.cenas.length > 0
      ? JSON.parse(JSON.stringify(custom.cenas))
      : useCartoonDemo
        ? buildCartoon25dDemoScenes()
        : buildRefinedCrateraScenes();

  const auditFixes: string[] = [];

  if (input.kind === 'single_scene' && cenas.length > 1) {
    cenas = [cenas[0]];
    const dur = Math.max(2, Number(cenas[0].fim || 5) - Number(cenas[0].inicio || 0));
    cenas[0].inicio = 0;
    cenas[0].fim = dur;
    auditFixes.push(`Modo single_scene ativo: recortado para 1 cena (${dur.toFixed(1)}s)`);
  }

  for (let i = 0; i < cenas.length; i++) {
    const c = cenas[i];
    if (!c.ambiente) c.ambiente = { fundo: 'cidade', horario: 'dia', chao: 'concreto' };
    if (!c.ambiente.fundo) c.ambiente.fundo = 'cidade';

    const objs: any[] = Array.isArray(c.objetos) ? c.objetos : [];
    const hasTubo = objs.some((o) => o.asset === 'tubo');
    const hasCutBlock = objs.some((o) => o.asset === 'corte_terreno' || o.asset === 'rua_camadas');

    if (hasTubo && hasCutBlock) {
      for (const o of objs) {
        if (o.asset === 'tubo') {
          if (!o.params) o.params = {};
          if (!o.params.raio || o.params.raio < 0.28) {
            o.params.raio = 0.32;
            auditFixes.push(`Cena ${i + 1}: raio do cano ajustado para 0.32m`);
          }
          if (!Array.isArray(o.pos) || Number(o.pos[2] || 0) < 2.2) {
            o.pos = [o.pos?.[0] ?? -3.2, o.pos?.[1] ?? 0.85, 2.8];
            auditFixes.push(`Cena ${i + 1}: cano reposicionado na face frontal (z=2.8) para não ficar oculto`);
          }
        }
        if (o.asset === 'corte_terreno' || o.asset === 'rua_camadas') {
          if (!Array.isArray(o.pos) || Number(o.pos[2] || 0) >= 0) {
            o.pos = [o.pos?.[0] ?? 0, o.pos?.[1] ?? 0, -1.0];
          }
          if (o.opacidade === undefined || o.opacidade > 0.85) {
            o.opacidade = 0.55;
            auditFixes.push(`Cena ${i + 1}: bloco de corte translúcido para manter cano 100% visível`);
          }
        }
      }
    }

    const hasBackdrop = objs.some((o) => ['rua_reta', 'loja', 'casa_simples', 'predio_apartamentos', 'arvore_redonda', 'arvore_pinheiro'].includes(o.asset));
    const isClosedSet = c.ambiente.fundo === 'interior' || c.ambiente.fundo === 'industrial';
    if (!hasBackdrop && !isClosedSet) {
      objs.push({ id: `bg_arv_${i}`, asset: 'arvore_redonda', pos: [-7.5, 0, -6.0], params: { seed: i + 1 } });
      objs.push({ id: `bg_casa_${i}`, asset: 'casa_simples', pos: [7.5, 0, -9.0], variante: 'azul' });
      c.objetos = objs;
      auditFixes.push(`Cena ${i + 1}: cenário de bairro adicionado ao fundo`);
    }

    for (const p of c.personagens || []) {
      if (Array.isArray(p.pos) && Math.abs(Number(p.pos[0] || 0)) > 4.2) {
        p.pos[0] = Math.sign(p.pos[0]) * 3.4;
        auditFixes.push(`Cena ${i + 1}: personagem ${p.id} trazido para dentro do enquadramento`);
      }

      // Spatial Clipping Guard: evita pernas/personagens atravessando cofres, portas, grades ou barreiras
      if (Array.isArray(p.pos) && !p.insideSafeZone) {
        const px = Number(p.pos[0] || 0);
        const pz = Number(p.pos.length === 2 ? p.pos[1] : p.pos[2] || 0);
        for (const o of objs) {
          const idTag = `${o.id || ''} ${o.asset || ''}`.toLowerCase();
          const isBarrier =
            Boolean(o.collisionBox) ||
            /(?:cofre|vault|porta|door|grade|barreira|muro|parede)/i.test(idTag);
          if (!isBarrier || !Array.isArray(o.pos)) continue;
          const ox = Number(o.pos[0] || 0);
          const oz = Number(o.pos.length === 2 ? o.pos[1] : o.pos[2] || 0);
          const safeHalfW = Number(o.collisionBox?.halfW || 0.85);
          const safeHalfD = Number(o.collisionBox?.halfD || 0.95);
          if (Math.abs(px - ox) < safeHalfW && Math.abs(pz - oz) < safeHalfD) {
            const shiftedZ = pz >= oz ? oz + safeHalfD + 0.55 : oz - safeHalfD - 0.55;
            if (p.pos.length === 2) p.pos[1] = +shiftedZ.toFixed(2);
            else p.pos[2] = +shiftedZ.toFixed(2);
            auditFixes.push(
              `Cena ${i + 1}: Spatial Clipping Guard reposicionou "${p.id}" fora do batente de "${o.id}" (z=${shiftedZ.toFixed(2)})`
            );
          }

          const doorOpenAt = typeof o.abreEm === 'number' ? o.abreEm : typeof o.doorOpenAt === 'number' ? o.doorOpenAt : null;
          if (doorOpenAt !== null && Array.isArray(p.movimentos)) {
            for (const mv of p.movimentos) {
              if (typeof mv.de === 'number' && mv.de < doorOpenAt + 0.35) {
                const oldDe = mv.de;
                mv.de = +(doorOpenAt + 0.35).toFixed(2);
                if (typeof mv.ate === 'number' && mv.ate <= mv.de + 0.4) {
                  mv.ate = +(mv.de + 1.2).toFixed(2);
                }
                auditFixes.push(
                  `Cena ${i + 1}: movimento de "${p.id}" atrasado de ${oldDe}s para ${mv.de}s aguardando abertura de "${o.id}"`
                );
              }
            }
          }
        }
      }
    }

    // Protege câmera fixa contra spawn dentro de sólidos grandes
    if (c.camera?.tipo === 'fixa' && Array.isArray(c.camera.pos)) {
      const cx = Number(c.camera.pos[0] || 0);
      const cy = Number(c.camera.pos[1] || 0);
      const cz = Number(c.camera.pos[2] || 0);
      for (const o of objs) {
        if (!Array.isArray(o.pos) || o.opacidade !== undefined && o.opacidade < 0.9) continue;
        const ox = Number(o.pos[0] || 0);
        const oy = o.pos.length === 3 ? Number(o.pos[1] || 0) : 0;
        const oz = Number(o.pos.length === 2 ? o.pos[1] : o.pos[2] || 0);
        const dist = Math.hypot(cx - ox, cy - (oy + 1), cz - oz);
        if (dist < 0.75) {
          c.camera.pos[2] = +(cz + 1.8).toFixed(2);
          auditFixes.push(`Cena ${i + 1}: câmera afastada de "${o.id}" para evitar oclusão`);
        }
      }
    }
  }

  let totalDur = Number(cenas[cenas.length - 1]?.fim || 60);
  if (input.audioDurationSec && input.audioDurationSec > 0 && cenas.length > 0) {
    const targetDur = Math.max(totalDur, +(input.audioDurationSec + 0.35).toFixed(2));
    if (Math.abs(targetDur - totalDur) > 0.1) {
      cenas[cenas.length - 1].fim = targetDur;
      totalDur = targetDur;
    }
  }

  const clockAudit = validateTimelineClockAndCuts(
    cenas.map((c, idx) => ({
      index: idx,
      inicio: Number(c.inicio || 0),
      fim: Number(c.fim || 0),
      acoes: Array.isArray(c.personagens) ? c.personagens.flatMap((p: any) => p.acoes || []) : [],
      movimentos: Array.isArray(c.personagens) ? c.personagens.flatMap((p: any) => p.movimentos || []) : [],
      textos: c.textos || [],
      elementos: c.elementos || [],
    })),
    { minKeyMarginSec: 0.7, autoClampNearCut: true }
  );
  auditFixes.push(...clockAudit.warnings);

  const storyboard: ThreeJsStoryboard = {
    versao: 1,
    titulo: input.title || custom?.titulo || (useCartoonDemo ? 'O Homem Que Vendeu a Torre Eiffel' : 'Por que a rua abre cratera do nada?'),
    estilo: resolvedEstilo,
    qualidade: custom?.qualidade || (input.isDraft ? 'basica' : 'media'),
    formato: { ...dims, fps },
    duracao: totalDur,
    audio: 'narracao.mp3',
    palavras: 'palavras.json',
    mouthCues: custom?.mouthCues || 'mouthCues.json',
    legendas: { ...DEFAULT_VIRAL_CAPTIONS, ...(custom?.legendas || {}), ...(input.captions || {}) },
    ambiente: custom?.ambiente || { fundo: 'cidade', horario: 'dia', chao: useCartoonDemo ? 'paralelepipedo' : 'concreto', nuvens: true },
    cenas,
  };

  return {
    storyboard,
    spokenScript: useCartoonDemo ? CARTOON_25D_SPOKEN_SCRIPT : CRATERA_SPOKEN_SCRIPT,
    sceneCount: cenas.length,
    auditFixes,
  };
}
