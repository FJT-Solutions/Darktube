// Chamada de IA de texto para a aba Flow, com a chave do proprio usuario.
// A chave nunca e registrada nem devolvida; os erros trazem so a mensagem do provedor.

export type FlowProvider = 'gemini' | 'openai' | 'claude' | 'openrouter'
export const FLOW_PROVIDERS: FlowProvider[] = ['gemini', 'openai', 'claude', 'openrouter']

export const PROVIDER_LABEL: Record<FlowProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  openrouter: 'OpenRouter',
}

const MODELS: Record<FlowProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-sonnet-5-5',
  openrouter: 'google/gemini-2.5-flash',
}

/** Tira trechos que parecam chave de API das mensagens de erro dos provedores. */
function scrub(message: string): string {
  return String(message || '')
    .replace(/\b(sk|AIza|key)[-_A-Za-z0-9*.]{6,}/gi, '[chave oculta]')
    .slice(0, 300)
}

async function chatCompletions(url: string, key: string, model: string, system: string, user: string, label: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Erro ${label}: ${scrub(data?.error?.message || res.statusText)}`)
  return String(data?.choices?.[0]?.message?.content || '')
}

export async function callFlowLLM(provider: FlowProvider, key: string, system: string, user: string): Promise<string> {
  if (!key) throw new Error(`Nenhuma chave ${PROVIDER_LABEL[provider]} salva em Credenciais.`)
  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const model = new GoogleGenerativeAI(key).getGenerativeModel({
      model: MODELS.gemini,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
    })
    try {
      const result = await model.generateContent([system, user])
      return result.response.text()
    } catch (err: any) {
      throw new Error(`Erro Gemini: ${scrub(err?.message || 'falha na chamada')}`)
    }
  }
  if (provider === 'openai') {
    return chatCompletions('https://api.openai.com/v1/chat/completions', key, MODELS.openai, system, user, 'OpenAI')
  }
  if (provider === 'openrouter') {
    return chatCompletions('https://openrouter.ai/api/v1/chat/completions', key, MODELS.openrouter, system, user, 'OpenRouter')
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELS.claude,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: `${user}\nResponda SOMENTE com o JSON, sem markdown.` }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Erro Claude: ${scrub(data?.error?.message || res.statusText)}`)
  return String(data?.content?.[0]?.text || '')
}
