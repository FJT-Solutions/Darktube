"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  ShieldCheck, 
  KeyRound, 
  QrCode, 
  RefreshCw, 
  Lock, 
  Sparkles,
  Cookie,
  FileCode,
  ShieldAlert
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code2FA, setCode2FA] = useState("");
  const [authMode, setAuthMode] = useState<"credentials" | "qr_code" | "cookies">("credentials");
  const [importJsonText, setImportJsonText] = useState("");
  const [savingCookies, setSavingCookies] = useState(false);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [promptNumber, setPromptNumber] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Reseta estado quando o modal fecha ou abre para nova plataforma
  useEffect(() => {
    if (!open) {
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
      setStatusMessage("");
      setPromptNumber(null);
      setScreenshot(null);
      setQrImage(null);
      setUsername("");
      setPassword("");
      setCode2FA("");
      setImportJsonText("");
      setIsSubmitting(false);
      setSavingCookies(false);

      if (platform === "tiktok") {
        setAuthMode("qr_code");
      } else {
        setAuthMode("credentials");
      }
    } else {
      if (platform === "tiktok") {
        setAuthMode("qr_code");
      } else {
        setAuthMode("credentials");
      }
    }
  }, [open, platform]);

  // Polling de status enquanto houver sessão ativa e não finalizada
  useEffect(() => {
    if (!sessionId) return;
    if (["success", "error", "cancelled", "challenge_active"].includes(status)) {
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
          if (s.message) setStatusMessage(s.message);
          if (s.promptNumber !== undefined) setPromptNumber(s.promptNumber);
          if (s.screenshot !== undefined) setScreenshot(s.screenshot);
          if (s.qrImage !== undefined) setQrImage(s.qrImage);

          if (s.status === "success") {
            toast.success(`🎉 ${platformName} conectado com sucesso!`);
            onSuccess();
            setTimeout(() => {
              onOpenChange(false);
            }, 1800);
          }
        }
      } catch (_) {}
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, status, platformName, onSuccess, onOpenChange]);

  const handleStartAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (authMode === "credentials" && (!username.trim() || !password.trim())) {
      toast.error("Por favor, preencha o e-mail/usuário e a senha.");
      return;
    }

    setIsSubmitting(true);
    setStatus("starting");
    setStatusMessage("Inicializando navegador seguro em nuvem...");

    try {
      const res = await fetch("/api/social/cloud-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          platform,
          mode: authMode,
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionId(data.session.sessionId);
        setStatus(data.session.status);
        setStatusMessage(data.session.message || "Acessando tela de autenticação...");
      } else {
        setStatus("error");
        setStatusMessage(data.error || "Não foi possível iniciar a autenticação.");
        toast.error(data.error || "Falha ao iniciar autenticação.");
      }
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(`Erro de conexão: ${err.message}`);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code2FA.trim() || !sessionId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/social/cloud-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_2fa",
          sessionId,
          code: code2FA.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("submitting_code");
        setStatusMessage("Validando código no servidor...");
      } else {
        toast.error("Erro ao enviar código de verificação.");
      }
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCookies = async () => {
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

  const handleReset = () => {
    setStatus("idle");
    setStatusMessage("");
    setPromptNumber(null);
    setScreenshot(null);
    setQrImage(null);
    setCode2FA("");
  };

  const isWorking = ["starting", "navigating", "logging_in", "waiting", "submitting_code"].includes(status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <Lock className="h-4 w-4" />
              </span>
              Conectar {platformName}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-semibold tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/10 uppercase">
              100% Nuvem
            </Badge>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Autenticação segura. Suas chaves de sessão são criptografadas e salvas diretamente no banco PostgreSQL.
          </DialogDescription>
        </DialogHeader>

        {/* ---------------- ESTADO: IDLE / FORMULÁRIO INICIAL ---------------- */}
        {status === "idle" && (
          <div className="space-y-4 pt-1">
            {/* Seletor de Modo de Conexão */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-lg border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setAuthMode("credentials")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  authMode === "credentials" 
                    ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Email e Senha
              </button>

              {platform === "tiktok" && (
                <button
                  type="button"
                  onClick={() => setAuthMode("qr_code")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    authMode === "qr_code" 
                      ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </button>
              )}

              <button
                type="button"
                onClick={() => setAuthMode("cookies")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  authMode === "cookies" 
                    ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Cookie className="h-3.5 w-3.5" />
                Cookies
              </button>
            </div>

            {/* MODO 1: CREDENCIAIS (USUÁRIO / SENHA) */}
            {authMode === "credentials" && (
              <form onSubmit={handleStartAuth} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">
                    {platform === "facebook" ? "E-mail ou Telefone do Facebook" : platform === "youtube" ? "E-mail da Conta Google" : "Usuário ou E-mail"}
                  </Label>
                  <Input
                    type="text"
                    placeholder="seu_email@exemplo.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 focus:border-red-500 text-xs h-9"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">Senha</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 focus:border-red-500 text-xs h-9"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isSubmitting}
                    className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5 px-4 shadow-lg shadow-red-600/20"
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Conectar na Nuvem
                  </Button>
                </div>
              </form>
            )}

            {/* MODO 2: QR CODE (TIKTOK) */}
            {authMode === "qr_code" && (
              <div className="space-y-4 pt-1 text-center">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                  <QrCode className="h-10 w-10 text-red-400 animate-pulse" />
                  <p className="text-xs text-zinc-300 font-medium">
                    O QR Code de login será gerado na hora pelo servidor na nuvem.
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs">
                    Abra o app do TikTok no celular, vá em Perfil &gt; Menu &gt; Escanear e aponte para o código.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-zinc-400"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => handleStartAuth()}
                    disabled={isSubmitting}
                    className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5 px-4"
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                    Gerar QR Code
                  </Button>
                </div>
              </div>
            )}

            {/* MODO 3: COOKIES DA SESSÃO (1 CLIQUE / SEM CAPTCHA) */}
            {authMode === "cookies" && (
              <div className="space-y-3.5 pt-1">
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5 text-xs text-emerald-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Sem Bloqueios:</strong> Como os cookies vêm do seu próprio navegador onde você já está logado, o Facebook não ativa nenhum desafio ou captcha anti-bot.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">
                    JSON de Cookies (Exportado do Cookie-Editor)
                  </Label>
                  <Textarea
                    rows={6}
                    placeholder='[ { "name": "c_user", "value": "..." }, ... ]'
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 font-mono text-[11px] resize-none focus:border-red-500"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-zinc-400"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleSaveCookies}
                    disabled={savingCookies || !importJsonText.trim()}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4"
                  >
                    {savingCookies ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Salvar Conexão
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- ESTADO: CARREGANDO / PROCESSANDO ---------------- */}
        {isWorking && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
              <ShieldCheck className="h-5 w-5 text-red-400 absolute inset-0 m-auto" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-semibold text-zinc-200 block">
                {statusMessage || "Processando autenticação..."}
              </span>
              <p className="text-[11px] text-zinc-500">
                O navegador em nuvem está interagindo com a plataforma de forma segura.
              </p>
            </div>
          </div>
        )}

        {/* ---------------- ESTADO: DESAFIO ANTI-BOT / CAPTCHA DETECTADO ---------------- */}
        {status === "challenge_active" && (
          <div className="space-y-3.5 py-1">
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs text-amber-200">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">Verificação Anti-Bot da Meta</span>
                <p className="leading-relaxed text-[11px]">
                  O Facebook detectou que a tentativa de login veio do datacenter da VPS e solicitou o desafio <em>&quot;Complete um desafio para verificar se você é humano&quot;</em>.
                </p>
              </div>
            </div>

            {screenshot && (
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 p-1">
                <img src={screenshot} alt="Desafio Meta" className="max-h-36 w-full object-contain rounded" />
              </div>
            )}

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2 text-xs">
              <span className="font-semibold text-zinc-300 block">Como resolver agora:</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Como você já está logado no Facebook no seu próprio navegador, você pode conectar em 3 segundos importando os cookies (onde o Facebook nunca pede captcha), ou tentar novamente com suas credenciais.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleReset}
                className="text-xs text-zinc-400"
              >
                Voltar
              </Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={() => {
                  handleReset();
                  setAuthMode("cookies");
                }}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3.5 shadow-sm"
              >
                <Cookie className="h-3.5 w-3.5" />
                Conectar via Cookies (Sem Captcha)
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- ESTADO: DESAFIO DE NÚMERO NA TELA (GOOGLE PROMPT / META) ---------------- */}
        {status === "device_prompt" && (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Smartphone className="h-4 w-4" />
                Verificação no Smartphone
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Abra a notificação que chegou no seu celular e toque no número indicado abaixo:
              </p>
              
              {/* NÚMERO EM DESTAQUE */}
              <div className="h-20 w-24 rounded-2xl bg-zinc-900 border-2 border-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 my-1 animate-pulse">
                <span className="text-4xl font-extrabold text-amber-300 tracking-wider">
                  {promptNumber || "..."}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-200/80">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Aguardando você confirmar o número no celular...
              </div>
            </div>

            {screenshot && (
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 p-1">
                <img src={screenshot} alt="Desafio da tela" className="max-h-40 w-full object-contain rounded" />
              </div>
            )}
          </div>
        )}

        {/* ---------------- ESTADO: APROVAÇÃO NO APLICATIVO ("Sim, sou eu") ---------------- */}
        {status === "waiting_device_approval" && (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-500/10 flex flex-col items-center gap-2.5">
              <Smartphone className="h-8 w-8 text-sky-400 animate-bounce" />
              <span className="font-bold text-sky-300 text-sm">
                Aprovação Solicitada no Celular
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {statusMessage || "Abra o aplicativo da rede social no seu smartphone e toque em 'Aprovar' ou 'Sim, sou eu'."}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-sky-300/80 pt-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando sua confirmação no aplicativo...
              </div>
            </div>

            {screenshot && (
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 p-1">
                <img src={screenshot} alt="Aprovação no dispositivo" className="max-h-40 w-full object-contain rounded" />
              </div>
            )}
          </div>
        )}

        {/* ---------------- ESTADO: CÓDIGO 2FA (SMS / AUTHENTICATOR) ---------------- */}
        {status === "needs_2fa" && (
          <form onSubmit={handleSubmit2FA} className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3 text-xs text-red-200">
              <KeyRound className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-red-300 block">Autenticação de Dois Fatores (2FA)</span>
                <p className="leading-relaxed">
                  {statusMessage || "Insira o código de verificação recebido via SMS ou no seu aplicativo autenticador."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-300">Código de 6 Dígitos</Label>
              <Input
                type="text"
                placeholder="123456"
                value={code2FA}
                onChange={(e) => setCode2FA(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-red-500 text-center tracking-widest text-lg font-mono font-bold h-11"
                maxLength={8}
                autoFocus
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleReset}
                className="text-xs text-zinc-400"
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={isSubmitting || !code2FA.trim()}
                className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5 px-4"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirmar Código
              </Button>
            </div>
          </form>
        )}

        {/* ---------------- ESTADO: QR CODE (TIKTOK / KWAI) ---------------- */}
        {(status === "qr_code" || status === "qr_code_update") && (
          <div className="space-y-4 py-2 text-center">
            <div className="space-y-1">
              <span className="text-sm font-bold text-zinc-200">Aponte a câmera do TikTok</span>
              <p className="text-xs text-zinc-400">
                No app do TikTok: Perfil &gt; Menu (3 linhas) &gt; Meu QR Code &gt; Ícone de Escanear.
              </p>
            </div>

            {qrImage ? (
              <div className="inline-block p-3 rounded-2xl bg-white shadow-xl shadow-red-500/10 border-2 border-red-500/30">
                <img src={qrImage} alt="QR Code de Login" className="h-48 w-48 object-contain" />
              </div>
            ) : (
              <div className="h-48 w-48 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-red-500" />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Aguardando leitura do QR Code...
            </div>
          </div>
        )}

        {/* ---------------- ESTADO: SUCESSO ---------------- */}
        {status === "success" && (
          <div className="py-6 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold text-emerald-300">Conectado com Sucesso!</span>
              <p className="text-xs text-zinc-400">
                Sessão salva com segurança no banco PostgreSQL. O DarkTube já pode publicar automaticamente nesta conta.
              </p>
            </div>
          </div>
        )}

        {/* ---------------- ESTADO: ERRO ---------------- */}
        {status === "error" && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 flex items-start gap-3 text-xs text-red-200">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-red-300 block">Falha na Autenticação</span>
                <p className="leading-relaxed">
                  {statusMessage || "Não foi possível concluir o login. Verifique seus dados e tente novamente."}
                </p>
              </div>
            </div>

            {screenshot && (
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 p-1">
                <img src={screenshot} alt="Detalhes do erro" className="max-h-36 w-full object-contain rounded" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)}
                className="text-xs text-zinc-400"
              >
                Fechar
              </Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleReset}
                className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5 px-4"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
