// instrumentation.ts
import type { Instrumentation } from 'next'
import { logger } from '@/lib/logger'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logger.info('🚀 DarkTube backend inicializado com sucesso', { context: 'System' })

    // Suppress unhandled noisy socket aborts from browser video scrubbing/cancels
    process.on('uncaughtException', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.message === 'aborted' || err?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        // Client abruptly disconnected or cancelled media fetch: harmless in HTTP streaming
        logger.debug(`Conexão encerrada pelo cliente (${err?.code || 'aborted'})`, { context: 'Stream' })
        return
      }
      logger.error('Exceção não tratada capturada:', err)
    })
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const errorObj = err as any

  // Filter out client disconnects / stream aborts (e.g., audio/video playback seeks)
  if (errorObj?.code === 'ECONNRESET' || errorObj?.message?.includes('aborted') || errorObj?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    logger.debug(`Cliente abortou requisição em ${request.path}`, { context: 'Network' })
    return
  }

  // Filter out invalid Server Action references from bot fuzzers
  if (errorObj?.message?.includes('The Server Reference ID did not match')) {
    logger.debug(`Bot probe de Server Action bloqueado: ${request.path}`, { context: 'Security' })
    return
  }

  logger.error(`Erro na requisição ${request.method} ${request.path} [${context.routerKind}]:`, err)
}
