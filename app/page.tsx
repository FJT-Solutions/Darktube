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
  Music2,
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
    // redirect to the setup-password page. This happens if Supabase redirects 
    // to the base Site URL instead of the specified redirectTo URL.
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      if (hash.includes('access_token=') || hash.includes('error=')) {
        router.replace(`/setup-password${hash}`)
      }
    }
  }, [router])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/20">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
          </div>
          
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

          {/* Mobile: only hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/10 bg-background/95 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1 px-4 py-4">
              <a href="#vision" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-white/5 hover:text-white">Visão</a>
              <a href="#intel" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-white/5 hover:text-white">Inteligência</a>
              <div className="my-1 h-px bg-white/5" />
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full rounded-2xl py-3.5 text-sm font-bold text-zinc-400 hover:text-white text-left px-4">
                  Entrar
                </button>
              </Link>
              <Link href="/invite" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="inverted" className="w-full rounded-2xl py-6 text-sm font-black">
                  SOLICITAR ACESSO
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16 text-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground mb-8">
              <Sparkles className="h-3 w-3" />
              A Nova Era da Gestão de Canais Faceless
            </div>
            
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-8xl mb-6 leading-[0.95] mx-auto">
              O <span className="text-primary italic">Big Data</span> por trás dos canais de{" "}
              <span className="whitespace-nowrap underline decoration-primary/50 underline-offset-4 sm:underline-offset-8">Social Media</span>
            </h1>
            
            

            
            <p className="mx-auto max-w-xl text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
              Inteligência multiplataforma para minerar, analisar e dominar nichos lucrativos no{" "}
              <span className="text-primary font-bold">YouTube</span>,{" "}
              <span className="font-bold" style={{background: 'linear-gradient(90deg, #25F4EE, #FE2C55)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>TikTok</span>,{" "}
              <span className="text-pink-500 font-bold">Instagram</span> e{" "}
              <span className="text-blue-500 font-bold">Facebook</span> sem aparecer.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/invite" className="w-full sm:w-auto">
                <Button variant="inverted" className="h-14 sm:h-16 px-8 sm:px-10 rounded-2xl font-black text-base sm:text-lg shadow-xl">
                  SOLICITAR ACESSO AGORA
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-7 w-7 rounded-full border-2 border-[#050506] bg-zinc-800 flex items-center justify-center">
                      <Users className="h-3 w-3 text-zinc-400" />
                    </div>
                  ))}
                </div>
                +240 gestores ativos
              </div>
            </div>
          </div>

          <div className="mt-16 w-full max-w-5xl px-0 sm:px-4">
            <div className="relative rounded-2xl sm:rounded-[2.5rem] border border-border/40 bg-gradient-to-b from-muted/50 to-transparent p-2 sm:p-3 backdrop-blur-sm">
              <div className="rounded-xl sm:rounded-[2rem] bg-card overflow-hidden border border-border shadow-2xl">
                <div className="flex h-8 items-center gap-1.5 px-4 border-b border-border bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary/40" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                </div>
                <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live Intel</span>
                      <div className="flex gap-1">
                        <div className="h-1 w-3 bg-red-500/20 rounded-full" />
                        <div className="h-1 w-1 bg-red-500 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { t: "Nicho: Curiosidades Espaciais", v: "840k views/dia", c: "text-emerald-600 dark:text-emerald-400" },
                        { t: "Trend: IA Voz de Celebridade", v: "CPM Médio R$ 42", c: "text-red-600 dark:text-red-400" },
                        { t: "Gap: Finanças p/ Adolescentes", v: "Competição Baixa", c: "text-blue-600 dark:text-blue-400" }
                      ].map((row, i) => (
                        <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{row.t}</div>
                          <div className={`text-[10px] font-black ${row.c}`}>{row.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estimativa Mensal</span>
                      <TrendingUp className="h-3 w-3 text-red-500/50" />
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                      <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">R$ 12.450 <span className="text-xs text-muted-foreground">/canal</span></div>
                      <div className="grid grid-cols-7 gap-1 items-end h-12">
                        {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
                          <div key={i} style={{ height: `${h}%` }} className="bg-red-500/30 dark:bg-red-500/20 rounded-t-[2px] border-t border-red-500/40" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white dark:bg-[#0C0C0E] border border-border/50 dark:border-white/5 p-4 sm:p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-transparent dark:bg-transparent pointer-events-none" />
                    <div className="relative z-10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Tracker</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { n: "@AlphaArchives", s: "82k subs", p: 72, h: true, type: 'yt' },
                        { n: "@HorrorPulse", s: "1.2M views", p: 100, h: true, type: 'tt' },
                        { n: "@LifeHacksFB", s: "500k likes", p: 45, h: true, type: 'fb' },
                        { n: "@AI_Discovery", s: "14k followers", p: 35, h: true, type: 'ig' }
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-end mb-1.5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-foreground tracking-tight flex items-center gap-1.5">
                                {item.type === 'yt' && <Youtube className="h-2.5 w-2.5 text-[#FF0000]" />}
                                {item.type === 'tt' && (
                                  <div className="relative h-2.5 w-2.5 shrink-0 overflow-visible">
                                    <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full fill-[#FE2C55] translate-x-[0.5px] translate-y-[0.5px] scale-90 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13 5.35.08 10.71-.13 16.06-.11 1.54-.75 3.12-1.93 4.11-1.41 1.25-3.41 1.58-5.19 1.17-2.01-.42-3.77-2.07-4.22-4.05-.62-2.31.25-4.99 2.22-6.31.84-.57 1.83-.88 2.84-.96v4.04c-.67.07-1.37.28-1.9.72-.8.61-1.09 1.69-.9 2.66.1 1.05.9 2.05 1.94 2.29.98.24 2.11-.01 2.82-.76.71-.72.88-1.8.84-2.8-.01-5.61-.01-11.23-.01-16.84a8.2 8.2 0 011.02-.01z"/>
                                    </svg>
                                    <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full fill-[#25F4EE] scale-90 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13 5.35.08 10.71-.13 16.06-.11 1.54-.75 3.12-1.93 4.11-1.41 1.25-3.41 1.58-5.19 1.17-2.01-.42-3.77-2.07-4.22-4.05-.62-2.31.25-4.99 2.22-6.31.84-.57 1.83-.88 2.84-.96v4.04c-.67.07-1.37.28-1.9.72-.8.61-1.09 1.69-.9 2.66.1 1.05.9 2.05 1.94 2.29.98.24 2.11-.01 2.82-.76.71-.72.88-1.8.84-2.8-.01-5.61-.01-11.23-.01-16.84a8.2 8.2 0 011.02-.01z"/>
                                    </svg>
                                  </div>
                                )}
                                {item.type === 'ig' && <Instagram className="h-2.5 w-2.5 text-[#E4405F]" />}
                                {item.type === 'fb' && <Facebook className="h-2.5 w-2.5 text-[#1877F2]" />}
                                {item.n}
                                {item.h && <span className="px-1 py-0.5 rounded-[4px] bg-foreground/10 text-foreground text-[7px] font-black border border-foreground/20">HIGH CPM</span>}
                              </span>
                              <span className="text-[8px] text-muted-foreground font-medium">{item.s}</span>
                            </div>
                            <span className={`text-[9px] font-black ${item.p === 100 ? 'text-emerald-500' : 'text-muted-foreground'}`}>{item.p}%</span>
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

        <section id="vision" className="py-20 sm:py-32 border-t border-border">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <Badge color="red">NOSSA VISÃO</Badge>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mt-6 mb-6 leading-tight">
                  Social Media é sobre <span className="text-muted-foreground italic">algoritmo</span>, não rosto.
                </h2>
                <p className="text-base sm:text-xl text-muted-foreground leading-relaxed font-medium mb-8">
                  Acreditamos que os canais mais rentáveis são aqueles que operam como máquinas de dados. Nós fornecemos o combustível.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: Target, text: "Identificação de nichos inexplorados" },
                    { icon: Users, text: "Engenharia reversa de viralização" },
                    { icon: Cpu, text: "Automação via Inteligência Artificial" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-foreground/5 transition-colors group">
                      <div className="bg-red-600/10 p-2 rounded-lg text-red-500 shrink-0">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-foreground/80 dark:text-zinc-200">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4 pt-8 sm:pt-12">
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

        <section id="intel" className="py-20 sm:py-32 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <Badge color="zinc">DARK INTELLIGENCE</Badge>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mt-8 mb-12 sm:mb-20 leading-tight">
              Mineração Profunda.<br /><span className="text-zinc-500">Decisões Rápidas.</span>
            </h2>
            
            <div className="grid gap-6 sm:gap-12 md:grid-cols-3">
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
                <div key={i} className="group relative text-left p-8 sm:p-10 rounded-3xl sm:rounded-[3rem] border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5">
                    <feature.icon className="h-20 w-20 sm:h-32 sm:w-32" />
                  </div>
                  <div className="mb-6 sm:mb-8 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-[1.5rem] bg-zinc-800 border-2 border-white/5 text-red-500 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4">{feature.title}</h3>
                  <p className="text-zinc-500 leading-relaxed font-medium text-sm sm:text-base">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-40 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-red-600/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-8 leading-[0.9]">
              Não deixe o <span className="text-red-600 italic">próximo hit</span> escapar entre os dados.
            </h2>
            <p className="text-base sm:text-xl text-foreground dark:text-muted-foreground mb-10 font-bold max-w-2xl mx-auto">
              Vagas restritas para agências e produtores sérios. Solicite seu convite hoje.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <Link href="/invite" className="w-full sm:w-auto">
                <Button variant="inverted" className="h-16 sm:h-20 w-full sm:w-auto rounded-2xl sm:rounded-3xl px-10 sm:px-14 text-base sm:text-xl font-black shadow-2xl">
                  SOLICITAR CONVITE AGORA
                </Button>
              </Link>
              <Link href="/login">
                <button className="text-muted-foreground hover:text-foreground font-bold transition-colors text-sm sm:text-base">
                  Já sou membro
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 sm:py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-600/20">
                <Youtube className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
            </div>
            <p className="text-foreground/70 dark:text-zinc-500 max-w-xs font-medium leading-relaxed text-sm">
              A inteligência de elite para quem constrói o futuro do conteúdo nas redes sociais.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Legal</h4>
            <div className="flex flex-col gap-3 text-foreground/60 dark:text-muted-foreground text-sm font-bold">
              <a href="#" className="hover:text-red-500 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-red-500 transition-colors">Termos</a>
              <a href="#" className="hover:text-red-500 transition-colors">Compliance</a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Contato</h4>
            <div className="flex flex-col gap-3 text-foreground/60 dark:text-muted-foreground text-sm font-bold">
              <a href="#" className="hover:text-red-500 transition-colors flex items-center gap-2">
                <Mail className="h-4 w-4" /> admin@darktube.com
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-12 text-center text-zinc-600 text-[10px] font-black tracking-widest uppercase">
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
    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${styles[color]}`}>
      {children}
    </span>
  )
}

function FeatureImage({ src }: { src: string }) {
  return (
    <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 group">
      <img
        src={src}
        alt="Feature"
        className="object-cover w-full h-full grayscale hover:grayscale-0 hover:scale-110 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
    </div>
  )
}
