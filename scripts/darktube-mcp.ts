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
} from '../lib/mcp/darktube-tools';

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
        description: 'Pipeline 3 Híbrido: renderiza MP4 via Remotion, ou cria projeto nativo no /flow com IA generativa, ou gera roteiro e copy.',
        inputSchema: {
          type: 'object',
          properties: {
            offer: { type: 'string', description: 'Nome ou identificador da oferta/produto (ex: 365-receitas, Tenis Nuvem)' },
            pipelineMode: {
              type: 'string',
              enum: ['remotion', 'flow', 'script_only'],
              description: 'Caminho de execução: "remotion" (MP4 procedural imediato), "flow" (projeto nativo no /flow + fila de IA) ou "script_only"',
              default: 'remotion',
            },
            templateId: { type: 'string', description: 'ID do template do /flow (ex: receita-viral, produto-tiktok-shop)', default: 'produto-tiktok-shop' },
            videoModel: {
              type: 'string',
              enum: ['Omni 1.1 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'],
              description: 'Modelo de geração de vídeo por IA no /flow',
              default: 'Omni 1.1 Flash',
            },
            secondsPerTake: {
              type: 'number',
              enum: [4, 6, 8, 10],
              description: 'Duração em segundos de cada take/cena',
              default: 6,
            },
            quality: { type: 'string', enum: ['360p', '720p', '1080p'], default: '360p' },
            angle: {
              type: 'string',
              description: 'Ângulo validado de venda do criativo (ex: pao-frigideira, doce-sem-culpa)',
              default: 'pao-frigideira',
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
            templateParams: { type: 'object', description: 'Parâmetros específicos do template selecionado (ex: voz, prato, cta)' },
            isDraft: { type: 'boolean', description: 'Se true, gera preview 360p ultra-rápido (~10s) com folha de contato', default: true },
            downloadLocal: { type: 'boolean', description: 'Se true, faz download do MP4 para ./midia/criativos/ do projeto', default: true },
            outputDir: { type: 'string', description: 'Diretório local para salvar o MP4', default: './midia/criativos' },
            queueTakes: { type: 'boolean', description: 'Se true, enfileira takes no Google Flow runner', default: true },
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
