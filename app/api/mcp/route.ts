import { NextRequest, NextResponse } from 'next/server';
import { resolveMcpAuth } from '@/lib/mcp/auth';
import { runWithMcpUser } from '@/lib/mcp/context';
import {
  listFlowTemplates,
  createCampaignCreative,
  renderCreative,
  downloadCreativeToLocal,
  getCreativeStatus,
  assembleFlowCreative,
  replaceCreativeAudio,
} from '@/lib/mcp/darktube-tools';
import {
  createNextPartCreative,
  analyzeVideoLinkMcp,
  cloneVideoFromLinkMcp,
  reviewProjectCharactersMcp,
  renderHtmlSvgVideoMcp,
  renderThreeJsVideoMcp,
  getRenderQueueStatusMcp,
  searchAndDownload3dAssetsMcp,
  generateFlowImageMcp,
  buildPuppetRigMcp,
  autoClipLiveMcp,
  batchRenderMcp,
  manageVoicesMcp,
} from '@/lib/mcp/flow-advanced-tools';

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
    description: 'Pipeline 3 Híbrido: renderiza MP4 via Remotion, ou cria projeto nativo no /flow com IA generativa, ou gera roteiro e copy. IMPORTANTE: O agente deve alinhar com o usuário as preferências de motor (remotion vs flow), modelo de vídeo (padrão Omni 1.2 Flash; Omni 1.1 e Veo 3.1 saem do Flow em 05/12), duração dos takes (Omni 1.2: 3 a 15 s; Omni 1.1: 4, 6, 8 ou 10 s; Veo: 5 ou 8 s) e personagem antes de executar.',
    inputSchema: {
      type: 'object',
      properties: {
        offer: { type: 'string', description: 'Nome ou identificador da oferta/produto (ex: 365-receitas, Tenis Nuvem)' },
        pipelineMode: {
          type: 'string',
          enum: ['remotion', 'flow', 'script_only'],
          description: 'Caminho de execução: "script_only" (padrão: roteiro, gancho e copy da oferta pela IA, grátis, sem projeto nem créditos), "flow" (projeto nativo no /flow + fila de IA) ou "remotion" (MP4 só dos presets prontos: exige angle)',
          default: 'script_only',
        },
        templateId: { type: 'string', description: 'ID do template do /flow (ex: receita-viral, produto-tiktok-shop)', default: 'produto-tiktok-shop' },
        videoModel: {
          type: 'string',
          enum: ['Omni 1.1 Flash', 'Omni 1.2 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'],
          description: 'Modelo de geração de vídeo por IA no /flow',
          default: 'Omni 1.2 Flash',
        },
        secondsPerTake: {
          type: 'number',
          minimum: 3,
          maximum: 15,
          description: 'Duração em segundos de cada take/cena. Omni 1.2: 3 a 15 s (barra, de 1 em 1); Omni 1.1: 4, 6, 8 ou 10 s; Veo: 5 ou 8 s. O servidor ajusta ao valor aceito pelo modelo.',
          default: 6,
        },
        quality: { type: 'string', enum: ['360p', '720p', '1080p'], default: '360p' },
        angle: {
          type: 'string',
          description: 'Preset pronto de outra oferta (pao-frigideira, doce-sem-culpa, mosaico-365); só necessário no modo remotion. Sem ele, o roteiro e a copy vêm da oferta pedida.',
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
        characters: {
          type: 'array',
          description: 'Lista opcional de personagens (c1, c2, c3...) com sheetUrl já aprovadas para histórias com múltiplos personagens',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              voice: { type: 'string' },
              sheetUrl: { type: 'string' },
              generateSheet: { type: 'boolean', default: false },
            },
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
  {
    name: 'darktube_create_next_part',
    description: 'Cria a próxima parte (Parte 2, Parte 3...) continuando um projeto existente do /flow. Herda automaticamente personagens, retratos aprovados (sheetUrl) e voz do narrador da parte anterior, mantendo continuidade da história sem gerar folha de novo.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID completo ou prefixo de 8 caracteres do projeto da parte anterior (Parte 1, Parte 2...)' },
        pipelineMode: { type: 'string', enum: ['flow', 'script_only'], description: '"flow" cria o projeto e enfileira os takes (padrão); "script_only" retorna apenas a prévia do roteiro da nova parte.', default: 'flow' },
        videoModel: { type: 'string', enum: ['Omni 1.1 Flash', 'Omni 1.2 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'], description: 'Opcional: sobrescreve o modelo da parte anterior' },
        secondsPerTake: { type: 'number', minimum: 3, maximum: 15, description: 'Opcional: sobrescreve segundos por take' },
        quality: { type: 'string', enum: ['360p', '720p', '1080p'] },
        takesCount: { type: 'number', description: 'Opcional: quantidade de takes da nova parte' },
        customIdea: { type: 'string', description: 'Opcional: direcionamento ou roteiro específico para esta nova parte' },
        provider: { type: 'string', enum: ['gemini', 'openai', 'claude', 'openrouter'], description: 'Provedor de IA das Credenciais do usuário' },
        queueTakes: { type: 'boolean', default: true },
        waitForSeconds: { type: 'number', description: 'Segundos para aguardar conclusão no Flow (0 = retorna projectId na hora)', default: 0 },
        downloadLocal: { type: 'boolean', default: true },
        outputDir: { type: 'string', default: './midia/criativos' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'darktube_analyze_video_link',
    description: 'Baixa um vídeo a partir de um link (YouTube, Shorts, Reels, TikTok, X), extrai frames sequenciais + áudio/transcrição e faz engenharia reversa frame a frame com OCR visual usando a credencial de IA do usuário (Gemini Vision, OpenAI, Claude ou OpenRouter).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL pública do vídeo de referência' },
        provider: { type: 'string', enum: ['gemini', 'openai', 'claude', 'openrouter'], description: 'Opcional: provedor multimodal salvo em Credenciais (padrão: primeiro disponível)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'darktube_clone_video_from_link',
    description: 'Estuda um vídeo por link frame a frame + OCR com a IA do usuário e replica exatamente a mesma estrutura narrativa, ritmo, enquadramentos e transições no /flow, trocando história/tema, personagem ou ambiente conforme pedido.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL pública do vídeo de referência a clonar' },
        provider: { type: 'string', enum: ['gemini', 'openai', 'claude', 'openrouter'], description: 'Provedor multimodal salvo em Credenciais' },
        pipelineMode: { type: 'string', enum: ['flow', 'script_only'], default: 'flow' },
        newTheme: { type: 'string', description: 'Nova história, oferta ou tema para colocar dentro da mesma estrutura' },
        newCharacter: { type: 'string', description: 'Novo personagem para substituir o original mantendo a mesma estrutura' },
        newLocation: { type: 'string', description: 'Novo ambiente/cenário para substituir o original' },
        keepInstructions: { type: 'string', description: 'O que manter ou observações extras de adaptação' },
        videoModel: { type: 'string', enum: ['Omni 1.1 Flash', 'Omni 1.2 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'] },
        secondsPerTake: { type: 'number', minimum: 3, maximum: 15 },
        quality: { type: 'string', enum: ['360p', '720p', '1080p'], default: '360p' },
        format: { type: 'string', enum: ['9:16', '16:9'] },
        takesCount: { type: 'number' },
        idioma: { type: 'string', default: 'pt-BR' },
        realismo: { type: 'string' },
        isHybrid: { type: 'boolean', default: true },
        wordsPerCaption: { type: 'number', default: 2 },
        character: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            voice: { type: 'string' },
            sheetUrl: { type: 'string' },
            generateSheet: { type: 'boolean', default: false },
          },
        },
        queueTakes: { type: 'boolean', default: true },
        waitForSeconds: { type: 'number', default: 0 },
        downloadLocal: { type: 'boolean', default: true },
        outputDir: { type: 'string', default: './midia/criativos' },
      },
      required: ['url'],
    },
  },
  {
    name: 'darktube_review_characters',
    description: 'Aprova ou reprova/regenera as folhas de todos os personagens de um projeto do /flow (em lote, igual ao @Criativos). Enquanto houver personagens com sheetStatus "aguardando" ou "gerando", os takes de vídeo ficam retidos na fila sem gastar créditos; quando todos os personagens são aprovados, os takes são liberados automaticamente.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto no /flow (ou prefixo de 8 caracteres)' },
        approveAll: { type: 'boolean', description: 'Se true, aprova todos os personagens visuais que não tenham decisão explícita de reprovação em decisions', default: false },
        realismo: { type: 'string', description: 'Opcional: atualiza o estilo visual do projeto (ex: animacao3d, ilustrado2d, cinematografico) antes de regenerar personagens reprovados' },
        decisions: {
          type: 'array',
          description: 'Decisões individuais por personagem (c1, c2, c3... ou pelo nome do personagem)',
          items: {
            type: 'object',
            properties: {
              characterId: { type: 'string', description: 'ID (c1, c2, c3) ou nome do personagem' },
              decision: { type: 'string', enum: ['approve', 'reject', 'regenerate'], description: 'approve libera o personagem; reject/regenerate gera nova imagem no Nano Banana' },
              newDescription: { type: 'string', description: 'Opcional: nova descrição física caso o usuário peça ajuste ao reprovar' },
              sheetUrl: { type: 'string', description: 'Opcional: URL de foto enviada manualmente pelo usuário' },
            },
            required: ['characterId', 'decision'],
          },
        },
        waitForSeconds: { type: 'number', description: 'Segundos para aguardar regeneração das folhas ou conclusão dos takes liberados', default: 0 },
        downloadLocal: { type: 'boolean', default: true },
        outputDir: { type: 'string', default: './midia/criativos' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'darktube_render_html_svg_video',
    description: 'Motor programático de vídeo $0 (sem créditos de Flow/IA): renderiza animações determinísticas em HTML + SVG + Canvas 2D/3D + física de molas (presets html_svg_explainer, html_svg_character_story, html_svg_product_motion, html_svg_tech_crimson, html_svg_3d_diorama, html_svg_netflix_doc, html_svg_vox_papercut, html_svg_kaz_chart, html_svg_paper_finance, html_svg_2d_puppet, html_svg_silhouette_film, html_svg_ampulheta_doc, html_svg_whatif_studio ou customHtml com window.__dtSeek) para MP4 via Chromium + FFmpeg com Motion Checks + Auditor de Leitura + Crítico Visual. FLUXO OBRIGATÓRIO NO html_svg_3d_stage (autorrevisão antes de montar): 1) monte a spec com staging em cada cena; 2) chame com previewOnly=true: volta uma folha de contato com 2 quadros por cena nos cortes reais da voz e a revisão de encenação feita pela LLM de visão da credencial do usuário (scenes[].issues com fix adjust_layer | regenerate_sprite | regenerate_background); 3) corrija tudo: ajuste camadas ou gere de novo o asset no darktube_generate_image; 4) repita a prévia até passed=true (ou até você mesmo conferir a folha e não ver erro); 5) só então renderize com previewOnly=false. REGRAS DE ENCENAÇÃO: FALAS DE PERSONAGEM: cada cena pode ter dialogue {text + voiceProvider + voiceId da voz do personagem (ou url de mp3), volume, gapBeforeSec, gapAfterSec}; o narrador fica em silêncio depois do spokenLine da cena enquanto o personagem fala e volta na cena seguinte (a cena estica sozinha). COERÊNCIA FÍSICA NOS PROMPTS DE IMAGEM (escreva explícito em cada prompt): dormindo ou deitado na cama = debaixo do cobertor, coberto até o peito, nunca deitado por cima da coberta; número de apartamento só existe na face externa da porta (vista do corredor), nunca de dentro do apartamento; objeto instalado (câmera, babá eletrônica, lâmpada) tem UMA posição fixa definida na primeira cena (ex.: canto superior direito do quarto, presa na prateleira) e todas as cenas repetem essa posição; a imagem de CCTV é o ponto de vista dessa câmera, então a própria câmera não aparece no quadro e o ângulo bate com o ponto onde ela foi instalada; mantenha a mesma planta do cômodo (porta, janela, berço) entre os takes. TUDO O QUE É NARRADO TEM QUE SER MOSTRADO: cada ação dita na fala (bateu na porta, olhou pelo olho mágico, instalou a câmera, carregou a caixa, riu) precisa de uma imagem do personagem fazendo exatamente essa ação no momento em que a palavra é dita; quebre a cena em takes por ação e escreva no staging qual ação da fala o quadro mostra; nunca cole um sprite que já traz cama, mesa ou porta sobre um cenário que já tem esse móvel (fica duplicado): se o cenário não tem o móvel no lugar certo, gere o cenário inteiro de novo; personagem deitado ou dormindo = pose própria gerada em fundo verde (olhos fechados, corpo na orientação da cama), nunca um recorte retangular com travesseiro; pés sempre no chão pintado, nunca em cima de móvel; criatura ou personagem vira o corpo e o olhar para o alvo da ação (use flipX ou gere a pose virada); objeto segurado nasce dentro da pose (gere a pose segurando o objeto), não como prop solto; quem está na frente da porta fica com o corpo inteiro na frente do batente (occluder só para quem espia por trás); batidas e impactos = camera.knocks (tranco de câmera), mais sfx de batida, e não ring.',
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
            'html_svg_netflix_doc',
            'html_svg_vox_papercut',
            'html_svg_kaz_chart',
            'html_svg_paper_finance',
            'html_svg_2d_puppet',
            'html_svg_silhouette_film',
            'html_svg_ampulheta_doc',
            'html_svg_whatif_studio',
            'html_svg_3d_stage',
          ],
          default: 'html_svg_explainer',
        },
        styleMood: {
          type: 'string',
          enum: ['dusk', 'midnight', 'golden', 'neon', 'storybook'],
          default: 'dusk',
          description: 'Paleta de iluminação para preset = html_svg_whatif_studio',
        },
        visualStyle: {
          type: 'string',
          enum: ['whatif_2d', 'quadro_negro', 'esboco_neon', 'pixel_art', 'quadrinhos', 'estilo_lego'],
          default: 'whatif_2d',
          description: 'Estilo visual renderizado em código para preset = html_svg_whatif_studio (What If 2D, Quadro-Negro, Esboço Neon, Pixel Art, Quadrinhos ou Estilo Lego)',
        },
        dioramaMode: {
          type: 'string',
          enum: ['rural_plot', 'storefront', 'cutaway_oven'],
          description: 'Submodo 3D quando preset = html_svg_3d_diorama (rural_plot, storefront ou cutaway_oven)',
        },
        title: { type: 'string', description: 'Título geral do vídeo' },
        aspect: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
        fps: { type: 'number', default: 30 },
        palette: {
          type: 'array',
          items: { type: 'string' },
          description: 'Até 3 cores hex da marca [fundo, destaquePrincipal, destaqueSecundario]',
        },
        characters: {
          type: 'array',
          description: 'Personagens vetoriais consistentes para o preset html_svg_character_story',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              skinColor: { type: 'string' },
              hairColor: { type: 'string' },
              shirtColor: { type: 'string' },
              pattern: { type: 'string', enum: ['solid', 'watermelon_stripes', 'strawberry_seeds', 'avocado_bumps'] },
            },
            required: ['id', 'name'],
          },
        },
        scenes: {
          type: 'array',
          description: 'Cenas sequenciais da animação',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              subtitle: { type: 'string' },
              spokenLine: { type: 'string' },
              badge: { type: 'string' },
              durationSec: { type: 'number', default: 4 },
              icon: { type: 'string', enum: ['chart', 'bolt', 'shield', 'rocket', 'heart', 'code'] },
              speakerId: { type: 'string' },
              expression: { type: 'string', enum: ['happy', 'shocked', 'smirk', 'angry', 'sad', 'thinking'] },
              metricValue: { type: 'string' },
              metricLabel: { type: 'string' },
              visual: {
                type: 'string',
                enum: [
                  'pc_ram',
                  'giant_matrix',
                  'binary_target',
                  'cpu_chip',
                  'node_tree',
                  'memory_corridor',
                  'dual_monitors',
                  'repo_night',
                ],
                description: 'Ilustração vetorial para preset = html_svg_tech_crimson',
              },
              callout: { type: 'string', description: 'Rótulo flutuante ancorado no cenário 3D (html_svg_3d_diorama / V2)' },
              imageUrl: { type: 'string', description: 'URL de imagem/foto histórica (Wikimedia Commons) para html_svg_netflix_doc ou html_svg_vox_papercut' },
              yearLabel: { type: 'string', description: 'Ano/marco exibido na timeline documental (html_svg_netflix_doc / V2)' },
              sceneKind: {
                type: 'string',
                enum: ['store_wide', 'store_hands', 'phone_alarm', 'room_window', 'store_counter', 'wall_poster', 'bed_wake', 'rain_street', 'quote_card', 'autumn_avenue', 'calendar_grid', 'green_hill', 'hourglass_intro', 'drakkar_sea', 'island_panorama', 'scribes_desk', 'narrator_interior', 'animated_map', 'triptych_cards', 'council_hud', 'cafe_hook', 'data_compare', 'freeze_10x', 'blueprint', 'big_face', 'action_stage', 'end_cta'],
                description: 'Cenário cinematográfico para html_svg_silhouette_film, html_svg_ampulheta_doc ou html_svg_whatif_studio',
              },
              shirtColor: { type: 'string', description: 'Cor do moletom/camisa do protagonista em html_svg_whatif_studio' },
              dialogueText: { type: 'string', description: 'Texto curto flutuante em halo escuro (html_svg_silhouette_film)' },
              quoteAuthor: { type: 'string', description: 'Autor da citação no quote_card (ex: EPICTETUS)' },
              phoneDate: { type: 'string' },
              phoneTime: { type: 'string' },
              phoneGoal: { type: 'string' },
              raincoat: { type: 'boolean' },
              ponytail: { type: 'boolean' },
              bgUrl: { type: 'string', description: 'URL de cenário vazio 3D/pintado para preset = html_svg_3d_stage' },
              camera: { type: 'object', description: 'Configuração de câmera (zoomStart, zoomEnd, panX, panY, shakeAmp, shakePeriod, tintColor, scanlines, recLabel, peepholeRadius, knocks: [segundos da cena de cada batida/impacto → tranco de câmera + escurecida], knockAmp) para html_svg_3d_stage' },
              sfx: { type: 'array', description: 'html_svg_3d_stage: efeitos sonoros da cena mixados sobre a narração. Item: { url (mp3/wav público), atSec (segundos desde o corte da cena, já sincronizado com a voz), volume 0..2 }. Ex.: batida na porta no mesmo segundo do camera.knocks, risada no porteiro.', items: { type: 'object' } },
              dialogue: { type: 'object', description: 'html_svg_3d_stage: fala ou reação do personagem nesta cena: { text + voiceProvider (elevenlabs|edge|openai) + voiceId + voiceGender + pitch (Edge, ex. "-20Hz" para idosa/grave) + speed (ex. 0.88) } para o servidor gerar a voz do personagem; prefira Edge pt-BR (FranciscaNeural/ThalitaMultilingualNeural/AntonioNeural...) com pitch/speed para diferenciar personagens, a OpenAI soa estrangeira em português, ou { url } de um mp3 pronto; mais volume, gapBeforeSec, gapAfterSec. O narrador pausa depois do spokenLine da cena, a fala toca no silêncio e o narrador volta na cena seguinte.' },
              staging: { type: 'string', description: 'html_svg_3d_stage: o que o quadro precisa mostrar (quem, onde, de frente para quê, segurando o quê, o que fica na frente). A revisão da prévia compara a imagem com este texto.' },
              layers: { type: 'array', description: 'Camadas 3D ordenadas por profundidade z (sprite, occluder poligonal de cama/mesa/porta, ring, badge) para html_svg_3d_stage. RECOMENDADO: space:"bg" (na cena ou na camada) = x/y em 0..1 DENTRO da imagem de fundo (ponto dos pés do personagem no chão/cama pintados) e height em fração da altura do fundo; assim o personagem fica colado ao cenário durante zoom/pan/tremor. Sprite: url, crop [sx,sy,sw,sh] 0..1 para escolher a célula de uma folha 2x2, x, y, z (só ordena), height, xEnd/yEnd/heightEnd (movimento), anchorY (1=pés, 0.5=centro p/ deitado), flipX, rot, showAtSec/hideAtSec (troca de expressão/pose dentro da cena), frames [[sx,sy,sw,sh],...] + frameFps (folha de quadros: gere numa imagem só as 2 poses lado a lado, ex. passada com a perna da frente trocada, e alterne a ~6 fps; some com xEnd para andar de lado ou heightEnd para vir em direção à câmera), shadow. PREFIRA takes integrados: o personagem desenhado dentro do próprio cenário (imagem inteira gerada com a folha do elenco + o ambiente como referência) e o movimento por troca de imagens inteiras com showAtSec/hideAtSec; recorte solto só para deslocamento. Occluder: polygon em 0..1 do fundo (space bg) recortando a frente da cama/balcão/porta com z menor que o personagem. Ring: x,y (0..1 em space bg) no ponto exato que bate (porta/armário), startSec/endSec. Use uma pose de corpo inteiro por ação (deitado, sentado, de costas, agachado, segurando objeto) e nunca corte o corpo com a borda da imagem: para close de expressão use zoom da câmera.', items: { type: 'object' } },
              chartItems: {
                type: 'array',
                description: 'Série de barras para html_svg_kaz_chart',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    value: { type: 'number' },
                    color: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        customHtml: { type: 'string', description: 'Opcional: documento HTML+SVG customizado implementando window.__dtSeek(timeSec)' },
        durationSec: { type: 'number', description: 'Duração total em segundos (usada quando customHtml for informado)' },
        isDraft: { type: 'boolean', default: false },
        previewOnly: { type: 'boolean', default: false, description: 'html_svg_3d_stage: não gera MP4. Renderiza 2 quadros por cena nos cortes reais da voz e devolve contactSheetUrl e a revisão de encenação por cena (scenes[].ok/issues[].fix/detail), feita pela LLM de visão da credencial do usuário. Use antes de todo render final e repita até passed=true.' },
        provider: { type: 'string', enum: ['gemini', 'openai', 'claude', 'openrouter'], description: 'LLM preferida para a revisão da prévia (padrão claude; cai para as outras credenciais salvas)' },
        downloadLocal: { type: 'boolean', default: true },
        outputDir: { type: 'string', default: './midia/criativos' },
        fileName: { type: 'string' },
        voiceProvider: {
          type: 'string',
          enum: ['external', 'elevenlabs', 'edge', 'openai'],
          description: 'OBRIGATÓRIO escolher explicitamente antes de renderizar com áudio (sem cascata auto): external | elevenlabs | edge | openai',
        },
        voiceGender: { type: 'string', enum: ['male', 'female'], default: 'male' },
        voiceId: { type: 'string', description: 'ID da voz (obrigatório se elevenlabs; ou ID neural do Edge PT-BR / OpenAI)' },
        audioPathOrUrl: { type: 'string', description: 'Caminho ou URL do áudio gravado (obrigatório se voiceProvider=external)' },
        scriptText: { type: 'string' },
      },
    },
  },
  {
    name: 'darktube_render_3d_video',
    description: 'Motor 3D articulado ($0 créditos Flow) na Fila Multi-Usuário FIFO: suporta 1 cena (single_scene) ou vídeo completo (full_video), voz híbrida (áudio externo -> ElevenLabs -> OpenAI -> Edge TTS fallback homem/mulher), legendas virais word-by-word (#ffd60a) e regras anti-oclusão/Set Bible.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['single_scene', 'full_video'], default: 'full_video' },
        preset: { type: 'string', enum: ['curiosidade_cratera', 'cartoon_25d_demo', 'custom_storyboard'], default: 'curiosidade_cratera' },
        estilo: { type: 'string', enum: ['3d', '2.5d_cartoon'], default: '3d', description: 'Estilo visual do motor: 3d (low-poly padrão) ou 2.5d_cartoon (personagens 2D nanquim em mundo 3D pintado com cel-ink, golden hour e contato no chão).' },
        backend: { type: 'string', enum: ['threejs', 'blender'], default: 'threejs', description: 'Motor 3D: threejs (padrão VPS rápido) ou blender (EEVEE Headless + fallback automático)' },
        fallbackToThreeJs: { type: 'boolean', default: true, description: 'Se true e Blender não estiver instalado, cai automaticamente para Three.js sem falha.' },
        title: { type: 'string' },
        aspect: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
        fps: { type: 'number', default: 24 },
        isDraft: { type: 'boolean', default: true },
        scriptText: { type: 'string' },
        storyboard: { type: 'object' },
        captions: {
          type: 'object',
          properties: {
            ativo: { type: 'boolean', default: true },
            palavrasPorBloco: { type: 'number', default: 2 },
            maiusculas: { type: 'boolean', default: true },
            corDestaque: { type: 'string', default: '#ffd60a' },
            tamanho: { type: 'number', default: 1.32 },
            posicaoY: { type: 'number', default: 0.69 },
          },
        },
        voiceProvider: {
          type: 'string',
          enum: ['external', 'elevenlabs', 'edge', 'openai'],
          description: 'OBRIGATÓRIO perguntar e selecionar explicitamente (sem cascata auto): external (áudio enviado), elevenlabs (exige voiceId), edge (PT-BR grátis) ou openai.',
        },
        voiceGender: { type: 'string', enum: ['male', 'female'], default: 'male' },
        voiceId: { type: 'string', description: 'ID da voz (obrigatório quando voiceProvider = elevenlabs)' },
        language: { type: 'string', default: 'pt-BR' },
        speed: { type: 'number', default: 1.02 },
        topic: { type: 'string', description: 'Tema livre em PT-BR: aciona o Diretor 3D com LLM automaticamente quando storyboard não for enviado' },
        durationSec: { type: 'number', description: 'Duração alvo em segundos quando topic for usado (ex: 30, 45, 60)' },
        quality: { type: 'string', enum: ['alta', 'media', 'basica'], description: 'Qualidade Three.js: media (30fps Bloom+Grade rápido p/ VPS), alta (GTAO+Bloom+Grade) ou basica (rascunho)' },
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
    description: 'Consulta a Fila Multi-Usuário FIFO de renderização na VPS (posição na fila, job ativo e histórico recente).',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Opcional: UUID do job para ver posição exata' },
      },
    },
  },
  {
    name: 'darktube_search_3d_assets',
    description: 'Acervo V2 ($0): busca e baixa modelos 3D gratuitos CC0 (.glb/.gltf no Poly Haven, Poly Pizza e Sketchfab Free), fotos históricas Wikimedia Commons e efeitos sonoros CC0 (Freesound + Builtin procedural).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca em inglês ou português (ex: waterwheel, chernobyl, whoosh)' },
        limit: { type: 'number', default: 16 },
        assetType: { type: 'string', enum: ['3d', 'wikimedia', 'sfx'], default: '3d', description: 'Categoria do acervo V2: modelos 3D, fotos Wikimedia ou SFX CC0.' },
        downloadSource: { type: 'string', enum: ['polyhaven', 'polypizza', 'sketchfab', 'url', 'sfx_builtin'], description: 'Baixa o item para cache local do DarkTube.' },
        assetId: { type: 'string', description: 'ID/UID do modelo (Poly Haven, Sketchfab) ou ID do SFX builtin (whoosh, pop, vault_open...)' },
        url: { type: 'string', description: 'URL direta .glb (para downloadSource polypizza ou url)' },
        name: { type: 'string', description: 'Nome amigável do modelo' },
      },
    },
  },
  {
    name: 'darktube_generate_image',
    description: 'Gera imagens avulsas no Nano Banana (Google Flow kind: "image") com Fundo Verde Chroma (#00FF00) opcional, imagem de referência (refImageUrl) para consistência, consulta status/list e recorta #00FF00 em PNG 32-bit transparente (RGBA). PLANEJE ANTES DE GERAR: leia o roteiro e monte um mapa de ângulos e assets por cena (cenário por cômodo e por ângulo de câmera, elenco/poses de cada personagem em cada ângulo, props). Não existe quantidade fixa: gere quantas peças o roteiro exigir, nem mais nem menos. Quem decide o escopo é a LLM que está conduzindo (agente do Cockpit ou LLM da credencial cadastrada no front do DarkTube).',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['generate', 'cutout_only', 'status', 'list'], default: 'generate', description: '"generate" enfileira no Nano Banana; "status" consulta um jobId e recorta se pronto; "list" lista jobs recentes; "cutout_only" recorta imageUrl.' },
        jobId: { type: 'string', description: 'UUID do job para consultar em action="status".' },
        limit: { type: 'number', default: 20, description: 'Limite de itens para action="list".' },
        assetKind: { type: 'string', enum: ['character', 'expressions', 'prop', 'background', 'puppet_sheet', 'accessories', 'cast_sheet'], default: 'character', description: 'Tipo da peça visual: personagem, folha de expressões (2x2 ou 3x2), folha de elenco/poses (cast_sheet), puppet_sheet, acessórios, prop/objeto ou background.' },
        description: { type: 'string', description: 'Descrição física detalhada do personagem, objeto ou cenário.' },
        customPrompt: { type: 'string', description: 'Opcional: prompt completo em inglês (sobrescreve o construtor automático).' },
        realismo: { type: 'string', description: 'Estilo visual do projeto (ilustrado2d, animacao3d, estilizado, cinematografico, etc.).', default: 'ilustrado2d' },
        aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
        chromaGreen: { type: 'boolean', default: true, description: 'Se true, gera com fundo verde puro (#00FF00) para recorte PNG transparente.' },
        gridLayout: { type: 'string', enum: ['2x2', '3x2'], default: '2x2', description: 'Para assetKind="expressions" ou cutout_only: fatia a grade em 4 (2x2) ou 6 (3x2) sprites PNG individuais.' },
        poseList: { type: 'array', items: { type: 'string' }, description: 'Para expressions/cast_sheet: pose + expressão de CADA célula da grade, em inglês e de corpo inteiro (ex. "lying in bed asleep, eyes closed", "sitting up startled, eyes wide"). Gere uma folha por necessidade da história.' },
        cameraAngle: { type: 'string', description: 'Para background: de onde a câmera olha o cômodo (ex. "from the doorway looking at the bed against the back wall"). Gere um fundo por ângulo e por cômodo. Para cena de câmera de segurança use o ponto de vista da câmera (ex. "high corner of the ceiling looking down diagonally at the whole room, wide-angle CCTV perspective") e gere poses específicas desse ângulo (ex. personagem dormindo visto de cima, criatura de costas ou virada para a câmera) via poseList.' },
        autoCutout: { type: 'boolean', default: true, description: 'Se true e a imagem terminar dentro de waitForSeconds (ou em status), já devolve o PNG transparente recortado.' },
        refImageUrl: { type: 'string', description: 'URL /api/storage/... da imagem de referência (personagem principal) para manter o mesmo personagem em expressões/variações.' },
        refImageUrls: { type: 'array', items: { type: 'string' }, description: 'Lista opcional de até 4 imagens de referência (/api/storage/...).' },
        imageUrl: { type: 'string', description: 'Caminho local, /api/storage/... ou URL de uma imagem em fundo #00FF00 para recortar (action="cutout_only").' },
        similarity: { type: 'number', default: 0.28, description: 'Tolerância do filtro colorkey #00FF00 (0.08 a 0.60).' },
        blend: { type: 'number', default: 0.1, description: 'Suavização de borda do filtro colorkey (0.02 a 0.40).' },
        waitForSeconds: { type: 'number', default: 0, description: 'Segundos para aguardar o Nano Banana entregar a imagem (0 retorna o jobId imediatamente).' },
        downloadLocal: { type: 'boolean', default: true },
        outputDir: { type: 'string', default: './midia/criativos' },
      },
    },
  },
  {
    name: 'darktube_build_puppet_rig',
    description: 'Constrói Puppet Rig 2.5D articulado nas juntas (head, torso, armL, armR, legL, legR) com Sticker Swap de expressões e acessórios a partir de folha em fundo #00FF00 (OpenCV ou FFmpeg proporcional $0).',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'Caminho local, /api/storage/... ou URL da folha A-Pose #00FF00.' },
        characterName: { type: 'string', default: 'Personagem Puppet' },
        expressionsUrl: { type: 'string', description: 'Opcional: grade 2x2 ou 3x2 de rostos em fundo #00FF00.' },
        gridLayout: { type: 'string', enum: ['2x2', '3x2'], default: '2x2' },
        accessoriesUrl: { type: 'string', description: 'Opcional: grade 2x2 de chapéus/itens extra.' },
        outputBaseName: { type: 'string' },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'darktube_auto_clip_live',
    description: 'Auto-Clipper Audio-First ($0) para Lives e Podcasts: em action="analyze" baixa apenas áudio leve e detecta os maiores picos de energia viral; em action="render" recorta apenas o trecho escolhido em 9:16 vertical_center ou split_screen com Modo Comentário TTS e legendas Zero-Símbolos.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'render'], default: 'analyze' },
        sourceUrl: { type: 'string', description: 'Link da live/vídeo ou arquivo local /storage.' },
        audioPathOrUrl: { type: 'string', description: 'Opcional: faixa de áudio direta.' },
        minClipSec: { type: 'number', default: 22 },
        maxClipSec: { type: 'number', default: 40 },
        topN: { type: 'number', default: 4 },
        startSec: { type: 'number' },
        endSec: { type: 'number' },
        layout: { type: 'string', enum: ['vertical_center', 'split_screen'], default: 'vertical_center' },
        gameplayUrl: { type: 'string', description: 'Vídeo opcional para metade inferior no layout split_screen.' },
        commentIntroText: { type: 'string', description: 'Texto falado em Modo Comentário TTS antes do corte.' },
        voiceProvider: { type: 'string', enum: ['external', 'elevenlabs', 'edge', 'openai'], description: 'Obrigatório quando houver commentIntroText (sem cascata auto).' },
        voiceGender: { type: 'string', enum: ['male', 'female'], default: 'male' },
        voiceId: { type: 'string' },
        title: { type: 'string' },
        waitForResult: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'darktube_batch_render',
    description: 'Renderização Data-in, Video-out em lote na Fila FIFO: aceita até 20 especificações JSON (html_svg ou threejs_3d). Todo item com fala DEVE informar voiceProvider explícito (external, elevenlabs+voiceId, edge ou openai) perguntado ao usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Lista de 1 a 20 especificações ({ engine, title, preset, aspect, isDraft, voiceProvider, voiceId, audioPathOrUrl, topic, scenes, storyboard, scriptText }).',
          items: { type: 'object' },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'darktube_manage_voices',
    description: 'Lista todas as vozes disponíveis (ElevenLabs reais da conta via API, Edge TTS PT-BR neurais e OpenAI) ou clona uma nova voz na ElevenLabs a partir de áudio em sample (action="list" | "clone"). Use ANTES de renderizar quando o usuário quiser selecionar ou criar uma voz.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'clone'], default: 'list' },
        name: { type: 'string', description: 'Nome da nova voz (quando action="clone")' },
        description: { type: 'string', description: 'Descrição opcional da voz clonada' },
        audioPathOrUrl: { type: 'string', description: 'Caminho local, /api/storage/... ou URL da amostra de áudio (quando action="clone")' },
      },
    },
  },
];

