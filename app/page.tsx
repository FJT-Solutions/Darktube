"use client"

import Link from "next/link"
import { 
  ArrowRight, 
  Search, 
  Zap, 
  Bookmark, 
  BarChart3, 
  Youtube, 
  ShieldCheck, 
  TrendingUp, 
  Target, 
  Users, 
  Cpu, 
  Sparkles,
  Mail,
  Instagram,
  Facebook,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Fallback: If we detect auth tokens in the hash while on the home page,
    // redirect to the setup-password page.
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      if (hash.includes('access_token=') || hash.includes('error=')) {
        router.replace(`/setup-password${hash}`)
      }
    }
  }, [router])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 font-sans w-full max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/20 shrink-0">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
          </Link>
          
          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#vision" className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground transition-all">Visão</a>
            <a href="#intel" className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground transition-all">Inteligência</a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50">Entrar</Button>
            </Link>
            <Link href="/invite">
              <Button variant="inverted" className="rounded-full px-6 py-5 text-sm font-black shadow-xl">
                SOLICITAR ACESSO
              </Button>
            </Link>
            <div className="ml-2 border-l border-border/40 pl-4">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: hamburger + theme toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Alternar menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1.5 px-4 py-4">
              <a href="#vision" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">Visão</a>
              <a href="#intel" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">Inteligência</a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full rounded-2xl py-3 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground text-left px-4 transition-colors">
                  Entrar
                </button>
              </Link>
              <Link href="/invite" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="inverted" className="w-full rounded-2xl py-4 text-sm font-black shadow-lg">
                  SOLICITAR ACESSO
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-3.5 sm:px-6 pt-24 pb-16 text-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-3.5 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-foreground mb-6 sm:mb-8">
              <Sparkles className="h-3 w-3 text-primary" />
              A Nova Era da Gestão de Canais Faceless
            </div>
            
            <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.08] sm:leading-[0.95] mx-auto break-words max-w-4xl">
              O <span className="text-primary italic">Big Data</span> por trás dos canais de{" "}
              <span className="inline-block sm:whitespace-nowrap underline decoration-primary/50 underline-offset-4 sm:underline-offset-8">Social Media</span>
            </h1>
            
            <p className="mx-auto max-w-xl text-sm sm:text-lg text-muted-foreground mb-8 sm:mb-10 leading-relaxed font-medium px-2">
              Inteligência multiplataforma para minerar, analisar e dominar nichos lucrativos no{" "}
              <span className="text-primary font-bold">YouTube</span>,{" "}
              <span className="font-bold" style={{background: 'linear-gradient(90deg, #25F4EE, #FE2C55)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>TikTok</span>,{" "}
              <span className="text-pink-500 font-bold">Instagram</span> e{" "}
              <span className="text-blue-500 font-bold">Facebook</span> sem aparecer.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center w-full max-w-md sm:max-w-none mx-auto">
              <Link href="/invite" className="w-full sm:w-auto">
                <Button variant="inverted" className="h-13 sm:h-16 w-full sm:w-auto px-6 sm:px-10 rounded-2xl font-black text-sm sm:text-lg shadow-xl">
                  SOLICITAR ACESSO AGORA
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center">
                      <Users className="h-3 w-3 text-zinc-400" />
                    </div>
                  ))}
                </div>
                +240 gestores ativos
              </div>
            </div>
          </div>

          <div className="mt-12 sm:mt-16 w-full max-w-5xl px-0 sm:px-4">
            <div className="relative rounded-2xl sm:rounded-[2.5rem] border border-border/40 bg-gradient-to-b from-muted/50 to-transparent p-2 sm:p-3 backdrop-blur-sm">
              <div className="rounded-xl sm:rounded-[2rem] bg-card overflow-hidden border border-border shadow-2xl">
                <div className="flex h-8 items-center gap-1.5 px-4 border-b border-border bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary/40" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                </div>
                <div className="p-3 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* Card 1 */}
                  <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-sm text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live Intel</span>
                      <div className="flex gap-1 items-center">
                        <div className="h-1 w-3 bg-red-500/20 rounded-full" />
                        <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { t: "Nicho: Curiosidades Espaciais", v: "840k views/dia", c: "text-emerald-600 dark:text-emerald-400" },
                        { t: "Trend: IA Voz de Celebridade", v: "CPM Médio R$ 42", c: "text-red-600 dark:text-red-400" },
                        { t: "Gap: Finanças p/ Jovens", v: "Competição Baixa", c: "text-blue-600 dark:text-blue-400" }
                      ].map((row, i) => (
                        <div key={i} className="flex flex-col gap-0.5 p-2.5 sm:p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight truncate">{row.t}</div>
                          <div className={`text-[10px] sm:text-xs font-black ${row.c}`}>{row.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-sm text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estimativa Mensal</span>
                      <TrendingUp className="h-3 w-3 text-red-500/50" />
                    </div>
                    <div className="flex flex-col justify-end gap-3 flex-1">
                      <div className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tighter">
                        R$ 12.450 <span className="text-xs text-muted-foreground font-normal">/canal</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 items-end h-12 pt-2">
                        {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
                          <div key={i} style={{ height: `${h}%` }} className="bg-red-500/30 dark:bg-red-500/20 rounded-t-[2px] border-t border-red-500/40" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-sm relative overflow-hidden text-left">
                    <div className="relative z-10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Tracker</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { n: "@AlphaArchives", s: "82k subs", p: 72, h: true, type: 'yt' },
                        { n: "@HorrorPulse", s: "1.2M views", p: 100, h: true, type: 'tt' },
                        { n: "@LifeHacksFB", s: "500k likes", p: 45, h: true, type: 'fb' },
                        { n: "@AI_Discovery", s: "14k followers", p: 35, h: true, type: 'ig' }
                      ].map((item, i) => (
                        <div key={i} className="min-w-0">
                          <div className="flex justify-between items-end mb-1 gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-bold text-foreground tracking-tight flex items-center gap-1.5 truncate">
                                {item.type === 'yt' && <Youtube className="h-2.5 w-2.5 text-[#FF0000] shrink-0" />}
                                {item.type === 'tt' && <span className="text-[9px] font-bold text-[#FE2C55] shrink-0">TT</span>}
                                {item.type === 'ig' && <Instagram className="h-2.5 w-2.5 text-[#E4405F] shrink-0" />}
                                {item.type === 'fb' && <Facebook className="h-2.5 w-2.5 text-[#1877F2] shrink-0" />}
                                <span className="truncate">{item.n}</span>
                                {item.h && <span className="px-1 py-0.2 rounded-[3px] bg-foreground/10 text-foreground text-[7px] font-black shrink-0 hidden xs:inline">HIGH CPM</span>}
                              </span>
                              <span className="text-[8px] text-muted-foreground font-medium">{item.s}</span>
                            </div>
                            <span className={`text-[9px] font-black shrink-0 ${item.p === 100 ? 'text-emerald-500' : 'text-muted-foreground'}`}>{item.p}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border">
                            <div
                              style={{ width: `${item.p}%` }}
                              className={`h-full rounded-full ${item.p === 100 ? 'bg-gradient-to-r from-emerald-600/50 to-emerald-400/80' : 'bg-gradient-to-r from-primary/40 to-primary/60'}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section id="vision" className="py-16 sm:py-24 lg:py-32 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
              <div>
                <Badge color="red">NOSSA VISÃO</Badge>
                <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black mt-4 sm:mt-6 mb-4 sm:mb-6 leading-tight">
                  Social Media é sobre <span className="text-muted-foreground italic">algoritmo</span>, não rosto.
                </h2>
                <p className="text-sm sm:text-xl text-muted-foreground leading-relaxed font-medium mb-6 sm:mb-8">
                  Acreditamos que os canais mais rentáveis são aqueles que operam como máquinas de dados. Nós fornecemos o combustível.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: Target, text: "Identificação de nichos inexplorados" },
                    { icon: Users, text: "Engenharia reversa de viralização" },
                    { icon: Cpu, text: "Automação via Inteligência Artificial" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl hover:bg-foreground/5 transition-colors group">
                      <div className="bg-red-600/10 p-2 rounded-lg text-red-500 shrink-0">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-sm sm:text-base text-foreground/80 dark:text-zinc-200">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4 pt-6 sm:pt-12">
                  <FeatureImage src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" />
                  <FeatureImage src="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=800&auto=format&fit=crop" />
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <FeatureImage src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=800&auto=format&fit=crop" />
                  <FeatureImage src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intel Section */}
        <section id="intel" className="py-16 sm:py-24 lg:py-32 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <Badge color="zinc">DARK INTELLIGENCE</Badge>
            <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black mt-6 sm:mt-8 mb-8 sm:mb-16 leading-tight">
              Mineração Profunda.<br /><span className="text-zinc-500">Decisões Rápidas.</span>
            </h2>
            
            <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Prospector de Nichos",
                  desc: "Encontre canais com menos de 10k inscritos gerando milhões de views mensais."
                },
                {
                  icon: BarChart3,
                  title: "Scanner de Métricas",
                  desc: "Analise CPM real, retenção estimada e receita por vídeo usando nossa base global."
                },
                {
                  icon: Bookmark,
                  title: "Gestor de Tracker",
                  desc: "Mantenha o radar ligado em toda a sua rede de canais e na concorrência direta."
                }
              ].map((feature, i) => (
                <div key={i} className="group relative text-left p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-border/40 bg-card/60 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:-translate-y-1 shadow-sm">
                  <div className="mb-4 sm:mb-6 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <feature.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-xs sm:text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center relative z-10">
            <h2 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight sm:leading-[0.95]">
              Não deixe o <span className="text-red-600 italic">próximo hit</span> escapar entre os dados.
            </h2>
            <p className="text-sm sm:text-xl text-foreground dark:text-muted-foreground mb-8 sm:mb-10 font-bold max-w-2xl mx-auto">
              Vagas restritas para agências e produtores sérios. Solicite seu convite hoje.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center max-w-md sm:max-w-none mx-auto">
              <Link href="/invite" className="w-full sm:w-auto">
                <Button variant="inverted" className="h-14 sm:h-18 w-full sm:w-auto rounded-2xl px-8 sm:px-12 text-sm sm:text-lg font-black shadow-2xl">
                  SOLICITAR CONVITE AGORA
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto text-center">
                <button className="text-muted-foreground hover:text-foreground font-bold transition-colors text-sm py-2 px-4">
                  Já sou membro
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-10 sm:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-600/20 shrink-0">
                <Youtube className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
            </div>
            <p className="text-foreground/70 dark:text-zinc-500 max-w-xs font-medium leading-relaxed text-xs sm:text-sm">
              A inteligência de elite para quem constrói o futuro do conteúdo nas redes sociais.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Legal</h4>
            <div className="flex flex-col gap-2 text-foreground/60 dark:text-muted-foreground text-xs sm:text-sm font-semibold">
              <a href="#" className="hover:text-red-500 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-red-500 transition-colors">Termos</a>
              <a href="#" className="hover:text-red-500 transition-colors">Compliance</a>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Contato</h4>
            <div className="flex flex-col gap-2 text-foreground/60 dark:text-muted-foreground text-xs sm:text-sm font-semibold">
              <a href="#" className="hover:text-red-500 transition-colors flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">admin@darktube.com</span>
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 text-center text-zinc-600 text-[10px] font-black tracking-widest uppercase">
          DARKTUBE &copy; 2026 &mdash; Built for the elite
        </div>
      </footer>
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode, color: 'red' | 'zinc' }) {
  const styles = {
    red: 'border-foreground/20 bg-foreground/5 text-foreground',
    zinc: 'border-border bg-muted/50 text-muted-foreground'
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${styles[color]}`}>
      {children}
    </span>
  )
}

function FeatureImage({ src }: { src: string }) {
  return (
    <div className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-border/40 group">
      <img
        src={src}
        alt="Feature"
        className="object-cover w-full h-full grayscale hover:grayscale-0 hover:scale-105 transition-all duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
    </div>
  )
}
