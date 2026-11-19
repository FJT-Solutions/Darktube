#!/usr/bin/env node
/**
 * DarkTube MCP Server (Transporte Stdio para clientes MCP locais ou mcp-remote).
 * 
 * Uso:
 *   npx tsx scripts/darktube-mcp.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  listFlowTemplates,
  createCampaignCreative,
  renderCreative,
  downloadCreativeToLocal,
  getCreativeStatus,
  assembleFlowCreative,
  replaceCreativeAudio,
} from '../lib/mcp/darktube-tools';
import {
  analyzeVideoLinkMcp,
  cloneVideoFromLinkMcp,
  renderHtmlSvgVideoMcp,
  renderThreeJsVideoMcp,
  getRenderQueueStatusMcp,
  searchAndDownload3dAssetsMcp,
} from '../lib/mcp/flow-advanced-tools';

const server = new Server(
  {
    name: 'darktube-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Registro do catálogo de tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'darktube_list_flow_templates',
        description: 'Lista todos os templates e formatos disponíveis no DarkTube Flow com seus beats e opções.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'darktube_create_campaign_creative',
        description: 'Pipeline 3 Híbrido: renderiza MP4 via Remotion, ou cria projeto nativo no /flow com IA generativa, ou gera roteiro e copy. IMPORTANTE: O agente deve alinhar com o usuário as preferências de motor (remotion vs flow), modelo de vídeo (Omni 1.1 vs Veo 3.1), duração dos takes (4s, 6s, 8s, 10s) e personagem antes de executar.',
        inputSchema: {
          type: 'object',
          properties: {
            offer: { type: 'string', description: 'Nome ou identificador da oferta/produto (ex: 365-receitas, Tenis Nuvem)' },
            pipelineMode: {
              type: 'string',
              enum: ['remotion', 'flow', 'script_only'],
              description: 'Caminho de execução: "script_only" (padrão: roteiro e copy da oferta pela IA, grátis), "flow" (projeto nativo no /flow + fila de IA) ou "remotion" (MP4 só dos presets prontos: exige angle)',
              default: 'script_only',
            },
            templateId: { type: 'string', description: 'ID do template do /flow (ex: receita-viral, produto-tiktok-shop)', default: 'produto-tiktok-shop' },
            videoModel: {
              type: 'string',
              enum: ['Omni 1.2 Flash', 'Omni 1.1 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'],
              description: 'Modelo de geração de vídeo por IA no /flow',
              default: 'Omni 1.2 Flash',
            },
            secondsPerTake: {
              type: 'number',
              minimum: 3,
              maximum: 15,
              description: 'Duração em segundos de cada take/cena (Omni 1.2: 3 a 15 s; Omni 1.1: 4, 6, 8 ou 10; Veo: 5 ou 8). O servidor ajusta ao valor aceito.',
              default: 6,
            },
            quality: { type: 'string', enum: ['360p', '720p', '1080p'], default: '360p' },
            angle: {
              type: 'string',
              description: 'Preset pronto de outra oferta (pao-frigideira, doce-sem-culpa, mosaico-365); só no modo remotion. Sem ele, roteiro e copy vêm da oferta pedida.',
            },
            format: { type: 'string', enum: ['9:16', '1:1', '16:9'], default: '9:16' },
            takesCount: { type: 'number', description: 'Quantidade de takes/cenas a serem gerados', default: 4 },
            benefits: { type: 'string', description: 'Benefícios principais do produto para o roteiro' },
            customIdea: { type: 'string', description: 'Ideia customizada ou instrução específica para a cena' },
            character: {
              type: 'object',
              description: 'Personagem/apresentador do vídeo: envie a foto em sheetUrl ou peça para gerar por IA',
              properties: {
                name: { type: 'string', description: 'Nome do personagem (ex: Julia Nutricionista)' },
                description: { type: 'string', description: 'Descrição física detalhada (idade, roupas, cabelo, traços)' },
                voice: { type: 'string', description: 'Timbre e tom de voz (ex: natural, acolhedora, entusiasta)' },
                sheetUrl: { type: 'string', description: 'URL da imagem/foto já existente para referência (Image-to-Video)' },
                generateSheet: { type: 'boolean', description: 'Se true e não tiver sheetUrl, gera a folha via IA primeiro', default: false },
              },
            },
            templateParams: { type: 'object', description: 'Parâmetros específicos do template selecionado (ex: voz, prato, cta). CTA animado na montagem (Remotion, so no pipeline flow): ctaTitle (obrigatorio para ativar), ctaSubtitle, ctaAccent (#RRGGBB), ctaPosition (top|center|bottom), ctaStartSec, ctaSeconds. O Flow nao desenha texto no video' },
            isDraft: { type: 'boolean', description: 'Se true, gera preview 360p ultra-rápido (~10s) com folha de contato', default: true },
            downloadLocal: { type: 'boolean', description: 'Se true, faz download do MP4 para ./midia/criativos/ do projeto', default: true },
            outputDir: { type: 'string', description: 'Diretório local para salvar o MP4', default: './midia/criativos' },
            queueTakes: { type: 'boolean', description: 'Se true, enfileira takes no Google Flow runner', default: true },
            waitForSeconds: { type: 'number', description: 'Segundos para aguardar a conclusão e montagem no Flow (600s por padrão; 0 para retorno imediato)', default: 600 },
          },
          required: ['offer'],
        },
      },
      {
        name: 'darktube_render_creative',
        description: 'Dispara renderização procedural direta no motor Remotion do DarkTube.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', default: 'ShortVideo' },
            scenes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  durationSeconds: { type: 'number' },
                  captionText: { type: 'string' },
                  mediaUrl: { type: 'string' },
                  animationStyle: { type: 'string' },
                  transitionIn: { type: 'string' },
                },
                required: ['durationSeconds', 'captionText'],
              },
            },
            format: { type: 'string', enum: ['vertical', 'horizontal'], default: 'vertical' },
            isDraft: { type: 'boolean', default: false },
            downloadLocal: { type: 'boolean', default: false },
            outputDir: { type: 'string', default: './midia/criativos' },
          },
          required: ['scenes'],
        },
      },
      {
        name: 'darktube_download_creative',
        description: 'Baixa um vídeo renderizado na VPS para a pasta interna ./midia/ do repositório ativo.',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'URL pública do vídeo gerado no DarkTube' },
            outputDir: { type: 'string', default: './midia/criativos' },
            preferredFileName: { type: 'string' },
          },
          required: ['videoUrl'],
        },
      },
      {
        name: 'darktube_get_creative_status',
        description: 'Consulta o status de geração dos takes, imagens de personagem e vídeo final montado de um projeto no /flow.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID do projeto retornado na criação (ou prefixo de 8 caracteres)' },
            assembleIfReady: { type: 'boolean', description: 'Se todos os takes estiverem prontos, dispara a montagem automática', default: true },
            downloadLocal: { type: 'boolean', description: 'Se true, baixa o vídeo final e a folha do personagem para a pasta local', default: true },
            outputDir: { type: 'string', description: 'Diretório local para download', default: './midia/criativos' },
            waitForSeconds: { type: 'number', description: 'Segundos para aguardar até os takes terminarem e montar o vídeo (0 para consulta imediata)', default: 0 },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'darktube_assemble_flow_project',
        description: 'Dispara a montagem de um projeto do /flow usando ffmpeg, gerando o MP4 final com legendas e áudio.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID do projeto no /flow' },
            downloadLocal: { type: 'boolean', description: 'Se true, baixa o MP4 montado para o disco local', default: true },
            outputDir: { type: 'string', default: './midia/criativos' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'darktube_replace_audio',
        description: 'Substitui a faixa de áudio de um criativo/vídeo do /flow por um áudio gravado externo (.webm, .mp3, .wav), sincroniza legendas dinâmicas via Whisper e opcionalmente dispara microserviço neural de Lip-Sync no rosto do personagem.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID do projeto no /flow para substituir o áudio e remontar com novas legendas' },
            videoPathOrUrl: { type: 'string', description: 'Ou caminho/URL do arquivo de vídeo MP4 avulso' },
            audioPathOrUrl: { type: 'string', description: 'Caminho local ou URL do áudio gravado (.webm, .mp3, .wav)' },
            lipsync: { type: 'boolean', description: 'Se true, envia para microserviço de Lip-Sync para sincronizar os lábios com IA', default: false },
            outputDir: { type: 'string', description: 'Diretório de destino', default: './midia/criativos' },
            filename: { type: 'string', description: 'Nome preferido do arquivo final MP4' },
          },
          required: ['audioPathOrUrl'],
        },
      },
      {
        name: 'darktube_render_html_svg_video',
        description: 'Motor programático de vídeo $0 (sem créditos de Flow/IA): renderiza animações determinísticas em HTML + SVG + Canvas 3D low-poly para MP4 via Chromium + FFmpeg com Motion Checks automáticos.',
        inputSchema: {
          type: 'object',
          properties: {
            preset: {
              type: 'string',
              enum: [
                'html_svg_explainer',
                'html_svg_character_story',
                'html_svg_product_motion',
                'html_svg_tech_crimson',
                'html_svg_3d_diorama',
              ],
              default: 'html_svg_explainer',
            },
            dioramaMode: { type: 'string', enum: ['rural_plot', 'storefront', 'cutaway_oven'] },
            title: { type: 'string' },
            aspect: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
            fps: { type: 'number', default: 30 },
            palette: { type: 'array', items: { type: 'string' } },
            characters: { type: 'array', items: { type: 'object' } },
            scenes: { type: 'array', items: { type: 'object' } },
            customHtml: { type: 'string' },
            durationSec: { type: 'number' },
            isDraft: { type: 'boolean', default: false },
            downloadLocal: { type: 'boolean', default: true },
            outputDir: { type: 'string', default: './midia/criativos' },
            fileName: { type: 'string' },
          },
        },
      },
      {
        name: 'darktube_render_3d_video',
        description: 'Motor 3D articulado ($0 créditos Flow) na Fila Multi-Usuário FIFO: 1 cena ou vídeo completo, voz híbrida (externo -> ElevenLabs -> OpenAI -> Edge TTS fallback) e legendas virais.',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['single_scene', 'full_video'], default: 'full_video' },
            preset: { type: 'string', enum: ['curiosidade_cratera', 'custom_storyboard'], default: 'curiosidade_cratera' },
            title: { type: 'string' },
            aspect: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
            fps: { type: 'number', default: 24 },
            isDraft: { type: 'boolean', default: true },
            scriptText: { type: 'string' },
            storyboard: { type: 'object' },
            captions: { type: 'object' },
            voiceProvider: { type: 'string', enum: ['auto', 'external', 'elevenlabs', 'openai', 'edge'], default: 'auto' },
            voiceGender: { type: 'string', enum: ['male', 'female'], default: 'male' },
            voiceId: { type: 'string' },
            language: { type: 'string', default: 'pt-BR' },
            speed: { type: 'number', default: 1.02 },
            topic: { type: 'string' },
            durationSec: { type: 'number' },
            quality: { type: 'string', enum: ['alta', 'media', 'basica'] },
            audioPathOrUrl: { type: 'string' },
            waitForResult: { type: 'boolean', default: true },
            downloadLocal: { type: 'boolean', default: true },
            outputDir: { type: 'string', default: './midia/criativos' },
            fileName: { type: 'string' },
          },
        },
      },
      {
        name: 'darktube_get_render_queue_status',
        description: 'Consulta a Fila Multi-Usuário FIFO de renderização na VPS.',
        inputSchema: {
          type: 'object',
          properties: { jobId: { type: 'string' } },
        },
      },
      {
        name: 'darktube_search_3d_assets',
        description: 'Busca e baixa modelos 3D gratuitos CC0 (.glb/.gltf) no cache local, Poly Haven e Poly Pizza.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 16 },
            downloadSource: { type: 'string', enum: ['polyhaven', 'polypizza', 'url'] },
            assetId: { type: 'string' },
            url: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    ],
  };
});

// 2. Execução das tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'darktube_list_flow_templates':
      case 'darktube_list_templates':
        result = await listFlowTemplates();
        break;

      case 'darktube_create_campaign_creative':
        result = await createCampaignCreative(args as any);
        break;

      case 'darktube_render_creative':
        result = await renderCreative(args as any);
        break;

      case 'darktube_download_creative':
        result = await downloadCreativeToLocal(
          (args as any).videoUrl,
          (args as any).outputDir,
          (args as any).preferredFileName
        );
        break;

      case 'darktube_get_creative_status':
        result = await getCreativeStatus(args as any);
        break;

      case 'darktube_assemble_flow_project':
        result = await assembleFlowCreative(args as any);
        break;

      case 'darktube_replace_audio':
        result = await replaceCreativeAudio(args as any);
        break;

      case 'darktube_analyze_video_link':
        result = await analyzeVideoLinkMcp(args as any);
        break;

      case 'darktube_clone_video_from_link':
        result = await cloneVideoFromLinkMcp(args as any);
        break;

      case 'darktube_render_html_svg_video':
        result = await renderHtmlSvgVideoMcp(args as any);
        break;

      case 'darktube_render_3d_video':
        result = await renderThreeJsVideoMcp(args as any);
        break;

      case 'darktube_get_render_queue_status':
        result = await getRenderQueueStatusMcp(args as any);
        break;

      case 'darktube_search_3d_assets':
        result = await searchAndDownload3dAssetsMcp(args as any);
        break;

      default:
        throw new Error(`Tool "${name}" não reconhecida.`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro ao executar tool ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[DarkTube MCP] Servidor MCP Stdio iniciado e pronto para receber conexões.');
}

main().catch((err) => {
  console.error('[DarkTube MCP] Erro fatal no servidor:', err);
  process.exit(1);
});
