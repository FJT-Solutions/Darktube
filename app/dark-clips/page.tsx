"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Download,
  Upload,
  Play,
  Settings,
  Calendar,
  Clock,
  Layers,
  Wand2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  Eye,
  Sliders,
  Type,
  Maximize2,
  Palette,
  ShieldCheck,
  Video,
  FileText,
  Users,
  Film,
  Plus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DarkClipsPreviewPlayer } from "@/components/dark-clips-player";
import { DarkClip, DarkClipPreset, DarkClipPost, BlotatoAccount } from "@/lib/types";
import { getBlotatoAccountsAction } from "@/app/actions";
import { toast } from "sonner";

export default function DarkClipsPage() {
  const [activeTab, setActiveTab] = useState<"clips" | "modeler" | "schedule">("modeler");
  const [clips, setClips] = useState<DarkClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<DarkClip | null>(null);
  const [presets, setPresets] = useState<DarkClipPreset[]>([]);
  const [activePreset, setActivePreset] = useState<DarkClipPreset | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<DarkClipPost[]>([]);
  const [blotatoAccounts, setBlotatoAccounts] = useState<BlotatoAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual URLs Input
  const [urlInput, setUrlInput] = useState("");
  const [importingUrls, setImportingUrls] = useState(false);

  // AI Remodel State
  const [remodelingAi, setRemodelingAi] = useState(false);
  const [aiThemePrompt, setAiThemePrompt] = useState("");

  // Modeler Granular State
  const [profileHeader, setProfileHeader] = useState({
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "Dark Clips",
    handle: "@darkclips",
    badgeType: "blue" as "none" | "blue" | "gold" | "gray",
    showHeader: true,
    paddingTop: 90,
  });

  const [headline, setHeadline] = useState({
    mainText: 'MEU AMIGO: "COMPREI UM MIC NOVO, MANO."',
    subText: "O DESGRAÇADO ENTRANDO NA CALL:",
    fontFamily: 'Montserrat, Inter, sans-serif',
    fontSize: 40,
    primaryColor: "#FACC15",
    secondaryColor: "#FFFFFF",
    textAlign: "center" as "left" | "center" | "right",
    uppercase: true,
    textShadow: true,
  });

  const [videoPlacement, setVideoPlacement] = useState({
    yOffset: 54,
    scale: 92,
    borderRadius: 24,
    hasShadow: true,
    aspectRatio: "auto",
  });

  const [background, setBackground] = useState({
    type: "black" as "black" | "blur" | "gradient" | "color",
    blurIntensity: 25,
    overlayOpacity: 60,
    customColor: "#000000",
  });

  const [footer, setFooter] = useState({
    showFooter: false,
    text: "Sigam a melhor página de memes!",
    fontSize: 24,
    color: "#9CA3AF",
  });

  // Scheduling State
  const [targetAccounts, setTargetAccounts] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [postCaption, setPostCaption] = useState("");
  const [postHashtags, setPostHashtags] = useState<string[]>(["#memes", "#viral", "#humor", "#reels", "#fyp"]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [clipsRes, presetsRes, postsRes, accountsData] = await Promise.all([
        fetch("/api/dark-clips/import").then((r) => r.json()),
        fetch("/api/dark-clips/presets").then((r) => r.json()),
        fetch("/api/dark-clips/schedule").then((r) => r.json()),
        getBlotatoAccountsAction(),
      ]);

      if (clipsRes.success && clipsRes.clips) {
        setClips(clipsRes.clips);
        if (clipsRes.clips.length > 0 && !selectedClip) {
          setSelectedClip(clipsRes.clips[0]);
        }
      }

      if (presetsRes.success && presetsRes.presets) {
        setPresets(presetsRes.presets);
        if (presetsRes.presets.length > 0) {
          loadPresetIntoModeler(presetsRes.presets[0]);
        }
      }

      if (postsRes.success && postsRes.posts) {
        setScheduledPosts(postsRes.posts);
      }

      if (accountsData) {
        setBlotatoAccounts(accountsData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do Dark Clips.");
    } finally {
      setLoading(false);
    }
  }

  function loadPresetIntoModeler(preset: DarkClipPreset) {
    setActivePreset(preset);
    if (preset.profile_header) setProfileHeader((p) => ({ ...p, ...preset.profile_header }));
    if (preset.headline_style) setHeadline((h) => ({ ...h, ...preset.headline_style }));
    if (preset.video_placement) setVideoPlacement((v) => ({ ...v, ...preset.video_placement }));
    if (preset.background_style) setBackground((b) => ({ ...b, ...preset.background_style }));
    if (preset.footer_style) setFooter((f) => ({ ...f, ...preset.footer_style }));
    toast.success(`Preset "${preset.name}" aplicado!`);
  }

  async function handleSavePreset() {
    const name = prompt("Nome para este preset de layout:", activePreset?.name || "Meu Layout Viral");
    if (!name) return;

    try {
      const res = await fetch("/api/dark-clips/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          profile_header: profileHeader,
          headline_style: headline,
          video_placement: videoPlacement,
          background_style: background,
          footer_style: footer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Preset salvo com sucesso!");
        fetchInitialData();
      }
    } catch {
      toast.error("Erro ao salvar preset.");
    }
  }

  async function handleImportUrls() {
    if (!urlInput.trim()) return;
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    setImportingUrls(true);
    try {
      const res = await fetch("/api/dark-clips/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.count || urls.length} clipe(s) importados e sanitizados!`);
        setUrlInput("");
        fetchInitialData();
      } else {
        toast.error(data.error || "Erro na importação.");
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setImportingUrls(false);
    }
  }

  async function handleRemodelWithAi() {
    setRemodelingAi(true);
    try {
      const res = await fetch("/api/dark-clips/remodel-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalCaption: selectedClip?.original_caption || "",
          theme: aiThemePrompt,
          authorHandle: profileHeader.handle,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const { headline_main, headline_sub, cta_text, post_caption, hashtags } = result.data;
        if (headline_main) setHeadline((h) => ({ ...h, mainText: headline_main, subText: headline_sub || "" }));
        if (cta_text) setFooter((f) => ({ ...f, text: cta_text, showFooter: true }));
        if (post_caption) setPostCaption(post_caption);
        if (hashtags) setPostHashtags(hashtags);
        toast.success("✨ Remodelagem com GPT aplicada ao Canvas!");
      }
    } catch {
      toast.error("Erro ao remodelar com IA.");
    } finally {
      setRemodelingAi(false);
    }
  }

  async function handleRender() {
    if (!selectedClip?.video_url) {
      toast.error("Selecione um clipe de vídeo para renderizar.");
      return;
    }

    setIsRendering(true);
    try {
      const res = await fetch("/api/dark-clips/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId: selectedClip.id,
          title: headline.mainText || "Dark Clip Meme",
          durationInSeconds: selectedClip.duration || 15,
          inputProps: {
            videoUrl: selectedClip.video_url,
            durationInSeconds: selectedClip.duration || 15,
            profileHeader,
            headline,
            videoPlacement,
            background,
            footer,
          },
          remodelData: {
            headline_main: headline.mainText,
            headline_sub: headline.subText,
            cta_text: footer.text,
            post_caption: postCaption,
            hashtags: postHashtags,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setRenderedUrl(data.videoUrl);
        toast.success("🎉 Vídeo MP4 1080x1920 renderizado com sucesso!");
        fetchInitialData();
      } else {
        toast.error(data.error || "Erro ao renderizar.");
      }
    } catch {
      toast.error("Falha no renderizador Remotion.");
    } finally {
      setIsRendering(false);
    }
  }

  async function handleSchedulePost(dispatchNow = false) {
    if (!selectedClip) {
      toast.error("Selecione um clipe.");
      return;
    }

    try {
      const scheduledDateTime = scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}:00` : new Date().toISOString();
      const res = await fetch("/api/dark-clips/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId: selectedClip.id,
          title: headline.mainText || "Meme Dark Clips",
          renderedVideoUrl: renderedUrl || selectedClip.video_url,
          remodelData: {
            headline_main: headline.mainText,
            headline_sub: headline.subText,
            cta_text: footer.text,
            post_caption: postCaption,
            hashtags: postHashtags,
          },
          scheduledAt: scheduledDateTime,
          targetAccounts,
          dispatchNow,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(dispatchNow ? "🚀 Publicação despachada com sucesso!" : "📅 Publicação agendada!");
        fetchInitialData();
      }
    } catch {
      toast.error("Erro ao salvar agendamento.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">

        {/* ── Top Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight">Dark Clips</h1>
                <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 font-bold text-[10px]">
                  REMODELAGEM VIRAL 9:16
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> ANTI-SHADOWBAN
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                Minerador em massa com extensão V3, estúdio de modelagem visual, inteligência artificial GPT-4o e postagem automática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePreset}
              className="border-border hover:bg-secondary/40 text-xs gap-1.5 h-9"
            >
              <Layers className="h-3.5 w-3.5" />
              Salvar Layout
            </Button>
            <Button
              size="sm"
              onClick={handleRender}
              disabled={isRendering || !selectedClip}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 h-9 shadow-md shadow-red-600/20"
            >
              {isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
              {isRendering ? "Renderizando MP4..." : "Renderizar Vídeo"}
            </Button>
          </div>
        </div>

        {/* ── Main Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="bg-secondary/20 p-1 border border-border/50 rounded-xl grid grid-cols-3 max-w-md">
            <TabsTrigger value="modeler" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              <Sliders className="h-3.5 w-3.5" />
              Modelador 9:16
            </TabsTrigger>
            <TabsTrigger value="clips" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              <Video className="h-3.5 w-3.5" />
              Clipes ({clips.length})
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              <Calendar className="h-3.5 w-3.5" />
              Agendamento ({scheduledPosts.length})
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: MODELADOR VISUAL 9:16 (CANVAS & REALTIME PREVIEW)
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="modeler" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── Left Column: Granular Controls (7 cols) ── */}
              <div className="lg:col-span-7 space-y-6">

                {/* AI Remodel Box */}
                <Card className="border-red-500/20 bg-gradient-to-r from-red-950/10 via-background to-background">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2 text-red-400">
                        <Wand2 className="h-4 w-4" /> Remodelagem Inteligente com GPT-4o
                      </span>
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                        Chave do Usuário
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Reescreva a headline, crie uma punchline viral e gere legendas automáticas baseando-se no clipe selecionado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Meme de amigo na call do Discord / Situação de trabalho..."
                        value={aiThemePrompt}
                        onChange={(e) => setAiThemePrompt(e.target.value)}
                        className="text-xs h-9 bg-secondary/30"
                      />
                      <Button
                        size="sm"
                        onClick={handleRemodelWithAi}
                        disabled={remodelingAi}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 shrink-0 h-9"
                      >
                        {remodelingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {remodelingAi ? "Gerando..." : "Remodelar com IA"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 1. Header do Perfil */}
                <Card>
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Header do Perfil (Autor / Sua Página)
                      </CardTitle>
                      <CardDescription className="text-xs">Personalize o avatar, arroba e selo verificado.</CardDescription>
                    </div>
                    <Switch
                      checked={profileHeader.showHeader}
                      onCheckedChange={(v) => setProfileHeader((p) => ({ ...p, showHeader: v }))}
                    />
                  </CardHeader>
                  {profileHeader.showHeader && (
                    <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Nome de Exibição</Label>
                        <Input
                          value={profileHeader.name}
                          onChange={(e) => setProfileHeader((p) => ({ ...p, name: e.target.value }))}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">@Username</Label>
                        <Input
                          value={profileHeader.handle}
                          onChange={(e) => setProfileHeader((p) => ({ ...p, handle: e.target.value }))}
                          className="h-8 text-xs mt-1 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">URL da Foto de Perfil / Avatar</Label>
                        <Input
                          value={profileHeader.avatarUrl}
                          onChange={(e) => setProfileHeader((p) => ({ ...p, avatarUrl: e.target.value }))}
                          className="h-8 text-xs mt-1 font-mono"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Selo de Verificado</Label>
                        <div className="flex gap-2 mt-1">
                          {(["blue", "gold", "none"] as const).map((b) => (
                            <Button
                              key={b}
                              size="sm"
                              variant={profileHeader.badgeType === b ? "default" : "outline"}
                              onClick={() => setProfileHeader((p) => ({ ...p, badgeType: b }))}
                              className="h-8 text-xs flex-1 capitalize"
                            >
                              {b === "blue" ? "Azul" : b === "gold" ? "Dourado" : "Nenhum"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 2. Headline & Tipografia */}
                <Card>
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" /> Headline & Textos do Meme
                    </CardTitle>
                    <CardDescription className="text-xs">Edite a chamada principal e a punchline do vídeo.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Texto Principal (Setup / Chamada)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Cor:</span>
                          <input
                            type="color"
                            value={headline.primaryColor}
                            onChange={(e) => setHeadline((h) => ({ ...h, primaryColor: e.target.value }))}
                            className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHeadline((h) => ({ ...h, primaryColor: "#FACC15" }))}
                            className="h-5 px-1.5 text-[9px] text-yellow-400 border-yellow-500/30"
                          >
                            Amarelo Viral
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={headline.mainText}
                        onChange={(e) => setHeadline((h) => ({ ...h, mainText: e.target.value }))}
                        rows={2}
                        className="text-xs mt-1 font-bold uppercase resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Texto Secundário (Punchline / Reação)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Cor:</span>
                          <input
                            type="color"
                            value={headline.secondaryColor}
                            onChange={(e) => setHeadline((h) => ({ ...h, secondaryColor: e.target.value }))}
                            className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                          />
                        </div>
                      </div>
                      <Input
                        value={headline.subText}
                        onChange={(e) => setHeadline((h) => ({ ...h, subText: e.target.value }))}
                        className="h-8 text-xs mt-1 font-semibold uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
                      <div>
                        <Label className="text-xs font-semibold">Tamanho da Fonte ({headline.fontSize}px)</Label>
                        <Slider
                          value={[headline.fontSize]}
                          min={24}
                          max={64}
                          step={2}
                          onValueChange={([v]) => setHeadline((h) => ({ ...h, fontSize: v }))}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Alinhamento</Label>
                        <div className="flex gap-1 mt-1">
                          {(["left", "center", "right"] as const).map((a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant={headline.textAlign === a ? "default" : "outline"}
                              onClick={() => setHeadline((h) => ({ ...h, textAlign: a }))}
                              className="h-8 text-xs flex-1 capitalize"
                            >
                              {a === "left" ? "Esq" : a === "center" ? "Centro" : "Dir"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <Label className="text-xs font-semibold">MAIÚSCULAS</Label>
                        <Switch
                          checked={headline.uppercase}
                          onCheckedChange={(v) => setHeadline((h) => ({ ...h, uppercase: v }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Enquadramento do Vídeo & Fundo */}
                <Card>
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Maximize2 className="h-4 w-4 text-primary" /> Enquadramento do Vídeo & Fundo do Canvas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Posição Vertical Y ({videoPlacement.yOffset}%)</Label>
                        <Slider
                          value={[videoPlacement.yOffset]}
                          min={30}
                          max={80}
                          step={1}
                          onValueChange={([v]) => setVideoPlacement((p) => ({ ...p, yOffset: v }))}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Largura / Escala ({videoPlacement.scale}%)</Label>
                        <Slider
                          value={[videoPlacement.scale]}
                          min={60}
                          max={100}
                          step={1}
                          onValueChange={([v]) => setVideoPlacement((p) => ({ ...p, scale: v }))}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Cantos Arredondados ({videoPlacement.borderRadius}px)</Label>
                        <Slider
                          value={[videoPlacement.borderRadius]}
                          min={0}
                          max={48}
                          step={2}
                          onValueChange={([v]) => setVideoPlacement((p) => ({ ...p, borderRadius: v }))}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Tipo de Fundo</Label>
                        <div className="flex gap-1.5 mt-1">
                          {(["black", "blur", "gradient"] as const).map((t) => (
                            <Button
                              key={t}
                              size="sm"
                              variant={background.type === t ? "default" : "outline"}
                              onClick={() => setBackground((b) => ({ ...b, type: t }))}
                              className="h-8 text-xs flex-1 capitalize"
                            >
                              {t === "black" ? "Preto" : t === "blur" ? "Video Blur" : "Gradiente"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* ── Right Column: Live Remotion Preview Player (5 cols) ── */}
              <div className="lg:col-span-5 sticky top-6 space-y-4">
                <Card className="overflow-hidden border-border bg-card/50 backdrop-blur-md">
                  <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Film className="h-4 w-4 text-red-500" /> Preview Interativo 9:16
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        {selectedClip ? `${selectedClip.author_handle || selectedClip.author_name} · ${selectedClip.duration}s` : "Nenhum vídeo selecionado"}
                      </CardDescription>

                    </div>
                    {renderedUrl && (
                      <a href={renderedUrl} download={`darkclip_${Date.now()}.mp4`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-emerald-400 border-emerald-500/30">
                          <Download className="h-3 w-3" /> Baixar MP4
                        </Button>
                      </a>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-border/60 bg-black">
                      <DarkClipsPreviewPlayer
                        videoUrl={selectedClip?.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                        durationInSeconds={selectedClip?.duration || 15}
                        profileHeader={profileHeader}
                        headline={headline}
                        videoPlacement={videoPlacement}
                        background={background}
                        footer={footer}
                      />
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0 border-t border-border/40 flex gap-2 justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">1080 x 1920 (9:16 Vertical HD)</span>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("schedule")}
                      className="gap-1.5 bg-primary text-primary-foreground font-bold text-xs h-8"
                    >
                      Avançar p/ Agendamento <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════
              TAB 2: CLIPES MINERADOS & IMPORTAÇÃO
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="clips" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Import Card */}
              <Card className="lg:col-span-1 border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" /> Importar URLs em Lote
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cole múltiplos links do Instagram Reels, TikTok, YouTube Shorts ou X (um por linha).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <Textarea
                    placeholder="https://www.instagram.com/reel/...&#10;https://www.tiktok.com/@user/video/...&#10;https://youtube.com/shorts/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    rows={6}
                    className="text-xs font-mono resize-none"
                  />
                  <Button
                    onClick={handleImportUrls}
                    disabled={importingUrls || !urlInput.trim()}
                    className="w-full text-xs font-bold gap-1.5 h-9"
                  >
                    {importingUrls ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {importingUrls ? "Baixando & Sanitizando..." : "Baixar & Sanitizar Clipes"}
                  </Button>

                  <div className="rounded-lg bg-secondary/30 p-3 border border-border/40 text-[11px] space-y-1 text-muted-foreground">
                    <p className="font-bold text-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sanitização Automática
                    </p>
                    <p>Todos os vídeos importados têm metadados EXIF eliminados para proteção anti-shadowban.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Clips Grid */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" /> Biblioteca de Clipes ({clips.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={fetchInitialData} className="h-8 text-xs gap-1">
                    <RefreshCw className="h-3 w-3" /> Atualizar
                  </Button>
                </div>

                {clips.length === 0 ? (
                  <div className="text-center py-16 border rounded-xl bg-card border-dashed">
                    <Film className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-semibold">Nenhum clipe minerado ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use o painel ao lado para colar links ou instale a extensão Dark Clips no Chrome.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {clips.map((clip) => {
                      const isSelected = selectedClip?.id === clip.id;
                      return (
                        <div
                          key={clip.id}
                          onClick={() => {
                            setSelectedClip(clip);
                            setActiveTab("modeler");
                          }}
                          className={`group cursor-pointer rounded-xl border p-3 bg-card transition-all relative overflow-hidden flex flex-col justify-between ${
                            isSelected ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary" : "border-border hover:border-border/80"
                          }`}
                        >
                          <div>
                            <div className="aspect-[9/16] max-h-[160px] rounded-lg overflow-hidden bg-black relative mb-2">
                              {clip.thumbnail_url ? (
                                <img src={clip.thumbnail_url} alt="Thumb" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Play className="h-6 w-6" />
                                </div>
                              )}
                              <Badge className="absolute bottom-1 right-1 text-[9px] px-1 py-0 bg-black/70">
                                {clip.duration}s
                              </Badge>
                              <Badge variant="secondary" className="absolute top-1 left-1 text-[8px] px-1 py-0 uppercase">
                                {clip.platform}
                              </Badge>
                            </div>

                            <p className="font-bold text-xs truncate text-primary">{clip.author_handle || clip.author_name}</p>

                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {clip.original_caption || clip.original_url}
                            </p>
                          </div>

                          <Button size="sm" variant={isSelected ? "default" : "outline"} className="w-full text-xs mt-3 h-7">
                            {isSelected ? "Modelando Agora" : "Modelar este Clipe"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════
              TAB 3: AGENDAMENTO & PUBLICAÇÃO AUTOMÁTICA
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form Scheduling (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Programação de Postagem
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Escolha data, horário e as contas de destino conectadas no Blotato.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    
                    {/* Destination Accounts */}
                    <div>
                      <Label className="text-xs font-semibold">Contas de Destino (Blotato)</Label>
                      {blotatoAccounts.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nenhuma conta Blotato conectada em <a href="/credentials" className="text-primary underline">Credenciais</a>.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {blotatoAccounts.map((acc) => {
                            const isChecked = targetAccounts.includes(acc.id);
                            return (
                              <button
                                key={acc.id}
                                onClick={() => {
                                  if (isChecked) setTargetAccounts((prev) => prev.filter((id) => id !== acc.id));
                                  else setTargetAccounts((prev) => [...prev, acc.id]);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isChecked
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/40 text-muted-foreground border-border"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3" />}
                                {acc.label || acc.page_name || acc.platform}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Data</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Horário</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>

                    {/* Post Caption */}
                    <div>
                      <Label className="text-xs font-semibold">Legenda do Post</Label>
                      <Textarea
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder="Escreva ou gere com IA a legenda envolvente..."
                        rows={3}
                        className="text-xs mt-1 resize-none"
                      />
                    </div>

                    {/* Hashtags */}
                    <div>
                      <Label className="text-xs font-semibold">Hashtags</Label>
                      <Input
                        value={postHashtags.join(" ")}
                        onChange={(e) => setPostHashtags(e.target.value.split(" ").filter(Boolean))}
                        className="h-8 text-xs mt-1 font-mono text-primary"
                      />
                    </div>

                    {/* Dispatch Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => handleSchedulePost(false)}
                        className="flex-1 text-xs font-bold gap-1.5 h-9"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Agendar Postagem
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleSchedulePost(true)}
                        className="flex-1 text-xs font-bold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Publicar Agora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scheduled Posts History (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Fila de Postagens ({scheduledPosts.length})
                </h3>

                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-16 border rounded-xl bg-card border-dashed">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">Nenhuma postagem agendada no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledPosts.map((post) => (
                      <div key={post.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">{post.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("pt-BR") : "Post Imediato"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={post.status === "published" ? "default" : "secondary"}
                            className="text-[9px] uppercase"
                          >
                            {post.status}
                          </Badge>
                          {post.rendered_video_url && (
                            <a href={post.rendered_video_url} target="_blank" rel="noreferrer" download>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Baixar Vídeo">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
}
