import { NextRequest, NextResponse } from 'next/server';
import { validateMcpAuth } from '@/lib/mcp/auth';
import {
  listFlowTemplates,
  createCampaignCreative,
  renderCreative,
  downloadCreativeToLocal,
  getCreativeStatus,
  assembleFlowCreative,
  replaceCreativeAudio,
} from '@/lib/mcp/darktube-tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 900;

const MCP_TOOLS_MANIFEST = [
  {
    name: 'darktube_list_flow_templates',
    description: 'Lista todos os templates e formatos disponíveis no DarkTube Flow com seus beats e opções. Também responde pelo apelido darktube_list_templates.',
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
          description: 'Caminho de execução: "remotion" (MP4 procedural imediato), "flow" (projeto nativo no /flow + fila de IA) ou "script_only"',
          default: 'remotion',
        },
        templateId: { type: 'string', description: 'ID do template do /flow (ex: receita-viral, produto-tiktok-shop)', default: 'produto-tiktok-shop' },
        videoModel: {
          type: 'string',
          enum: ['Omni 1.1 Flash', 'Omni 1.2 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'],
          description: 'Modelo de geração de vídeo por IA no /flow',
          default: 'Omni 1.1 Flash',
        },
        secondsPerTake: {
          type: 'number',
          enum: [4, 5, 6, 8, 10],
          description: 'Duração em segundos de cada take/cena (Veo: 5 ou 8s; Omni: 4, 6, 8 ou 10s)',
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
    description: 'Substitui a faixa de áudio de um criativo/vídeo do /flow aplicando a Tríade do Slot Atômico (início aos 0.14s, anti-buraco, forced alignment e Y adaptativo), com suporte a microserviço neural de Lip-Sync.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto no /flow para substituir o áudio e remontar com novas legendas' },
        videoPathOrUrl: { type: 'string', description: 'Ou caminho/URL do arquivo de vídeo MP4 avulso' },
        audioPathOrUrl: { type: 'string', description: 'Caminho local ou URL do áudio gravado (.webm, .mp3, .wav)' },
        lipsync: { type: 'boolean', description: 'Se true, envia para microserviço de Lip-Sync para sincronizar os lábios com IA', default: false },
        layout: { type: 'string', enum: ['expert', 'split', 'auto'], description: 'Posicionamento da Tríade: expert (Y=1520 no terço inferior livre) ou split (Y=960 na divisória central)', default: 'expert' },
        scriptText: { type: 'string', description: 'Texto oficial do roteiro para Forced Token Alignment (elimina erros ortográficos)' },
        outputDir: { type: 'string', description: 'Diretório de destino', default: './midia/criativos' },
        filename: { type: 'string', description: 'Nome preferido do arquivo final MP4' },
      },
      required: ['audioPathOrUrl'],
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
            protocolVersion: params?.protocolVersion || '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'darktube-mcp', version: '1.0.0' },
          },
        });
      }

      if (typeof method === 'string' && method.startsWith('notifications/')) {
        return new NextResponse(null, { status: 202 });
      }

      if (method === 'ping') {
        return NextResponse.json({ jsonrpc: '2.0', id, result: {} });
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
    // 'darktube_list_templates' e o nome que os agentes costumam tentar; aceita como apelido do oficial.
    case 'darktube_list_flow_templates':
    case 'darktube_list_templates':
      return await listFlowTemplates();

    case 'darktube_create_campaign_creative':
      return await createCampaignCreative(args);

    case 'darktube_render_creative':
      return await renderCreative(args);

    case 'darktube_download_creative':
      return await downloadCreativeToLocal(args.videoUrl, args.outputDir, args.preferredFileName);

    case 'darktube_get_creative_status':
      return await getCreativeStatus(args);

    case 'darktube_assemble_flow_project':
      return await assembleFlowCreative(args);

    case 'darktube_replace_audio':
      return await replaceCreativeAudio(args);

    default:
      throw new Error(`Ferramenta desconhecida: "${name}". Disponíveis: ${MCP_TOOLS_MANIFEST.map((t) => t.name).join(', ')}.`);
  }
}
