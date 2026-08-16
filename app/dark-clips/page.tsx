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
  Shield,
  Image as ImageIcon,
  Video,
  FileText,
  Users,
  Film,
  Plus,
  Loader2,
  AlertCircle,
  BookmarkCheck,
  CheckCircle2,
  ArrowRight,
  FolderPlus,
  Move,
  Navigation
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DarkClipsPreviewPlayer } from "@/components/dark-clips-player";
import { DarkClip, DarkClipPreset, DarkClipPost, BlotatoAccount, DarkClipArrowItem } from "@/lib/types";
import { getBlotatoAccountsAction } from "@/app/actions";
import { toast } from "sonner";

export default function DarkClipsPage() {
  // Main Tab Navigation: "modeler" (🎨 Layout & Templates) | "creation" (🎬 Criação & Clipes)
  const [activeTab, setActiveTab] = useState<"modeler" | "creation">("modeler");
  
  // Data States
  const [clips, setClips] = useState<DarkClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<DarkClip | null>(null);
  const [presets, setPresets] = useState<DarkClipPreset[]>([]);
  const [activePreset, setActivePreset] = useState<DarkClipPreset | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<DarkClipPost[]>([]);
  const [blotatoAccounts, setBlotatoAccounts] = useState<BlotatoAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Preset Save Dialog State
  const [isSaveLayoutDialogOpen, setIsSaveLayoutDialogOpen] = useState(false);
  const [layoutNameInput, setLayoutNameInput] = useState("");
  const [isDefaultLayoutInput, setIsDefaultLayoutInput] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  // Manual URLs Input
  const [urlInput, setUrlInput] = useState("");
  const [importingUrls, setImportingUrls] = useState(false);

  // Avatar and Watermark Upload Refs
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const watermarkFileInputRef = React.useRef<HTMLInputElement>(null);

  // AI Remodel State
  const [remodelingAi, setRemodelingAi] = useState(false);
  const [aiThemePrompt, setAiThemePrompt] = useState("");

  // Modeler Granular State
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string>("/sample-oceans.mp4");
  const [profileHeader, setProfileHeader] = useState({
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "Dark Clips",
    handle: "@darkclips",
    badgeType: "blue" as "none" | "blue",
    showHeader: true,
    paddingTop: 90,
    textAlign: "left" as "left" | "center" | "right",
    scale: 100,
    avatarSize: 76,
    fontSize: 32,
  });

  const [headline, setHeadline] = useState({
    mainText: 'Meu amigo: "Comprei um mic novo, mano."',
    subText: "O desgraçado entrando na call:",
    showMainText: true,
    showSubText: true,
    fontFamily: 'Montserrat, Inter, sans-serif',
    fontSize: 40,
    primaryColor: "#FACC15",
    secondaryColor: "#FFFFFF",
    textAlign: "center" as "left" | "center" | "right",
    mainTextAlign: "center" as "left" | "center" | "right",
    subTextAlign: "center" as "left" | "center" | "right",
    uppercase: true,
    mainTextUppercase: true,
    subTextUppercase: true,
    textShadow: true,
    mainTextYOffset: 17,
    subTextYOffset: 25,
  });

  const [watermark, setWatermark] = useState({
    enabled: false,
    type: "text" as "text" | "image" | "both",
    shape: "circle" as "circle" | "rounded" | "square",
    text: "@darkclips",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    position: "bottom-right" as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "custom",
    xOffset: 85,
    yOffset: 92,
    opacity: 70,
    fontSize: 22,
    imageSize: 44,
    scale: 100,
    color: "#FFFFFF",
    hasShadow: true,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  });

  // Bi-directional Auto-Scroll & Card Highlight State
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);

  const handleLayerFocus = (
    layer: "header" | "headline" | "video" | "watermark" | "footer" | "arrows",
    arrowIndex?: number
  ) => {
    if (layer === "arrows" && typeof arrowIndex === "number") {
      setSelectedArrowIndex(arrowIndex);
    }

    const targetCardId =
      layer === "header"
        ? "card-header"
        : layer === "headline"
        ? "card-headline"
        : layer === "video"
        ? "card-video"
        : layer === "watermark"
        ? "card-watermark"
        : layer === "footer"
        ? "card-footer"
        : layer === "arrows"
        ? "card-arrows"
        : null;

    if (targetCardId) {
      setHighlightedCard(targetCardId);
      const el = document.getElementById(targetCardId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(() => {
        setHighlightedCard((curr) => (curr === targetCardId ? null : curr));
      }, 1800);
    }
  };

  const [videoPlacement, setVideoPlacement] = useState({
    yOffset: 54,
    scale: 92,
    borderRadius: 24,
    hasShadow: true,
    aspectRatio: "auto",
  });

  const [background, setBackground] = useState({
    type: "black" as "black" | "white" | "blur" | "gradient" | "neon" | "zinc" | "color",
    blurIntensity: 25,
    overlayOpacity: 60,
    customColor: "#000000",
  });

  const [footer, setFooter] = useState({
    showFooter: false,
    text: "Sigam a melhor página de memes!",
    fontSize: 26,
    color: "#9CA3AF",
    yOffset: 92,
    textAlign: "center" as "left" | "center" | "right",
    scale: 100,
  });

  // Arrows state (supports multiple containers with independent counts and positions)
  const [arrowsList, setArrowsList] = useState<DarkClipArrowItem[]>([
    {
      id: "arrow-1",
      enabled: false,
      direction: "right",
      style: "trail",
      count: 2,
      xOffset: 82,
      yOffset: 65,
      color: "#FE2C55",
      size: 40,
      scale: 100,
      text: "Siga!",
      textColor: "#FFFFFF",
    },
  ]);
  const [selectedArrowIndex, setSelectedArrowIndex] = useState<number>(0);

  const currentArrow = arrowsList[selectedArrowIndex] || arrowsList[0] || {
    id: "arrow-1",
    enabled: true,
    direction: "right" as const,
    style: "trail" as const,
    count: 2,
    xOffset: 82,
    yOffset: 65,
    color: "#FE2C55",
    size: 40,
    scale: 100,
    text: "Siga!",
    textColor: "#FFFFFF",
  };

  const isAnyArrowEnabled = arrowsList.some((a) => a.enabled !== false);

  function handleToggleAllArrows(enabled: boolean) {
    setArrowsList((prev) =>
      prev.map((item) => ({ ...item, enabled }))
    );
  }

  function handleUpdateSelectedArrow(updates: Partial<DarkClipArrowItem>) {
    setArrowsList((prev) =>
      prev.map((item, idx) => (idx === selectedArrowIndex ? { ...item, ...updates } : item))
    );
  }

  function handleAddArrowContainer() {
    const newId = `arrow-${Date.now()}`;
    const newIdx = arrowsList.length;
    const presetsSuggestions = [
      { dir: "down" as const, x: 50, y: 84, text: "Assista!" },
      { dir: "up" as const, x: 22, y: 15, text: "Confira!" },
      { dir: "down-right" as const, x: 80, y: 75, text: "Clique!" },
    ];
    const suggestion = presetsSuggestions[newIdx % presetsSuggestions.length];

    const newContainer: DarkClipArrowItem = {
      id: newId,
      enabled: true,
      direction: suggestion.dir,
      style: "trail",
      count: 2,
      xOffset: suggestion.x,
      yOffset: suggestion.y,
      color: "#FE2C55",
      size: 40,
      scale: 100,
      text: suggestion.text,
      textColor: "#FFFFFF",
    };

    setArrowsList((prev) => [...prev, newContainer]);
    setSelectedArrowIndex(newIdx);
    toast.success(`Container de Setas #${newIdx + 1} adicionado!`);
  }

  function handleDuplicateArrowContainer(index: number) {
    const target = arrowsList[index];
    if (!target) return;
    const newContainer: DarkClipArrowItem = {
      ...target,
      id: `arrow-${Date.now()}`,
      xOffset: Math.min(95, (target.xOffset ?? 82) + 5),
      yOffset: Math.min(95, (target.yOffset ?? 65) + 5),
    };
    const newIdx = arrowsList.length;
    setArrowsList((prev) => [...prev, newContainer]);
    setSelectedArrowIndex(newIdx);
    toast.success(`Container duplicado como #${newIdx + 1}!`);
  }

  function handleRemoveArrowContainer(index: number) {
    if (arrowsList.length <= 1) {
      setArrowsList([
        {
          id: "arrow-1",
          enabled: false,
          direction: "right",
          style: "trail",
          count: 2,
          xOffset: 82,
          yOffset: 65,
          color: "#FE2C55",
          size: 40,
          scale: 100,
          text: "Siga!",
          textColor: "#FFFFFF",
        },
      ]);
      setSelectedArrowIndex(0);
      return;
    }
    setArrowsList((prev) => prev.filter((_, i) => i !== index));
    setSelectedArrowIndex((prev) => Math.max(0, Math.min(prev, arrowsList.length - 2)));
    toast.success(`Container #${index + 1} removido.`);
  }

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
          const defaultPreset = presetsRes.presets.find((p: DarkClipPreset) => p.is_default) || presetsRes.presets[0];
          loadPresetIntoModeler(defaultPreset);
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
    if (preset.profile_header) {
      setProfileHeader((p) => ({
        ...p,
        showHeader: preset.profile_header.show_header ?? preset.profile_header.showHeader ?? p.showHeader,
        name: preset.profile_header.name ?? p.name,
        handle: preset.profile_header.handle ?? p.handle,
        avatarUrl: preset.profile_header.avatar_url ?? preset.profile_header.avatarUrl ?? p.avatarUrl,
        paddingTop: preset.profile_header.padding_top ?? preset.profile_header.paddingTop ?? p.paddingTop,
        scale: preset.profile_header.scale ?? p.scale,
        avatarSize: preset.profile_header.avatar_size ?? preset.profile_header.avatarSize ?? p.avatarSize,
        fontSize: preset.profile_header.font_size ?? preset.profile_header.fontSize ?? p.fontSize,
        textAlign: (preset.profile_header.textAlign || preset.profile_header.text_align || p.textAlign) as any,
        badgeType: (preset.profile_header.badge_type || preset.profile_header.badgeType || p.badgeType) as any,
      }));
    }
    if (preset.headline_style) {
      setHeadline((h) => ({
        ...h,
        fontSize: preset.headline_style.font_size ?? preset.headline_style.fontSize ?? h.fontSize,
        primaryColor: preset.headline_style.primary_color ?? preset.headline_style.primaryColor ?? h.primaryColor,
        secondaryColor: preset.headline_style.secondary_color ?? preset.headline_style.secondaryColor ?? h.secondaryColor,
        textAlign: (preset.headline_style.textAlign || preset.headline_style.text_align || h.textAlign) as any,
        mainTextAlign: (preset.headline_style.mainTextAlign || preset.headline_style.main_text_align || h.mainTextAlign) as any,
        subTextAlign: (preset.headline_style.subTextAlign || preset.headline_style.sub_text_align || h.subTextAlign) as any,
        uppercase: preset.headline_style.uppercase ?? h.uppercase,
        mainTextUppercase: preset.headline_style.mainTextUppercase ?? preset.headline_style.main_text_uppercase ?? h.mainTextUppercase,
        subTextUppercase: preset.headline_style.subTextUppercase ?? preset.headline_style.sub_text_uppercase ?? h.subTextUppercase,
        textShadow: preset.headline_style.textShadow ?? preset.headline_style.text_shadow ?? h.textShadow,
        mainTextYOffset: preset.headline_style.mainTextYOffset ?? preset.headline_style.main_text_y_offset ?? h.mainTextYOffset,
        subTextYOffset: preset.headline_style.subTextYOffset ?? preset.headline_style.sub_text_y_offset ?? h.subTextYOffset,
        showMainText: preset.headline_style.showMainText ?? preset.headline_style.show_main_text ?? h.showMainText,
        showSubText: preset.headline_style.showSubText ?? preset.headline_style.show_sub_text ?? h.showSubText,
      }));
    }
    if (preset.video_placement) {
      setVideoPlacement((v) => ({
        ...v,
        yOffset: preset.video_placement.y_offset ?? preset.video_placement.yOffset ?? v.yOffset,
        scale: preset.video_placement.scale ?? v.scale,
        borderRadius: preset.video_placement.border_radius ?? preset.video_placement.borderRadius ?? v.borderRadius,
        hasShadow: preset.video_placement.has_shadow ?? preset.video_placement.hasShadow ?? v.hasShadow,
      }));
    }
    if (preset.background_style) {
      setBackground((b) => ({
        ...b,
        type: (preset.background_style.type || b.type) as any,
        blurIntensity: preset.background_style.blur_intensity ?? b.blurIntensity,
        overlayOpacity: preset.background_style.overlay_opacity ?? b.overlayOpacity,
        customColor: preset.background_style.custom_color ?? b.customColor,
      }));
    }
    if (preset.watermark_style) {
      setWatermark((w) => ({
        ...w,
        enabled: preset.watermark_style?.enabled ?? w.enabled,
        type: (preset.watermark_style?.type || w.type) as any,
        shape: (preset.watermark_style?.shape || w.shape) as any,
        text: preset.watermark_style?.text ?? w.text,
        imageUrl: preset.watermark_style?.imageUrl ?? preset.watermark_style?.image_url ?? w.imageUrl,
        position: (preset.watermark_style?.position || w.position) as any,
        xOffset: preset.watermark_style?.xOffset ?? preset.watermark_style?.x_offset ?? w.xOffset,
        yOffset: preset.watermark_style?.yOffset ?? preset.watermark_style?.y_offset ?? w.yOffset,
        opacity: preset.watermark_style?.opacity ?? w.opacity,
        fontSize: preset.watermark_style?.fontSize ?? preset.watermark_style?.font_size ?? w.fontSize,
        imageSize: preset.watermark_style?.imageSize ?? preset.watermark_style?.image_size ?? w.imageSize,
        scale: preset.watermark_style?.scale ?? w.scale,
        color: preset.watermark_style?.color ?? w.color,
        hasShadow: preset.watermark_style?.hasShadow ?? preset.watermark_style?.has_shadow ?? w.hasShadow,
        borderWidth: preset.watermark_style?.borderWidth ?? preset.watermark_style?.border_width ?? w.borderWidth,
        borderColor: preset.watermark_style?.borderColor ?? preset.watermark_style?.border_color ?? w.borderColor,
      }));
    }
    if (preset.footer_style) {
      setFooter((f) => ({
        ...f,
        showFooter: preset.footer_style.show_footer ?? preset.footer_style.showFooter ?? f.showFooter,
        text: preset.footer_style.text ?? f.text,
        fontSize: preset.footer_style.font_size ?? preset.footer_style.fontSize ?? f.fontSize,
        color: preset.footer_style.color ?? f.color,
        yOffset: preset.footer_style.y_offset ?? preset.footer_style.yOffset ?? f.yOffset ?? 92,
        textAlign: (preset.footer_style.text_align || preset.footer_style.textAlign || f.textAlign) as any,
        scale: preset.footer_style.scale ?? f.scale ?? 100,
      }));
    }
    if (preset.arrows_list && Array.isArray(preset.arrows_list) && preset.arrows_list.length > 0) {
      setArrowsList(
        preset.arrows_list.map((item, i) => ({
          id: item.id || `arrow-${i + 1}`,
          enabled: item.enabled ?? true,
          direction: item.direction || "right",
          style: item.style || "trail",
          count: item.count ?? 2,
          xOffset: item.x_offset ?? item.xOffset ?? 82,
          yOffset: item.y_offset ?? item.yOffset ?? 65,
          color: item.color || "#FE2C55",
          size: item.size ?? 40,
          scale: item.scale ?? 100,
          text: item.text ?? "Siga!",
          textColor: item.text_color ?? item.textColor ?? "#FFFFFF",
        }))
      );
      setSelectedArrowIndex(0);
    } else if (preset.arrows_style) {
      setArrowsList([
        {
          id: "arrow-1",
          enabled: preset.arrows_style.enabled ?? false,
          direction: preset.arrows_style.direction || "right",
          style: preset.arrows_style.style || "trail",
          count: preset.arrows_style.count ?? 2,
          xOffset: preset.arrows_style.x_offset ?? preset.arrows_style.xOffset ?? 82,
          yOffset: preset.arrows_style.y_offset ?? preset.arrows_style.yOffset ?? 65,
          color: preset.arrows_style.color || "#FE2C55",
          size: preset.arrows_style.size ?? 40,
          scale: preset.arrows_style.scale ?? 100,
          text: preset.arrows_style.text ?? "Siga!",
          textColor: preset.arrows_style.text_color ?? preset.arrows_style.textColor ?? "#FFFFFF",
        },
      ]);
      setSelectedArrowIndex(0);
    }
    toast.success(`Layout "${preset.name}" carregado!`);
  }

  // Quick save current active preset
  async function handleQuickSavePreset(showToastNotification = true) {
    if (!activePreset?.id) {
      // If no active preset, open modal to name it
      setLayoutNameInput("Meu Layout 9:16");
      setIsSaveLayoutDialogOpen(true);
      return;
    }

    setSavingPreset(true);
    try {
      const res = await fetch("/api/dark-clips/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activePreset.id,
          name: activePreset.name,
          profile_header: profileHeader,
          headline_style: headline,
          video_placement: videoPlacement,
          background_style: background,
          watermark_style: watermark,
          footer_style: footer,
          arrows_style: arrowsList[0] || {},
          arrows_list: arrowsList,
          is_default: activePreset.is_default,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (showToastNotification) {
          toast.success(`Layout "${activePreset.name}" salvo com sucesso! 💾`);
        }
        fetchInitialData();
        return true;
      } else {
        toast.error("Erro ao salvar layout.");
        return false;
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
      return false;
    } finally {
      setSavingPreset(false);
    }
  }

  // Save preset with custom name (New or Duplicate)
  async function handleSavePresetSubmit(customName: string, isDefault = false) {
    if (!customName.trim()) {
      toast.error("Digite um nome para o layout.");
      return;
    }

    setSavingPreset(true);
    try {
      const res = await fetch("/api/dark-clips/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName.trim(),
          profile_header: profileHeader,
          headline_style: headline,
          video_placement: videoPlacement,
          background_style: background,
          watermark_style: watermark,
          footer_style: footer,
          arrows_style: arrowsList[0] || {},
          arrows_list: arrowsList,
          is_default: isDefault,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Layout "${customName}" salvo com sucesso! 💾`);
        if (data.preset) {
          setActivePreset(data.preset);
        }
        setIsSaveLayoutDialogOpen(false);
        fetchInitialData();
      } else {
        toast.error(data.error || "Erro ao salvar layout.");
      }
    } catch {
      toast.error("Erro ao salvar layout.");
    } finally {
      setSavingPreset(false);
    }
  }

  // Delete preset
  async function handleDeletePreset(presetId: string) {
    if (!confirm("Deseja realmente excluir este layout?")) return;
    try {
      const res = await fetch(`/api/dark-clips/presets?id=${presetId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Layout excluído.");
        fetchInitialData();
      }
    } catch {
      toast.error("Erro ao excluir layout.");
    }
  }

  // Proceed from Modeler to Creation Tab
  async function handleProceedToCreation() {
    await handleQuickSavePreset(false);
    setActiveTab("creation");
    toast.success("Layout ativo aplicado! Avançando para a Criação de Clipes 🎬");
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

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setProfileHeader((p) => ({ ...p, avatarUrl: result }));
        setWatermark((w) => {
          // Se a marca d'água não tiver imagem customizada ou for a foto antiga, atualiza automaticamente
          if (!w.imageUrl || w.imageUrl === profileHeader.avatarUrl) {
            return { ...w, imageUrl: result };
          }
          return w;
        });
        toast.success("Foto de perfil carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteAvatarFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
              setProfileHeader((p) => ({ ...p, avatarUrl: result }));
              setWatermark((w) => {
                if (!w.imageUrl || w.imageUrl === profileHeader.avatarUrl) {
                  return { ...w, imageUrl: result };
                }
                return w;
              });
              toast.success("Imagem colada da área de transferência!");
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http") || text.startsWith("data:image"))) {
        setProfileHeader((p) => ({ ...p, avatarUrl: text.trim() }));
        setWatermark((w) => {
          if (!w.imageUrl || w.imageUrl === profileHeader.avatarUrl) {
            return { ...w, imageUrl: text.trim() };
          }
          return w;
        });
        toast.success("Imagem colada da área de transferência!");
      } else {
        toast.error("Nenhuma imagem encontrada na área de transferência.");
      }
    } catch {
      toast.error("Permissão de clipboard necessária ou use Ctrl+V.");
    }
  };

  const handleWatermarkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setWatermark((w) => ({ ...w, imageUrl: result, type: 'image', enabled: true }));
        toast.success("Logo da marca d'água carregado com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteWatermarkFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
              setWatermark((w) => ({ ...w, imageUrl: result, type: 'image', enabled: true }));
              toast.success("Logo da marca d'água colado com sucesso!");
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http") || text.startsWith("data:image"))) {
        setWatermark((w) => ({ ...w, imageUrl: text.trim(), type: 'image', enabled: true }));
        toast.success("URL da logo colada com sucesso!");
      } else {
        toast.error("Nenhuma imagem encontrada na área de transferência.");
      }
    } catch {
      toast.error("Permissão de clipboard necessária ou use Ctrl+V.");
    }
  };

  async function handleRemodelWithAi() {
    if (!selectedClip) {
      toast.error("Selecione um clipe na biblioteca para gerar o gancho com IA.");
      return;
    }
    setRemodelingAi(true);
    try {
      const res = await fetch("/api/dark-clips/remodel-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalCaption: selectedClip.original_caption || selectedClip.title || "",
          theme: aiThemePrompt,
          authorHandle: profileHeader.handle,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const { headline_main, headline_sub, cta_text, post_caption, hashtags } = result.data;
        if (headline_main) setHeadline((h) => ({ ...h, mainText: headline_main, subText: headline_sub || h.subText }));
        if (cta_text && footer.showFooter) setFooter((f) => ({ ...f, text: cta_text }));
        if (post_caption) setPostCaption(post_caption);
        if (hashtags) setPostHashtags(hashtags);
        toast.success("✨ Gancho e textos virais gerados com IA!");
      } else {
        toast.error(result.error || "Erro ao gerar com IA.");
      }
    } catch {
      toast.error("Erro ao comunicar com a IA.");
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
            watermark,
            footer,
            arrows: arrowsList[0] || {},
            arrowsList: arrowsList,
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
            <a href="/api/extension/download" download="dark-clips-extension.zip">
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs gap-1.5 h-9 font-bold"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar Extensão (.ZIP)
              </Button>
            </a>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSavePreset()}
              disabled={savingPreset}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5 h-9 font-bold"
            >
              {savingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Salvar Layout 💾
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

        {/* ── Main Tab Navigation: Layouts vs Criação ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="bg-secondary/20 p-1 border border-border/50 rounded-xl grid grid-cols-2 max-w-md">
            <TabsTrigger value="modeler" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              <Sliders className="h-3.5 w-3.5" />
              🎨 Layout & Templates 9:16
            </TabsTrigger>
            <TabsTrigger value="creation" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              <Video className="h-3.5 w-3.5" />
              🎬 Criação & Clipes ({clips.length})
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════
              ABA 1: MODELADOR VISUAL DE LAYOUT & TEMPLATES 9:16
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="modeler" className="space-y-6">
            
            {/* Top Toolbar: Layout Selector & Quick Management */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Modelo de Layout Ativo:</span>
                </div>
                
                <div className="w-[200px] sm:w-[260px]">
                  <Select
                    value={activePreset?.id || ""}
                    onValueChange={(val) => {
                      const found = presets.find((p) => p.id === val);
                      if (found) loadPresetIntoModeler(found);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue placeholder="Selecione um layout..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} {p.is_default ? "🌟 (Padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLayoutNameInput(`Novo Layout ${presets.length + 1}`);
                    setIsDefaultLayoutInput(false);
                    setIsSaveLayoutDialogOpen(true);
                  }}
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Novo Layout
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleQuickSavePreset()}
                  disabled={savingPreset}
                  className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {savingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Salvar Layout 💾
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLayoutNameInput(activePreset?.name ? `${activePreset.name} (Cópia)` : "Meu Layout 9:16");
                    setIsDefaultLayoutInput(false);
                    setIsSaveLayoutDialogOpen(true);
                  }}
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Salvar Como...
                </Button>

                {activePreset && !activePreset.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(activePreset.id)}
                    className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
                    title="Excluir este preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── Left Column: Granular Controls (7 cols) ── */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Cabeçalho do Perfil */}
                <Card
                  id="card-header"
                  className={`transition-all duration-300 ${
                    highlightedCard === "card-header" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Cabeçalho do Perfil (Autor / Sua Página)
                      </CardTitle>
                      <CardDescription className="text-xs">Personalize a foto, arroba, escala, alinhamento e selo verificado.</CardDescription>
                    </div>
                    <Switch
                      checked={profileHeader.showHeader}
                      onCheckedChange={(v) => setProfileHeader((p) => ({ ...p, showHeader: v }))}
                    />
                  </CardHeader>
                  {profileHeader.showHeader && (
                    <CardContent className="p-4 pt-0 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold">Nome de Exibição</Label>
                          <Input
                            value={profileHeader.name}
                            onChange={(e) => setProfileHeader((p) => ({ ...p, name: e.target.value }))}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">@Usuário</Label>
                          <Input
                            value={profileHeader.handle}
                            onChange={(e) => setProfileHeader((p) => ({ ...p, handle: e.target.value }))}
                            className="h-8 text-xs mt-1 font-mono"
                          />
                        </div>
                      </div>

                      {/* Foto de Perfil: Envio, Colar, URL */}
                      <div className="p-3 rounded-xl bg-secondary/20 border border-border/60 space-y-3">
                        <Label className="text-xs font-semibold flex items-center justify-between">
                          <span>Foto de Perfil</span>
                          <span className="text-[10px] text-muted-foreground">Enviar ou Colar (Ctrl+V)</span>
                        </Label>
                        
                        <div className="flex items-center gap-3">
                          {/* Circular Avatar Preview */}
                          <div 
                            onClick={() => avatarFileInputRef.current?.click()}
                            className="relative group cursor-pointer w-12 h-12 rounded-full overflow-hidden border-2 border-primary/40 bg-zinc-900 shrink-0 shadow-md"
                            title="Clique para enviar foto de perfil"
                          >
                            <img 
                              src={profileHeader.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                              alt="Avatar" 
                              className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" 
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="h-4 w-4 text-white" />
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <input 
                              type="file" 
                              ref={avatarFileInputRef} 
                              onChange={handleAvatarFileUpload} 
                              accept="image/*" 
                              className="hidden" 
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => avatarFileInputRef.current?.click()}
                              className="h-8 text-xs gap-1.5"
                            >
                              <Upload className="h-3.5 w-3.5 text-primary" /> Carregar Foto
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={handlePasteAvatarFromClipboard}
                              className="h-8 text-xs gap-1.5"
                            >
                              <Copy className="h-3.5 w-3.5 text-emerald-400" /> Colar Imagem
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Sliders de Escala, Foto e Fonte */}
                      <div className="p-3 rounded-xl bg-secondary/10 border border-border/40 space-y-3.5">
                        {/* Escala Geral */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Maximize2 className="h-3.5 w-3.5 text-primary" /> Escala Geral do Cabeçalho
                            </span>
                            <span className="font-mono text-primary">{profileHeader.scale || 100}%</span>
                          </div>
                          <Slider
                            value={[profileHeader.scale || 100]}
                            min={50}
                            max={180}
                            step={1}
                            onValueChange={([scale]) => setProfileHeader((p) => ({ ...p, scale }))}
                          />
                        </div>

                        {/* Tamanho da Foto de Perfil */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5">
                              <ImageIcon className="h-3.5 w-3.5 text-emerald-400" /> Tamanho do Avatar
                            </span>
                            <span className="font-mono text-emerald-400">{profileHeader.avatarSize || 76}px</span>
                          </div>
                          <Slider
                            value={[profileHeader.avatarSize || 76]}
                            min={40}
                            max={140}
                            step={2}
                            onValueChange={([avatarSize]) => setProfileHeader((p) => ({ ...p, avatarSize }))}
                          />
                        </div>

                        {/* Tamanho da Fonte do Nome/@ */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Type className="h-3.5 w-3.5 text-yellow-400" /> Tamanho da Tipografia
                            </span>
                            <span className="font-mono text-yellow-400">{profileHeader.fontSize || 32}px</span>
                          </div>
                          <Slider
                            value={[profileHeader.fontSize || 32]}
                            min={18}
                            max={52}
                            step={1}
                            onValueChange={([fontSize]) => setProfileHeader((p) => ({ ...p, fontSize }))}
                          />
                        </div>
                      </div>

                      {/* Selo & Alinhamento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold">Selo Verificado</Label>
                          <div className="flex gap-2 mt-1">
                            {(["none", "blue"] as const).map((type) => (
                              <Button
                                key={type}
                                type="button"
                                size="sm"
                                variant={profileHeader.badgeType === type ? "default" : "outline"}
                                onClick={() => setProfileHeader((p) => ({ ...p, badgeType: type }))}
                                className="flex-1 text-xs h-8"
                              >
                                {type === "none" ? "Nenhum" : "Azul ✓"}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Alinhamento do Cabeçalho</Label>
                          <div className="flex gap-2 mt-1">
                            {(["left", "center", "right"] as const).map((align) => (
                              <Button
                                key={align}
                                type="button"
                                size="sm"
                                variant={profileHeader.textAlign === align ? "default" : "outline"}
                                onClick={() => setProfileHeader((p) => ({ ...p, textAlign: align }))}
                                className="flex-1 text-xs h-8 capitalize"
                              >
                                {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Espaçamento Superior (Padding) */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">Posição Vertical do Topo</span>
                          <span className="font-mono text-primary">{profileHeader.paddingTop}px</span>
                        </div>
                        <Slider
                          value={[profileHeader.paddingTop]}
                          min={20}
                          max={260}
                          step={2}
                          onValueChange={([paddingTop]) => setProfileHeader((p) => ({ ...p, paddingTop }))}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 2. Título & Gancho Viral */}
                <Card
                  id="card-headline"
                  className={`transition-all duration-300 ${
                    highlightedCard === "card-headline" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" /> Títulos, Textos & Gancho Viral
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure as fontes, cores, maiúsculas, sombras e digite textos de exemplo para pré-visualizar o layout.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Texto Primário */}
                    <div className="p-3 rounded-xl bg-secondary/15 border border-border/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                          <span>Texto Primário (Destaque)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Exibir</span>
                          <Switch
                            checked={headline.showMainText}
                            onCheckedChange={(v) => setHeadline((h) => ({ ...h, showMainText: v }))}
                          />
                        </div>
                      </div>
                      {headline.showMainText && (
                        <>
                          <Textarea
                            value={headline.mainText}
                            onChange={(e) => setHeadline((h) => ({ ...h, mainText: e.target.value }))}
                            placeholder="Ex: Meu amigo: 'Comprei um mic novo, mano.'"
                            rows={2}
                            className="text-xs font-bold resize-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Posição Vertical Independente */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-semibold">Posição Vertical (Y)</span>
                                <span className="font-mono text-primary">{headline.mainTextYOffset}%</span>
                              </div>
                              <Slider
                                value={[headline.mainTextYOffset]}
                                min={5}
                                max={50}
                                step={1}
                                onValueChange={([mainTextYOffset]) => setHeadline((h) => ({ ...h, mainTextYOffset }))}
                              />
                            </div>
                            {/* Alinhamento Independente */}
                            <div>
                              <Label className="text-[11px] font-semibold">Alinhamento</Label>
                              <div className="flex gap-1.5 mt-1">
                                {(["left", "center", "right"] as const).map((align) => (
                                  <Button
                                    key={align}
                                    type="button"
                                    size="sm"
                                    variant={headline.mainTextAlign === align ? "default" : "outline"}
                                    onClick={() => setHeadline((h) => ({ ...h, mainTextAlign: align }))}
                                    className="flex-1 text-[11px] h-7"
                                  >
                                    {align === "left" ? "Esq" : align === "center" ? "Centro" : "Dir"}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Texto Secundário */}
                    <div className="p-3 rounded-xl bg-secondary/15 border border-border/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>Texto Secundário (Contexto)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Exibir</span>
                          <Switch
                            checked={headline.showSubText}
                            onCheckedChange={(v) => setHeadline((h) => ({ ...h, showSubText: v }))}
                          />
                        </div>
                      </div>
                      {headline.showSubText && (
                        <>
                          <Textarea
                            value={headline.subText}
                            onChange={(e) => setHeadline((h) => ({ ...h, subText: e.target.value }))}
                            placeholder="Ex: O desgraçado entrando na call:"
                            rows={2}
                            className="text-xs resize-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Posição Vertical Independente */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-semibold">Posição Vertical (Y)</span>
                                <span className="font-mono text-primary">{headline.subTextYOffset}%</span>
                              </div>
                              <Slider
                                value={[headline.subTextYOffset]}
                                min={10}
                                max={60}
                                step={1}
                                onValueChange={([subTextYOffset]) => setHeadline((h) => ({ ...h, subTextYOffset }))}
                              />
                            </div>
                            {/* Alinhamento Independente */}
                            <div>
                              <Label className="text-[11px] font-semibold">Alinhamento</Label>
                              <div className="flex gap-1.5 mt-1">
                                {(["left", "center", "right"] as const).map((align) => (
                                  <Button
                                    key={align}
                                    type="button"
                                    size="sm"
                                    variant={headline.subTextAlign === align ? "default" : "outline"}
                                    onClick={() => setHeadline((h) => ({ ...h, subTextAlign: align }))}
                                    className="flex-1 text-[11px] h-7"
                                  >
                                    {align === "left" ? "Esq" : align === "center" ? "Centro" : "Dir"}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tamanho da Fonte & Cores */}
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">Tamanho da Fonte dos Títulos</span>
                          <span className="font-mono text-primary">{headline.fontSize}px</span>
                        </div>
                        <Slider
                          value={[headline.fontSize]}
                          min={24}
                          max={68}
                          step={2}
                          onValueChange={([fontSize]) => setHeadline((h) => ({ ...h, fontSize }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold">Cor Primária (Destaque)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={headline.primaryColor}
                              onChange={(e) => setHeadline((h) => ({ ...h, primaryColor: e.target.value }))}
                              className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
                            />
                            <Input
                              value={headline.primaryColor}
                              onChange={(e) => setHeadline((h) => ({ ...h, primaryColor: e.target.value }))}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Cor Secundária (Texto)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={headline.secondaryColor}
                              onChange={(e) => setHeadline((h) => ({ ...h, secondaryColor: e.target.value }))}
                              className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
                            />
                            <Input
                              value={headline.secondaryColor}
                              onChange={(e) => setHeadline((h) => ({ ...h, secondaryColor: e.target.value }))}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Switches de Efeitos e Maiúsculas */}
                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={headline.mainTextUppercase}
                            onCheckedChange={(v) => setHeadline((h) => ({ ...h, mainTextUppercase: v }))}
                          />
                          <Label className="text-xs font-medium">Primário Maiúsculas</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={headline.subTextUppercase}
                            onCheckedChange={(v) => setHeadline((h) => ({ ...h, subTextUppercase: v }))}
                          />
                          <Label className="text-xs font-medium">Secundário Maiúsculas</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={headline.textShadow}
                            onCheckedChange={(v) => setHeadline((h) => ({ ...h, textShadow: v }))}
                          />
                          <Label className="text-xs font-medium">Sombra 3D</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Enquadramento do Vídeo & Fundo */}
                <Card
                  id="card-video"
                  className={`transition-all duration-300 ${
                    highlightedCard === "card-video" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Maximize2 className="h-4 w-4 text-primary" /> Enquadramento do Vídeo & Fundo 9:16
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Posicionamento vertical, escala, cantos arredondados e efeito de fundo do reel/short.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Posição Y */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">Posição Vertical do Vídeo (Y)</span>
                        <span className="font-mono text-primary">{videoPlacement.yOffset}%</span>
                      </div>
                      <Slider
                        value={[videoPlacement.yOffset]}
                        min={20}
                        max={85}
                        step={1}
                        onValueChange={([yOffset]) => setVideoPlacement((v) => ({ ...v, yOffset }))}
                      />
                    </div>

                    {/* Escala */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">Tamanho / Escala do Vídeo</span>
                        <span className="font-mono text-primary">{videoPlacement.scale}%</span>
                      </div>
                      <Slider
                        value={[videoPlacement.scale]}
                        min={50}
                        max={100}
                        step={1}
                        onValueChange={([scale]) => setVideoPlacement((v) => ({ ...v, scale }))}
                      />
                    </div>

                    {/* Bordas Arredondadas */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">Arredondamento das Bordas (Border Radius)</span>
                        <span className="font-mono text-primary">{videoPlacement.borderRadius}px</span>
                      </div>
                      <Slider
                        value={[videoPlacement.borderRadius]}
                        min={0}
                        max={48}
                        step={2}
                        onValueChange={([borderRadius]) => setVideoPlacement((v) => ({ ...v, borderRadius }))}
                      />
                    </div>

                    {/* Estilo do Fundo */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <Label className="text-xs font-semibold">Estilo de Fundo 9:16</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { id: "black", label: "Preto", bg: "bg-black text-white" },
                          { id: "blur", label: "Desfoque", bg: "bg-zinc-800 text-white" },
                          { id: "gradient", label: "Gradiente", bg: "bg-gradient-to-tr from-purple-900 to-black text-white" },
                          { id: "neon", label: "Neon Dark", bg: "bg-gradient-to-tr from-rose-950 via-zinc-950 to-indigo-950 text-white" },
                          { id: "zinc", label: "Cinza Dark", bg: "bg-zinc-900 text-white" },
                          { id: "white", label: "Branco", bg: "bg-zinc-200 text-black" },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBackground((prev) => ({ ...prev, type: b.id as any }))}
                            className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                              background.type === b.id ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/60 hover:border-border"
                            } ${b.bg}`}
                          >
                            <span>{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Marca D'água & Selo Personalizado */}
                <Card
                  id="card-watermark"
                  className={`transition-all duration-300 ${
                    highlightedCard === "card-watermark" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> 4. Marca D'água & Logo Personalizada
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Adicione texto arroba, foto/logo com moldura circular ou ambos combinados.
                      </CardDescription>
                    </div>
                    <Switch
                      checked={watermark.enabled}
                      onCheckedChange={(v) => setWatermark((w) => ({ ...w, enabled: v }))}
                    />
                  </CardHeader>
                  {watermark.enabled && (
                    <CardContent className="p-4 pt-0 space-y-4">
                      {/* Seletor Unificado do Tipo de Marca D'água */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Modo de Exibição da Marca D'água</Label>
                        <Select
                          value={watermark.type || "text"}
                          onValueChange={(val: "text" | "image" | "both") => setWatermark((w) => ({ ...w, type: val }))}
                        >
                          <SelectTrigger className="h-9 text-xs font-semibold bg-secondary/30">
                            <SelectValue placeholder="Selecione o formato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text" className="text-xs font-medium">
                              📝 Apenas Texto / @Arroba
                            </SelectItem>
                            <SelectItem value="image" className="text-xs font-medium">
                              ⚪ Logo / Imagem com Moldura
                            </SelectItem>
                            <SelectItem value="both" className="text-xs font-medium">
                              🌟 Logo + Texto / @Arroba (Combinados)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 1. SEÇÕES DE CONFIGURAÇÃO DE IMAGEM / LOGO (quando image ou both) */}
                      {(watermark.type === "image" || watermark.type === "both") && (
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/60 space-y-3">
                          <Label className="text-xs font-semibold flex items-center justify-between">
                            <span>Foto / Logo da Marca D'água</span>
                            <span className="text-[10px] text-muted-foreground">Moldura circular com borda</span>
                          </Label>

                          <div className="flex items-center gap-3">
                            <div
                              className={`w-14 h-14 border-2 border-primary/50 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md ${
                                watermark.shape === "square"
                                  ? "rounded-md"
                                  : watermark.shape === "rounded"
                                  ? "rounded-xl"
                                  : "rounded-full"
                              }`}
                            >
                              <img
                                src={
                                  watermark.imageUrl ||
                                  profileHeader.avatarUrl ||
                                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                                }
                                alt="Logo"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <input
                                type="file"
                                ref={watermarkFileInputRef}
                                onChange={handleWatermarkFileUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => watermarkFileInputRef.current?.click()}
                                className="h-8 text-xs gap-1.5"
                              >
                                <Upload className="h-3.5 w-3.5 text-primary" /> Carregar Imagem
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handlePasteWatermarkFromClipboard}
                                className="h-8 text-xs gap-1.5"
                              >
                                <Copy className="h-3.5 w-3.5 text-emerald-400" /> Colar Imagem
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setWatermark((w) => ({
                                    ...w,
                                    imageUrl:
                                      profileHeader.avatarUrl ||
                                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                                  }));
                                  toast.success("Foto do cabeçalho aplicada à marca d'água!");
                                }}
                                className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10 border border-primary/20"
                                title="Puxar imagem da foto de perfil para a marca d'água"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Usar Foto do Perfil
                              </Button>
                            </div>
                          </div>

                          {/* Formato da Moldura & Tamanho da Logo */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                            <div>
                              <Label className="text-xs font-semibold">Formato da Moldura</Label>
                              <div className="flex gap-1.5 mt-1">
                                {[
                                  { id: "circle", label: "Circular ⚪" },
                                  { id: "rounded", label: "Arredondado 🔲" },
                                  { id: "square", label: "Quadrado ⬛" },
                                ].map((shape) => (
                                  <Button
                                    key={shape.id}
                                    type="button"
                                    size="sm"
                                    variant={(watermark.shape || "circle") === shape.id ? "default" : "outline"}
                                    onClick={() => setWatermark((w) => ({ ...w, shape: shape.id as any }))}
                                    className="flex-1 text-[11px] h-7 px-1 font-bold"
                                  >
                                    {shape.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold">Tamanho da Logo</span>
                                <span className="font-mono text-primary">{watermark.imageSize || 44}px</span>
                              </div>
                              <Slider
                                value={[watermark.imageSize || 44]}
                                min={24}
                                max={100}
                                step={2}
                                onValueChange={([imageSize]) => setWatermark((w) => ({ ...w, imageSize }))}
                              />
                            </div>
                          </div>

                          {/* Borda da Moldura */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold">Espessura da Borda</span>
                                <span className="font-mono text-primary">{watermark.borderWidth ?? 2}px</span>
                              </div>
                              <Slider
                                value={[watermark.borderWidth ?? 2]}
                                min={0}
                                max={6}
                                step={1}
                                onValueChange={([borderWidth]) => setWatermark((w) => ({ ...w, borderWidth }))}
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-semibold">Cor da Borda</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="color"
                                  value={watermark.borderColor?.startsWith("#") ? watermark.borderColor : "#FFFFFF"}
                                  onChange={(e) => setWatermark((w) => ({ ...w, borderColor: e.target.value }))}
                                  className="h-7 w-9 rounded border border-border bg-transparent cursor-pointer"
                                />
                                <Input
                                  value={watermark.borderColor || "rgba(255,255,255,0.4)"}
                                  onChange={(e) => setWatermark((w) => ({ ...w, borderColor: e.target.value }))}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. SEÇÕES DE CONFIGURAÇÃO DE TEXTO / @ARROBA (quando text ou both) */}
                      {(watermark.type === "text" || watermark.type === "both") && (
                        <div className="p-3 rounded-xl bg-secondary/15 border border-border/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Texto / @Arroba da Marca D'água</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setWatermark((w) => ({
                                  ...w,
                                  text: profileHeader.handle || "@darkclips",
                                }));
                                toast.success("Arroba do perfil copiado!");
                              }}
                              className="h-6 text-[10px] text-primary hover:bg-primary/10 gap-1 px-2"
                            >
                              <RefreshCw className="h-2.5 w-2.5" /> Usar @ do Perfil
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              value={watermark.text}
                              onChange={(e) => setWatermark((w) => ({ ...w, text: e.target.value }))}
                              placeholder="@meucanal"
                              className="h-8 text-xs font-mono"
                            />

                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-semibold shrink-0">Cor:</Label>
                              <input
                                type="color"
                                value={watermark.color || "#FFFFFF"}
                                onChange={(e) => setWatermark((w) => ({ ...w, color: e.target.value }))}
                                className="h-8 w-9 rounded border border-border bg-transparent cursor-pointer shrink-0"
                              />
                              <Input
                                value={watermark.color || "#FFFFFF"}
                                onChange={(e) => setWatermark((w) => ({ ...w, color: e.target.value }))}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold">Tamanho da Fonte</span>
                              <span className="font-mono text-primary">{watermark.fontSize || 22}px</span>
                            </div>
                            <Slider
                              value={[watermark.fontSize || 22]}
                              min={12}
                              max={48}
                              step={1}
                              onValueChange={([fontSize]) => setWatermark((w) => ({ ...w, fontSize }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* 3. POSIÇÃO RÁPIDA */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Posição Rápida</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { pos: "top-left", label: "Sup. Esq.", x: 15, y: 15 },
                            { pos: "top-right", label: "Sup. Dir.", x: 85, y: 15 },
                            { pos: "bottom-left", label: "Inf. Esq.", x: 15, y: 92 },
                            { pos: "bottom-right", label: "Inf. Dir.", x: 85, y: 92 },
                          ].map((item) => (
                            <Button
                              key={item.pos}
                              type="button"
                              size="sm"
                              variant={watermark.position === item.pos ? "default" : "outline"}
                              onClick={() =>
                                setWatermark((w) => ({
                                  ...w,
                                  position: item.pos as any,
                                  xOffset: item.x,
                                  yOffset: item.y,
                                }))
                              }
                              className="text-[11px] h-7"
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 4. OPACIDADE, ESCALA & SOMBRA */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">Opacidade</span>
                            <span className="font-mono text-primary">{watermark.opacity}%</span>
                          </div>
                          <Slider
                            value={[watermark.opacity]}
                            min={10}
                            max={100}
                            step={5}
                            onValueChange={([opacity]) => setWatermark((w) => ({ ...w, opacity }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">Escala Geral</span>
                            <span className="font-mono text-primary">{watermark.scale || 100}%</span>
                          </div>
                          <Slider
                            value={[watermark.scale || 100]}
                            min={40}
                            max={200}
                            step={5}
                            onValueChange={([scale]) => setWatermark((w) => ({ ...w, scale }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          checked={watermark.hasShadow !== false}
                          onCheckedChange={(v) => setWatermark((w) => ({ ...w, hasShadow: v }))}
                        />
                        <Label className="text-xs font-medium">Sombra e Contraste Automático</Label>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 5. Rodapé & Chamada para Ação */}
                <Card
                  id="card-footer"
                  className={`transition-all duration-300 ${
                    highlightedCard === "card-footer" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Rodapé & Chamada para Ação (CTA)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Texto de conversão/engajamento com posicionamento livre (arrasto 0% - 98%).
                      </CardDescription>
                    </div>
                    <Switch
                      checked={footer.showFooter}
                      onCheckedChange={(v) => setFooter((f) => ({ ...f, showFooter: v }))}
                    />
                  </CardHeader>
                  {footer.showFooter && (
                    <CardContent className="p-4 pt-0 space-y-4">
                      {/* Texto do CTA */}
                      <div>
                        <Label className="text-xs font-semibold">Texto do Rodapé / CTA</Label>
                        <Input
                          value={footer.text}
                          onChange={(e) => setFooter((f) => ({ ...f, text: e.target.value }))}
                          placeholder="Ex: Siga para não perder nenhum vídeo!"
                          className="h-8 text-xs mt-1"
                        />
                      </div>

                      {/* Presets Rápidos de Posição Vertical */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Posição Rápida</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { pos: 10, label: "Topo (10%)" },
                            { pos: 48, label: "Centro (48%)" },
                            { pos: 82, label: "Inferior (82%)" },
                            { pos: 92, label: "Rodapé (92%)" },
                          ].map((item) => (
                            <Button
                              key={item.pos}
                              type="button"
                              size="sm"
                              variant={footer.yOffset === item.pos ? "default" : "outline"}
                              onClick={() => setFooter((f) => ({ ...f, yOffset: item.pos }))}
                              className="text-[11px] h-7"
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Slider de Posição Vertical Livre */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Move className="h-3.5 w-3.5 text-primary" /> Posição Vertical no Vídeo (Y)
                          </span>
                          <span className="font-mono text-primary">{footer.yOffset ?? 92}%</span>
                        </div>
                        <Slider
                          value={[footer.yOffset ?? 92]}
                          min={5}
                          max={98}
                          step={1}
                          onValueChange={([yOffset]) => setFooter((f) => ({ ...f, yOffset }))}
                        />
                      </div>

                      {/* Tamanho da Fonte & Cor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Type className="h-3.5 w-3.5 text-yellow-400" /> Tamanho da Fonte
                            </span>
                            <span className="font-mono text-yellow-400">{footer.fontSize}px</span>
                          </div>
                          <Slider
                            value={[footer.fontSize]}
                            min={14}
                            max={48}
                            step={1}
                            onValueChange={([fontSize]) => setFooter((f) => ({ ...f, fontSize }))}
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Cor do Texto</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={footer.color || "#9CA3AF"}
                              onChange={(e) => setFooter((f) => ({ ...f, color: e.target.value }))}
                              className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
                            />
                            <Input
                              value={footer.color || "#9CA3AF"}
                              onChange={(e) => setFooter((f) => ({ ...f, color: e.target.value }))}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Alinhamento */}
                      <div>
                        <Label className="text-xs font-semibold">Alinhamento do Texto</Label>
                        <div className="flex gap-2 mt-1">
                          {(["left", "center", "right"] as const).map((align) => (
                            <Button
                              key={align}
                              type="button"
                              size="sm"
                              variant={footer.textAlign === align ? "default" : "outline"}
                              onClick={() => setFooter((f) => ({ ...f, textAlign: align }))}
                              className="flex-1 text-xs h-8 capitalize"
                            >
                              {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* ── CARD 6: Setas & Indicadores Animados de Ação (CTA Visual Multi-Containers) ── */}
                <Card
                  id="card-arrows"
                  className={`border-border shadow-sm transition-all duration-300 ${
                    highlightedCard === "card-arrows" ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3 cursor-pointer select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400">
                          <Navigation className="h-4 w-4 rotate-45" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            6. Setas & Indicadores de Ação
                            {isAnyArrowEnabled && (
                              <Badge className="text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/30">
                                {arrowsList.length} {arrowsList.length === 1 ? "Container" : "Containers"}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Crie múltiplos grupos de setas animadas com direções, quantidades e textos independentes
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={isAnyArrowEnabled}
                        onCheckedChange={(v) => handleToggleAllArrows(v)}
                      />
                    </div>
                  </CardHeader>

                  {isAnyArrowEnabled && (
                    <CardContent className="p-4 pt-0 space-y-4 border-t border-border/40 mt-3">
                      
                      {/* Seletor e Gerenciamento de Containers */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground">
                            Containers de Setas ({arrowsList.length})
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAddArrowContainer}
                            className="text-[11px] h-7 gap-1 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold"
                          >
                            <Plus className="h-3 w-3" /> Adicionar Outro Container
                          </Button>
                        </div>

                        {/* Abas / Botões de seleção dos containers */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-secondary/30 rounded-lg border border-border/50">
                          {arrowsList.map((item, idx) => {
                            const isSelected = idx === selectedArrowIndex;
                            const dirIcon =
                              item.direction === "right"
                                ? "👉"
                                : item.direction === "left"
                                ? "👈"
                                : item.direction === "up"
                                ? "👆"
                                : item.direction === "down"
                                ? "👇"
                                : item.direction === "down-right"
                                ? "↘️"
                                : "↗️";

                            return (
                              <button
                                key={item.id || idx}
                                type="button"
                                onClick={() => setSelectedArrowIndex(idx)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                  isSelected
                                    ? "bg-rose-500 text-white shadow-sm ring-1 ring-white/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                }`}
                              >
                                <span>{dirIcon}</span>
                                <span>Container #{idx + 1}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 border-0 ${
                                    isSelected ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  {item.count || 2} {item.count === 1 ? "seta" : "setas"}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Header de ações do container selecionado */}
                      <div className="flex items-center justify-between p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-rose-400">
                            Configurando Container #{selectedArrowIndex + 1}
                          </span>
                          <Switch
                            checked={currentArrow.enabled !== false}
                            onCheckedChange={(v) => handleUpdateSelectedArrow({ enabled: v })}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicateArrowContainer(selectedArrowIndex)}
                            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                            title="Duplicar este container"
                          >
                            <Copy className="h-3 w-3" /> Duplicar
                          </Button>
                          {arrowsList.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveArrowContainer(selectedArrowIndex)}
                              className="text-[11px] h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                              title="Excluir este container"
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Presets Rápidos de Direção & Posicionamento para o container ativo */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Atalhos de Posicionamento Rápido</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "👉 Botão Seguir (Lateral)", dir: "right", x: 82, y: 65, text: "Siga!" },
                            { label: "👇 CTA Inferior", dir: "down", x: 50, y: 84, text: "Assista!" },
                            { label: "👆 Perfil Superior", dir: "up", x: 22, y: 15, text: "Confira!" },
                          ].map((p) => (
                            <Button
                              key={p.label}
                              type="button"
                              size="sm"
                              variant={currentArrow.xOffset === p.x && currentArrow.yOffset === p.y ? "default" : "outline"}
                              onClick={() =>
                                handleUpdateSelectedArrow({
                                  direction: p.dir as any,
                                  xOffset: p.x,
                                  yOffset: p.y,
                                  text: p.text,
                                })
                              }
                              className="text-xs h-8 font-bold"
                            >
                              {p.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Direção da Seta */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Direção da Seta</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {[
                            { dir: "right", label: "Direita →" },
                            { dir: "left", label: "← Esquerda" },
                            { dir: "down", label: "Baixo ↓" },
                            { dir: "up", label: "Cima ↑" },
                            { dir: "down-right", label: "Diagonal ↘" },
                            { dir: "up-right", label: "Diagonal ↗" },
                          ].map((item) => (
                            <Button
                              key={item.dir}
                              type="button"
                              size="sm"
                              variant={currentArrow.direction === item.dir ? "default" : "outline"}
                              onClick={() => handleUpdateSelectedArrow({ direction: item.dir as any })}
                              className="text-xs h-8 font-medium"
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Estilo da Animação & Quantidade de Setas no Container */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Efeito da Animação</Label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: "trail", label: "Cascata 🌊" },
                              { id: "bounce", label: "Quicar 🦘" },
                              { id: "pulse", label: "Pulsar 💓" },
                            ].map((st) => (
                              <Button
                                key={st.id}
                                type="button"
                                size="sm"
                                variant={currentArrow.style === st.id ? "default" : "outline"}
                                onClick={() => handleUpdateSelectedArrow({ style: st.id as any })}
                                className="text-xs h-8 font-bold"
                              >
                                {st.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <Label className="text-xs font-semibold">Quantidade de Setas</Label>
                            <span className="font-mono text-rose-400 font-bold">{currentArrow.count || 2} {currentArrow.count === 1 ? "seta" : "setas"}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <Button
                                key={num}
                                type="button"
                                size="sm"
                                variant={currentArrow.count === num ? "default" : "outline"}
                                onClick={() => handleUpdateSelectedArrow({ count: num })}
                                className="text-xs h-8 font-bold"
                              >
                                {num}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Texto de Ação Opcional & Cor da Seta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Texto da Seta (Opcional)</Label>
                          <Input
                            value={currentArrow.text || ""}
                            onChange={(e) => handleUpdateSelectedArrow({ text: e.target.value })}
                            placeholder="Ex: Siga!, Inscreva-se!"
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Cor das Setas</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={currentArrow.color || "#FE2C55"}
                              onChange={(e) => handleUpdateSelectedArrow({ color: e.target.value })}
                              className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
                            />
                            <Input
                              value={currentArrow.color || "#FE2C55"}
                              onChange={(e) => handleUpdateSelectedArrow({ color: e.target.value })}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sliders de Posição X e Y */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">Posição Horizontal (X)</span>
                            <span className="font-mono text-primary">{currentArrow.xOffset}%</span>
                          </div>
                          <Slider
                            value={[currentArrow.xOffset ?? 82]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([xOffset]) => handleUpdateSelectedArrow({ xOffset })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">Posição Vertical (Y)</span>
                            <span className="font-mono text-primary">{currentArrow.yOffset}%</span>
                          </div>
                          <Slider
                            value={[currentArrow.yOffset ?? 65]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([yOffset]) => handleUpdateSelectedArrow({ yOffset })}
                          />
                        </div>
                      </div>

                      {/* Slider de Tamanho */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">Tamanho das Setas</span>
                          <span className="font-mono text-rose-400">{currentArrow.size}px</span>
                        </div>
                        <Slider
                          value={[currentArrow.size ?? 40]}
                          min={20}
                          max={72}
                          step={2}
                          onValueChange={([size]) => handleUpdateSelectedArrow({ size })}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* ── Action Bar at Bottom of Modeler Controls Column ── */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/60 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm">
                  <div className="text-xs text-muted-foreground text-center sm:text-left">
                    Layout pronto? Salve suas customizações e avance para a produção dos vídeos.
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickSavePreset()}
                      disabled={savingPreset}
                      className="gap-1.5 text-xs font-bold h-9 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {savingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Salvar Layout 💾
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleProceedToCreation()}
                      className="gap-1.5 bg-primary text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
                    >
                      Avançar para Criação 🎬 <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </div>

              {/* ── Right Column: Sticky 9:16 Canvas Live Preview (5 cols) ── */}
              <div className="lg:col-span-5 sticky top-6 self-start space-y-4">
                <Card className="border-border shadow-2xl overflow-hidden bg-card">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" /> Visualização ao Vivo (Canvas 9:16)
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                        Interativo
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Seletor de Vídeo de Exemplo Limpo para Teste de Layout */}
                  <div className="p-3 bg-secondary/20 border-b border-border/40 space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 text-primary" /> Vídeo de Exemplo (Teste do Layout):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { url: "/sample-oceans.mp4", label: "🌊 Oceano HD" },
                        { url: "/sample-viral-clip.mp4", label: "🎬 Animação" },
                        { url: "/sample-nature.mp4", label: "🌿 Natureza" },
                      ].map((s) => (
                        <Button
                          key={s.url}
                          type="button"
                          size="sm"
                          variant={sampleVideoUrl === s.url ? "default" : "outline"}
                          onClick={() => setSampleVideoUrl(s.url)}
                          className="text-xs h-8 font-bold"
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <CardContent className="p-4 flex flex-col items-center justify-center bg-black/40">
                    <DarkClipsPreviewPlayer
                      videoUrl={sampleVideoUrl}
                      durationInSeconds={15}
                      profileHeader={profileHeader}
                      headline={headline}
                      videoPlacement={videoPlacement}
                      background={background}
                      watermark={watermark}
                      footer={footer}
                      arrows={isAnyArrowEnabled ? currentArrow : { enabled: false }}
                      arrowsList={isAnyArrowEnabled ? arrowsList : []}
                      onLayerFocus={handleLayerFocus}
                      onUpdateHeaderPadding={(paddingTop) => setProfileHeader((p) => ({ ...p, paddingTop }))}
                      onUpdateHeadline={(updates) => setHeadline((h) => ({ ...h, ...updates }))}
                      onUpdateVideoPlacement={(placement) => setVideoPlacement((p) => ({ ...p, ...placement }))}
                      onUpdateWatermark={(updates) => setWatermark((w) => ({ ...w, ...updates }))}
                      onUpdateFooter={(updates) => setFooter((f) => ({ ...f, ...updates }))}
                      onUpdateArrows={(updates) => handleUpdateSelectedArrow(updates)}
                      onUpdateArrowItem={(index, updates) =>
                        setArrowsList((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
                        )
                      }
                    />
                  </CardContent>

                  {/* Modeler Preview Footer Action Bar */}
                  <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row gap-3 justify-between items-center bg-card/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant="outline" className="text-[10px] border-border bg-secondary/30">
                        1080 x 1920 (9:16)
                      </Badge>
                      <span className="truncate max-w-[140px]">{activePreset?.name || "Layout Atual"}</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSavePreset()}
                        disabled={savingPreset}
                        className="gap-1.5 text-xs font-bold h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        {savingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Salvar Layout 💾
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleProceedToCreation()}
                        className="gap-1.5 bg-primary text-primary-foreground font-bold text-xs h-8 shadow-md shadow-primary/20"
                      >
                        Avançar para Criação 🎬 <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════
              ABA 2: CRIAÇÃO & PRODUÇÃO DOS CLIPES (COM AGENDAMENTO)
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="creation" className="space-y-6">
            
            {/* Top Active Layout Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/30 via-secondary/20 to-card border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold shadow-inner">
                  🎨
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Layout Selecionado para Produção:</span>
                    <span className="text-sm font-black text-foreground">{activePreset?.name || "Layout Padrão 9:16"}</span>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">9:16 Vertical</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Os clipes produzidos receberão automaticamente esta diagramação, cabeçalho e posicionamento de vídeo.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("modeler")}
                className="text-xs font-bold gap-1.5 h-8 border-primary/40 text-primary hover:bg-primary/10 shrink-0"
              >
                <Sliders className="h-3.5 w-3.5" /> Customizar / Trocar Layout
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── Left Column: Importador & Extensão (4 cols) ── */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Import Card */}
                <Card className="border-border">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" /> Importar URLs em Lote
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cole links do Instagram Reels, TikTok, Shorts ou X (um por linha).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <Textarea
                      placeholder="https://www.instagram.com/reel/...&#10;https://www.tiktok.com/@user/video/...&#10;https://youtube.com/shorts/..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      rows={5}
                      className="text-xs font-mono resize-none"
                    />
                    <Button
                      onClick={handleImportUrls}
                      disabled={importingUrls || !urlInput.trim()}
                      className="w-full text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground"
                    >
                      {importingUrls ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {importingUrls ? "Baixando & Sanitizando..." : "Baixar & Sanitizar Clipes"}
                    </Button>

                    <div className="rounded-lg bg-secondary/30 p-3 border border-border/40 text-[11px] space-y-1 text-muted-foreground">
                      <p className="font-bold text-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sanitização Automática Anti-Shadowban
                      </p>
                      <p>Vídeos importados têm metadados EXIF eliminados automaticamente para máxima proteção.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Extension Install Card */}
                <Card className="border-red-500/20 bg-gradient-to-br from-red-950/10 to-card">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                      <Sparkles className="h-4 w-4" /> Extensão Dark Clips (Vivaldi, Chrome, Edge)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Minere perfis inteiros de Instagram, TikTok e Shorts com 1 clique direto no navegador.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <a href="/api/extension/download" download="dark-clips-extension.zip" className="block w-full">
                      <Button className="w-full text-xs font-bold gap-1.5 h-9 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20">
                        <Download className="h-3.5 w-3.5" /> Baixar Extensão (.ZIP)
                      </Button>
                    </a>

                    <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1">
                      <p className="font-semibold text-foreground">Como instalar em 10 segundos:</p>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>Baixe e descompacte o arquivo <code className="text-red-400 font-mono text-[10px]">.zip</code></li>
                        <li>Acesse <code className="text-foreground font-mono text-[10px]">vivaldi://extensions</code> ou <code className="text-foreground font-mono text-[10px]">chrome://extensions</code></li>
                        <li>Ative o <strong>"Modo do desenvolvedor"</strong></li>
                        <li>Clique em <strong>"Carregar desempacotado"</strong> e selecione a pasta!</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* ── Center & Right Column: Clipes Minerados & Estúdio de Produção (8 cols) ── */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. Biblioteca de Clipes Minerados */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" /> Clipes Disponíveis para Produção ({clips.length})
                      </h3>
                      <Button variant="ghost" size="sm" onClick={fetchInitialData} className="h-8 text-xs gap-1">
                        <RefreshCw className="h-3 w-3" /> Atualizar
                      </Button>
                    </div>
                  </div>

                  {clips.length === 0 ? (
                    <div className="text-center py-12 border rounded-xl bg-card border-dashed">
                      <Film className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm font-semibold">Nenhum clipe minerado ainda</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use o painel ao lado para colar links ou instale a extensão Dark Clips no seu navegador.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {clips.map((clip) => {
                        const isSelected = selectedClip?.id === clip.id;
                        return (
                          <div
                            key={clip.id}
                            className={`group rounded-xl border p-3 bg-card transition-all relative overflow-hidden flex flex-col justify-between ${
                              isSelected ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary" : "border-border hover:border-border/80"
                            }`}
                          >
                            <div>
                              <div 
                                onClick={() => setSelectedClip(clip)}
                                className="aspect-[9/16] max-h-[160px] rounded-lg overflow-hidden bg-black relative mb-2 cursor-pointer group-hover:opacity-95"
                              >
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

                            <div className="flex gap-1.5 mt-3">
                              <Button 
                                size="sm" 
                                variant={isSelected ? "default" : "outline"} 
                                onClick={() => setSelectedClip(clip)}
                                className="flex-1 text-[11px] h-7"
                              >
                                {isSelected ? "Selecionado ✓" : "Selecionar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedClip(clip);
                                  handleRender();
                                }}
                                disabled={isRendering}
                                className="text-[11px] h-7 px-2.5 text-red-400 border border-red-500/30"
                                title="Produzir clipe com o layout ativo"
                              >
                                {isRendering && selectedClip?.id === clip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "🎬 Produzir"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Estúdio de Produção & Agendamento Integrado do Clipe Selecionado */}
                {selectedClip && (
                  <Card className="border-border/80 shadow-md">
                    <CardHeader className="p-4 pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Film className="h-4 w-4 text-primary" /> Estúdio de Produção: {selectedClip.author_handle || selectedClip.author_name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Remodele o gancho com IA, renderize o vídeo em 1080x1920 e agende para suas redes.
                          </CardDescription>
                        </div>

                        <Button
                          size="sm"
                          onClick={handleRender}
                          disabled={isRendering}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 h-8 shadow-sm"
                        >
                          {isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                          {isRendering ? "Renderizando..." : "Renderizar Clipe 9:16"}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-6">
                      
                      {/* Remodelagem com IA baseada no vídeo selecionado */}
                      <div className="p-3.5 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                              <Wand2 className="h-3.5 w-3.5" /> Geração de Textos & Gancho Viral com IA (GPT-4o)
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              A IA analisa a legenda e contexto do clipe ({selectedClip.platform ? `@${selectedClip.author_handle || selectedClip.author_name}` : "Minerado"}) para criar ganchos de alta retenção.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={handleRemodelWithAi}
                            disabled={remodelingAi}
                            className="text-xs font-bold gap-1.5 h-7.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                          >
                            {remodelingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            {remodelingAi ? "Gerando com IA..." : "Gerar com IA ✨"}
                          </Button>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold">Tema / Direcionamento do Gancho (Opcional)</Label>
                          <Input
                            placeholder="Ex: Humor brasileiro, sarcasmo, reflexão profunda, mistério..."
                            value={aiThemePrompt}
                            onChange={(e) => setAiThemePrompt(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Campos de Textos Ativos no Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {headline.showMainText && (
                            <div>
                              <Label className="text-[11px] font-semibold text-yellow-400">Texto Primário / Gancho</Label>
                              <Input
                                value={headline.mainText}
                                onChange={(e) => setHeadline((h) => ({ ...h, mainText: e.target.value }))}
                                placeholder="Gancho principal gerado..."
                                className="h-8 text-xs font-bold mt-1"
                              />
                            </div>
                          )}

                          {headline.showSubText && (
                            <div>
                              <Label className="text-[11px] font-semibold">Texto Secundário / Contexto</Label>
                              <Input
                                value={headline.subText}
                                onChange={(e) => setHeadline((h) => ({ ...h, subText: e.target.value }))}
                                placeholder="Texto secundário ou contexto..."
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          )}

                          {footer.showFooter && (
                            <div className="sm:col-span-2">
                              <Label className="text-[11px] font-semibold text-emerald-400">Texto do Rodapé / CTA</Label>
                              <Input
                                value={footer.text}
                                onChange={(e) => setFooter((f) => ({ ...f, text: e.target.value }))}
                                placeholder="Ex: Siga para mais vídeos diários!"
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Painel de Agendamento & Publicação Automática (Integrado) */}
                      <div className="space-y-4 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <h4 className="text-xs font-bold">Agendamento & Publicação Automática (Blotato)</h4>
                        </div>

                        {/* Destination Accounts */}
                        <div>
                          <Label className="text-xs font-semibold">Contas de Destino</Label>
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
                                    type="button"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-semibold">Data da Postagem</Label>
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

                        {/* Post Caption & Hashtags */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div>
                            <Label className="text-xs font-semibold">Hashtags</Label>
                            <Input
                              value={postHashtags.join(" ")}
                              onChange={(e) => setPostHashtags(e.target.value.split(" ").filter(Boolean))}
                              className="h-8 text-xs mt-1 font-mono text-primary"
                            />
                          </div>
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
                      </div>

                    </CardContent>
                  </Card>
                )}

                {/* 3. Fila de Postagens Agendadas */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Fila de Postagens Agendadas ({scheduledPosts.length})
                  </h3>

                  {scheduledPosts.length === 0 ? (
                    <div className="text-center py-8 border rounded-xl bg-card border-dashed">
                      <Calendar className="h-7 w-7 mx-auto text-muted-foreground mb-1.5 opacity-50" />
                      <p className="text-xs text-muted-foreground">Nenhuma postagem agendada na fila.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {scheduledPosts.map((post) => (
                        <div key={post.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-sm">
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
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Baixar Vídeo MP4">
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

            </div>
          </TabsContent>

        </Tabs>

        {/* ── Save Layout Dialog ── */}
        <Dialog open={isSaveLayoutDialogOpen} onOpenChange={setIsSaveLayoutDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Layers className="h-5 w-5 text-primary" /> Salvar Modelo de Layout 9:16
              </DialogTitle>
              <DialogDescription className="text-xs">
                Salve este modelo visual com todos os estilos de cabeçalho, tipografia, enquadramento e marca d'água para reutilizar em todos os seus clipes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Layout / Template</Label>
                <Input
                  value={layoutNameInput}
                  onChange={(e) => setLayoutNameInput(e.target.value)}
                  placeholder="Ex: Viral Minimalista, Dark Podcast, Humor..."
                  className="text-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={isDefaultLayoutInput}
                  onCheckedChange={setIsDefaultLayoutInput}
                />
                <Label className="text-xs">Definir como layout padrão para novos clipes</Label>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setIsSaveLayoutDialogOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleSavePresetSubmit(layoutNameInput, isDefaultLayoutInput)}
                disabled={savingPreset || !layoutNameInput.trim()}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                {savingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Salvar Layout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
