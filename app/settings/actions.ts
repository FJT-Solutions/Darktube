"use server"

import { getCurrentUser } from "@/lib/auth-helpers"
import { createMcpToken, listMcpTokens, revokeMcpToken } from "@/lib/mcp/tokens"

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autenticado.")
  return user
}

const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : "Erro inesperado." })

export async function listMcpTokensAction() {
  try {
    const user = await requireUser()
    return { success: true as const, tokens: await listMcpTokens(user.id) }
  } catch (err) {
    return fail(err)
  }
}

export async function createMcpTokenAction(name: string) {
  try {
    const user = await requireUser()
    const { token, row } = await createMcpToken(user.id, String(name || ""))
    return { success: true as const, token, row }
  } catch (err) {
    return fail(err)
  }
}

export async function revokeMcpTokenAction(id: string) {
  try {
    const user = await requireUser()
    return { success: await revokeMcpToken(user.id, String(id)) }
  } catch (err) {
    return fail(err)
  }
}
