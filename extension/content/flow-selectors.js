// Todos os pontos de contato com a pagina do Google Flow ficam aqui.
// Quando o Google mudar o layout, so este arquivo precisa de ajuste.
// Origem: leitura de ferramentas abertas (gflow-cli, MIT) e do relatorio da pagina (flow-probe).
window.DT_FLOW_SEL = {
  editor: 'div.ProseMirror',
  agentToggle: 'flow-agent-mode-toggle-chip button',
  generate: 'flow-generate-icon-button button[type=submit], button.generate-icon-button',
  settingsBtn: 'button.settings-trigger-button, .settings-trigger-button, button[aria-label*="setting" i], button[aria-label*="configura" i]',
  settingsPanel: 'flow-prompt-box-settings',
  modelBtn: 'button.mat-mdc-menu-trigger',
  imageTile: 'flow-image-tile',
  imageTileImg: 'flow-image-tile img[data-media-id]',
  videoTile: 'flow-video-tile',
  pendingTile: 'flow-pending-tile',
  overlay: '.cdk-overlay-backdrop-showing',
  menuItem: '[role=menuitem]',
  radio: '[role=radio]',
  radioGroup: '[role=radiogroup]',
  alerts: '[role=alert], .mat-mdc-snack-bar-container, mat-dialog-container, [role=dialog]',
};

window.DT_FLOW_RX = {
  // Textos que indicam geracao com erro em um bloco de resultado.
  failure: /error|erro|fail|falha|falló|unusual|inusual|incomum|não foi possível|policy|política|violat/i,
  // Pedido de verificacao da conta: para tudo e avisa o usuario.
  verification: /unusual activity|atividade incomum|verify it|verifique|captcha|confirm you|confirme que/i,
  // Excesso de pedidos: pausa para esfriar.
  rateLimit: /too fast|muito rápid|rate limit|limite de taxa|try again later|tente novamente mais tarde|requesting too/i,
};
