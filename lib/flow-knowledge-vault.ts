export interface HookPatternEntry {
  id: string;
  name: string;
  formula: string;
  visualHook: string;
  spokenExamplePtBr: string;
  idealPresets: string[];
}

export interface PromptTechniqueEntry {
  id: string;
  name: string;
  whenToUse: string;
  promptSnippetEn: string;
}

export interface StyleBibleEntry {
  id: string;
  name: string;
  palette: [string, string, string];
  typography: string;
  lightingAndGrain: string;
  motionRule: string;
}

export const HOOK_PATTERNS_VAULT: HookPatternEntry[] = [
  {
    id: 'contrarian_audit',
    name: 'Contradição Imediata nos 2 Primeiros Segundos',
    formula: 'Inicie desmontando uma crença comum antes do título aparecer completo.',
    visualHook: 'Close-up + carimbo vermelho de erro + corte seco de 0.3s para a prova visual.',
    spokenExamplePtBr: 'Todo mundo te disse que isso era impossível sem orçamento, até esse código rodar em 12 segundos.',
    idealPresets: ['html_svg_tech_crimson', 'html_svg_netflix_doc', 'html_svg_vox_papercut'],
  },
  {
    id: 'in_media_res_conflict',
    name: 'Conflito no Meio da Ação (In Media Res)',
    formula: 'Abra com um objeto sendo entregue/recusado ou uma frase interrompida.',
    visualHook: 'Câmera na mão em plano médio + expressão de choque + objeto-chave travado em quadro.',
    spokenExamplePtBr: 'Você não vai entregar essa chave agora, vai? Olha o que está escrito atrás do contrato.',
    idealPresets: ['novelinha-dramatica', 'threejs_3d', 'puppet'],
  },
  {
    id: 'data_shock_zoom',
    name: 'Choque Numérico + Barra Crescente',
    formula: 'Mostre a diferença brutal entre dois números reais nos primeiros 3 segundos.',
    visualHook: 'Dois pilares subindo em 0.9s com câmera acompanhando o pico vencedor.',
    spokenExamplePtBr: 'De 14 mil para 1 milhão e 200 mil no mesmo mês, usando só um arquivo de dados.',
    idealPresets: ['html_svg_kaz_chart', 'html_svg_paper_finance'],
  },
  {
    id: 'historical_enigma',
    name: 'Enigma Cronológico de Dossiê',
    formula: 'Fixe ano e local exatos no topo e revele uma inconsistência histórica.',
    visualHook: 'Ken Burns lento em foto histórica P&B + marcação amarela na área suspeita.',
    spokenExamplePtBr: 'Em 1986, ninguém entendeu por que aquela sala foi lacrada com chumbo em menos de 4 horas.',
    idealPresets: ['html_svg_netflix_doc', 'geografia-plano-continuo', 'city-timelapse-historico'],
  },
];

export const PROMPT_TECHNIQUES_VAULT: PromptTechniqueEntry[] = [
  {
    id: 'exit_seam_anchor',
    name: 'Costura de Saída (Exit Seam) entre Takes',
    whenToUse: 'Sempre que dois takes consecutivos no Flow compartilharem personagem ou cenário.',
    promptSnippetEn:
      'Exit seam / ending pose: hold the exact final posture, grip on props, gaze direction and lighting exposure for the last 0.4s to stitch seamlessly into the next beat.',
  },
  {
    id: 'anti_drift_object_lock',
    name: 'Trava Anti-Telecinese e Anti-Morphing',
    whenToUse: 'Cenas com mãos manipulando ingredientes, portas, cofres ou embalagens.',
    promptSnippetEn:
      'Physical lock: zero autonomous floating or sliding objects; handles only move while firmly grasped by a hand; static countertops stay frozen.',
  },
  {
    id: 'single_take_continuous_flight',
    name: 'Plano-Sequência Geográfico Contínuo',
    whenToUse: 'Explainers territoriais, guerras, viagens ou mudanças climáticas.',
    promptSnippetEn:
      'Continuous unbroken aerial tracking move sliding smoothly forward over 3D terrain without cuts, crossfades or sudden altitude teleports.',
  },
  {
    id: 'chroma_a_pose_puppet',
    name: 'Folha Chroma #00FF00 A-Pose para Puppet 2.5D',
    whenToUse: 'Gerar personagem no Nano Banana e recortar juntas sem contaminar fundo.',
    promptSnippetEn:
      'Full body isolated standing in clean A-pose, front view, slight gap between arms and torso, flat solid pure #00FF00 background with zero cast shadows.',
  },
];

export const STYLE_BIBLE_VAULT: StyleBibleEntry[] = [
  {
    id: 'netflix_doc_bible',
    name: 'Documentário Investigativo (Netflix Doc)',
    palette: ['#07080D', '#E50914', '#FACC15'],
    typography: 'Serifa editorial nos títulos + monospace nas datas e carimbos',
    lightingAndGrain: 'Vinheta profunda + grão 35mm em 24fps + luz lateral dura',
    motionRule: 'Ken Burns lento contínuo (zoom 1.0 -> 1.13) + barra cronológica no topo',
  },
  {
    id: 'vox_papercut_bible',
    name: 'Explicador Tátil VOX Paper-Cut',
    palette: ['#F4EFE4', '#DC2626', '#FDE047'],
    typography: 'Sans extrabold preto sobre papel off-white com marca-texto amarelo',
    lightingAndGrain: 'Sombra dura recortada em papel (offset shadow) + fita adesiva amarela',
    motionRule: 'Animação em degraus de 12 FPS + destaque marca-texto nos primeiros 0.55s',
  },
  {
    id: 'kaz_data_bible',
    name: 'História de Dados (Kaz Chart)',
    palette: ['#090D16', '#38BDF8', '#22C55E'],
    typography: 'Números tabulares gigantes + rótulos limpos de alto contraste',
    lightingAndGrain: 'Grade técnica sutil + linha de tendência dourada animada',
    motionRule: 'Barras com easing cúbico + câmera acompanhando suavemente o gráfico',
  },
  {
    id: 'paper_finance_bible',
    name: 'Caderno de Finanças & Stickman',
    palette: ['#F7F1E3', '#15803D', '#B91C1C'],
    typography: 'Ink dark peso 900 com bordas grossas estilo marcador nanquim',
    lightingAndGrain: 'Papel creme quadriculado sem reflexo digital excessivo',
    motionRule: 'Stickman apresentador apontando para candlesticks que sobem em sequência',
  },
];

export function getKnowledgeVaultSummary() {
  return {
    hooksCount: HOOK_PATTERNS_VAULT.length,
    techniquesCount: PROMPT_TECHNIQUES_VAULT.length,
    stylesCount: STYLE_BIBLE_VAULT.length,
    hooks: HOOK_PATTERNS_VAULT,
    techniques: PROMPT_TECHNIQUES_VAULT,
    styles: STYLE_BIBLE_VAULT,
  };
}
