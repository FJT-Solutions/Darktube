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
  Upload,
  Plus,
  UserPlus,
  Trash2,
  Users
} from "lucide-react";
import { CloudAuthModal } from "@/components/cloud-auth-modal";
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
import { SocialAccount } from "@/lib/social-accounts";

interface SocialAccountStatus {
  connected: boolean;
  expired?: boolean;
  label: string;
  details?: string;
}

export function SocialConnections() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Record<string, SocialAccountStatus>>({});
  const [multiAccounts, setMultiAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

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
  const [importAccountId, setImportAccountId] = useState("default");
  const [importJsonText, setImportJsonText] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  // Cloud Auth Modal
  const [cloudAuthOpen, setCloudAuthOpen] = useState(false);
  const [cloudAuthPlatform, setCloudAuthPlatform] = useState("");
  const [cloudAuthPlatformName, setCloudAuthPlatformName] = useState("");
  const [cloudAuthAccountId, setCloudAuthAccountId] = useState("default");
  const [cloudAuthAccountName, setCloudAuthAccountName] = useState("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/social");
      const data = await res.json();
      if (data.success) {
        if (data.accounts) setAccounts(data.accounts);
        if (data.multiAccounts) setMultiAccounts(data.multiAccounts);
        if (data.telegramChatId) setTelegramChatId(data.telegramChatId);
        if (data.facebookPages) setFacebookPages(data.facebookPages);
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

  const handleConnectNewAccount = (platform: string, platformName: string) => {
    if (platform === "telegram") {
      setShowTelegramConfig(true);
      return;
    }

    const currentPlatAccounts = multiAccounts.filter(a => a.platform === platform && a.connected);
    const newAccId = currentPlatAccounts.length === 0 ? "default" : `acc_${Date.now().toString(36)}`;
    const newAccName = `${platformName} #${currentPlatAccounts.length + 1}`;

    setCloudAuthPlatform(platform);
    setCloudAuthPlatformName(platformName);
    setCloudAuthAccountId(newAccId);
    setCloudAuthAccountName(newAccName);
    setCloudAuthOpen(true);
  };

  const handleReconnectAccount = (platform: string, platformName: string, accountId: string, accountName: string) => {
    setCloudAuthPlatform(platform);
    setCloudAuthPlatformName(platformName);
    setCloudAuthAccountId(accountId);
    setCloudAuthAccountName(accountName);
    setCloudAuthOpen(true);
  };

  const handleDisconnectAccount = async (platform: string, accountId: string, accountName: string) => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect_account", platform, accountId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Conta ${accountName} desconectada com sucesso.`);
        fetchStatus();
      } else {
        toast.error(data.error || "Erro ao desconectar conta.");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDisconnectAll = async (platform: string) => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", platform })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Todas as contas do ${platform} foram desconectadas.`);
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
          accountId: importAccountId,
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
    { key: "facebook", name: "Facebook Reels", icon: Facebook, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { key: "instagram", name: "Instagram Reels", icon: Instagram, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    { key: "tiktok", name: "TikTok", icon: Music2, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { key: "youtube", name: "YouTube Shorts", icon: Youtube, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { key: "pinterest", name: "Pinterest", icon: Pin, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    { key: "kwai", name: "Kwai", icon: Sparkles, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    { key: "threads", name: "Threads", icon: Share2, color: "text-foreground bg-secondary/50 border-border" },
    { key: "telegram", name: "Telegram", icon: Send, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" }
  ];

  const totalConnectedAccounts = multiAccounts.filter(a => a.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <span>Redes Sociais & Multi-Contas</span>
            <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px] font-bold">
              MULTI-PERFIS
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conecte múltiplas contas por plataforma. Dispare vídeos simultaneamente para redes inteiras de canais.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {totalConnectedAccounts} {totalConnectedAccounts === 1 ? "Conta Conectada" : "Contas Conectadas"}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grid de Plataformas e Multi-Contas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformsList.map((item) => {
          const Icon = item.icon;
          const status = accounts[item.key] || { connected: false, label: item.name };
          const platformAccounts = multiAccounts.filter(a => a.platform === item.key && a.connected);
          const hasExpired = platformAccounts.some(a => a.expired) || status.expired;
          const isBusy = connecting === item.key;

          return (
            <Card 
              key={item.key}
              className={`border transition-all duration-200 ${
                hasExpired
                  ? "border-amber-500/50 bg-amber-500/[0.04] shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/20"
                  : platformAccounts.length > 0 
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]" 
                  : "border-border/60 bg-card/40 hover:border-border"
              }`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-sm leading-none">{item.name}</h3>
                        {hasExpired && (
                          <Badge variant="outline" className="text-[9px] font-bold text-amber-400 border-amber-500/40 bg-amber-500/10 px-1 py-0">
                            ⚠️ EXPIRADO
                          </Badge>
                        )}
                        {platformAccounts.length > 1 && (
                          <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0">
                            {platformAccounts.length} contas
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`h-2 w-2 rounded-full ${hasExpired ? "bg-amber-400 animate-ping" : platformAccounts.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                        <span className={`text-[11px] font-medium ${hasExpired ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>
                          {hasExpired ? "Sessão Expirada" : platformAccounts.length > 0 ? `${platformAccounts.length} ${platformAccounts.length === 1 ? "conta conectada" : "contas conectadas"}` : "Nenhuma conta"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Contas Conectadas desta Rede */}
                {platformAccounts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {platformAccounts.map((acc) => (
                      <div 
                        key={acc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${acc.expired ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span className="font-semibold text-zinc-200 truncate">
                            {acc.name || acc.username || "Conta Principal"}
                          </span>
                          {acc.isDefault && (
                            <span className="text-[9px] text-zinc-400 bg-zinc-800 px-1 rounded shrink-0">
                              Padrão
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {acc.expired ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReconnectAccount(item.key, item.name, acc.id, acc.name)}
                              className="h-6 text-[10px] px-2 text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 font-bold gap-1"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                              Reconectar
                            </Button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleDisconnectAccount(item.key, acc.id, acc.name)}
                            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Desconectar esta conta"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ações do Card */}
                <div className="pt-2 border-t border-border/40 flex items-center gap-2 justify-between">
                  {platformAccounts.length > 0 ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectNewAccount(item.key, item.name)}
                        className="flex-1 h-8 text-xs font-semibold gap-1.5 border-dashed border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
                        title="Adicionar mais uma conta desta rede social"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        + Adicionar Conta
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportPlatform(item.key);
                          setImportAccountId(`acc_${Date.now().toString(36)}`);
                          setImportModalOpen(true);
                        }}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border border-border/40"
                        title="Importar Cookies JSON"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConnectNewAccount(item.key, item.name)}
                        disabled={isBusy}
                        className="flex-1 h-8 text-xs font-semibold gap-1.5 shadow-sm"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        Conectar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportPlatform(item.key);
                          setImportAccountId("default");
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
      {facebookPages.length > 0 && (
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
                className="flex items-center gap-3 p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] text-xs"
              >
                {pg.avatarUrl ? (
                  <img src={pg.avatarUrl} alt={pg.name} className="h-8 w-8 rounded-full object-cover border border-blue-400/40" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300">
                    {pg.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate flex-1">
                  <span className="font-semibold text-zinc-200 block truncate">{pg.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono block">ID: {pg.id}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configuração Telegram */}
      <Dialog open={showTelegramConfig} onOpenChange={setShowTelegramConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-400" />
              Configurar Telegram Bot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Insira o token do seu bot gerado pelo @BotFather e o Chat ID do seu canal ou grupo para disparos automáticos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bot Token</Label>
              <Input
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Chat ID do Canal / Grupo</Label>
              <Input
                placeholder="-1001234567890"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowTelegramConfig(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveTelegram} disabled={savingTelegram} className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white">
              {savingTelegram ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Salvar Conexão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação Manual de Cookies JSON */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <FileCode className="h-4 w-4 text-emerald-400" />
              Importar Cookies JSON ({importPlatform.toUpperCase()})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cole a lista de cookies exportada do <strong>Cookie-Editor</strong> para vincular a conta imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              rows={8}
              placeholder='[ { "name": "sessionid", "value": "..." }, ... ]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="bg-zinc-900 border-zinc-800 font-mono text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleImportSubmit} disabled={savingImport} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {savingImport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Salvar Cookies
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal do Navegador Visual Remoto */}
      <CloudAuthModal
        open={cloudAuthOpen}
        onOpenChange={setCloudAuthOpen}
        platform={cloudAuthPlatform}
        platformName={cloudAuthPlatformName}
        accountId={cloudAuthAccountId}
        accountName={cloudAuthAccountName}
        onSuccess={fetchStatus}
      />
    </div>
  );
}
