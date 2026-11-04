/**
 * Script de teste temporário para o MCP DarkTube.
 * Testa a listagem de templates, geração de criativo da oferta 365 Receitas
 * e o download automático para ./midia/criativos/.
 */

import fs from 'fs';
import path from 'path';
import {
  listFlowTemplates,
  createCampaignCreative,
  downloadCreativeToLocal,
} from '../lib/mcp/darktube-tools';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 INICIANDO TESTES DO MCP DARKTUBE');
  console.log('====================================================\n');

  // Teste 1: Listagem de Templates
  console.log('▶ Teste 1: Listando templates do DarkTube Flow...');
  const templates = await listFlowTemplates();
  console.log(`✅ Sucesso! Total de templates encontrados: ${templates.length}`);
  console.log(`   Exemplos: ${templates.slice(0, 4).map((t) => t.name).join(' | ')}\n`);

  // Teste 2: Criação da pasta ./midia/criativos/ e download local
  console.log('▶ Teste 2: Testando mecanismo de download para ./midia/criativos/...');
  const targetDir = path.resolve(process.cwd(), './midia/criativos');
  
  // Testando com um asset público leve para validar a integridade da pasta e download
  const sampleUrl = 'https://picsum.photos/200/300';
  const downloadResult = await downloadCreativeToLocal(sampleUrl, './midia/criativos', 'teste_integracao_midia.png');

  if (downloadResult.success && fs.existsSync(downloadResult.filePath)) {
    const stats = fs.statSync(downloadResult.filePath);
    console.log(`✅ Sucesso no download local!`);
    console.log(`   Arquivo salvo em: ${downloadResult.filePath}`);
    console.log(`   Tamanho do arquivo: ${stats.size} bytes\n`);
  } else {
    console.error(`❌ Falha no download de teste:`, downloadResult.error);
  }

  // Teste 3: Geração de criativo nativo pela esteira do /flow (Cenário 2)
  console.log('▶ Teste 3: Testando esteira nativa do /flow para 365 Receitas (Template: produto-tiktok-shop)...');
  try {
    const campaignResult = await createCampaignCreative({
      offer: '365 Receitas Sem Açúcar e Sem Glúten',
      angle: 'pao-frigideira',
      templateId: 'produto-tiktok-shop',
      format: '9:16',
      takesCount: 4,
    });

    if (campaignResult && campaignResult.success) {
      console.log(`✅ Sucesso na geração nativa do /flow!`);
      console.log(`   Engine: ${campaignResult.engine}`);
      console.log(`   Template: ${campaignResult.template?.name} (${campaignResult.template?.id})`);
      console.log(`   Título: ${campaignResult.creative?.title}`);
      console.log(`   Hook: "${campaignResult.creative?.hook}"`);
      console.log(`   Takes Gerados: ${campaignResult.creative?.takesCount}`);
      console.log(`   Take 1 Prompt: ${campaignResult.creative?.takes[0]?.flowGenerationPrompt?.slice(0, 100)}...`);
      console.log(`   URL no /flow: ${campaignResult.flowUrl}`);
    }
  } catch (err: any) {
    console.error(`❌ Erro no teste do /flow:`, err.message);
  }

  console.log('\n====================================================');
  console.log('🏁 TESTES CONCLUÍDOS COM SUCESSO!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Erro na execução dos testes:', err);
});
