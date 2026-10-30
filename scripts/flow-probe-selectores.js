// Cole no Console (F12) da aba do Flow, com um projeto aberto. Copia um resumo da estrutura da pagina
// para a area de transferencia. Nao le cookies, tokens nem URLs; so tags, classes e textos curtos.
console.log('Coletando em 6 segundos: abra agora o painel/estado que quer registrar...');
setTimeout(() => {
  const cut = (s, n = 50) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const cls = (e) => cut(typeof e.className === 'string' ? e.className : '', 90);
  const describe = (e) => ({
    tag: e.tagName.toLowerCase(), cls: cls(e), id: e.id || undefined,
    role: e.getAttribute('role') || undefined, aria: cut(e.getAttribute('aria-label'), 40) || undefined,
    type: e.getAttribute('type') || undefined, text: cut(e.textContent, 40) || undefined,
    icon: cut(e.querySelector('mat-icon, .material-icons, [class*=icon]')?.textContent, 25) || undefined,
  });
  const pick = (sel, max = 40) => [...document.querySelectorAll(sel)].slice(0, max).map(describe);
  const customTags = [...new Set([...document.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()).filter((t) => t.includes('-')))].sort();
  const out = {
    pagina: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id'),
    customTags,
    iframes: [...document.querySelectorAll('iframe')].map((f) => {
      let origem = '?'; try { origem = new URL(f.src, location.href).origin; } catch (e) {}
      return { origem, sandbox: f.getAttribute('sandbox') || undefined, acessivel: !!(() => { try { return f.contentDocument; } catch (e) { return null; } })() };
    }),
    editores: pick('[contenteditable], textarea, div.ProseMirror'),
    botoes: pick('button', 80),
    inputs: pick('input', 20),
    menus: pick('[role=menu], [role=listbox], [role=menuitem], [role=option], [role=tab]', 40),
    midia: {
      imgComDataMediaId: document.querySelectorAll('img[data-media-id]').length,
      videos: document.querySelectorAll('video').length,
      tilesPendentes: document.querySelectorAll('[class*=pending], flow-pending-tile').length,
    },
  };
  const json = JSON.stringify(out, null, 1);
  copy(json);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'flow-probe-' + Date.now() + '.json';
  a.click();
  console.log('Copiado e baixado (' + json.length + ' caracteres) como ' + a.download);
}, 6000);
