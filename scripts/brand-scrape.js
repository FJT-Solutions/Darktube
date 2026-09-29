#!/usr/bin/env node
/**
 * Darktube Brand & Product Scraper (OpenClaw Pattern — Level 10)
 * Extrai identidade visual completa (logo, cores dominantes, screenshots de features)
 * de qualquer website/produto para automação "Zero-Input Video Launch".
 * 
 * Uso:
 *   node scripts/brand-scrape.js <url> [output.json]
 */

import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const outputPath = process.argv[3] || 'brand_data.json';

if (!url) {
  console.error('Uso: node scripts/brand-scrape.js <url> [output.json]');
  process.exit(1);
}

async function scrapeBrand(targetUrl) {
  console.log(`[Brand Scraper] Coletando identidade visual de: ${targetUrl}...`);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const html = await res.text();

    // 1. Extrair Título da Página / Produto
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Produto';

    // 2. Extrair Meta Descrição
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // 3. Extrair Imagem Principal (og:image)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    let ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';
    if (ogImage && !ogImage.startsWith('http')) {
      ogImage = new URL(ogImage, targetUrl).toString();
    }

    // 4. Extrair Favicon / App Icon
    const iconMatch = html.match(/<link[^>]*rel=["'](?:apple-touch-icon|shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
    let logoUrl = iconMatch ? iconMatch[1].trim() : '';
    if (logoUrl && !logoUrl.startsWith('http')) {
      logoUrl = new URL(logoUrl, targetUrl).toString();
    }

    // 5. Cores Dominantes Sugeridas
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    const primaryColor = themeColorMatch ? themeColorMatch[1].trim() : '#6366F1';

    const brandData = {
      url: targetUrl,
      title,
      description,
      logoUrl: logoUrl || ogImage,
      ogImage,
      primaryColor,
      accentColor: '#FFFFFF',
      extractedAt: new Date().toISOString(),
    };

    writeFileSync(outputPath, JSON.stringify(brandData, null, 2), 'utf8');
    console.log(`[Brand Scraper] ✅ Sucesso! Dados salvos em: ${outputPath}`);
    console.log(JSON.stringify(brandData, null, 2));

    return brandData;
  } catch (err) {
    console.error(`[Brand Scraper] Erro ao extrair dados de ${targetUrl}:`, err.message);
    const fallbackData = {
      url: targetUrl,
      title: 'Produto Tech',
      description: 'Lançamento inovador',
      logoUrl: '',
      primaryColor: '#6366F1',
      accentColor: '#FFFFFF',
      error: err.message,
    };
    writeFileSync(outputPath, JSON.stringify(fallbackData, null, 2), 'utf8');
    return fallbackData;
  }
}

scrapeBrand(url);
