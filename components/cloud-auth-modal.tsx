"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Globe, 
  CornerDownLeft, 
  Delete, 
  ArrowRight,
  Cookie,
  Monitor,
  MousePointer,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface CloudAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  platformName: string;
  onSuccess: () => void;
}

export function CloudAuthModal({
  open,
  onOpenChange,
  platform,
  platformName,
  onSuccess,
}: CloudAuthModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [url, setUrl] = useState<string>("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [quickText, setQuickText] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Ripple visual do clique
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);

  // Modo alternativo de cookies
  const [manualCookiesMode, setManualCookiesMode] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [savingCookies, setSavingCookies] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Inicia o navegador remoto assim que o modal abre
  const startRemoteBrowser = useCallback(async () => {
    setStatus("starting");
    setScreenshot(null);
    setUrl("");

    try {
      const res = await fetch("/api/social/cloud-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", platform }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionId(data.session.sessionId);
        setStatus(data.session.status);
      } else {
        setStatus("error");
        toast.error(data.error || "Não foi possível abrir o navegador remoto.");
      }
    } catch (err: any) {
      setStatus("error");
      toast.error(`Erro: ${err.message}`);
    }
  }, [platform]);

  useEffect(() => {
    if (open) {
      setManualCookiesMode(false);
      startRemoteBrowser();
    } else {
      if (sessionId) {
        fetch("/api/social/cloud-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel", sessionId }),
        }).catch(() => {});
      }
      if (pollRef.current) clearInterval(pollRef.current);
      setSessionId(null);
      setStatus("idle");
      setScreenshot(null);
      setUrl("");
      setQuickText("");
      setClickRipple(null);
    }
  }, [open, startRemoteBrowser]);

  // Polling contínuo de frames e status do navegador
  useEffect(() => {
    if (!sessionId) return;
    if (["success", "error", "cancelled"].includes(status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/social/cloud-auth?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.session) {
          const s = data.session;
          setStatus(s.status);
          if (s.url) setUrl(s.url);
          if (s.screenshot) setScreenshot(s.screenshot);

          if (s.status === "success") {
            toast.success(`🎉 ${platformName} conectado com sucesso!`);
            onSuccess();
            setTimeout(() => {
              onOpenChange(false);
            }, 1800);
          }
        }
      } catch (_) {}
    }, 900);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, status, platformName, onSuccess, onOpenChange]);

  // Envia ação de interação para o navegador
  const sendInteraction = async (payload: {
    type: "click" | "type" | "press" | "scroll" | "reload";
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    deltaY?: number;
  }) => {
    if (!sessionId) return;

    try {
      const res = await fetch("/api/social/cloud-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interact",
          sessionId,
          ...payload,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        if (data.session.screenshot) setScreenshot(data.session.screenshot);
        if (data.session.url) setUrl(data.session.url);
        if (data.session.status === "success") {
          setStatus("success");
          toast.success(`🎉 ${platformName} conectado com sucesso!`);
          onSuccess();
          setTimeout(() => onOpenChange(false), 1800);
        }
      }
    } catch (_) {}
  };

  // Clique do usuário na tela do navegador remoto
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return;
    }

    // Calcula coordenadas relativas proporcionais à resolução 1280x800
    const x = Math.round(((clientX - rect.left) / rect.width) * 1280);
    const y = Math.round(((clientY - rect.top) / rect.height) * 800);

    // Efeito visual do clique
    setClickRipple({ x: clientX - rect.left, y: clientY - rect.top });
    setTimeout(() => setClickRipple(null), 400);

    sendInteraction({ type: "click", x, y });
  };

  // Rolagem do mouse na tela
  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    sendInteraction({ type: "scroll", deltaY: e.deltaY });
  };

  // Digitação direta no teclado quando a tela estiver em foco
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["Tab", "Enter", "Backspace", "Escape", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      sendInteraction({ type: "press", key: e.key });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      sendInteraction({ type: "type", text: e.key });
    }
  };

  // Envia texto da barra de digitação rápida
  const handleSendQuickText = (e?: React.FormEvent, pressEnter = false) => {
    if (e) e.preventDefault();
    if (!quickText) return;

    setIsInteracting(true);
    sendInteraction({ type: "type", text: quickText }).then(() => {
      if (pressEnter) {
        setTimeout(() => sendInteraction({ type: "press", key: "Enter" }), 150);
      }
      setQuickText("");
      setIsInteracting(false);
    });
  };

  const handleSaveCookiesDirect = async () => {
    if (!importJsonText.trim()) {
      toast.error("Cole o conteúdo JSON dos cookies.");
      return;
    }

    setSavingCookies(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_session",
          platform,
          sessionData: importJsonText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `🎉 ${platformName} conectado com sucesso!`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Erro ao salvar cookies.");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSavingCookies(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl rounded-2xl gap-0">
        {/* Barra de Janela do Navegador */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="h-4 w-px bg-zinc-700/60 mx-1" />
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-zinc-800 text-zinc-300">
                <Monitor className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold text-zinc-200">
                {platformName}
              </span>
            </div>
          </div>

          {/* Barra de URL do Navegador */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-400">
              <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-zinc-300">
                {url || "Carregando página segura..."}
              </span>
              <button
                type="button"
                onClick={() => sendInteraction({ type: "reload" })}
                className="ml-auto text-zinc-500 hover:text-zinc-200 transition-colors"
                title="Recarregar Página"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ao Vivo
            </Badge>
            <button
              type="button"
              onClick={() => setManualCookiesMode(!manualCookiesMode)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 transition-colors flex items-center gap-1"
              title="Alternar para colar cookies JSON"
            >
              <Cookie className="h-3 w-3" />
              {manualCookiesMode ? "Ver Navegador" : "Colar Cookies"}
            </button>
          </div>
        </div>

        {/* ---------------- SUCESSO ---------------- */}
        {status === "success" && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center bg-zinc-950">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <span className="text-lg font-bold text-emerald-300">Conectado com Sucesso!</span>
            <p className="text-xs text-zinc-400 max-w-sm">
              Sua sessão foi detectada e salva no banco PostgreSQL. O DarkTube já pode publicar nessa conta.
            </p>
          </div>
        )}

        {/* ---------------- MODO MANUAL DE COOKIES (FALLBACK) ---------------- */}
        {manualCookiesMode && status !== "success" && (
          <div className="p-6 space-y-4 bg-zinc-950">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5 text-xs text-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Você pode colar a lista de cookies exportada do <strong>Cookie-Editor</strong> para conectar imediatamente sem interagir com o navegador.
              </p>
            </div>
            <Textarea
              rows={8}
              placeholder='[ { "name": "c_user", "value": "..." }, ... ]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="bg-zinc-900 border-zinc-800 font-mono text-xs resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setManualCookiesMode(false)} className="text-xs">
                Voltar ao Navegador
              </Button>
              <Button size="sm" onClick={handleSaveCookiesDirect} disabled={savingCookies} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                {savingCookies ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Salvar Cookies
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- TELA DO NAVEGADOR REMOTO (STREAMING) ---------------- */}
        {!manualCookiesMode && status !== "success" && (
          <div className="flex flex-col bg-zinc-950">
            {/* Viewport Interativo */}
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onWheel={handleViewportWheel}
              onClick={handleViewportClick}
              className="relative w-full aspect-[16/10] max-h-[500px] bg-zinc-900 flex items-center justify-center overflow-hidden cursor-crosshair focus:outline-none select-none border-b border-zinc-800/80"
            >
              {screenshot ? (
                <>
                  <img
                    ref={imgRef}
                    src={screenshot}
                    alt="Navegador Remoto"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {clickRipple && (
                    <span
                      className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/30 animate-ping pointer-events-none"
                      style={{ left: `${clickRipple.x}px`, top: `${clickRipple.y}px` }}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="h-10 w-10 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                  <span className="text-xs font-medium">Carregando tela do navegador na nuvem...</span>
                </div>
              )}
            </div>

            {/* Barra Inferior de Digitação Rápida e Teclas Especiais */}
            <div className="p-3 bg-zinc-900/90 flex flex-wrap items-center gap-2">
              <form onSubmit={(e) => handleSendQuickText(e, false)} className="flex-1 flex items-center gap-1.5 min-w-[280px]">
                <Input
                  type="text"
                  placeholder="Digitar texto / e-mail / senha no campo ativo..."
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs h-8 focus:border-red-500"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!quickText.trim() || isInteracting}
                  className="h-8 text-xs font-medium px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  title="Digitar texto no navegador"
                >
                  Digitar
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => handleSendQuickText(undefined, true)}
                  disabled={!quickText.trim() || isInteracting}
                  className="h-8 text-xs font-medium px-2.5 bg-red-600 hover:bg-red-700 text-white gap-1"
                  title="Digitar texto e pressionar Enter"
                >
                  <CornerDownLeft className="h-3 w-3" />
                  Enter
                </Button>
              </form>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Tab" })}
                  className="h-8 text-[11px] px-2 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  title="Pular para próximo campo (Tab)"
                >
                  Tab ⇥
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Enter" })}
                  className="h-8 text-[11px] px-2 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  title="Enviar tecla Enter"
                >
                  Enter ↵
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Backspace" })}
                  className="h-8 text-[11px] px-2 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  title="Apagar caractere (Backspace)"
                >
                  <Delete className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 ml-auto">
                <MousePointer className="h-3 w-3 text-red-400" />
                <span>Clique diretamente na imagem para focar e interagir.</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
