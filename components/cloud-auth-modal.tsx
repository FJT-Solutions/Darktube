"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Dialog, 
  DialogContent,
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
  CornerDownLeft, 
  Delete, 
  Cookie, 
  Monitor, 
  MousePointer, 
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Keyboard,
  Share2
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Ripple visual do clique
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);

  // Modo alternativo de cookies
  const [manualCookiesMode, setManualCookiesMode] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [savingCookies, setSavingCookies] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Inicia o navegador remoto
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
      setIsFullscreen(false);
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
    }, 850);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, status, platformName, onSuccess, onOpenChange]);

  // Envia ação de interação para o navegador remoto
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

  // Clique do usuário com cálculo preciso de coordenadas (considerando letterboxing do object-contain)
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const naturalAspect = 1280 / 800; // 1.6
    const containerAspect = rect.width / rect.height;

    let renderedWidth = rect.width;
    let renderedHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > naturalAspect) {
      renderedWidth = rect.height * naturalAspect;
      offsetX = (rect.width - renderedWidth) / 2;
    } else {
      renderedHeight = rect.width / naturalAspect;
      offsetY = (rect.height - renderedHeight) / 2;
    }

    const clickX = e.clientX - rect.left - offsetX;
    const clickY = e.clientY - rect.top - offsetY;

    if (clickX < 0 || clickX > renderedWidth || clickY < 0 || clickY > renderedHeight) {
      return;
    }

    const x = Math.round((clickX / renderedWidth) * 1280);
    const y = Math.round((clickY / renderedHeight) * 800);

    // Efeito visual do ripple exatamente onde clicou
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      setClickRipple({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
      setTimeout(() => setClickRipple(null), 350);
    }

    sendInteraction({ type: "click", x, y });
  };

  // Rolagem do mouse na tela
  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    sendInteraction({ type: "scroll", deltaY: e.deltaY });
  };

  // Digitação direta no teclado quando a tela estiver em foco
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["Tab", "Enter", "Backspace", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
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
        setTimeout(() => sendInteraction({ type: "press", key: "Enter" }), 120);
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
      <DialogContent 
        className={`p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl gap-0 flex flex-col transition-all duration-200 ${
          isFullscreen 
            ? "fixed inset-0 w-screen h-screen max-w-none rounded-none border-none z-50" 
            : "w-[94vw] max-w-6xl h-[86vh] rounded-2xl"
        }`}
      >
        {/* ================= BARRA SUPERIOR DO NAVEGADOR ================= */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 select-none shrink-0">
          {/* Lado Esquerdo: Controles de Janela e Identificação */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button 
                type="button" 
                onClick={() => onOpenChange(false)}
                className="h-3 w-3 rounded-full bg-red-500 hover:brightness-125 transition-all cursor-pointer"
                title="Fechar Navegador"
              />
              <button 
                type="button" 
                onClick={() => setIsFullscreen(false)}
                className="h-3 w-3 rounded-full bg-amber-500 hover:brightness-125 transition-all cursor-pointer"
                title="Restaurar Tamanho"
              />
              <button 
                type="button" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-3 w-3 rounded-full bg-emerald-500 hover:brightness-125 transition-all cursor-pointer"
                title="Tela Cheia"
              />
            </div>

            <div className="h-4 w-px bg-zinc-700/60" />

            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/50">
                <Monitor className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-200 tracking-wide">
                {platformName}
              </span>
            </div>
          </div>

          {/* Centro: Barra de Endereço / URL */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
              <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-zinc-300 flex-1">
                {url || "https://www.facebook.com/login/"}
              </span>
              <button
                type="button"
                onClick={() => sendInteraction({ type: "reload" })}
                className="text-zinc-400 hover:text-zinc-100 transition-colors p-0.5"
                title="Recarregar Página"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Lado Direito: Status e Ações */}
          <div className="flex items-center gap-2 pr-6">
            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 py-0.5 px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nuvem Ao Vivo
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              title={isFullscreen ? "Sair da Tela Cheia" : "Expandir Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualCookiesMode(!manualCookiesMode)}
              className="h-7 text-[11px] px-2.5 bg-zinc-900 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 gap-1"
            >
              <Cookie className="h-3 w-3" />
              {manualCookiesMode ? "Ver Tela" : "Cookies"}
            </Button>
          </div>
        </div>

        {/* ================= CONTEÚDO PRINCIPAL ================= */}

        {/* 1. ESTADO DE SUCESSO */}
        {status === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center bg-zinc-950 p-6">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="h-11 w-11" />
            </div>
            <div className="space-y-1">
              <span className="text-xl font-bold text-emerald-300 block">Conectado com Sucesso!</span>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                A sessão foi detectada e salva com segurança no banco PostgreSQL. O DarkTube já pode publicar automaticamente nesta conta.
              </p>
            </div>
          </div>
        )}

        {/* 2. MODO MANUAL DE COOKIES (FALLBACK) */}
        {manualCookiesMode && status !== "success" && (
          <div className="flex-1 p-6 space-y-4 bg-zinc-950 overflow-y-auto">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3 text-xs text-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Você pode colar a lista de cookies exportada do <strong>Cookie-Editor</strong> para conectar imediatamente sem precisar interagir com a tela.
              </p>
            </div>
            <Textarea
              rows={12}
              placeholder='[ { "name": "c_user", "value": "..." }, ... ]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="bg-zinc-900 border-zinc-800 font-mono text-xs resize-none h-[calc(100%-140px)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setManualCookiesMode(false)} className="text-xs">
                Voltar à Tela do Navegador
              </Button>
              <Button size="sm" onClick={handleSaveCookiesDirect} disabled={savingCookies} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4">
                {savingCookies ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Salvar Cookies
              </Button>
            </div>
          </div>
        )}

        {/* 3. TELA DO NAVEGADOR REMOTO (INTERATIVO) */}
        {!manualCookiesMode && status !== "success" && (
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-hidden">
            {/* Viewport Interativo com Suporte a Fullscreen e Proporção Perfeita */}
            <div
              ref={containerRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onWheel={handleViewportWheel}
              onClick={handleViewportClick}
              className="relative flex-1 w-full bg-zinc-950 flex items-center justify-center overflow-hidden cursor-crosshair focus:outline-none select-none"
            >
              {screenshot ? (
                <>
                  <img
                    ref={imgRef}
                    src={screenshot}
                    alt="Navegador Remoto"
                    className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
                  />
                  {clickRipple && (
                    <span
                      className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/40 animate-ping pointer-events-none"
                      style={{ left: `${clickRipple.x}px`, top: `${clickRipple.y}px` }}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-zinc-400 py-16">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                    <Monitor className="h-5 w-5 text-red-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-sm font-semibold text-zinc-200 block">
                      Iniciando Navegador em Nuvem...
                    </span>
                    <p className="text-xs text-zinc-500">
                      Carregando tela de login de {platformName}. Aguarde alguns instantes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ================= BARRA INFERIOR DE TECLADO E DIGITAÇÃO RÁPIDA ================= */}
            <div className="p-3 bg-zinc-900/95 border-t border-zinc-800 flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Campo para digitar texto com envio imediato */}
              <form onSubmit={(e) => handleSendQuickText(e, false)} className="flex-1 flex items-center gap-2 min-w-[320px]">
                <div className="relative flex-1">
                  <Keyboard className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Digite ou cole seu e-mail / senha aqui..."
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 pl-8 text-xs h-8 focus:border-red-500 placeholder:text-zinc-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!quickText.trim() || isInteracting}
                  className="h-8 text-xs font-semibold px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50"
                  title="Digitar texto no campo focado"
                >
                  Digitar
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => handleSendQuickText(undefined, true)}
                  disabled={!quickText.trim() || isInteracting}
                  className="h-8 text-xs font-semibold px-3 bg-red-600 hover:bg-red-700 text-white gap-1 shadow-md shadow-red-600/20"
                  title="Digitar texto e enviar Enter"
                >
                  <CornerDownLeft className="h-3 w-3" />
                  Enter
                </Button>
              </form>

              {/* Botões de Ações de Teclado */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Tab" })}
                  className="h-8 text-xs px-2.5 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  title="Pular para próximo campo (Tab)"
                >
                  Tab ⇥
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Enter" })}
                  className="h-8 text-xs px-2.5 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  title="Enviar tecla Enter"
                >
                  Enter ↵
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendInteraction({ type: "press", key: "Backspace" })}
                  className="h-8 text-xs px-2 bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  title="Apagar caractere (Backspace)"
                >
                  <Delete className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Dica de uso */}
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 ml-auto">
                <MousePointer className="h-3 w-3 text-red-400 animate-pulse" />
                <span>Clique diretamente na tela para focar nos campos ou botões.</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
