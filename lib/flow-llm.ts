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
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-5-5',
  openrouter: 'google/gemini-2.5-flash',
}

/** Tira trechos que parecam chave de API das mensagens de erro dos provedores. */
function scrub(message: string): string {
  return String(message || '')
    .replace(/\b(sk|AIza|key)[-_A-Za-z0-9*.]{6,}/gi, '[chave oculta]')
    .slice(0, 300)
}

export interface FlowVisionImage {
  /** Base64 sem prefixo data:. */
  dataBase64: string
  mimeType?: string
  /** Rotulo opcional enviado antes da imagem (ex: "Frame 1 (0.0s)"). */
  label?: string
}

async function chatCompletions(
  url: string,
  key: string,
  model: string,
  system: string,
  userContent: string | Array<Record<string, any>>,
  label: string,
  maxTokens?: number
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Erro ${label}: ${scrub(data?.error?.message || res.statusText)}`)
  return String(data?.choices?.[0]?.message?.content || '')
}

async function callClaude(key: string, system: string, content: string | Array<Record<string, any>>) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELS.claude,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Erro Claude: ${scrub(data?.error?.message || res.statusText)}`)
  return String(data?.content?.[0]?.text || '')
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
  return callClaude(key, system, `${user}\nResponda SOMENTE com o JSON, sem markdown.`)
}

/**
 * Chamada multimodal (Visao + OCR frame a frame) usando a credencial do proprio usuario
 * (Gemini Vision, GPT-4o-mini / OpenAI, Claude ou OpenRouter).
 */
export async function callFlowVisionLLM(
  provider: FlowProvider,
  key: string,
  system: string,
  user: string,
  images: FlowVisionImage[]
): Promise<string> {
  if (!key) throw new Error(`Nenhuma chave ${PROVIDER_LABEL[provider]} salva em Credenciais.`)
  const list = images.slice(0, 20)
  if (!list.length) return callFlowLLM(provider, key, system, user)

  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const model = new GoogleGenerativeAI(key).getGenerativeModel({
      model: MODELS.gemini,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    })
    const parts: any[] = [system, user]
    for (const img of list) {
      if (img.label) parts.push(img.label)
      parts.push({ inlineData: { data: img.dataBase64, mimeType: img.mimeType || 'image/jpeg' } })
    }
    try {
      const result = await model.generateContent(parts)
      return result.response.text()
    } catch (err: any) {
      throw new Error(`Erro Gemini Vision: ${scrub(err?.message || 'falha na chamada')}`)
    }
  }

  if (provider === 'openai' || provider === 'openrouter') {
    const content: Array<Record<string, any>> = [{ type: 'text', text: user }]
    for (const img of list) {
      if (img.label) content.push({ type: 'text', text: img.label })
      content.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType || 'image/jpeg'};base64,${img.dataBase64}`, detail: 'auto' },
      })
    }
    const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions'
    return chatCompletions(url, key, MODELS[provider], system, content, PROVIDER_LABEL[provider], 8192)
  }

  const claudeContent: Array<Record<string, any>> = []
  for (const img of list) {
    if (img.label) claudeContent.push({ type: 'text', text: img.label })
    claudeContent.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.dataBase64 },
    })
  }
  claudeContent.push({ type: 'text', text: `${user}\nResponda SOMENTE com o JSON valido, sem markdown.` })
  return callClaude(key, system, claudeContent)
}
