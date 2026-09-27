"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Instagram, 
  Youtube, 
  Facebook, 
  Send, 
  Music2, 
  Pin, 
  Share2, 
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Cloud,
  FileCode,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SocialAccountStatus {
  connected: boolean;
  label: string;
  details?: string;
}

export function SocialConnections() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Record<string, SocialAccountStatus>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [isHeadlessServer, setIsHeadlessServer] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  
  // Telegram inputs
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);

  // Facebook Pages
  const [facebookPages, setFacebookPages] = useState<Array<{ id: string; name: string; url: string; avatarUrl?: string }>>([]);

  // Import JSON Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState("");
  const [importJsonText, setImportJsonText] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/social");
      const data = await res.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
        if (data.telegramChatId) {
          setTelegramChatId(data.telegramChatId);
        }
        if (data.facebookPages) {
          setFacebookPages(data.facebookPages);
        }
        if (typeof data.isHeadlessServer === "boolean") {
          setIsHeadlessServer(data.isHeadlessServer);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar conexões sociais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const handleFocus = () => fetchStatus();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleSyncCloud = async () => {
    setSyncingCloud(true);
    const toastId = toast.loading("Sincronizando sessões com o banco de dados compartilhado...");
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_sessions" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ Todas as sessões foram sincronizadas com sucesso com o banco!", { id: toastId });
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao sincronizar.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Falha na sincronização: ${err.message}`, { id: toastId });
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleConnect = async (platform: string) => {
    if (platform === "telegram") {
      setShowTelegramConfig(true);
      return;
    }

    try {
      setConnecting(platform);

      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", platform })
      });
      const data = await res.json();

      if (data.success) {
        toast.info(`Iniciando conexão com ${platform.toUpperCase()}...`, {
          description: "A janela do navegador foi aberta. Faça seu login nela."
        });

        // Inicia verificação periódica inteligente em tempo real
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const checkRes = await fetch("/api/social");
            const checkData = await checkRes.json();
            if (checkData.success && checkData.accounts) {
              setAccounts(checkData.accounts);
              if (checkData.accounts[platform]?.connected) {
                clearInterval(pollInterval);
                setConnecting(null);
                toast.success(`🎉 ${checkData.accounts[platform].label || platform.toUpperCase()} conectado com sucesso!`);
                return;
              }
            }
          } catch (e) {}

          if (attempts > 120) {
            clearInterval(pollInterval);
            setConnecting(null);
          }
        }, 2500);
      } else {
        setConnecting(null);
        if (data.isRemote) {
          toast.warning("Servidor em Nuvem / Docker detectado", {
            description: "Como o banco é compartilhado, suas contas já conectadas no seu DarkTube local são sincronizadas automaticamente! Você também pode importar os cookies JSON diretamente.",
            duration: 8000,
          });
          setImportPlatform(platform);
          setImportModalOpen(true);
        } else {
          toast.error(data.error || `Não foi possível iniciar login para ${platform}.`);
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao conectar: ${err.message}`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", platform })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Conta do ${platform} desconectada.`);
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(`Erro ao desconectar: ${err.message}`);
    }
  };

  const handleSaveTelegram = async () => {
    try {
      setSavingTelegram(true);
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_telegram",
          telegramBotToken: telegramToken,
          telegramChatId: telegramChatId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Telegram configurado com sucesso!");
        setShowTelegramConfig(false);
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar Telegram: ${err.message}`);
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importJsonText.trim()) {
      toast.error("Cole o conteúdo JSON dos cookies.");
      return;
    }
    setSavingImport(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_session",
          platform: importPlatform,
          sessionData: importJsonText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Sessão importada com sucesso!`);
        setImportModalOpen(false);
        setImportJsonText("");
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao salvar cookies.");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSavingImport(false);
    }
  };

  const platformsList = [
    { key: "tiktok", name: "TikTok", icon: Music2, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { key: "instagram", name: "Instagram Reels", icon: Instagram, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    { key: "facebook", name: "Facebook Reels", icon: Facebook, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { key: "youtube", name: "YouTube Shorts", icon: Youtube, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { key: "pinterest", name: "Pinterest", icon: Pin, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    { key: "kwai", name: "Kwai", icon: Sparkles, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    { key: "threads", name: "Threads", icon: Share2, color: "text-foreground bg-secondary/50 border-border" },
    { key: "telegram", name: "Telegram", icon: Send, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" }
  ];

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  return (
    <div className="space-y-6">
      {/* Alerta inteligente de Nuvem / Servidor Remoto */}
      {isHeadlessServer && (
        <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-start gap-3.5 text-xs text-sky-200">
          <Cloud className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sky-300 text-sm block">☁️ Servidor em Nuvem / Docker Ativo</span>
            <p className="leading-relaxed">
              Como o banco de dados PostgreSQL é compartilhado entre o seu PC e este servidor, todas as redes sociais que você conecta no <strong>DarkTube local</strong> são sincronizadas automaticamente com esta máquina de produção.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Redes Sociais</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conecte suas contas uma única vez para publicação automática de vídeos.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            {connectedCount} de {platformsList.length} Conectadas
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncCloud}
            disabled={syncingCloud}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            title="Sincronizar sessões entre local e o banco de dados compartilhado"
          >
            <Cloud className={`h-3.5 w-3.5 ${syncingCloud ? "animate-spin" : ""}`} />
            Sincronizar Nuvem
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platformsList.map((item) => {
          const status = accounts[item.key] || { connected: false, label: item.name };
          const isBusy = connecting === item.key;
          const Icon = item.icon;

          return (
            <Card 
              key={item.key} 
              className={`border transition-all duration-200 ${
                status.connected 
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]" 
                  : "border-border/60 bg-card/40 hover:border-border"
              }`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-none">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`h-2 w-2 rounded-full ${status.connected ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {status.connected ? "Conectado" : "Não conectado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center gap-2 justify-between">
                  {status.connected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(item.key)}
                      className="w-full h-8 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConnect(item.key)}
                        disabled={isBusy}
                        className="flex-1 h-8 text-xs font-semibold"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Conectar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportPlatform(item.key);
                          setImportModalOpen(true);
                        }}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border border-border/40"
                        title="Importar Cookies JSON"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de Páginas do Facebook Detectadas */}
      {accounts.facebook?.connected && facebookPages.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/[0.02] p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <Facebook className="h-4 w-4" />
              <h3 className="font-bold text-sm">Páginas do Facebook Disponíveis ({facebookPages.length})</h3>
            </div>
            <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
              Sincronizadas com sua Conta
            </Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {facebookPages.map((pg) => (
              <div 
                key={pg.id} 
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-background/40 hover:border-blue-500/40 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 font-bold text-xs">
                  🚩
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate" title={pg.name}>{pg.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">ID: {pg.id}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Na tela de publicação do <strong>Dark Clips</strong>, você poderá escolher individualmente qual destas páginas receberá cada vídeo.
          </p>
        </Card>
      )}

      {/* Configuração Inline do Telegram */}
      {showTelegramConfig && (
        <Card className="border-sky-500/30 bg-sky-500/[0.04] p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400">
              <Send className="h-4 w-4" />
              <h3 className="font-bold text-sm">Configurar Telegram</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowTelegramConfig(false)} className="h-7 text-xs">
              Fechar
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bot Token</Label>
              <Input
                placeholder="123456789:ABCdef..."
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canal ou Grupo ID</Label>
              <Input
                placeholder="@meucanal ou -10012345678"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveTelegram}
            disabled={savingTelegram || !telegramChatId}
            className="h-8 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white"
          >
            {savingTelegram ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Salvar Conexão do Telegram
          </Button>
        </Card>
      )}

      {/* Modal de Importação Manual de Cookies JSON */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Importar Cookies JSON ({importPlatform.toUpperCase()})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cole a lista de cookies em formato JSON exportados da extensão (ex: EditThisCookie ou Cookie-Editor).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder='[ { "name": "c_user", "value": "..." }, ... ]'
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="font-mono text-xs resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleImportSubmit} disabled={savingImport} className="text-xs font-semibold">
                {savingImport ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Salvar Cookies
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
