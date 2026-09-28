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
  Mail,
  KeyRound,
  Rocket,
  ExternalLink,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CloudAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  platformName: string;
  accountId?: string;
  accountName?: string;
  onSuccess: () => void;
}

export function CloudAuthModal({
  open,
  onOpenChange,
  platform,
  platformName,
  accountId = "default",
  accountName = "",
  onSuccess,
}: CloudAuthModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [url, setUrl] = useState<string>("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  // Abas e Popups (ex: Login com o Google)
  const [isPopup, setIsPopup] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [pages, setPages] = useState<Array<{ index: number; title: string; url: string; isActive: boolean }>>([]);

  // Preenchimento direto
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Ripple visual do clique
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);

  // Modo alternativo de cookies
  const [manualCookiesMode, setManualCookiesMode] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [savingCookies, setSavingCookies] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Inicia o navegador remoto
  const startRemoteBrowser = useCallback(async () => {
    setStatus("starting");
    setScreenshot(null);
    setUrl("");
    setIsPopup(false);
    setPageCount(1);
    setPages([]);

    try {
      const res = await fetch("/api/social/cloud-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "start", 
          platform,
          accountId,
          accountName,
        }),
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
  }, [platform, accountId, accountName]);

  useEffect(() => {
    if (open) {
      setManualCookiesMode(false);
      setIsFullscreen(false);
      setInputEmail("");
      setInputPassword("");
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
      setIsPopup(false);
      setPageCount(1);
      setPages([]);
      setInputEmail("");
      setInputPassword("");
      setClickRipple(null);
    }
  }, [open, startRemoteBrowser]);

  // Polling de alta frequência (400ms) para fluidez máxima
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
          if (s.isPopup !== undefined) setIsPopup(s.isPopup);
          if (s.pageCount !== undefined) setPageCount(s.pageCount);
          if (s.pages) setPages(s.pages);

          if (s.status === "success") {
            toast.success(`🎉 ${platformName} conectado com sucesso!`);
            onSuccess();
            setTimeout(() => {
              onOpenChange(false);
            }, 1800);
          }
        }
      } catch (_) {}
    }, 400);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, status, platformName, onSuccess, onOpenChange]);

  // Envia ação de interação para o navegador remoto com resposta de tela imediata
  const sendInteraction = async (payload: {
    type: "click" | "type" | "press" | "scroll" | "reload" | "fill_field" | "fill_and_submit" | "switch_tab" | "close_tab";
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    deltaY?: number;
    field?: "email" | "password" | "submit";
    value?: string;
    email?: string;
    password?: string;
    index?: number;
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
        if (data.session.isPopup !== undefined) setIsPopup(data.session.isPopup);
        if (data.session.pageCount !== undefined) setPageCount(data.session.pageCount);
        if (data.session.pages) setPages(data.session.pages);

        if (data.session.status === "success") {
          setStatus("success");
          toast.success(`🎉 ${platformName} conectado com sucesso!`);
          onSuccess();
          setTimeout(() => onOpenChange(false), 1800);
        }
      }
    } catch (_) {}
  };

  // Clique do usuário na tela com mapeamento pixel-perfect 1:1 e foco no teclado físico
  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Garante que o teclado físico continue ativo
    hiddenInputRef.current?.focus();

    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
      return;
    }

    const x = Math.round((clickX / rect.width) * 1280);
    const y = Math.round((clickY / rect.height) * 800);

    // Efeito visual do ripple
    setClickRipple({ x: clickX, y: clickY });
    setTimeout(() => setClickRipple(null), 350);

    sendInteraction({ type: "click", x, y });
  };

  // Rolagem do mouse na tela
  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    sendInteraction({ type: "scroll", deltaY: e.deltaY });
  };

  // Digitação direta no teclado físico via sink invisível
  const handlePhysicalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Tab", "Enter", "Backspace", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      sendInteraction({ type: "press", key: e.key });
    }
  };

  const handlePhysicalInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    if (val) {
      sendInteraction({ type: "type", text: val });
      e.currentTarget.value = "";
    }
  };

  // Preenche e submete credenciais diretamente
  const handleFillAndSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputEmail.trim() && !inputPassword.trim()) {
      toast.error("Preencha o e-mail ou a senha para preencher na tela.");
      return;
    }

    setIsSubmittingForm(true);
    await sendInteraction({
      type: "fill_and_submit",
      email: inputEmail.trim(),
      password: inputPassword.trim(),
    });
    setIsSubmittingForm(false);
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
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl gap-0 flex flex-col transition-all duration-200",
          isFullscreen 
            ? "!fixed !inset-0 !w-screen !h-screen !max-w-none !rounded-none !border-none z-50" 
            : "!w-[96vw] sm:!max-w-[1280px] !h-[92vh] !max-h-[94vh] rounded-2xl"
        )}
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

            {/* Abas Múltiplas / Indicador de Popup */}
            {pages.length > 1 && (
              <div className="flex items-center gap-1 ml-2">
                {pages.map((pg) => (
                  <div
                    key={pg.index}
                    onClick={() => sendInteraction({ type: "switch_tab", index: pg.index })}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-all border",
                      pg.isActive
                        ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm"
                        : "bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    {pg.url.includes("accounts.google") ? (
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        🔑 Google
                      </span>
                    ) : (
                      <span className="truncate max-w-[90px]">{pg.title || `Aba ${pg.index + 1}`}</span>
                    )}

                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendInteraction({ type: "close_tab", index: pg.index });
                        }}
                        className="text-zinc-400 hover:text-red-400 p-0.5"
                        title="Fechar esta aba"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Centro: Barra de Endereço / URL */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
              <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-zinc-300 flex-1">
                {url || "Carregando..."}
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
          <div className="flex items-center gap-2">
            {isPopup ? (
              <Badge variant="outline" className="text-[10px] font-semibold text-amber-400 border-amber-500/40 bg-amber-500/10 gap-1.5 py-0.5 px-2 animate-pulse">
                <ExternalLink className="h-3 w-3" />
                Pop-up Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 py-0.5 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao Vivo (400ms)
              </Badge>
            )}

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

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ml-1"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
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
              placeholder='[ { "name": "sessionid", "value": "..." }, ... ]'
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
            {/* Aviso quando popup está ativo */}
            {isPopup && (
              <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>
                    <strong>Pop-up de autenticação aberto!</strong> Você está visualizando a janela do Google. Quando você terminar o login, a janela fecha sozinha e a conta conecta automaticamente.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => sendInteraction({ type: "close_tab", index: pages.length - 1 })}
                  className="h-6 text-[11px] px-2 text-amber-300 hover:text-white hover:bg-amber-500/20"
                >
                  Fechar Janela
                </Button>
              </div>
            )}

            {/* Viewport Interativo com Proporção Exata e Centralização Perfeita */}
            <div
              ref={containerRef}
              onClick={() => hiddenInputRef.current?.focus()}
              className="relative flex-1 w-full bg-zinc-950 flex items-center justify-center overflow-hidden p-2 select-none focus:outline-none"
            >
              {/* Input invisível que captura teclado físico em tempo real */}
              <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 pointer-events-none absolute -top-10 left-0 w-1 h-1"
                onKeyDown={handlePhysicalKeyDown}
                onInput={handlePhysicalInput}
                autoFocus
              />

              {screenshot ? (
                <div
                  ref={wrapperRef}
                  onClick={handleWrapperClick}
                  onWheel={handleViewportWheel}
                  className="relative aspect-[16/10] max-h-full max-w-full shadow-2xl border border-zinc-800 rounded-lg overflow-hidden cursor-crosshair bg-black"
                >
                  <img
                    src={screenshot}
                    alt="Navegador Remoto"
                    className="w-full h-full object-fill pointer-events-none drop-shadow-2xl"
                  />
                  {clickRipple && (
                    <span
                      className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/50 animate-ping pointer-events-none"
                      style={{ left: `${clickRipple.x}px`, top: `${clickRipple.y}px` }}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-zinc-400 py-16">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                    <Monitor className="h-5 w-5 text-red-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-sm font-semibold text-zinc-200 block">
                      Iniciando Navegador na Nuvem...
                    </span>
                    <p className="text-xs text-zinc-500">
                      Carregando tela de login de {platformName}. Aguarde alguns instantes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ================= BARRA INFERIOR DE PREENCHIMENTO RÁPIDO E CONTROLES ================= */}
            <div className="p-3 bg-zinc-900/95 border-t border-zinc-800 flex flex-wrap items-center gap-2.5 shrink-0">
              <form onSubmit={handleFillAndSubmit} className="flex-1 flex flex-wrap items-center gap-2 min-w-[340px]">
                {/* Campo E-mail */}
                <div className="relative flex-1 min-w-[180px]">
                  <Mail className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder={isPopup ? "E-mail da Conta Google..." : "E-mail ou Telefone..."}
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 pl-8 text-xs h-8 focus:border-red-500 placeholder:text-zinc-500"
                  />
                </div>

                {/* Campo Senha */}
                <div className="relative flex-1 min-w-[160px]">
                  <KeyRound className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    placeholder={isPopup ? "Senha da Conta Google..." : "Sua Senha..."}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 pl-8 text-xs h-8 focus:border-red-500 placeholder:text-zinc-500"
                  />
                </div>

                {/* Botão de Ação: Preencher & Entrar */}
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={(!inputEmail.trim() && !inputPassword.trim()) || isSubmittingForm}
                  className="h-8 text-xs font-semibold px-3.5 bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-md shadow-red-600/20"
                  title="Preencher campos na tela e submeter"
                >
                  {isSubmittingForm ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  {isPopup ? "Preencher no Google 🚀" : "Preencher & Entrar"}
                </Button>
              </form>

              {/* Ações Auxiliares de Teclado */}
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
                  <CornerDownLeft className="h-3 w-3" />
                  Enter
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

              {/* Dica */}
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 ml-auto">
                <MousePointer className="h-3 w-3 text-red-400 animate-pulse" />
                <span>Clique diretamente na tela para digitar ou use o formulário rápido.</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
