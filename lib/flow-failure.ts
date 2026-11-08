// Classifica a falha que o Flow mostra no tile ("Failed ..." / "Falha ..."). O Flow muda o idioma da tela conforme a
// conta (hoje em portugues), entao os textos de recusa por politica e de falha passageira existem nos dois idiomas.
// Usado pelo servidor ao receber a falha; a extensao tem a mesma regra em failCode (extension/content/flow.js).

/** Recusa por politica ("might violate our policies" / "talvez viole nossas politicas"). */
export const POLICY_RX = /polic|violat|prominent|people|famous|celebrit|polític|\bviol(e|am|ar|ação)\b|menores|crian[çc]|pessoas (conhecidas|proeminentes)|figuras? públicas?|celebridade/i

/** Sinal anti-abuso do Google ("Notamos uma atividade incomum"): sem cobranca; esperar e repetir, sem suavizar o prompt. */
export const UNUSUAL_RX = /atividade incomum|unusual activity|unusual traffic|tr[áa]fego incomum/i

/** Falha passageira do Flow: tentar o mesmo take de novo costuma funcionar. */
export const TRANSIENT_RX =
  /failed to generate|something went wrong|try again|unable to (generate|edit)|couldn.t generate|try a different prompt|falha ao gerar|algo deu errado|tente novamente|n[ãa]o foi poss[ií]vel (gerar|editar)|tente usar outro comando/i

/** Motivo da recusa por politica, quando o Flow diz qual foi (usado para ajustar o prompt na nova tentativa). */
export function policyReason(msg: string): 'minors' | 'famous' | 'unknown' {
  if (/minor|child|menor|crian[çc]/i.test(msg)) return 'minors'
  if (/prominent|famous|celebrit|public figure|real person|pessoas (conhecidas|proeminentes)|famos|figuras? públicas?|celebridade/i.test(msg)) return 'famous'
  return 'unknown'
}

/**
 * Codigo final da falha: 'policy' (recusa por politica), 'gen_failed' (falha passageira) ou o que a extensao mandou.
 * A recusa por politica vem primeiro: a mensagem dela tambem pede "tente usar outro comando".
 */
export function classifyFlowFailure(code: string, msg: string): string {
  if (code !== 'failed' && code !== '' && code !== 'gen_failed' && code !== 'policy') return code
  if (UNUSUAL_RX.test(msg)) return 'unusual'
  if (code !== 'failed' && code !== '') return code
  if (POLICY_RX.test(msg)) return 'policy'
  if (TRANSIENT_RX.test(msg)) return 'gen_failed'
  return code
}
