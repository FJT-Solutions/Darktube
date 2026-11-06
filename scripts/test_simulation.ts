import { allowedSecondsForModel, clampSecondsForModel, resolveTakeModel } from '../lib/flow-template-base';
import { normalizeScript } from '../lib/flow-script';
import { getFlowTemplate } from '../lib/flow-templates';
import fs from 'fs';
import path from 'path';

console.log('===========================================================');
console.log('   DARK TUBE • TESTE SIMULADO DE ARQUITETURA E MODELOS     ');
console.log('===========================================================\n');

let failed = 0;

// 1. Validação de Durações Nativas por Família
console.log('--- 1. Validação de Durações Nativas ---');
const veoSeconds = allowedSecondsForModel('Veo 3.1 - Quality');
console.log('Veo 3.1 allowed seconds:', veoSeconds, '-> Esperado: [5, 8]');
if (veoSeconds.length === 2 && veoSeconds.includes(5) && veoSeconds.includes(8)) {
  console.log('  [PASS] Veo durations OK');
} else {
  console.error('  [FAIL] Veo durations incorretas');
  failed++;
}

const omniSeconds = allowedSecondsForModel('Omni 1.1 Flash');
console.log('Omni 1.1 allowed seconds:', omniSeconds, '-> Esperado: [4, 6, 8, 10]');
if (omniSeconds.length === 4 && omniSeconds.includes(4) && omniSeconds.includes(6) && omniSeconds.includes(8) && omniSeconds.includes(10)) {
  console.log('  [PASS] Omni durations OK');
} else {
  console.error('  [FAIL] Omni durations incorretas');
  failed++;
}

const clampedVeo = clampSecondsForModel(6, 'Veo 3.1 - Fast');
console.log('Clamp 6s para Veo:', clampedVeo, '-> Esperado: 5');
if (clampedVeo === 5) {
  console.log('  [PASS] Clamp Veo 6s -> 5s OK');
} else {
  console.error('  [FAIL] Clamp Veo incorreto');
  failed++;
}

// 2. Validação da Estratégia Híbrida de Modelos
console.log('\n--- 2. Validação da Estratégia Híbrida de Modelos ---');
const veoDialogue = resolveTakeModel('Veo 3.1 - Quality', true);
const veoBroll = resolveTakeModel('Veo 3.1 - Quality', false);
console.log('Veo Take Diálogo/Pessoa:', veoDialogue, '-> Esperado: Veo 3.1 - Quality');
console.log('Veo Take Objeto/B-Roll:', veoBroll, '-> Esperado: Veo 3.1 - Lite');

const omniDialogue = resolveTakeModel('Omni 1.1 Flash', true);
const omniBroll = resolveTakeModel('Omni 1.1 Flash', false);
console.log('Omni Take Diálogo/Pessoa:', omniDialogue, '-> Esperado: Omni 1.2 Flash');
console.log('Omni Take Objeto/B-Roll:', omniBroll, '-> Esperado: Omni 1.1 Flash');

if (veoDialogue === 'Veo 3.1 - Quality' && veoBroll === 'Veo 3.1 - Lite' && omniDialogue === 'Omni 1.2 Flash' && omniBroll === 'Omni 1.1 Flash') {
  console.log('  [PASS] Resolução inteligente de modelos híbridos OK');
} else {
  console.error('  [FAIL] Resolução de modelo híbrido incorreta');
  failed++;
}

// 3. Simulação de Roteiro Heterogêneo (Frontend / Templates / MCP)
console.log('\n--- 3. Simulação de Normalização de Roteiro ---');
const template = getFlowTemplate('produto-tiktok-shop')!;
const mockScript = {
  title: 'Anúncio Caderno Mágico Teste',
  logline: 'Oferta especial de caligrafia infantil',
  characters: [
    { id: 'c1', name: 'Juliana', description: 'adult woman in her thirties, dark hair, blue sweater', voice: 'warm friendly' }
  ],
  locations: [
    { id: 'l1', name: 'Mesa de Estudos', description: 'wooden desk with natural daylight' }
  ],
  takes: [
    {
      n: 1,
      seconds: 6, // Em Veo deve virar 5s
      speaker: 'c1',
      line: 'Veja como essa caneta mágica faz a letra do seu filho melhorar em dias!',
      characters: ['c1'],
      action: 'Juliana holds up magic notebook smiling to partner off camera.',
      sound: 'gentle room ambience'
    },
    {
      n: 2,
      seconds: 6, // Em Veo deve virar 5s
      speaker: '',
      line: '', // B-Roll sem pessoas
      characters: [],
      action: 'Macro close up of pen writing cursive strokes into grooved paper.',
      sound: 'crisp paper scratching sound'
    }
  ],
  seo: { title: 'Caderno Mágico', caption: 'Compre já', hook: 'Seu filho escreve feio?', hashtags: ['#caligrafia'] }
};

const normalized = normalizeScript(mockScript, template, { model: 'Veo 3.1 - Quality', seconds: 6 });
console.log('Take 1 (Diálogo): model =', normalized.takes[0].model, '| seconds =', normalized.takes[0].seconds);
console.log('Take 2 (B-Roll):  model =', normalized.takes[1].model, '| seconds =', normalized.takes[1].seconds);

if (normalized.takes[0].model === 'Veo 3.1 - Quality' && normalized.takes[0].seconds === 5 &&
    normalized.takes[1].model === 'Veo 3.1 - Lite' && normalized.takes[1].seconds === 5) {
  console.log('  [PASS] Roteiro normalizou duração para 5s e separou Quality no diálogo e Lite no B-roll');
} else {
  console.error('  [FAIL] Normalização do roteiro falhou');
  failed++;
}

// 4. Verificação das Fontes Virais Instaladas
console.log('\n--- 4. Verificação das Fontes Virais Instaladas ---');
const fontsDir = path.resolve(process.cwd(), 'public', 'fonts');
const fontFiles = ['Montserrat-Bold.ttf', 'Montserrat-ExtraBold.ttf', 'theboldfont.ttf'];
for (const font of fontFiles) {
  const p = path.join(fontsDir, font);
  if (fs.existsSync(p)) {
    const sz = (fs.statSync(p).size / 1024).toFixed(1);
    console.log(`  [PASS] Fonte ${font} presente (${sz} KB)`);
  } else {
    console.error(`  [FAIL] Fonte ${font} NÃO encontrada`);
    failed++;
  }
}

console.log('\n===========================================================');
if (failed === 0) {
  console.log('   RESULTADO: TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ');
} else {
  console.log(`   RESULTADO: ${failed} TESTES FALHARAM.                  `);
}
console.log('===========================================================');
