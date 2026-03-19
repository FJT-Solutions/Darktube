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
  Facebook
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050506] text-white selection:bg-red-500/30 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050506]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-900/20">
              <Youtube className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">DARK<span className="text-red-500">TUBE</span></span>
          </div>
          
          <nav className="hidden items-center gap-10 md:flex">
            <a href="#vision" className="text-sm font-semibold text-zinc-400 hover:text-white transition-all">Visão</a>
            <a href="#intel" className="text-sm font-semibold text-zinc-400 hover:text-white transition-all">Inteligência</a>
            <a href="#social" className="text-sm font-semibold text-zinc-400 hover:text-white transition-all">Social Media</a>
          </nav>

          <div className="flex items-center gap-6">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5">Entrar</Button>
            </Link>
            <Link href="/invite">
              <Button className="rounded-full bg-white px-7 py-6 text-sm font-black text-black hover:bg-zinc-200 transition-transform hover:scale-105 shadow-xl">
                SOLICITAR ACESSO
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 pt-32 pb-20 text-center overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-10 animate-fade-in">
              <Sparkles className="h-3 w-3" />
              A Nova Era da Gestão de Canais Faceless
            </div>
            
            <h1 className="text-6xl font-black tracking-tight sm:text-8xl mb-8 leading-[0.95] max-w-4xl mx-auto">
              O <span className="text-red-600 italic">Big Data</span> por trás dos canais de <span className="whitespace-nowrap underline decoration-red-600/50 underline-offset-8">Social Media</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-zinc-400 mb-12 leading-relaxed font-medium">
              DarkTube Miner é a inteligência multiplataforma para minerar, analisar e dominar nichos lucrativos no <span className="text-white font-bold ml-1 text-red-500">YouTube</span>, <span className="text-white font-bold mx-1 text-cyan-400">TikTok</span>, <span className="text-white font-bold mx-1 text-pink-500">Instagram</span> e <span className="text-white font-bold mr-1 text-blue-500">Facebook</span> sem aparecer.
            </p>

            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Link href="/invite">
                <Button className="h-16 rounded-2xl bg-red-600 px-12 text-lg font-black text-white hover:bg-red-500 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)]">
                  QUERO ACESSO EXCLUSIVO
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-7 w-7 rounded-full border-2 border-[#050506] bg-zinc-800 flex items-center justify-center overflow-hidden">
                            <Users className="h-3 w-3 text-zinc-400" />
                        </div>
                    ))}
                </div>
                +240 gestores ativos
              </div>
            </div>
          </div>

          {/* Abstract Device Preview */}
          <div className="mt-24 w-full max-w-6xl px-4 perspective-1000">
             <div className="relative rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-3 backdrop-blur-sm -rotate-x-12 rotate-y-3">
                 <div className="rounded-[2rem] bg-[#0A0A0B] overflow-hidden border border-white/5 shadow-2xl">
                    <div className="flex h-8 items-center gap-1.5 px-6 border-b border-white/5 bg-zinc-900/50">
                        <div className="h-2 w-2 rounded-full bg-red-500/30" />
                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    </div>
                    <div className="p-8 grid grid-cols-3 gap-6">
                        {/* Janela 1: Intelligence Feed */}
                        <div className="h-64 rounded-2xl bg-[#0C0C0E] border border-white/5 p-5 flex flex-col gap-4 shadow-inner relative overflow-hidden group">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live Intel</span>
                                <div className="flex gap-1">
                                    <div className="h-1 w-3 bg-red-500/20 rounded-full" />
                                    <div className="h-1 w-1 bg-red-500 rounded-full animate-ping" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { t: "Nicho: Curiosidades Espaciais", v: "840k views/dia", c: "text-emerald-400" },
                                    { t: "Trend: IA Voz de Celebridade", v: "CPM Médio R$ 42", c: "text-red-400" },
                                    { t: "Gap: Finanças p/ Adolescentes", v: "Competição Baixa", c: "text-blue-400" }
                                ].map((row, i) => (
                                    <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-white/[0.05] transition-colors">
                                        <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight">{row.t}</div>
                                        <div className={`text-[10px] font-black ${row.c}`}>{row.v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Janela 2: Revenue & CPM Insights */}
                        <div className="h-64 rounded-2xl bg-[#0C0C0E] border border-white/5 p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estimativa Mensal</span>
                                <TrendingUp className="h-3 w-3 text-red-500/50" />
                            </div>
                            <div className="flex-1 flex flex-col justify-end gap-3 pb-2">
                                <div className="text-3xl font-black text-white tracking-tighter">R$ 12.450 <span className="text-xs text-zinc-500">/canal</span></div>
                                <div className="grid grid-cols-7 gap-1 items-end h-16">
                                    {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
                                        <div key={i} style={{ height: `${h}%` }} className="bg-red-600/20 rounded-t-[2px] border-t border-red-500/40" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Janela 3: Monitoramento de Concorrentes */}
                        <div className="h-64 rounded-2xl bg-[#0C0C0E] border border-white/5 p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Tracker</span>
                                </div>
                                <div className="flex -space-x-1.5 focus-within:space-x-1 transition-all">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-5 w-5 rounded-full border-2 border-[#0C0C0E] bg-zinc-800 shadow-xl overflow-hidden">
                                            <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 pt-1">
                                {[
                                    { n: "@AlphaArchives", s: "82k subs", c: "Investimento", p: 72, h: true, type: 'yt' },
                                    { n: "@HorrorPulse", s: "1.2M views", c: "Entertainment", p: 100, h: false, type: 'tt' },
                                    { n: "@LifeHacksFB", s: "500k likes", c: "Life Hacks", p: 45, h: true, type: 'fb' },
                                    { n: "@AI_Discovery", s: "14k followers", c: "Tecnologia", p: 35, h: true, type: 'ig' }
                                ].map((item, i) => (
                                    <div key={i} className="group relative">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-white tracking-tight flex items-center gap-1.5">
                                                    {item.type === 'yt' && <Youtube className="h-2.5 w-2.5 text-red-500" />}
                                                    {item.type === 'tt' && <Music2 className="h-2.5 w-2.5 text-cyan-400" />}
                                                    {item.type === 'ig' && <Instagram className="h-2.5 w-2.5 text-pink-500" />}
                                                    {item.type === 'fb' && <Facebook className="h-2.5 w-2.5 text-blue-500" />}
                                                    {item.n}
                                                    {item.h && <span className="px-1 py-0.5 rounded-[4px] bg-red-500/10 text-red-500 text-[7px] font-black border border-red-500/20">HIGH CPM</span>}
                                                </span>
                                                <span className="text-[8px] text-zinc-500 font-medium">{item.c} • {item.s}</span>
                                            </div>
                                            <span className={`text-[9px] font-black tracking-tighter ${item.p === 100 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                                {item.p}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                style={{ width: `${item.p}%` }} 
                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                                    item.p === 100 
                                                        ? 'bg-gradient-to-r from-emerald-600/50 to-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                                                        : 'bg-gradient-to-r from-red-600/40 to-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                                }`} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
                 {/* Floating Badges */}
                 <div className="absolute -top-10 -right-10 hidden lg:flex items-center gap-4 p-5 rounded-3xl border border-red-500/20 bg-red-950/20 backdrop-blur-xl animate-bounce duration-[3000ms]">
                    <TrendingUp className="h-6 w-6 text-red-500" />
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">ROI Estimado</div>
                        <div className="text-xl font-black">420k+ <span className="text-zinc-500 text-xs font-medium">BRL/mês</span></div>
                    </div>
                 </div>
             </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section id="vision" className="py-32 border-t border-white/5">
            <div className="mx-auto max-w-7xl px-4">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <Badge color="red">NOSSA VISÃO</Badge>
                        <h2 className="text-4xl sm:text-6xl font-black mt-6 mb-8 leading-tight">Social Media é sobre <span className="text-zinc-500 italic">algoritmo</span>, não rosto.</h2>
                        <p className="text-xl text-zinc-400 leading-relaxed font-medium mb-10">
                            Acreditamos que os canais mais rentáveis são aqueles que operam como máquinas de dados. Nós fornecemos o combustível.
                        </p>
                        <div className="space-y-6">
                            {[
                                { icon: Target, text: "Identificação de nichos inexplorados" },
                                { icon: Users, text: "Engenharia reversa de viralização" },
                                { icon: Cpu, text: "Automação via Inteligência Artificial" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                    <div className="bg-red-600/10 p-2 rounded-lg text-red-500">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-zinc-200">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4 pt-12">
                            <FeatureImage src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" />
                            <FeatureImage src="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=800&auto=format&fit=crop" />
                        </div>
                        <div className="space-y-4">
                            <FeatureImage src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=800&auto=format&fit=crop" />
                            <FeatureImage src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Detailed Intelligence */}
        <section id="intel" className="py-32 bg-white/[0.01]">
            <div className="mx-auto max-w-7xl px-4 text-center">
                 <Badge color="zinc">DARK INTELLIGENCE</Badge>
                 <h2 className="text-4xl sm:text-6xl font-black mt-8 mb-20 leading-tight">Mineração Profunda.<br /><span className="text-zinc-500">Decisões Rápidas.</span></h2>
                 
                 <div className="grid gap-12 md:grid-cols-3">
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
                        <div key={i} className="group relative text-left p-10 rounded-[3rem] border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <feature.icon className="h-32 w-32" />
                            </div>
                            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-zinc-800 border-2 border-white/5 text-red-500 group-hover:scale-110 transition-transform">
                                <feature.icon className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                            <p className="text-zinc-500 leading-relaxed font-medium">{feature.desc}</p>
                        </div>
                    ))}
                 </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
             <div className="mx-auto max-w-4xl px-4 text-center">
                <h2 className="text-5xl sm:text-7xl font-black mb-10 leading-[0.9]">Não deixe o <span className="text-red-600 italic">próximo hit</span> escapar entre os dados.</h2>
                 <p className="text-xl text-zinc-400 mb-12 font-bold max-w-2xl mx-auto">Vagas restritas para agências e produtores sérios. Solicite seu convite hoje.</p>
                 <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <Link href="/invite">
                        <Button className="h-20 rounded-3xl bg-white text-black px-14 text-xl font-black hover:bg-zinc-100 hover:scale-105 transition-all shadow-2xl">
                            SOLICITAR CONVITE AGORA
                        </Button>
                    </Link>
                    <Link href="/login">
                        <button className="text-zinc-500 hover:text-white font-bold transition-colors">Já sou membro</button>
                    </Link>
                 </div>
             </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-20 bg-[#050506]">
        <div className="mx-auto max-w-7xl px-4 grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                        <Youtube className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">DARK<span className="text-red-500">TUBE</span></span>
                </div>
                <p className="text-zinc-500 max-w-xs font-medium leading-relaxed">
                    A inteligência de elite para quem constrói o futuro do conteúdo nas redes sociais.
                </p>
            </div>
            <div className="space-y-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-white">Legal</h4>
                <div className="flex flex-col gap-3 text-zinc-500 text-sm font-bold">
                    <a href="#" className="hover:text-red-500 transition-colors">Privacidade</a>
                    <a href="#" className="hover:text-red-500 transition-colors">Termos</a>
                    <a href="#" className="hover:text-red-500 transition-colors">Compliance</a>
                </div>
            </div>
            <div className="space-y-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-white">Contato</h4>
                <div className="flex flex-col gap-3 text-zinc-500 text-sm font-bold">
                    <a href="#" className="hover:text-red-500 transition-colors flex items-center gap-2">
                        <Mail className="h-4 w-4" /> admin@darktube.com
                    </a>
                </div>
            </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-20 text-center text-zinc-600 text-[10px] font-black tracking-widest uppercase">
            DarkTube Miner &copy; 2026 &mdash; Built for the elite
        </div>
      </footer>
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode, color: 'red' | 'zinc' }) {
    const styles = {
        red: 'border-red-500/20 bg-red-500/5 text-red-500',
        zinc: 'border-white/10 bg-white/5 text-zinc-400'
    }
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${styles[color]}`}>
            {children}
        </span>
    )
}

function FeatureImage({ src }: { src: string }) {
    return (
        <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 group">
            <img 
                src={src} 
                alt="Feature" 
                className="object-cover w-full h-full grayscale hover:grayscale-0 hover:scale-110 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
        </div>
    )
}
