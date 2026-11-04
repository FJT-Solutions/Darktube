import { NextRequest, NextResponse } from 'next/server';
import { validateMcpAuth } from '@/lib/mcp/auth';
import {
  listFlowTemplates,
  createCampaignCreative,
  renderCreative,
  downloadCreativeToLocal,
} from '@/lib/mcp/darktube-tools';

export const dynamic = 'force-dynamic';

const MCP_TOOLS_MANIFEST = [
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
];

export async function GET(req: NextRequest) {
  const auth = validateMcpAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  return NextResponse.json({
    name: 'DarkTube MCP Server',
    version: '1.0.0',
    description: 'Servidor MCP oficial do DarkTube para geração procedural de criativos de vídeo.',
    tools: MCP_TOOLS_MANIFEST,
  });
}

export async function POST(req: NextRequest) {
  const auth = validateMcpAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Suporte a protocolo JSON-RPC MCP
    if (body.jsonrpc === '2.0') {
      const { id, method, params } = body;

      if (method === 'initialize') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'darktube-mcp', version: '1.0.0' },
          },
        });
      }

      if (method === 'tools/list') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { tools: MCP_TOOLS_MANIFEST },
        });
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const toolResult = await executeTool(name, args || {});
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
          },
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Método ${method} não encontrado` },
      });
    }

    // Suporte a chamada REST direta { tool: 'darktube_...', args: { ... } }
    const toolName = body.tool || body.name;
    const toolArgs = body.args || body.arguments || {};

    if (!toolName) {
      return NextResponse.json({ error: 'Campo "tool" ou "name" é obrigatório.' }, { status: 400 });
    }

    const result = await executeTool(toolName, toolArgs);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[API MCP DarkTube] Erro na execução:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function executeTool(name: string, args: any) {
  switch (name) {
    case 'darktube_list_flow_templates':
      return await listFlowTemplates();

    case 'darktube_create_campaign_creative':
      return await createCampaignCreative(args);

    case 'darktube_render_creative':
      return await renderCreative(args);

    case 'darktube_download_creative':
      return await downloadCreativeToLocal(args.videoUrl, args.outputDir, args.preferredFileName);

    default:
      throw new Error(`Ferramenta desconhecida: "${name}"`);
  }
}
