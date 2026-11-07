// Catalogo de templates da aba Flow (formatos curtos e longos, virais e atemporais).
// Cada template define a estrutura de cenas (beats), o plano de camera de cada uma e as regras do formato;
// a IA do roteiro so preenche o conteudo. Textos proprios; brief, beats, rules e look em ingles.

import { EMOTIONS, REALISM, type FlowTemplate } from './flow-template-base'

export const FLOW_TEMPLATE_CATALOG: FlowTemplate[] = [
  // ============================================================================
  // CURTOS (9:16 | 20–60 s | 4 a 8 takes)
  // ============================================================================
  {
    id: 'novelinha-dramatica',
    niche: 'Histórias',
    subniche: 'Microdrama em capítulos',
    name: 'Novelinha dramática',
    description:
      'Microdrama vertical: começa no meio do conflito, escala na arrogância do antagonista, revela um segredo e termina em gancho para o próximo capítulo.',
    mode: 'dialogo',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'genero',
        label: 'Gênero',
        type: 'select',
        default: 'vinganca',
        options: [
          { value: 'vinganca', label: 'Humilhação e reversão de status' },
          { value: 'familiar', label: 'Drama familiar' },
          { value: 'superacao', label: 'Superação e justiça' },
          { value: 'romance', label: 'Romance proibido' },
          { value: 'suspense', label: 'Suspense doméstico com virada' },
          { value: 'antropomorfico', label: 'Fábula dramática (animais/objetos de luxo)' },
        ],
      },
      {
        id: 'personagens',
        label: 'Personagens principais',
        type: 'select',
        default: '2',
        options: [
          { value: '2', label: '2 personagens (duelo direto)' },
          { value: '3', label: '3 personagens (entrada de aliado/testemunha)' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'raiva', options: EMOTIONS },
    ],
    brief:
      'Vertical serialized micro-drama with original fictional characters. Open in media res during a status clash or betrayal, escalate the confrontation, drop a sudden power reversal, and cut on an unresolved cliffhanger.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: public humiliation, unfair accusation, or caught-in-the-act confrontation, never a slow greeting',
        camera: 'medium two-shot, tense handheld movement at eye level',
      },
      {
        fn: 'Escalation: the arrogant antagonist doubles down and raises the stakes',
        camera: 'low-angle close-up on the antagonist, shallow depth of field',
      },
      {
        fn: 'Disruption: an unexpected witness, key object, or luxury vehicle arrives',
        camera: 'whip-pan tracking shot following the arriving element',
      },
      {
        fn: 'Twist: hidden authority, true ownership, or secret proof is exposed',
        camera: 'extreme close-up on stunned eyes and trembling hands',
      },
      {
        fn: 'Payoff and cliffhanger: power flips and the scene cuts right before the final consequence',
        camera: 'fast push-in on the protagonist before a hard cut',
      },
    ],
    rules: [
      'Shot / reverse-shot discipline: only one character speaks per take',
      'Every spoken line carries status conflict or emotional weight; zero small talk',
      'Keep identical wardrobe and facial description across all takes, no background music',
      'End on an unresolved cliffhanger that demands the next episode',
    ],
    look: 'high-drama cinema lighting, warm luxury interiors, 35mm prime lens, shallow depth of field',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'produto-tiktok-shop',
    niche: 'Vendas',
    subniche: 'Produto (TikTok Shop / UGC)',
    name: 'Vídeo de produto (UGC)',
    description:
      'Começa pela dor real ou quebra de objeção nos primeiros segundos, faz teste físico tátil em close, mostra o antes/depois e fecha com chamada direta.',
    mode: 'dialogo',
    length: 'curto',
    trend: 'viral',
    fields: [
      { id: 'produto', label: 'Produto', type: 'text', default: '', placeholder: 'Ex.: escova elétrica de limpeza pesada' },
      {
        id: 'beneficios',
        label: 'Benefícios reais (um por linha)',
        type: 'textarea',
        default: '',
        placeholder: 'Só o que o produto realmente faz. Sem promessas médicas ou resultados garantidos.',
      },
      {
        id: 'estilo',
        label: 'Ângulo de conversão',
        type: 'select',
        default: 'objecao',
        options: [
          { value: 'objecao', label: 'Quebra de objeção ("Achei que era golpe, mas...")' },
          { value: 'dor', label: 'Dor imediata + solução prática' },
          { value: 'teste_extremo', label: 'Teste físico extremo em close' },
          { value: 'comparativo', label: 'Jeito antigo vs. jeito novo' },
        ],
      },
    ],
    brief:
      'Authentic user-generated commerce video with one original presenter. Lead with a frustrating everyday problem or skeptical objection in the first 1.5s, prove performance through a tactile physical test, reveal the clean outcome, and finish with an urgent call to action.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: show the messy problem or voice the skeptical objection while holding the item',
        camera: 'handheld selfie close-up with natural home motion',
      },
      {
        fn: 'Tension and test: put the item through a demanding, hands-on physical test',
        camera: 'macro close-up on hands operating the item in real time',
      },
      {
        fn: 'Turning point: immediate side-by-side contrast showing the problem solved on contact',
        camera: 'steady overhead close-up with crisp focus on the result',
      },
      {
        fn: 'Payoff: highlight a clever secondary detail or durability feature',
        camera: 'medium close-up tilting from the item to the presenter',
      },
      {
        fn: 'Call to action and loop bridge: direct spoken recommendation that connects back to the opening problem',
        camera: 'eye-level medium shot, presenter pointing down toward the basket area',
      },
    ],
    rules: [
      'No medical claims, no guaranteed miracles, no trademarked brand marks',
      'Keep the physical item clearly visible in action in every single take',
      'Negative constraints: no random extra bystanders, no deformed hands/fingers, static background and furniture stay completely stable',
      'Capture crisp tactile foley of buttons, latches, or surfaces with no background music',
    ],
    look: 'bright natural window daylight, lived-in home environment, authentic handheld camera feel',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'historias-reais',
    niche: 'Curiosidades',
    subniche: 'Histórias e fatos narrados',
    name: 'História ou fato narrado',
    description:
      'Narrador conta um caso intrigante ou curiosidade real com ancoragem visual literal: cada plano mostra exatamente o objeto e a ação da frase.',
    mode: 'narracao',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      { id: 'assunto', label: 'Assunto', type: 'text', default: '', placeholder: 'Ex.: o faroleiro que viveu 40 anos isolado no mar' },
      {
        id: 'base',
        label: 'Base da história',
        type: 'select',
        default: 'curiosidade',
        options: [
          { value: 'curiosidade', label: 'Fato ou curiosidade real (sem inventar dados)' },
          { value: 'ficcional', label: 'Crônica ficcional inspirada em casos reais' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'surpresa', options: EMOTIONS },
    ],
    brief:
      'Tightly paced narrated micro-documentary. Open with a paradoxical detail in the first 1.5s, never an encyclopedic introduction. Every visual literally anchors the concrete noun and verb spoken by the off-screen narrator.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: a bizarre physical detail or contradiction, never an encyclopedic opening',
        camera: 'extreme close-up on the central physical artifact with slow push-in',
      },
      {
        fn: 'Setup and rising stakes: establish the isolated place and the warning everyone ignored',
        camera: 'low-angle dolly glide across the environment',
      },
      {
        fn: 'Escalation: the mechanism or crisis unfolds step by step',
        camera: 'tight over-the-shoulder tracking shot of silent physical action',
      },
      {
        fn: 'Twist: the counter-intuitive reason behind the mystery is revealed',
        camera: 'dramatic crane pull-back revealing the full scale of the scene',
      },
      {
        fn: 'Payoff and seamless loop: final sentence completes the opening thought and returns to the first object',
        camera: 'macro close-up matching the opening frame composition',
      },
    ],
    rules: [
      'Narrator is strictly off-screen; on-screen figures keep mouths closed and never speak',
      'Literal visual anchoring: every take must show the exact physical object mentioned in that line',
      'Final sentence bridges grammatically into the first sentence for a seamless replay loop',
    ],
    look: '35mm archival documentary cinema, natural grain, dramatic practical lighting, deep shadows',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'animais-natureza',
    niche: 'Natureza',
    subniche: 'Animais e natureza (sem fala)',
    name: 'Animais e natureza',
    description:
      'Momentos contemplativos, fofos ou épicos da vida selvagem com foley natural rico e sem nenhuma fala.',
    mode: 'ambiente',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      { id: 'animal', label: 'Animal ou ecossistema', type: 'text', default: '', placeholder: 'Ex.: filhotes de raposa-do-ártico na neve ao amanhecer' },
      {
        id: 'clima',
        label: 'Clima da cena',
        type: 'select',
        default: 'relaxante',
        options: [
          { value: 'relaxante', label: 'Contemplativo e relaxante' },
          { value: 'fofo', label: 'Filhotes e interações fofas' },
          { value: 'epico', label: 'Sobrevivência épica e forças da natureza' },
          { value: 'noturno', label: 'Vida noturna bioluminescente' },
        ],
      },
    ],
    brief:
      'Wordless wildlife micro-cinema with rich spatial nature foley. Keep the exact same animal species and habitat across all takes, progressing from an arresting close-up to an intimate behavioral payoff that loops.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: arresting eye contact or sudden micro-movement of the animal',
        camera: 'telephoto 400mm portrait, razor-thin depth of field',
      },
      {
        fn: 'Tension or curiosity: the creature navigates a weather element or terrain obstacle',
        camera: 'low-angle tracking shot at ground level beside paws or wings',
      },
      {
        fn: 'Turning point: a tactile interaction with water, snow, foliage, or a companion',
        camera: 'medium profile shot with slow-motion droplets or particles',
      },
      {
        fn: 'Payoff: intimate sensory detail of fur, feathers, or breathing in golden light',
        camera: 'extreme macro close-up with backlit rim glow',
      },
      {
        fn: 'Seamless loop: calm resting posture matching the lighting and tone of the opening frame',
        camera: 'slow smooth pull-back into the surrounding habitat',
      },
    ],
    rules: [
      'Strictly zero speech, zero voiceover, and zero background music',
      'Specify layered natural foley in every take: footsteps on snow, wind in dry grass, water ripples, breathing',
      'Maintain consistent animal markings, lighting hour, and habitat across all takes',
    ],
    look: 'high-end wildlife documentary cinematography, telephoto compression, golden-hour rim light',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'pov-imersivo',
    niche: 'Imersão',
    subniche: 'POV em 1ª pessoa (Você)',
    name: 'POV imersivo (2ª pessoa)',
    description:
      'Coloca o espectador dentro de uma época histórica ou cenário de sobrevivência em primeira pessoa ("Você acorda..."), com mãos visíveis e som espacial.',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'cenario',
        label: 'Cenário de imersão',
        type: 'select',
        default: 'historico',
        options: [
          { value: 'historico', label: 'Viagem no tempo / Época histórica extrema' },
          { value: 'sobrevivencia', label: 'Sobrevivência em local isolado (oceano, ártico, caverna)' },
          { value: 'futurista', label: 'Estação espacial ou metrópole distópica' },
          { value: 'noturno', label: 'Turno da madrugada em local misterioso' },
        ],
      },
      {
        id: 'intensidade',
        label: 'Ritmo sensorial',
        type: 'select',
        default: 'tenso',
        options: [
          { value: 'tenso', label: 'Perigo iminente e adrenalina' },
          { value: 'misterioso', label: 'Exploração silenciosa e suspense' },
          { value: 'contemplativo', label: 'Nostalgia e imersão atmosférica' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'tensao', options: EMOTIONS },
    ],
    brief:
      'First-person subjective camera perspective combined with second-person narration addressing the viewer as You. Drop the viewer straight into immediate sensory danger in the first 1.5s, escalate environmental threats, and loop back to the awakening moment.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: wake up or look down at your own hands holding a period tool as danger echoes nearby',
        camera: 'strict first-person eye-level POV looking down at hands, natural head bob',
      },
      {
        fn: 'Tension: step forward through a claustrophobic or hostile environment as a threat approaches',
        camera: 'first-person walking POV pushing through mist, rain, or torchlit corridor',
      },
      {
        fn: 'Turning point: interact physically with a mechanism, door, or survival tool that suddenly fails or reveals a secret',
        camera: 'first-person close-up on hands struggling with a heavy latch or instrument',
      },
      {
        fn: 'Climax: whip around to face the massive environmental event or approaching silhouette',
        camera: 'urgent first-person whip-pan tilting upward into the looming spectacle',
      },
      {
        fn: 'Payoff and loop bridge: sudden blackout or blink transition that grammatically completes the opening line',
        camera: 'first-person stumble backward as shadows close in over the lens',
      },
    ],
    rules: [
      'Every single take must be shot from strict 100% first-person subjective POV; never show the protagonist face',
      'Narration must be written entirely in second person addressing the viewer directly',
      'Include immersive 3D spatial foley: heavy breathing, footsteps on wet stone or mud, close-mic cloth rustle, no background music',
    ],
    look: 'immersive subjective cinema, anamorphic lens flare, practical torch or flashlight beam, visceral atmosphere',
    defaults: { takes: 5, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'storytime-entrevista-rua',
    niche: 'Humor e Viral',
    subniche: 'Falso documentário / Microfone de rua',
    name: 'Storytime e entrevista absurda',
    description:
      'Personagem improvável (viajante do tempo, criatura folclórica, trabalhador medieval ou figura urbana) dá entrevista de rua ou grava vlog como se o absurdo fosse banal.',
    mode: 'dialogo',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'protagonista',
        label: 'Tipo de entrevistado',
        type: 'select',
        default: 'historico',
        options: [
          { value: 'historico', label: 'Trabalhador de época histórica reclamando do expediente' },
          { value: 'criatura', label: 'Criatura mítica em vlog cotidiano (ex.: Pé-Grande, Yeti)' },
          { value: 'profissao', label: 'Profissional em situação absurda mantendo a pose' },
          { value: 'carro', label: 'Desabafo confessional dentro do carro na chuva' },
        ],
      },
      {
        id: 'tom',
        label: 'Tom da fala',
        type: 'select',
        default: 'indignado',
        options: [
          { value: 'indignado', label: 'Indignado com um problema ridículo' },
          { value: 'casual', label: 'Totalmente calmo diante do caos' },
          { value: 'fofoca', label: 'Contando um segredo em voz baixa' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'humor', options: EMOTIONS },
    ],
    brief:
      'Mockumentary street interview or handheld confessional vlog with one original character speaking directly to the camera. Contrast gritty documentary realism with an absurd premise delivered completely straight.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: character says an outrageous complaint with a dead-serious face into a handheld mic',
        camera: 'handheld documentary medium close-up with slight zoom snap',
      },
      {
        fn: 'Escalation: character explains the bizarre daily struggle as background chaos subtly unfolds behind them',
        camera: 'eye-level handheld shot, rack focus briefly to the background absurdity',
      },
      {
        fn: 'Visual proof: quick cut to the ridiculous physical evidence or coworker causing the issue',
        camera: 'shaky documentary whip-pan to the side action, then snap back',
      },
      {
        fn: 'Twist: an unexpected interruption forces the speaker to react on the spot',
        camera: 'tight close-up on the speaker pausing mid-sentence in disbelief',
      },
      {
        fn: 'Payoff punchline: ironic closing remark delivered to the lens before walking off frame',
        camera: 'handheld medium shot holding steady as the speaker turns away',
      },
    ],
    rules: [
      'Single speaker lip-sync per take in natural, colloquial spoken phrasing',
      'Contrast hyper-realistic documentary camera work with a comedic or anachronistic premise',
      'Use realistic outdoor wind, room tone, and mic-handling foley with no background music',
    ],
    look: 'raw handheld street documentary look, natural overcast or night street lighting, realistic skin detail',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'metafora-visual-minidoc',
    niche: 'Curiosidades',
    subniche: 'Metáfora visual e minidoc',
    name: 'Metáfora visual (Minidoc)',
    description:
      'Explica psicologia, economia ou anatomia humana materializando conceitos abstratos em objetos físicos surreais ou cortes anatômicos 3D em macro.',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'area',
        label: 'Área do tema',
        type: 'select',
        default: 'corpo',
        options: [
          { value: 'corpo', label: 'Corpo humano e cérebro no limite (Anatômico 3D)' },
          { value: 'psicologia', label: 'Psicologia e comportamento (Metáfora física)' },
          { value: 'economia', label: 'Dinheiro e sociedade (Objetos surreais em macro)' },
          { value: 'engenharia', label: 'Máquinas e física extrema por dentro' },
        ],
      },
      {
        id: 'estetica',
        label: 'Estética visual',
        type: 'select',
        default: 'macro_surreal',
        options: [
          { value: 'macro_surreal', label: 'Objetos físicos hiper-realistas (vidro, ouro, mercúrio)' },
          { value: 'anatomico', label: 'Corte anatômico/translúcido de cinema' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'curiosidade', options: EMOTIONS },
    ],
    brief:
      'High-retention visual metaphor explainer. Instead of generic people thinking, materialize abstract scientific or psychological ideas into tactile macro objects or translucent anatomical cross-sections synchronized with calm, authoritative narration.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: counter-intuitive claim paired with a surreal physical metaphor cracking or igniting',
        camera: '100mm macro extreme close-up, slow push-in on the glowing or fracturing object',
      },
      {
        fn: 'Hidden mechanism: reveal what happens inside the system under pressure',
        camera: 'translucent cross-section camera glide through internal gears, vessels, or fibers',
      },
      {
        fn: 'Escalation: chronological progression pushes the object or organ to its breaking point',
        camera: 'orbital macro shot as heat, tension, or liquid mercury rises',
      },
      {
        fn: 'Turning point: the unexpected scientific or psychological shift transforms the material',
        camera: 'high-speed slow-motion macro capture of the physical transformation',
      },
      {
        fn: 'Payoff and loop bridge: restored equilibrium that visually and verbally mirrors the opening frame',
        camera: 'clean overhead macro shot pulling back to match the first composition',
      },
    ],
    rules: [
      'Never show charts, graphs, or written symbols; turn every abstract concept into a physical 3D object',
      'Off-screen voiceover only; synchronize every spoken verb with a physical reaction in the macro object',
      'Layer crisp micro-foley: glass stress, electric hum, heartbeat pulse, liquid droplets, no background music',
    ],
    look: 'dark studio macro cinematography, dramatic rim lighting, translucent materials, shallow depth of field',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'asmr-fisica-impossivel',
    niche: 'Sensorial',
    subniche: 'ASMR e física impossível',
    name: 'ASMR de física impossível',
    description:
      'Loops hipnóticos sem fala: frutas de vidro, lava sólida, cristais ou metais líquidos sendo cortados ou prensados com som ASMR hiper-crocante.',
    mode: 'ambiente',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'material',
        label: 'Material principal',
        type: 'select',
        default: 'vidro_fruta',
        options: [
          { value: 'vidro_fruta', label: 'Frutas translúcidas de vidro e cristal' },
          { value: 'lava_metal', label: 'Lava incandescente e metal líquido cromado' },
          { value: 'areia_cinetica', label: 'Areia cinética perolada e cerâmica macia' },
          { value: 'gelo_neon', label: 'Gelo cristalino com núcleo luminoso' },
        ],
      },
      {
        id: 'acao',
        label: 'Ação física',
        type: 'select',
        default: 'corte',
        options: [
          { value: 'corte', label: 'Corte preciso com lâmina de aço damasco' },
          { value: 'prensa', label: 'Compressão lenta em prensa hidráulica' },
          { value: 'laser', label: 'Limpeza a laser ou escultura térmica' },
        ],
      },
    ],
    brief:
      'Hyper-tactile ASMR loop featuring impossible material physics and razor-sharp native foley. Every take focuses on macro refraction, satisfying physical slicing or compression, and crisp acoustic detail with zero speech.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: the blade or press makes initial contact, cracking the outer crystalline shell',
        camera: 'fixed tripod 45-degree 100mm macro close-up, razor-sharp focus on contact point',
      },
      {
        fn: 'Sensory escalation: slice smoothly through the glowing interior revealing intricate internal layers',
        camera: 'extreme macro side profile following the blade edge through the material',
      },
      {
        fn: 'Turning point: a dense liquid core or shimmering geometric fragments spill across the dark slab',
        camera: 'high-frame-rate macro shot capturing refracted light and rolling droplets',
      },
      {
        fn: 'Payoff and seamless loop: final clean slice falls into place as a fresh identical object slides into position',
        camera: 'locked-off macro frame matching the exact geometry of the first take',
      },
    ],
    rules: [
      'Strictly zero speech, zero whispers, and zero background music',
      'Focus 100% of the audio layer on hyper-crisp close-mic ASMR foley: crystalline crunch, metallic ring, viscous drip',
      'Keep camera locked on a steady macro angle so the material physics command full visual attention',
      'Negative constraints: strictly no human figures, no faces, no extra floating hands, no deformed tools; the cutting surface stays completely anchored and stationary',
    ],
    look: 'studio macro product cinematography, dark obsidian surface, specular rim lighting, pristine optical refraction',
    defaults: { takes: 4, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'antes-depois-restauracao',
    niche: 'Sensorial',
    subniche: 'Transformação e restauração',
    name: 'Antes e depois (Restauração)',
    description:
      'Transformação satisfatória de um objeto enferrujado ou ambiente abandonado em uma peça impecável, mantendo o mesmo enquadramento.',
    mode: 'ambiente',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'alvo',
        label: 'O que será restaurado',
        type: 'select',
        default: 'objeto',
        options: [
          { value: 'objeto', label: 'Relíquia mecânica ou relógio antigo na bancada' },
          { value: 'ambiente', label: 'Quarto/oficina abandonada virando estúdio moderno' },
          { value: 'carro', label: 'Clássico coberto de ferrugem voltando a brilhar' },
          { value: 'cabana', label: 'Terreno selvagem virando refúgio aconchegante' },
        ],
      },
      {
        id: 'ritmo',
        label: 'Estilo de áudio',
        type: 'select',
        default: 'foley_puro',
        options: [
          { value: 'foley_puro', label: '100% sons mecânicos da oficina (sem fala)' },
          { value: 'detalhado', label: 'Foco em ferramentas de precisão e polimento' },
        ],
      },
    ],
    brief:
      'Satisfying restoration progression moving from extreme decay to pristine perfection. Anchor the viewer with the damaged state in the first 1.5s, progress through heavy stripping, precision assembly, and final illuminated reveal.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: show the heavily rusted, mud-caked, or ruined subject placed on the workbench',
        camera: 'locked-off overhead or three-quarter medium shot establishing the exact frame',
      },
      {
        fn: 'Aggressive stripping: high-pressure wash, sandblasting, or demolition removes decades of grime',
        camera: 'macro close-up on sparks, water jets, and peeling oxidation',
      },
      {
        fn: 'Precision craftsmanship: oiled gears, fresh woodwork, or polished metal parts click into place',
        camera: 'tight side-angle dolly across gloved hands fitting precision components',
      },
      {
        fn: 'Final polish: warm light sweeps across the newly finished surface',
        camera: 'slow macro glide over the mirror-like finish',
      },
      {
        fn: 'Payoff reveal: the fully restored masterpiece working smoothly in the exact framing of the opening shot',
        camera: 'locked-off three-quarter shot matching Beat 1 for instant visual comparison',
      },
    ],
    rules: [
      'No spoken dialogue and no background music; rely entirely on mechanical workshop foley',
      'Beat 1 and the final beat must share the exact same camera angle and focal length to highlight the transformation',
      'Show clear physical tools interacting with the surface in the middle takes',
    ],
    look: 'warm artisan workshop lighting, tungsten practical lamps, rich metallic and wood reflections',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'true-crime-misterio',
    niche: 'Mistério',
    subniche: 'True crime e casos inexplicáveis',
    name: 'Mistério e investigação noir',
    description:
      'Reconstrução atmosférica estilo cinema noir: começa por uma pista contraditória nos primeiros segundos e reconstrói a linha do tempo do enigma.',
    mode: 'narracao',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      {
        id: 'tipo_caso',
        label: 'Tipo de mistério',
        type: 'select',
        default: 'desaparecimento',
        options: [
          { value: 'desaparecimento', label: 'Lugar encontrado intacto, mas sem ninguém (Ex.: navio, farol)' },
          { value: 'forense', label: 'O detalhe forense impossível que mudou o caso' },
          { value: 'artefato', label: 'Objeto encontrado onde não deveria existir' },
          { value: 'codigo', label: 'Enigma histórico nunca decifrado' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'tensao', options: EMOTIONS },
    ],
    brief:
      'Noir investigative mystery reconstruction with an off-screen narrator. Open with a chilling physical contradiction in the first 1.5s, trace the overlooked forensic clue through moody archival visuals, and close on an eerie loop.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: reveal a contradictory physical clue at the scene—like a warm meal in an empty room',
        camera: 'slow creeping dolly-in on the untouched object under a flickering green desk lamp',
      },
      {
        fn: 'Timeline tension: reconstruct the final known evening through shadows and rain-soaked exteriors',
        camera: 'high-angle wide shot of a lone vehicle or doorway in heavy rain and fog',
      },
      {
        fn: 'The overlooked clue: an investigator gloved hand examines a small anomalous detail',
        camera: 'extreme close-up under a magnifying glass or flashlight beam',
      },
      {
        fn: 'Twist revelation: the detail proves the event happened in reverse or from the inside',
        camera: 'slow low-angle push-in down a dark hallway toward an open door',
      },
      {
        fn: 'Payoff and loop bridge: haunting closing question that connects directly back to the opening clue',
        camera: 'close-up returning to the initial object as the light dims',
      },
    ],
    rules: [
      'Off-screen narrator only; keep all human figures in silhouette, over-the-shoulder, or shadow with mouths closed',
      'Never use real victim names or sensitive real-world tragedy footage; frame as atmospheric investigative cinema',
      'Layer eerie diegetic sound: rain on glass, ticking clock, magnetic tape hum, footsteps on floorboards, no music',
    ],
    look: 'neo-noir thriller cinematography, 35mm film grain, chiaroscuro shadows, cold rain and tungsten practicals',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'historia-e-se',
    niche: 'História',
    subniche: 'Cenários "E se?" e história visceral',
    name: 'História visceral e "E se?"',
    description:
      'Foge de datas de enciclopédia para mostrar os detalhes sensoriais reais do passado ou cenários alternativos ("E se a Terra perdesse...").',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'abordagem',
        label: 'Abordagem',
        type: 'select',
        default: 'cotidiano_brutal',
        options: [
          { value: 'cotidiano_brutal', label: 'Como era sobreviver a um dia comum no passado' },
          { value: 'e_se_historico', label: 'História alternativa ("E se tal império nunca tivesse caído?")' },
          { value: 'e_se_ciencia', label: 'Cenário planetário ("E se o oxigênio sumisse por 5 segundos?")' },
          { value: 'profissao_antiga', label: 'O trabalho mais perigoso de uma era antiga' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'surpresa', options: EMOTIONS },
    ],
    brief:
      'Gritty historical micro-cinema or high-concept counterfactual scenario. Never open with dates or academic facts; start with a visceral sensory shock in the first 1.5s and escalate the physical consequences.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: visceral close-up of a dangerous period tool, custom, or immediate physical anomaly',
        camera: 'handheld close-up with firelight or atmospheric dust particles',
      },
      {
        fn: 'Escalation: show the harsh immediate reality on the street or landscape within seconds',
        camera: 'sweeping crane shot across the authentic period environment or shifting skyline',
      },
      {
        fn: 'Turning point: the hidden biological or mechanical consequence hits everyday people',
        camera: 'medium tracking shot following an ordinary person reacting to the phenomenon',
      },
      {
        fn: 'Twist: reveal the ironic survival rule or unexpected long-term outcome',
        camera: 'low-angle dramatic push-in on the surviving structure or artifact',
      },
      {
        fn: 'Payoff and loop bridge: final observation that links seamlessly back to the opening visual shock',
        camera: 'tight close-up mirroring the opening frame lighting and surface detail',
      },
    ],
    rules: [
      'Ban encyclopedic openings; never start with dates, centuries, or classroom definitions',
      'Focus on tactile period authenticity: mud, smoke, candle wax, hammered iron, weathered cloth',
      'Off-screen narration with rich environmental sound effects and zero background music',
    ],
    look: 'epic historical drama cinematography, natural fire and daylight, rich atmospheric smoke and grain',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'infantil-fabula-3d',
    niche: 'Infantil',
    subniche: 'Fábula em 3D ou massinha',
    name: 'Fábula infantil (3D / Massinha)',
    description:
      'Pequena fábula encantadora com animais ou personagens fofos em estilo animação 3D ou massinha/feltro, com lição doce e alto replay.',
    mode: 'narracao',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      {
        id: 'estilo_visual',
        label: 'Estilo de animação',
        type: 'select',
        default: 'animacao3d',
        options: [
          { value: 'animacao3d', label: 'Animação 3D de cinema (iluminação suave e expressiva)' },
          { value: 'massinha', label: 'Stop-motion artesanal (massinha e feltro tátil)' },
        ],
      },
      {
        id: 'licao',
        label: 'Tema da fábula',
        type: 'select',
        default: 'coragem',
        options: [
          { value: 'coragem', label: 'Perder o medo do escuro ou do desconhecido' },
          { value: 'amizade', label: 'Dividir e ajudar um amigo diferente' },
          { value: 'curiosidade', label: 'Por que a natureza funciona assim (educativo)' },
          { value: 'paciencia', label: 'Acalmar a pressa e a frustração' },
        ],
      },
      { id: 'protagonista', label: 'Protagonista', type: 'text', default: '', placeholder: 'Ex.: um ouriço azul pequenininho de cachecol amarelo' },
    ],
    brief:
      'Heartwarming children fable featuring a consistent cute animal or miniature protagonist in stylized 3D animation or tactile felt stop-motion. Warm storyteller narration guides a gentle dilemma, a funny mishap, and a comforting moral.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: the tiny protagonist faces a charming oversized dilemma with wide expressive eyes',
        camera: 'character eye-level medium close-up, warm soft-box illumination',
      },
      {
        fn: 'Comedic attempt: a clumsy first try goes adorably wrong',
        camera: 'wide side shot capturing playful physical comedy in the miniature world',
      },
      {
        fn: 'Turning point: a gentle friend or tiny glowing detail offers a clever clue',
        camera: 'over-the-shoulder shot focusing on the shared discovery',
      },
      {
        fn: 'Payoff: the protagonist succeeds through kindness or courage, transforming the cozy environment',
        camera: 'gentle crane pull-back as warm lantern or sunbeams fill the scene',
      },
      {
        fn: 'Cozy loop ending: sweet moral and a peaceful gesture that connects back to the opening pose',
        camera: 'soft close-up on the smiling protagonist settling down',
      },
    ],
    rules: [
      'Keep the exact same character proportions, colors, and miniature world scale in every take',
      'Warm, expressive off-screen storyteller narration with gentle organic foley: tiny footsteps, rustling leaves, soft chimes',
      'Strictly safe, comforting, family-friendly imagery with zero scary or aggressive elements',
    ],
    look: 'high-end 3D animated feature film or handmade felt stop-motion, warm pastel palette, soft global illumination',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'motivacional-estoico',
    niche: 'Mentalidade',
    subniche: 'Estoicismo e verdades duras',
    name: 'Motivacional estoico cinematográfico',
    description:
      'Afasta-se de clichês de autoajuda para entregar uma verdade psicológica dura sobre disciplina e silêncio em planos cinematográficos contemplativos.',
    mode: 'narracao',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      {
        id: 'arquetipo',
        label: 'Atmosfera visual',
        type: 'select',
        default: 'urbano_noturno',
        options: [
          { value: 'urbano_noturno', label: 'Solidão urbana (trem noturno, chuva, oficina silenciosa)' },
          { value: 'classico', label: 'Estátuas clássicas, biblioteca antiga e luz de vela' },
          { value: 'natureza_bruta', label: 'Montanha fria, mar revolto e neblina ao amanhecer' },
          { value: 'artesao', label: 'Forja, treino solitário ou trabalho manual silencioso' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'calma', options: EMOTIONS },
    ],
    brief:
      'Contemplative stoic micro-essay. Avoid loud motivational cliches; pair a single grounded psychological truth with moody, deliberate 35mm cinema shots of solitude, craftsmanship, and quiet endurance.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: a sharp paradoxical truth spoken over a solitary figure in quiet action',
        camera: 'tight close-up on calloused hands or rain-streaked glass, shallow focus',
      },
      {
        fn: 'Tension: illustrate the trap of seeking external validation or comfort',
        camera: 'slow tracking shot behind a lone figure walking against a blurred crowd or storm',
      },
      {
        fn: 'Turning point: a deliberate pause where discipline replaces impulse',
        camera: 'extreme close-up on calm eyes reflecting warm fire or dawn light',
      },
      {
        fn: 'Payoff: quiet mastery shown through a completed craft or steady horizon',
        camera: 'wide anamorphic composition holding steady on the vast landscape or workshop',
      },
      {
        fn: 'Loop reflection: final stoic sentence completes the opening premise',
        camera: 'slow pull-back returning to the opening visual motif',
      },
    ],
    rules: [
      'Deep, measured off-screen voiceover at a calm pace; no shouting and no hype cliches',
      'Never use roaring lions, luxury sports cars, or generic men in suits celebrating',
      'Use deep atmospheric foley: steady rain, crackling hearth, distant train rails, calm breathing, no music',
    ],
    look: 'arthouse 35mm cinema, moody desaturated palette, heavy film grain, natural chiaroscuro lighting',
    defaults: { takes: 5, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'comedia-deadpan',
    niche: 'Humor e Viral',
    subniche: 'Sitcom deadpan / Câmera de segurança',
    name: 'Comédia seca (Deadpan)',
    description:
      'Algo completamente absurdo acontece num escritório comum ou câmera de portaria, e os personagens reagem com tédio absoluto.',
    mode: 'dialogo',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'formato_camera',
        label: 'Estilo de câmera',
        type: 'select',
        default: 'escritorio',
        options: [
          { value: 'escritorio', label: 'Sitcom de escritório (zoom rápido estilo documentário)' },
          { value: 'portaria', label: 'Câmera fixa de portaria ou corredor' },
          { value: 'loja', label: 'Atendimento ao cliente totalmente apático' },
        ],
      },
      {
        id: 'absurdo',
        label: 'Tipo de absurdo',
        type: 'select',
        default: 'animal',
        options: [
          { value: 'animal', label: 'Animal improvável agindo como funcionário comum' },
          { value: 'fisica', label: 'Falha na realidade tratada como burocracia' },
          { value: 'visita', label: 'Criatura ou figura histórica na fila de atendimento' },
        ],
      },
    ],
    brief:
      'Deadpan situational comedy where a surreal or impossible event occurs inside a mundane workplace or hallway, and an exhausted everyday worker reacts with dry boredom.',
    beats: [
      {
        fn: 'Hook in the first 1.5s: instant pattern interrupt—an absurd creature or phenomenon in a fluorescent office',
        camera: 'medium documentary shot that whip-pans straight to the anomaly',
      },
      {
        fn: 'Deadpan escalation: the anomaly performs a mundane task while the employee watches unimpressed',
        camera: 'crash-zoom onto the employee blank, tired expression looking into the lens',
      },
      {
        fn: 'Turning point: the employee addresses the situation with a bureaucratic complaint',
        camera: 'medium two-shot under flat office lighting as the employee speaks calmly',
      },
      {
        fn: 'Payoff punchline: a second tiny absurd detail happens right on cue and the worker just sighs',
        camera: 'quick pan to the secondary gag, then back to the worker sipping from a plain mug',
      },
    ],
    rules: [
      'Acting delivery must be 100% deadpan, exhausted, and matter-of-fact—never slapstick',
      'Only one character speaks per take; keep lip-sync lines brief and dry',
      'Use mundane office or hallway foley: fluorescent hum, printer whir, heavy sigh, coffee sip, no music',
    ],
    look: 'flat fluorescent workplace documentary look, handheld crash-zooms, realistic everyday surfaces',
    defaults: { takes: 4, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },

  // ============================================================================
  // LONGOS (16:9 | YouTube 3–10 min | 18 a 40 takes de 8 s | beats = atos)
  // ============================================================================
  {
    id: 'doc-investigativo-longo',
    niche: 'Documentários (Longo)',
    subniche: 'Documentário narrado em atos',
    name: 'Documentário profundo (YouTube 16:9)',
    description:
      'Mini-documentário horizontal de alta retenção sobre colapsos, megaprojetos, anomalias geopolíticas ou fenômenos modernos divididos em 5 atos.',
    mode: 'narracao',
    length: 'longo',
    trend: 'atemporal',
    fields: [
      {
        id: 'recorte',
        label: 'Recorte temático',
        type: 'select',
        default: 'engenharia',
        options: [
          { value: 'engenharia', label: 'Megaprojetos, logística oculta e cidades fantasmas' },
          { value: 'ascensao_queda', label: 'Ascensão e colapso de um império ou invenção' },
          { value: 'fenomeno', label: 'Anomalia geográfica ou científica pouco conhecida' },
          { value: 'sociedade', label: 'Subculturas e comportamentos modernos explicados' },
        ],
      },
      { id: 'emocao', label: 'Tom predominante', type: 'select', default: 'curiosidade', options: EMOTIONS },
    ],
    brief:
      'Widescreen 16:9 long-form narrative documentary structured in five acts. Open with a cold-open paradox in the first 1.5s, build investigative momentum through chapters, and sustain retention with open loops between acts.',
    beats: [
      {
        fn: 'Act I (Cold Open Hook): present a striking visual anomaly or abandoned mega-structure and pose the central unanswered question',
        camera: '16:9 aerial drone establishing shot descending into a slow anamorphic dolly push-in',
      },
      {
        fn: 'Act II (The Ambition & Hidden Mechanism): reconstruct how the system was built and the fatal flaw hidden beneath the surface',
        camera: 'wide architectural tracking shots alternating with macro close-ups of physical mechanisms',
      },
      {
        fn: 'Act III (The Escalation & Domino Effect): show the chronological chain reaction as warnings fail one by one',
        camera: 'tense handheld documentary movement and low-angle dolly shots through corridors or sites',
      },
      {
        fn: 'Act IV (The Climax & Unseen Consequence): reveal the decisive turning point and the human or environmental aftermath',
        camera: 'sweeping crane reveal across the transformed landscape in dramatic twilight',
      },
      {
        fn: 'Act V (Synthesis & Lingering Echo): connect the lesson back to the cold-open image and leave a thought-provoking final image',
        camera: 'slow symmetrical pull-back matching the opening widescreen composition',
      },
    ],
    rules: [
      'Distribute takes across the 5 acts, planting an open-loop curiosity question at the end of Acts I, II, and III',
      'Off-screen documentary voiceover only; vary camera scale every take between wide establishing, medium tracking, and macro detail',
      'Use rich environmental soundscapes and mechanical foley in every take with no background music',
    ],
    look: 'widescreen 16:9 prestige streaming documentary look, anamorphic 35mm lenses, natural color grading',
    defaults: { takes: 24, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'true-crime-dossie-longo',
    niche: 'Mistério',
    subniche: 'Dossiê forense e mistério (Longo)',
    name: 'Dossiê True Crime & Mistério (16:9)',
    description:
      'Investigação narrativa de fôlego (3 a 5 min): reconstrói casos frios, enigmas marítimos ou reviravoltas forenses em cinco atos cinematográficos.',
    mode: 'narracao',
    length: 'longo',
    trend: 'atemporal',
    fields: [
      {
        id: 'foco',
        label: 'Foco da investigação',
        type: 'select',
        default: 'forense',
        options: [
          { value: 'forense', label: 'A técnica forense obscura que resolveu um caso antigo' },
          { value: 'desaparecimento_massa', label: 'Expedições, navios ou colônias desaparecidas' },
          { value: 'roubo_engenhoso', label: 'O golpe ou roubo perfeito e o erro mínimo do autor' },
        ],
      },
      { id: 'emocao', label: 'Clima da narrativa', type: 'select', default: 'tensao', options: EMOTIONS },
    ],
    brief:
      'Widescreen 16:9 forensic mystery documentary structured in five investigative acts. Focus on physical evidence, timeline contradictions, and atmospheric reconstructions without sensationalism.',
    beats: [
      {
        fn: 'Act I (The Contradictory Scene): open on the single physical detail at the scene that defied every initial theory',
        camera: '16:9 slow creeping dolly toward the key object under moody practical tungsten light',
      },
      {
        fn: 'Act II (The Official Timeline): trace the last confirmed movements through atmospheric night exteriors and silent interiors',
        camera: 'wide anamorphic tracking shot along a rain-slicked road or corridor in deep shadow',
      },
      {
        fn: 'Act III (The False Leads & Cold Years): illustrate how investigators chased the wrong hypothesis while a tiny clue sat in storage',
        camera: 'overhead close-up of gloved hands examining physical evidence trays under a focused lamp',
      },
      {
        fn: 'Act IV (The Forensic Breakthrough): reveal the scientific test or microscopic detail that inverted the entire timeline',
        camera: 'extreme macro close-up on fibers, gears, or chemical reactions, followed by a dramatic camera push-in',
      },
      {
        fn: 'Act V (The Resolution & Final Echo): reconstruct what truly happened in sequence and return to the opening location at dawn',
        camera: 'wide slow pull-back from the quiet location as morning mist clears',
      },
    ],
    rules: [
      'Off-screen narrator only; keep all human figures anonymous in silhouette, shadow, or close-up on gloved hands',
      'Never use real victims names or graphic violence; build tension through forensic precision and atmosphere',
      'Sustain suspense across acts with diegetic noir audio layers: rain, footsteps, magnetic tape hum, clock ticks, no music',
    ],
    look: 'widescreen 16:9 neo-noir mystery cinema, cold green-amber palette, subtle 35mm grain, deep shadows',
    defaults: { takes: 28, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'compilacao-curiosidades-longo',
    niche: 'Curiosidades',
    subniche: 'Explicado e compilação (Longo)',
    name: 'Fenômenos explicados (YouTube 16:9)',
    description:
      'Formato "Explicado" de alta retenção: conecta de 4 a 6 fenômenos, paradoxos científicos ou maravilhas ocultas em uma escalada de escala.',
    mode: 'narracao',
    length: 'longo',
    trend: 'viral',
    fields: [
      {
        id: 'estrutura',
        label: 'Estrutura do vídeo',
        type: 'select',
        default: 'escalada',
        options: [
          { value: 'escalada', label: 'Escalada de intensidade (do mais leve ao mais extremo)' },
          { value: 'comparacao', label: 'Como diferentes lugares ou espécies resolvem o mesmo problema' },
          { value: 'camadas', label: 'Camadas de profundidade (superfície até o núcleo/abismo)' },
        ],
      },
      {
        id: 'visual',
        label: 'Acabamento visual',
        type: 'select',
        default: 'cinematografico',
        options: REALISM,
      },
    ],
    brief:
      'Widescreen 16:9 high-concept explainer compilation. Structure the runtime as an escalating ladder from familiar phenomena to mind-bending extremes, using vivid physical visuals to demonstrate every step.',
    beats: [
      {
        fn: 'Act I (The Everyday Illusion): shatter a common assumption in the first 1.5s with a striking visual demonstration',
        camera: '16:9 eye-level macro close-up pulling back rapidly to reveal a surprising environment',
      },
      {
        fn: 'Act II (First Escalation — Human Scale): explore the phenomenon at everyday human scale with clear physical cause and effect',
        camera: 'smooth gimbal tracking shot following the physical reaction in natural light',
      },
      {
        fn: 'Act III (Second Escalation — Extreme Environments): move into deep ocean, extreme altitude, or microscopic scale where rules bend',
        camera: 'sweeping underwater or high-altitude wide shot transitioning to a detailed close-up',
      },
      {
        fn: 'Act IV (The Apex Paradox): present the most counter-intuitive, extreme case that challenges intuition',
        camera: 'slow orbital camera movement around the central phenomenon with dramatic lighting',
      },
      {
        fn: 'Act V (Unified Payoff): tie all levels together into one unforgettable rule and mirror the opening visual',
        camera: 'symmetrical widescreen pull-back returning to the opening subject',
      },
    ],
    rules: [
      'Each act must escalate in scale or strangeness so viewer curiosity never plateaus',
      'Show concrete physical processes in motion; never rely on static talking heads or written overlays',
      'Off-screen narration paired with crisp environmental and physical foley, no background music',
    ],
    look: 'crisp 16:9 modern science documentary look, high dynamic range, vivid natural colors, macro to wide transitions',
    defaults: { takes: 20, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'reconstituicao-historica-longo',
    niche: 'História',
    subniche: 'Reconstituição histórica (Longo)',
    name: 'Reconstituição histórica épica (16:9)',
    description:
      'Documentário histórico imersivo (3 a 6 min): reconstrói uma jornada, cerco, expedição ou dia decisivo do passado como se fosse um filme.',
    mode: 'narracao',
    length: 'longo',
    trend: 'atemporal',
    fields: [
      {
        id: 'era',
        label: 'Período histórico',
        type: 'select',
        default: 'antiguidade',
        options: [
          { value: 'antiguidade', label: 'Mundo Antigo (Roma, Egito, Grécia, Mesopotâmia)' },
          { value: 'medieval', label: 'Idade Média e Grandes Navegações' },
          { value: 'industrial', label: 'Séculos XVIII–XIX (Explorações, ferrovias, ciência pioneira)' },
          { value: 'pre_historia', label: 'Pré-história e sobrevivência na Era do Gelo' },
        ],
      },
      { id: 'emocao', label: 'Tom da jornada', type: 'select', default: 'tensao', options: EMOTIONS },
    ],
    brief:
      'Widescreen 16:9 historical docudrama following one concrete expedition, siege, or ordinary artisan through a decisive historical event across five cinematic acts.',
    beats: [
      {
        fn: 'Act I (In Media Res Arrival): drop into the mud, smoke, or lantern light on the eve of the historical turning point',
        camera: '16:9 low-angle tracking shot following boots and period tools through a lived-in camp or street',
      },
      {
        fn: 'Act II (The World & The Stakes): establish the daily reality, scarcity, and geographical obstacle facing the group',
        camera: 'sweeping widescreen crane shot over the ancient settlement, harbor, or mountain pass',
      },
      {
        fn: 'Act III (The Ordeal): physical conditions worsen as weather, siege, or mechanical failure tests endurance',
        camera: 'handheld medium close-ups on weathered hands working ropes, iron, or oars in heavy weather',
      },
      {
        fn: 'Act IV (The Decisive Hour): the pivotal ingenious tactic or unexpected natural event changes the outcome',
        camera: 'dramatic dolly push-in through torchlight and smoke revealing the turning point',
      },
      {
        fn: 'Act V (The Aftermath & Legacy): quiet dawn over the remnants of the event, connecting past survival to the present',
        camera: 'slow wide pull-back across the silent landscape at sunrise',
      },
    ],
    rules: [
      'Maintain strict period authenticity in clothing fabrics, tools, lighting sources, and architecture across all takes',
      'Off-screen narration only; on-screen historical figures remain silent in physical action',
      'Rich period foley: crackling torches, creaking timber, clinking bronze or iron, wind and horses, no music',
    ],
    look: 'epic 16:9 historical cinema, natural firelight and overcast daylight, 35mm film grain, rich earthy materials',
    defaults: { takes: 26, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'historia-ninar-longo',
    niche: 'Infantil',
    subniche: 'História de ninar e relaxamento (Longo)',
    name: 'História de ninar encantada (16:9)',
    description:
      'Conto longo e acolhedor (3 a 6 min) com ritmo desacelerado, luz quente e narração suave, ideal para acalmar e dormir.',
    mode: 'narracao',
    length: 'longo',
    trend: 'atemporal',
    fields: [
      {
        id: 'universo',
        label: 'Universo do conto',
        type: 'select',
        default: 'floresta',
        options: [
          { value: 'floresta', label: 'Vila secreta dos animais na floresta iluminada' },
          { value: 'viagem_trem', label: 'Viagem noturna num trem aconchegante sob a chuva' },
          { value: 'nuvens', label: 'Ilhas flutuantes no céu estrelado' },
          { value: 'oceano_calmo', label: 'Fundo do mar calmo e bioluminescente' },
        ],
      },
      {
        id: 'estilo_visual',
        label: 'Estilo visual',
        type: 'select',
        default: 'animacao3d',
        options: [
          { value: 'animacao3d', label: 'Animação 3D suave e aveludada' },
          { value: 'massinha', label: 'Feltro e lã artesanal iluminados por luz quente' },
          { value: 'cinematografico', label: 'Realismo mágico aconchegante' },
        ],
      },
    ],
    brief:
      'Gentle widescreen 16:9 bedtime story structured to gradually slow the viewer heart rate across five soothing acts. Warm, soft-spoken narration accompanies slow camera glides through cozy, lantern-lit worlds.',
    beats: [
      {
        fn: 'Act I (Golden Dusk): introduce the gentle protagonist as twilight settles over a cozy, safe village or cottage',
        camera: '16:9 slow floating crane descent toward a warm glowing window at dusk',
      },
      {
        fn: 'Act II (The Quiet Stroll): a peaceful evening walk collecting fireflies, stars, or sleepy animal friends',
        camera: 'slow lateral dolly glide beside the protagonist through soft glowing foliage',
      },
      {
        fn: 'Act III (The Soothing Shelter): gentle rain or snow begins outside while everyone gathers in a warm shelter',
        camera: 'medium shot inside a lantern-lit cabin or burrow looking out at soft falling rain',
      },
      {
        fn: 'Act IV (Settling into Slumber): each small friend curls up as lights dim one by one and breathing slows',
        camera: 'intimate close-up panning slowly across sleepy eyes and warm blankets',
      },
      {
        fn: 'Act V (Starlight Loop): the whole landscape rests under a calm starry sky with rhythmic, peaceful ambient sound',
        camera: 'ultra-slow pull-back into the quiet night sky',
      },
    ],
    rules: [
      'Pacing must decelerate from Act I to Act V: slower camera motion, softer light, and calmer narration',
      'Zero sudden movements, zero loud noises, and zero frightening conflict',
      'Soft comforting foley: gentle rain on leaves, distant crickets, warm hearth crackle, soft breathing, no music',
    ],
    look: 'cozy 16:9 storybook cinema, warm amber lantern light, deep twilight blues, soft bokeh and velvet fabrics',
    defaults: { takes: 22, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'meditacao-ambiente-longo',
    niche: 'Natureza',
    subniche: 'Meditação e paisagem sonora (Longo)',
    name: 'Paisagem contemplativa e som ambiente (16:9)',
    description:
      'Experiência visual e acústica longa sem fala (3 a 6 min): chuva na janela, cabana alpina, templo na neblina ou costa oceânica para foco e relaxamento.',
    mode: 'ambiente',
    length: 'longo',
    trend: 'atemporal',
    fields: [
      {
        id: 'ambiente',
        label: 'Cenário principal',
        type: 'select',
        default: 'cabana_chuva',
        options: [
          { value: 'cabana_chuva', label: 'Cabana de madeira com lareira e chuva lá fora' },
          { value: 'jardim_zen', label: 'Jardim oriental na neblina com água corrente em bambu' },
          { value: 'costa_nordica', label: 'Falésias e ondas lentas sob aurora boreal' },
          { value: 'biblioteca_noite', label: 'Biblioteca antiga à luz de velas com chuva na vidraça' },
        ],
      },
      {
        id: 'ciclo_luz',
        label: 'Progressão de luz',
        type: 'select',
        default: 'entardecer_noite',
        options: [
          { value: 'entardecer_noite', label: 'Do fim de tarde dourado até a noite chuvosa' },
          { value: 'noite_continua', label: 'Madrugada serena contínua' },
          { value: 'amanhecer', label: 'Da neblina azul antes do sol até a luz da manhã' },
        ],
      },
    ],
    brief:
      'Wordless widescreen 16:9 contemplative ambient film with rich 48kHz spatial nature sound. Progress smoothly through five atmospheric chapters of the same sanctuary as light and weather gently evolve.',
    beats: [
      {
        fn: 'Act I (Arrival at the Sanctuary): wide tranquil composition establishing the shelter and the rhythmic natural element',
        camera: '16:9 locked-off tripod wide shot with subtle natural motion of rain, fire, or mist',
      },
      {
        fn: 'Act II (Tactile Water & Light): focus on the hypnotic interaction of water droplets, ripples, or reflections',
        camera: 'slow macro slider shot across rain-streaked glass, bamboo fountain, or tide pool',
      },
      {
        fn: 'Act III (Warmth vs. Elements): contrast the cozy interior warmth against the vast weather outside',
        camera: 'medium framing past a glowing hearth or lantern toward the misty landscape beyond',
      },
      {
        fn: 'Act IV (Deep Stillness): twilight deepens and wind softens into a steady, meditative rhythm',
        camera: 'ultra-slow pan across the quiet horizon and shimmering water surface',
      },
      {
        fn: 'Act V (Infinite Loop Return): return to the opening sanctuary framing for uninterrupted replay',
        camera: 'locked-off widescreen frame matching the exact geometry of Act I',
      },
    ],
    rules: [
      'Strictly zero speech, zero voiceover, and zero musical instruments',
      'Layer continuous, soothing acoustic foley: steady rain, crackling cedar wood, flowing water, distant wind',
      'Camera movements must be imperceptibly slow or tripod-locked to induce deep calm',
    ],
    look: 'widescreen 16:9 meditative cinema, anamorphic depth, warm practical glow against cool atmospheric rain or mist',
    defaults: { takes: 30, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'pov-historia-ilustrada-longo',
    niche: 'Histórias',
    subniche: 'POV "Você..." ilustrado 2D (Longo)',
    name: 'História POV ilustrada 2D (16:9)',
    description:
      'Drama do dia a dia brasileiro narrado em 2ª pessoa ("Você largou a CLT..."): personagem em preto e branco num cenário pintado e colorido, dinheiro em jogo a cada ato e final aberto com palavra para comentar. Longo (YouTube).',
    mode: 'narracao',
    length: 'longo',
    trend: 'viral',
    fields: [
      {
        id: 'tema_historia',
        label: 'Tema da história',
        type: 'select',
        default: 'delivery_casa',
        options: [
          { value: 'delivery_casa', label: 'Largar a CLT e abrir um delivery (hambúrguer, marmita) na cozinha de casa' },
          { value: 'motorista_app', label: 'Comprar um carro financiado para virar motorista de aplicativo' },
          { value: 'revenda', label: 'Revender roupas ou eletrônicos de casa e crescer sem controle' },
          { value: 'confeitaria', label: 'Confeitaria caseira que explode de pedidos' },
          { value: 'black_friday', label: 'Sazonal: dono de lojinha de bairro na semana da Black Friday' },
          { value: 'natal', label: 'Sazonal: vender panetone e doces de Natal e encarar a corrida de dezembro' },
          { value: 'volta_aulas', label: 'Sazonal: papelaria de bairro na volta às aulas (janeiro)' },
          { value: 'carnaval', label: 'Sazonal: barraca de ambulante no Carnaval (fevereiro)' },
        ],
      },
      {
        id: 'arco',
        label: 'Arco da história',
        type: 'select',
        default: 'sucesso_ameaca',
        options: [
          { value: 'sucesso_ameaca', label: 'O sucesso vira a ameaça: o negócio cresce rápido demais e pode quebrar' },
          { value: 'divida_crescente', label: 'Dívida crescente: cada solução cria um problema maior' },
          { value: 'virada_do_zero', label: 'Do zero à virada: tudo dá errado e uma decisão muda o jogo' },
        ],
      },
      {
        id: 'palavra_cta',
        label: 'Palavra para o público comentar no final',
        type: 'text',
        default: 'EU',
        placeholder: 'Ex.: HAMBÚRGUER, CORAGEM, TOPO',
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'tensao', options: EMOTIONS },
    ],
    brief:
      'Long-form 16:9 illustrated drama about an ordinary Brazilian worker who bets savings on a small business. Narrated entirely in second person ("Você"), present tense, by one calm confessional off-screen voice. Stakes are always concrete money amounts in reais that escalate act by act, and the success itself becomes the threat. The audience should feel the risk of losing everything and be invited to comment a keyword at the end.',
    beats: [
      {
        fn: 'Hook in media res: the protagonist works alone at night in a small home kitchen, a phone buzzing with orders, and the first line states the exact amount at risk',
        camera: 'wide establishing shot of the kitchen with slow parallax push-in, steam and warm bulb flicker',
      },
      {
        fn: 'The old life: the daily grind of the salaried job (boss, alarm clock, crowded bus, small paycheck) that makes the dream feel necessary',
        camera: 'medium shot following the protagonist through the routine, gentle lateral parallax',
      },
      {
        fn: 'The decision: the protagonist spends savings on used equipment or stock and turns part of the home into a workplace, family doubtful',
        camera: 'close-up on hands counting money, then wide shot of the transformed corner of the house',
      },
      {
        fn: 'First orders: a small win, the first customers arrive by phone and the protagonist delivers with pride',
        camera: 'over-the-shoulder on the work surface, then tracking shot along the street at dusk',
      },
      {
        fn: 'Growth and excitement: orders multiply, family helps, sleep shrinks, the hero product looks irresistible',
        camera: 'hyper-appetizing macro close-ups of the product alternating with a fast montage of full order bags',
      },
      {
        fn: 'Cracks appear: a harsh complaint, hidden costs, mistakes and a kitchen too small for the demand',
        camera: 'low angle on the pile of tasks and bills, slow push-in on the exhausted face',
      },
      {
        fn: 'Overload: more customers than the protagonist can serve, late deliveries and a confrontation with a worried family member',
        camera: 'tense two-shot across the table, cluttered wide shot with orders piling up',
      },
      {
        fn: 'The big bet: a large loan or investment to open a dedicated spot, the point of no return',
        camera: 'slow dolly toward a desk with documents under a single lamp, extreme close-up on a hesitating hand',
      },
      {
        fn: 'Peak tension: the night before the leap, success itself may destroy everything the protagonist built',
        camera: 'empty street or empty new storefront at night, slow pull-back showing how small the protagonist is',
      },
      {
        fn: 'Open ending and loop: a final question to the viewer, the invitation to comment the keyword, and a last line that connects to the opening line',
        camera: 'locked wide shot of the home kitchen matching the opening frame, light turning off',
      },
    ],
    rules: [
      'Narrate every take in second person, present tense ("Você acorda...", "Você conta o dinheiro...") with one calm confessional voice; the protagonist never speaks and keeps the mouth closed',
      'Every person is drawn as a flat grayscale ink figure (white and light gray skin and clothes, thick black outline, simple dot eyes, spiky black hair for the protagonist); all environments, food, objects and skies are richly painted in saturated warm color with weathered textures. Keep this contrast in every take',
      'Setting is ordinary Brazilian daily life: ceramic-tile kitchens, peeling green cabinets, old fridge, plastic chairs, narrow streets, motorbikes, small shops. Night scenes use warm tungsten light against deep blue windows',
      'Name a concrete amount in reais aloud in at least every second act (savings, loan, cost, revenue) and make it grow or hurt; amounts are only spoken, never written on screen',
      'Phones, bags, boxes and documents appear with no readable writing; show orders through phone glow and notification sounds',
      'Each act raises the stakes over the previous one and the final take stays unresolved on purpose; the last line asks the viewer a direct question and tells them to comment the chosen keyword',
      'The SEO caption must say this is a fictional dramatized story; the story gives no financial promises or guaranteed results',
      'Layered foley, no music: sizzle, knife on board, phone pings, scooter engines, fridge hum, distant street noise',
    ],
    look: 'hand-painted 2D illustrated drama, monochrome ink characters inside saturated painterly Brazilian interiors, limited animation with parallax, steam and warm light flicker',
    defaults: { takes: 40, seconds: 8, aspect: '16:9', model: 'Omni 1.1 Flash', quality: '360p', realismo: 'ilustrado2d' },
  },
  {
    id: 'historia-cartum-stickman',
    niche: 'História',
    subniche: 'Cartum 2D de bonecos (curto)',
    name: 'História curiosa em cartum 2D (9:16)',
    description:
      'Fato ou lenda da história contado em cartum de bonecos simples com reações exageradas e reviravolta, ex.: "O jarro que avisou um império".',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'tipo',
        label: 'Tipo de história',
        type: 'select',
        default: 'lenda',
        options: [
          { value: 'lenda', label: 'Lenda ou fato histórico absurdo' },
          { value: 'erro', label: 'Erro histórico que mudou tudo' },
          { value: 'ordem_ridicula', label: 'Ordem ou lei ridícula de um rei' },
          { value: 'invencao', label: 'Invenção acidental' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'surpresa', options: EMOTIONS },
    ],
    brief:
      'A 40 to 60 second narrated historical story in a simple cartoon style. Open with the absurd outcome or the strangest detail, explain how it happened in clear cause-and-effect steps, and end on an ironic twist.',
    beats: [
      { fn: 'Hook: state the strangest or most shocking outcome of the story in one line', camera: 'static wide shot of a throne room or battlefield, characters reacting' },
      { fn: 'Setup: who the characters are and what they wanted', camera: 'slow push-in on the main character at the center of the scene' },
      { fn: 'The problem: the decision or mistake that starts the chain of events', camera: 'close-up on the character and the object that causes the problem' },
      { fn: 'Escalation: the situation gets worse in an exaggerated, visual way', camera: 'wide shot with crowd of identical background characters reacting in sync' },
      { fn: 'Twist: the unexpected consequence', camera: 'quick zoom on the shocked face, then wide reveal' },
      { fn: 'Ironic closing line that echoes the hook', camera: 'locked wide shot, a single character looking at the camera' },
    ],
    rules: [
      'Characters are simple round-headed cartoon figures with thin limbs; keep the same face and outfit colors for each role in every take',
      'Backgrounds are detailed painted historical settings; crowds are rows of near-identical little soldiers or villagers',
      'Narration is short punchy sentences in third person, with dry humor; use real, well-known historical facts only and no real living people',
      'Sound: light cartoon foley (pops, thuds, cloth), crowd murmur, no music',
    ],
    look: 'flat 2D cartoon with simple characters on detailed historical backgrounds, expressive reactions',
    defaults: { takes: 7, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p', realismo: 'stickman2d' },
  },
  {
    id: 'historia-avatar-3d',
    niche: 'História',
    subniche: 'Avatar 3D estilo jogo (curto)',
    name: 'Como era na história com avatar 3D (9:16)',
    description:
      'Um avatar 3D de blocos viaja a uma época (Egito, Roma, Idade Média) e mostra como as coisas eram feitas, com humor leve e narração.',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'epoca',
        label: 'Época e cenário',
        type: 'select',
        default: 'egito',
        options: [
          { value: 'egito', label: 'Egito Antigo: construção das pirâmides' },
          { value: 'roma', label: 'Roma Antiga: arena e vida na cidade' },
          { value: 'medieval', label: 'Idade Média: castelo e vilarejo' },
          { value: 'vikings', label: 'Vikings: navegação e aldeia' },
          { value: 'brasil_colonia', label: 'Brasil colonial: engenho e vila' },
        ],
      },
      { id: 'tema_hist', label: 'Pergunta a responder (opcional)', type: 'text', default: '', placeholder: 'Ex.: Como as pirâmides foram construídas?' },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'curiosidade', options: EMOTIONS },
    ],
    brief:
      'A 40 to 60 second narrated history explainer: a blocky 3D game-style avatar guide travels to the chosen era and discovers how a famous thing was really done, step by step, with light humor.',
    beats: [
      { fn: 'Hook: pose the surprising question and show the avatar arriving in the era', camera: 'wide shot of the avatar standing in the landscape, slow push-in' },
      { fn: 'First step: the workers or locals start the task in a practical, concrete way', camera: 'medium tracking shot following the workers' },
      { fn: 'The clever trick: reveal the technique or tool that explains the mystery', camera: 'close-up on the tool or mechanism in action' },
      { fn: 'The scale: show how many people and how much time it takes', camera: 'high wide shot revealing the large crowd and the structure' },
      { fn: 'Surprising detail that most people get wrong', camera: 'close-up on the avatar reacting, then cut to the detail' },
      { fn: 'Closing line that answers the question and teases another', camera: 'slow pull-back with the avatar waving at the camera' },
    ],
    rules: [
      'One recurring blocky avatar (bright yellow outfit and cap) appears in every take; era characters share the same blocky style',
      'Each take shows one concrete action (hauling, pouring, building) tied to the narration line',
      'Narration is lively and simple, in second person when it fits; keep facts accurate and avoid invented precise numbers',
      'Sound: wind, sand or crowd ambience, tools, ropes, footsteps; no music',
    ],
    look: 'stylized 3D game-avatar look, bright sunny colors, clean polished render',
    defaults: { takes: 7, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p', realismo: 'avatar3d' },
  },
  {
    id: 'explicador-3d-brinquedo',
    niche: 'Curiosidades',
    subniche: 'Explicador 3D de maquete (curto)',
    name: 'Explicador 3D de maquete (9:16)',
    description:
      'Conceito de ciência ou escala explicado em cenas de maquete 3D de brinquedo (ex.: congelar, comparar tamanhos, como algo funciona), com narração simples.',
    mode: 'narracao',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'assunto',
        label: 'Tipo de explicação',
        type: 'select',
        default: 'ciencia',
        options: [
          { value: 'ciencia', label: 'Fenômeno de ciência do dia a dia (congelar, ferver, evaporar)' },
          { value: 'escala', label: 'Comparação de tamanhos e escalas (prédios, pontes, planetas)' },
          { value: 'funcionamento', label: 'Como algo funciona por dentro (ponte, represa, motor)' },
          { value: 'o_que_aconteceria', label: 'O que aconteceria se...' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'curiosidade', options: EMOTIONS },
    ],
    brief:
      'A 40 to 60 second narrated explainer made of clean toy-like 3D miniature scenes. Start with a surprising question, show one visual demonstration per take with simple cause and effect, and end with a memorable takeaway.',
    beats: [
      { fn: 'Hook: a surprising question or comparison shown as a clear visual setup', camera: 'static medium shot of the miniature scene, centered' },
      { fn: 'Demonstration one: the first change happens, slow and readable', camera: 'smooth push-in on the object changing' },
      { fn: 'Demonstration two: raise the scale or intensity', camera: 'smooth rise upward showing a bigger scene' },
      { fn: 'The surprising result that breaks expectation', camera: 'quick orbit around the result' },
      { fn: 'Why it happens in one simple sentence, shown with a cutaway', camera: 'cutaway close-up showing the inside of the object' },
      { fn: 'Takeaway line that lingers, last scene mirrors the first', camera: 'locked frame matching take 1' },
    ],
    rules: [
      'No text, numbers or diagrams drawn in the image; labels are only spoken in narration',
      'Keep one consistent miniature world and color palette across takes; objects are simple glossy toy shapes',
      'Each take shows one clear change in the scene, easy to follow without sound',
      'Sound: soft clicks, pops, water, wind and whoosh effects; no music',
    ],
    look: 'clean 3D toy diorama, soft studio lighting, glossy simple shapes, bright colors',
    defaults: { takes: 7, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p', realismo: 'brinquedo3d' },
  },
  {
    id: 'receita-viral',
    niche: 'Culinária',
    subniche: 'Receita viral (voz ou sem voz)',
    name: 'Receita viral (9:16)',
    description:
      'Receita em mãos e comida hiper-apetitosa, do ingrediente ao prato pronto, com opção de ASMR sem voz ou narração curta. Ótimo para atrair público para PDF de receitas.',
    mode: 'narracao',
    length: 'curto',
    trend: 'atemporal',
    fields: [
      {
        id: 'voz',
        label: 'Narração',
        type: 'select',
        default: 'sem_voz',
        options: [
          { value: 'sem_voz', label: 'Sem voz (ASMR, só sons da cozinha)' },
          { value: 'com_voz', label: 'Com voz (narração curta por take)' },
        ],
      },
      { id: 'prato', label: 'Prato', type: 'text', default: '', placeholder: 'Ex.: pão de queijo recheado de requeijão' },
      {
        id: 'tipo',
        label: 'Tipo de receita',
        type: 'select',
        default: 'tres_ingredientes',
        options: [
          { value: 'tres_ingredientes', label: 'Com 3 ingredientes' },
          { value: 'airfryer', label: 'Na airfryer' },
          { value: 'marmita_fit', label: 'Marmita fit' },
          { value: 'doce_natal', label: 'Doce de Natal' },
          { value: 'sobremesa_pote', label: 'Sobremesa de pote' },
          { value: 'lanche', label: 'Lanche estilo lanchonete' },
        ],
      },
      { id: 'cta', label: 'Palavra do CTA (para o PDF)', type: 'text', default: 'RECEITA', placeholder: 'Ex.: RECEITA' },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'alegria', options: EMOTIONS },
    ],
    brief:
      'A 40 to 55 second viral recipe video in a warm home kitchen, shot mostly on hands and food. Show the finished dish as a hook, then ingredients, the key preparation step, one satisfying transformation (cheese pull, cut, syrup pour, crunch) and a final close-up. The voice option is given in the Narração field.',
    beats: [
      { fn: 'Hook: the finished dish in a tempting close-up, steam or a first bite or cut', camera: 'macro close-up of the dish with a slow push-in' },
      { fn: 'Ingredients laid out simply on the counter, only what the recipe needs', camera: 'top-down shot of the counter, hands placing ingredients' },
      { fn: 'Key preparation step: mixing, shaping or assembling, easy to follow', camera: 'over-the-hands medium close-up' },
      { fn: 'Cooking step: oven, airfryer, pan or fridge; an adult hand firmly grasps the handle to slide the basket open/closed; food sizzles and changes texture', camera: 'medium close-up on appliance with hand action, followed by macro close-up on the sizzling food' },
      { fn: 'The satisfying transformation: cheese pull, cut, syrup pour or crunch', camera: 'slow-motion macro on the transformation' },
      { fn: 'Final plated dish with a call to action; last frame echoes the hook', camera: 'locked close-up of the plated dish, soft rack focus' },
    ],
    rules: [
      'Only hands and food appear, never a face; the kitchen is the same in every take',
      'Zero telekinesis: appliances, airfryer baskets, oven doors and lids NEVER open or slide by themselves; every movement requires a visible human hand firmly grasping the handle',
      'Consistent hand orientation: hands must naturally enter from the lower foreground/bottom; never swap sides from right to left or show arms crossing unnaturally',
      'Anatomical integrity: hands have realistic adult anatomy, exactly 5 fingers connected to arms; no severed floating fingers, phantom hands or backward-bending joints',
      'Appliance continuity: the airfryer or oven must keep identical matte finish, model and shape across takes; strictly no morphing into different designs, no spontaneous glass windows, and zero digital screen numbers, LED timers or HUD text',
      'Strict physical stability: static ingredients, bowls, pans and countertop props stay completely stationary; no sliding objects, no morphing food',
      'No random extra hands or people: at most two hands performing the action in frame',
      'If Narração is sem_voz: zero speech and zero music, only crisp close-mic kitchen foley (sizzle, chop, crunch, pour, bubbling)',
      'If Narração is com_voz: one short, warm spoken line per take, simple and appetizing, ending with the CTA word spoken in the last take; soft kitchen sounds underneath, no music',
      'No text, numbers, quantities or logos drawn in the image; the recipe details go in the caption added later',
      'Food must look hyper-appetizing: glossy, steaming, natural warm light, realistic textures',
    ],
    look: 'warm home kitchen food cinematography, soft window light, shallow depth of field, rich appetizing colors',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p', realismo: 'hiper' },
  },
  {
    id: 'receita-chromakey-expert',
    niche: 'Culinária',
    subniche: 'Receita com Narrador (Chroma Key & B-Roll)',
    name: 'Receita com Narrador (Chroma Key)',
    description:
      'Criativo híbrido de alta conversão: o Expert (Chef ou Nutricionista) é gerado do torso para cima falando sobre fundo verde sólido (#00FF00), recortado nativamente no FFmpeg e sobreposto em Picture-in-Picture sobre fatias dinâmicas de B-Roll culinário.',
    mode: 'dialogo',
    length: 'curto',
    trend: 'viral',
    fields: [
      {
        id: 'perfil_expert',
        label: 'Perfil do Expert',
        type: 'select',
        default: 'chef_mulher',
        options: [
          { value: 'chef_mulher', label: 'Chef de cozinha mulher (dolmã branca, calorosa)' },
          { value: 'nutri_mulher', label: 'Nutricionista mulher (estilo clínico acolhedor)' },
          { value: 'chef_homem', label: 'Chef de cozinha homem (avental escuro profissional)' },
          { value: 'nutri_homem', label: 'Nutricionista homem (estilo moderno e didático)' },
        ],
      },
      { id: 'prato', label: 'Prato ou Oferta', type: 'text', default: '365 Receitas Sem Açúcar e Sem Glúten', placeholder: 'Ex.: 365 Receitas Saudáveis' },
      {
        id: 'posicao_overlay',
        label: 'Posição do Narrador',
        type: 'select',
        default: 'canto_inferior_direito',
        options: [
          { value: 'canto_inferior_direito', label: 'Canto inferior direito (PiP fluído)' },
          { value: 'canto_inferior_esquerdo', label: 'Canto inferior esquerdo' },
        ],
      },
      { id: 'cta', label: 'Palavra do CTA', type: 'text', default: 'RECEITA', placeholder: 'Ex.: RECEITA' },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'alegria', options: EMOTIONS },
    ],
    brief:
      'A 32-second high-converting direct-response creative combining a talking head expert (Chef/Nutritionist) shot from the chest up against a pure flat solid green screen studio background (#00FF00), seamlessly composited over fast-paced multi-shot cooking and meal-prep b-roll in post-production via FFmpeg chromakey.',
    beats: [
      {
        fn: 'Hook in first 1.5s: Expert addresses the camera against flat green studio background (#00FF00), breaking the diet struggle myth with expressive hand gestures',
        camera: 'medium close-up torso shot, centered, eye-level, flat pure green background #00FF00, sharp edges, no shadows',
      },
      {
        fn: 'B-roll showcase: Rapid 3-slice dynamic demonstration of appetizing, practical food prep (slicing, airfryer, pot layer)',
        camera: 'macro close-up over-the-counter action, glossy sizzling textures, rich lighting',
      },
      {
        fn: 'Proof & Offer bridge: Expert reappears on pure green background (#00FF00), holding digital tablet and presenting the 365 recipes catalog with warmth',
        camera: 'medium close-up torso shot, centered, eye-level, flat pure green background #00FF00, studio key lighting',
      },
      {
        fn: 'CTA payoff: Final plated dish and meal prep fridge with bold conversion call-to-action to claim access',
        camera: 'locked macro close-up of delicious plated meal with subtle rack focus to CTA card',
      },
    ],
    rules: [
      'Takes 1 and 3 (Expert): strictly torso/chest up, facing camera directly, solid uniform green background #00FF00 with zero gradients or cast shadows for clean alpha keying',
      'Takes 2 and 4 (B-Roll): 100% faceless hands and food only, rapid visual cuts between ingredients and finished plates',
      'Expert delivery is warm, empathetic and authoritative, addressing viewer pain points without small talk',
      'All lip-sync lines must match Brazilian Portuguese naturally and concisely',
      'Zero text or logos rendered inside video pixels; kinetic typography is burned in post-assembly',
    ],
    look: 'commercial direct-response lighting, studio key light with clean green-screen back, crisp appetizing colors for b-roll',
    defaults: { takes: 4, seconds: 8, aspect: '9:16', model: 'Omni 1.2 Flash', quality: '720p', realismo: 'hiper' },
  },
]
