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
        description: 'Cria um criativo completo para campanhas do X1 / Meta Ads com roteiro, render e download automático.',
        inputSchema: {
          type: 'object',
          properties: {
            offer: { type: 'string', description: 'Nome ou identificador da oferta (ex: 365-receitas)' },
            angle: {
              type: 'string',
              enum: ['pao-frigideira', 'doce-sem-culpa', 'mosaico-365'],
              description: 'Ângulo validado de venda do criativo',
            },
            format: { type: 'string', enum: ['9:16', '1:1', '16:9'], default: '9:16' },
            isDraft: { type: 'boolean', description: 'Se true, gera preview 360p ultrarrápido (~10s) com folha de contato', default: true },
            downloadLocal: { type: 'boolean', description: 'Se true, salva o .mp4 na pasta ./midia/criativos/ do repositório', default: true },
            outputDir: { type: 'string', description: 'Caminho da pasta local de saída', default: './midia/criativos' },
          },
          required: ['offer', 'angle'],
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