export async function GET(req: NextRequest) {
  const auth = await resolveMcpAuth(req);
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
  const auth = await resolveMcpAuth(req);
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
        try {
          const toolResult = await runWithMcpUser(auth.userId, () => executeTool(name, args || {}));
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
            },
          });
        } catch (toolErr: any) {
          console.error(`[API MCP DarkTube] Erro na tool ${name}:`, toolErr);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Erro ao executar ${name}: ${toolErr?.message || 'Erro interno'}` }],
            },
          });
        }
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

    const result = await runWithMcpUser(auth.userId, () => executeTool(toolName, toolArgs));
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

    case 'darktube_create_next_part':
      return await createNextPartCreative(args);

    case 'darktube_analyze_video_link':
      return await analyzeVideoLinkMcp(args);

    case 'darktube_clone_video_from_link':
      return await cloneVideoFromLinkMcp(args);

    case 'darktube_review_characters':
      return await reviewProjectCharactersMcp(args);

    case 'darktube_render_html_svg_video':
      return await renderHtmlSvgVideoMcp(args);

    case 'darktube_render_3d_video':
      return await renderThreeJsVideoMcp(args);

    case 'darktube_get_render_queue_status':
      return await getRenderQueueStatusMcp(args);

    case 'darktube_search_3d_assets':
      return await searchAndDownload3dAssetsMcp(args);

    case 'darktube_generate_image':
      return await generateFlowImageMcp(args);

    case 'darktube_build_puppet_rig':
      return await buildPuppetRigMcp(args);

    case 'darktube_auto_clip_live':
      return await autoClipLiveMcp(args);

    case 'darktube_batch_render':
      return await batchRenderMcp(args);

    case 'darktube_manage_voices':
      return await manageVoicesMcp(args);

    default:
      throw new Error(`Ferramenta desconhecida: "${name}". Disponíveis: ${MCP_TOOLS_MANIFEST.map((t) => t.name).join(', ')}.`);
  }
}
