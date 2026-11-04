# Proposta de Arquitetura: DarkTube Desktop Companion (.exe)

## 1. Visão Geral
O **DarkTube Desktop Companion** é uma evolução do agente local para um aplicativo de bandeja do Windows (System Tray). Ele empacota o motor autônomo baseado no `flow-mcp` (`scripts/flow-runner.ts`) com Playwright + Chrome DevTools Protocol (CDP), eliminando totalmente a dependência de extensões de navegador e de abas do Google Flow abertas pelo usuário.

## 2. Experiência do Usuário (UX)
1. **Instalação:** Download de instalador leve (`DarkTube-Companion.exe`) de 1 clique (construído com Tauri ou Electron).
2. **Login Único:** Na primeira abertura, uma janela do Chrome dedicada abre em `~/.darktube/flow-chrome-profile` solicitando login na conta Google do usuário.
3. **Bandeja Silenciosa:** O app se esconde no System Tray (perto do relógio do Windows) com consumo mínimo de RAM.
4. **Geração Invisível:**
   - O usuário cria projetos pelo site do DarkTube (`darktube.fjt-solutions.com` ou local).
   - Quando clica em "Gerar Takes", o Companion detecta os jobs na fila.
   - Dispara a automação local via CDP na porta 9333 em segundo plano.
   - Faz o download automático dos clipes e devolve para o servidor DarkTube.
   - O usuário não precisa abrir terminal, não precisa de extensão e não precisa abrir o Flow.

## 3. Vantagens Técnicas
- **Zero Extensão:** Não sofre com restrições do Manifest V3, desativações ou atualizações da Chrome Web Store.
- **IP Residencial Legítimo:** Como roda no PC do usuário, o Google nunca detecta IP de datacenter.
- **Sem Suspensão de Abas:** Navegadores comuns costumam suspender abas em segundo plano para poupar memória; uma instância dedicada com `--disable-background-timer-throttling` roda sem interrupções.
- **Continuidade de Frames Automatizada:** Usa o FFmpeg local para extração do último frame (`refPrevFrameUrl`), garantindo consistência cena a cena.
