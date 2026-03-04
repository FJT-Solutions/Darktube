"use client"

import { useMemo } from "react"
import { formatCurrencyUSD, formatBRNumber } from "@/lib/metrics"
import type { YouTubeChannel, YouTubeVideo, ChannelMetrics } from "@/lib/types"
import {
    PlayCircle,
    Zap,
    DollarSign,
    TrendingUp,

    Users,
    CalendarDays,
    MapPin,
    Tag,
} from "lucide-react"

// RPM ranges by content category
const CONTENT_CATEGORIES = [
    { id: "finance", label: "Finance & Business", rpmMin: 11, rpmMax: 28, rpmDefault: 15 },
    { id: "technology", label: "Technology", rpmMin: 8, rpmMax: 20, rpmDefault: 12 },
    { id: "automotive", label: "Automotive", rpmMin: 7, rpmMax: 16, rpmDefault: 10 },
    { id: "health", label: "Health & Fitness", rpmMin: 4.5, rpmMax: 11, rpmDefault: 7 },
    { id: "education", label: "Education", rpmMin: 4, rpmMax: 10, rpmDefault: 6 },
    { id: "marketing", label: "Marketing", rpmMin: 5.5, rpmMax: 12, rpmDefault: 8 },
    { id: "tech_gadgets", label: "Tech & Gadgets", rpmMin: 4, rpmMax: 10, rpmDefault: 6 },
    { id: "real_estate", label: "Real Estate", rpmMin: 5, rpmMax: 11, rpmDefault: 7 },
    { id: "lifestyle", label: "Lifestyle", rpmMin: 3.5, rpmMax: 9, rpmDefault: 5 },
    { id: "food_cooking", label: "Food & Cooking", rpmMin: 2.5, rpmMax: 7, rpmDefault: 4 },
    { id: "beauty_fashion", label: "Beauty & Fashion", rpmMin: 2, rpmMax: 6, rpmDefault: 3.5 },
    { id: "family", label: "Family & Parenting", rpmMin: 2, rpmMax: 5, rpmDefault: 3 },
    { id: "travel", label: "Travel & Events", rpmMin: 2.5, rpmMax: 12, rpmDefault: 5 },
    { id: "diy", label: "DIY & Crafts", rpmMin: 2, rpmMax: 4.5, rpmDefault: 3 },
    { id: "gaming", label: "Gaming", rpmMin: 1, rpmMax: 7, rpmDefault: 3 },
    { id: "entertainment", label: "Entertainment", rpmMin: 1, rpmMax: 6, rpmDefault: 2.5 },
    { id: "music", label: "Music", rpmMin: 0.5, rpmMax: 5, rpmDefault: 2 },
    { id: "vlogging", label: "Vlogging", rpmMin: 1, rpmMax: 18, rpmDefault: 4 },
]

// Country RPM multipliers
const COUNTRIES = [
    { code: "US", label: "United States", multiplier: 1.0 },
    { code: "UK", label: "United Kingdom", multiplier: 0.85 },
    { code: "CA", label: "Canada", multiplier: 0.80 },
    { code: "AU", label: "Australia", multiplier: 0.75 },
    { code: "DE", label: "Germany", multiplier: 0.70 },
    { code: "FR", label: "France", multiplier: 0.60 },
    { code: "PT", label: "Portugal", multiplier: 0.70 },
    { code: "ES", label: "Spain", multiplier: 0.70 },
    { code: "BR", label: "Brazil", multiplier: 0.45 },
    { code: "MX", label: "Mexico", multiplier: 0.45 },
    { code: "IN", label: "India", multiplier: 0.40 },
    { code: "OTHER", label: "Other", multiplier: 0.50 },
]

interface EarningsCalculatorProps {
    channel: YouTubeChannel
    videos: YouTubeVideo[]
    metrics: ChannelMetrics
}

// Maps YouTube topicCategories (from Wikipedia) → our category IDs
const TOPIC_TO_CATEGORY: Record<string, string> = {
    "Education": "education",
    "Finance": "finance",
    "Business": "finance",
    "Investing": "finance",
    "Technology": "technology",
    "Automobile": "automotive",
    "Vehicle": "automotive",
    "Health": "health",
    "Fitness": "health",
    "Sport": "health",
    "Marketing": "marketing",
    "Gadget": "tech_gadgets",
    "Electronics": "tech_gadgets",
    "Real estate": "real_estate",
    "Lifestyle": "lifestyle",
    "Lifestyle (sociology)": "lifestyle",
    "Food": "food_cooking",
    "Cooking": "food_cooking",
    "Fashion": "beauty_fashion",
    "Beauty": "beauty_fashion",
    "Family": "family",
    "Tourism": "travel",
    "Travel": "travel",
    "Do it yourself": "diy",
    "Video game": "gaming",
    "Gaming": "gaming",
    "Action game": "gaming",
    "Role-playing video game": "gaming",
    "Entertainment": "entertainment",
    "Humor": "entertainment",
    "Comedy": "entertainment",
    "Film": "entertainment",
    "Television program": "entertainment",
    "Performing arts": "entertainment",
    "Music": "music",
    "Hip hop music": "music",
    "Electronic music": "music",
    "Rock music": "music",
    "Pop music": "music",
    "Soul music": "music",
    "Rhythm and blues": "music",
    "Country music": "music",
    "Jazz": "music",
    "Christian music": "music",
    "Independent music": "music",
    "Society": "lifestyle",
    "Knowledge": "education",
    "Hobby": "lifestyle",
    "Pet": "lifestyle",
    "Animal": "lifestyle",
    "Nature": "lifestyle",
    "Politics": "entertainment",
    "News": "entertainment",
    "Military": "entertainment",
    "Religion": "lifestyle",
}

function detectCategory(channel: YouTubeChannel, videos: YouTubeVideo[]): string {
    // 1. Primary: Use real topicCategories from YouTube API
    if (channel.topicCategories && channel.topicCategories.length > 0) {
        for (const topic of channel.topicCategories) {
            const mapped = TOPIC_TO_CATEGORY[topic]
            if (mapped) return mapped
        }
    }

    // 2. Fallback: Text-based detection
    const text = `${channel.name} ${channel.description} ${videos.map(v => v.title).join(" ")}`.toLowerCase()
    if (text.match(/financ|invest|dinheiro|money|riqueza|cripto/)) return "finance"
    if (text.match(/tech|software|programming|código|programação/)) return "technology"
    if (text.match(/carro|car|auto|moto/)) return "automotive"
    if (text.match(/saúde|health|fitness|treino|workout/)) return "health"
    if (text.match(/educa|learn|tutorial|como fazer|how to|aula/)) return "education"
    if (text.match(/market|seo|ads|negócio/)) return "marketing"
    if (text.match(/gadget|unbox|review|smartphone/)) return "tech_gadgets"
    if (text.match(/imóv|real estate|house|casa/)) return "real_estate"
    if (text.match(/lifestyle|vida|rotina|daily/)) return "lifestyle"
    if (text.match(/culinária|receita|cozinha|food|cook/)) return "food_cooking"
    if (text.match(/beauty|moda|fashion|makeup/)) return "beauty_fashion"
    if (text.match(/família|parent|baby|criança/)) return "family"
    if (text.match(/viagem|travel|trip|turismo/)) return "travel"
    if (text.match(/diy|craft|artesanato|faça/)) return "diy"
    if (text.match(/game|gaming|gameplay|play/)) return "gaming"
    if (text.match(/entertain|humor|comédia|funny|react/)) return "entertainment"
    if (text.match(/music|música|song|cover|beat/)) return "music"
    if (text.match(/vlog|daily|diary/)) return "vlogging"
    return "entertainment"
}

// ISO 2-letter code → our country codes
const ISO_TO_COUNTRY: Record<string, string> = {
    "US": "US", "GB": "UK", "UK": "UK", "CA": "CA", "AU": "AU",
    "DE": "DE", "FR": "FR", "BR": "BR", "MX": "MX", "IN": "IN",
    "PH": "PH", "ID": "ID",
    "PT": "BR", "AO": "BR", "MZ": "BR", // Portuguese-speaking → BR RPM
    "ES": "MX", "AR": "MX", "CO": "MX", "CL": "MX", "PE": "MX", // Spanish-speaking → MX RPM
    "JP": "AU", "KR": "AU", "NZ": "AU", // High-value Asian/Oceania
    "IT": "FR", "NL": "DE", "BE": "FR", "AT": "DE", "CH": "DE", // European
    "SE": "DE", "NO": "DE", "DK": "DE", "FI": "DE", // Nordics
    "IE": "UK", "SG": "AU", "HK": "AU", "TW": "AU",
}

function detectCountry(channel: YouTubeChannel): string {
    const code = (channel.country || "").toUpperCase().trim()
    if (!code) return "OTHER"

    // Direct ISO code match
    const mapped = ISO_TO_COUNTRY[code]
    if (mapped) return mapped

    // Full name fallback (for scraper data)
    const lower = code.toLowerCase()
    if (lower.includes("brazil") || lower.includes("brasil")) return "BR"
    if (lower.includes("united states")) return "US"
    if (lower.includes("united kingdom")) return "UK"
    if (lower.includes("canada")) return "CA"
    if (lower.includes("india")) return "IN"

    return "OTHER"
}

export function EarningsCalculator({ channel, videos, metrics }: EarningsCalculatorProps) {
    const detectedCat = detectCategory(channel, videos)
    const detectedCountry = detectCountry(channel)
    const category = CONTENT_CATEGORIES.find(c => c.id === detectedCat) || CONTENT_CATEGORIES[4]
    const country = COUNTRIES.find(c => c.code === detectedCountry) || COUNTRIES[6]
    const rpm = category.rpmDefault

    const earnings = useMemo(() => {
        const channelAge = channel.joinedDate
            ? Math.max(1, Math.floor((Date.now() - new Date(channel.joinedDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 365

        const effectiveRpm = rpm * country.multiplier

        // Long-form calculations
        const totalDailyViews = channel.totalViews / channelAge
        const longFormDailyViews = Math.round(totalDailyViews * 0.97)
        const longFormDailyEarnings = (longFormDailyViews / 1000) * effectiveRpm
        const longFormMonthlyViews = longFormDailyViews * 30
        const longFormMonthlyEarnings = (longFormMonthlyViews / 1000) * effectiveRpm

        // Shorts (estimate ~3% of views, RPM much lower)
        const shortsDailyViews = Math.round(totalDailyViews * 0.03)
        const shortsRpm = effectiveRpm * 0.03 // Shorts pay ~3% of long-form
        const shortsDailyEarnings = (shortsDailyViews / 1000) * shortsRpm
        const shortsMonthlyViews = shortsDailyViews * 30
        const shortsMonthlyEarnings = (shortsMonthlyViews / 1000) * shortsRpm

        // Totals
        const dailyTotal = longFormDailyEarnings + shortsDailyEarnings
        const monthlyTotal = longFormMonthlyEarnings + shortsMonthlyEarnings
        const yearlyTotal = monthlyTotal * 12
        const lifetimeTotal = (channel.totalViews / 1000) * effectiveRpm

        // Real-life ranges (conservative: 20%-60% of estimate)
        const monthlyRange = { min: Math.round(monthlyTotal * 0.2), max: Math.round(monthlyTotal * 0.6) }
        const yearlyRange = { min: Math.round(yearlyTotal * 0.2), max: Math.round(yearlyTotal * 0.6) }
        const lifetimeRange = { min: Math.round(lifetimeTotal * 0.2), max: Math.round(lifetimeTotal * 0.6) }

        return {
            longForm: {
                dailyViews: longFormDailyViews,
                dailyEarnings: longFormDailyEarnings,
                monthlyViews: longFormMonthlyViews,
                monthlyEarnings: longFormMonthlyEarnings,
            },
            shorts: {
                dailyViews: shortsDailyViews,
                dailyEarnings: shortsDailyEarnings,
                monthlyViews: shortsMonthlyViews,
                monthlyEarnings: shortsMonthlyEarnings,
            },
            total: { daily: dailyTotal, monthly: monthlyTotal, yearly: yearlyTotal, lifetime: lifetimeTotal },
            range: { monthly: monthlyRange, yearly: yearlyRange, lifetime: lifetimeRange },
        }
    }, [channel, rpm, country.multiplier])


    const joinedFormatted = channel.joinedDate
        ? new Date(channel.joinedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : ""

    return (
        <div className="space-y-5">
            {/* Channel Profile Card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="h-24 bg-gradient-to-r from-primary/30 via-secondary to-primary/10 lg:h-32">
                    {channel.banner && (
                        <img
                            src={channel.banner}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    )}
                </div>
                <div className="flex flex-col items-center -mt-10 pb-5 px-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-secondary">
                        {channel.avatar ? (
                            <img
                                src={channel.avatar}
                                alt={channel.name}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="text-2xl font-bold text-muted-foreground">{channel.name.charAt(0)}</span>
                        )}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-card-foreground">{channel.name}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {formatBRNumber(channel.subscribers)} Subscribers
                    </p>
                    {joinedFormatted && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <CalendarDays className="h-3 w-3" />
                            Joined: {joinedFormatted}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <Tag className="h-3 w-3" />
                            {category.label}
                        </span>
                        {channel.country && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                                <MapPin className="h-3 w-3" />
                                {country.label}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Long-Form Video Earnings */}
            <EarningsSection
                icon={<PlayCircle className="h-4 w-4 text-primary" />}
                title="Long-Form Video Earnings"
                items={[
                    { label: "Daily Views", value: formatBRNumber(earnings.longForm.dailyViews), isCurrency: false },
                    { label: "Daily Earnings", value: formatCurrencyUSD(earnings.longForm.dailyEarnings), isCurrency: true },
                    { label: "Monthly Views", value: formatBRNumber(earnings.longForm.monthlyViews), isCurrency: false },
                    { label: "Monthly Earnings", value: formatCurrencyUSD(earnings.longForm.monthlyEarnings), isCurrency: true },
                ]}
            />

            {/* Shorts Earnings */}
            <EarningsSection
                icon={<Zap className="h-4 w-4 text-yellow-400" />}
                title="Shorts Earnings"
                items={[
                    { label: "Daily Views", value: formatBRNumber(earnings.shorts.dailyViews), isCurrency: false },
                    { label: "Daily Earnings", value: formatCurrencyUSD(earnings.shorts.dailyEarnings), isCurrency: true },
                    { label: "Monthly Views", value: formatBRNumber(earnings.shorts.monthlyViews), isCurrency: false },
                    { label: "Monthly Earnings", value: formatCurrencyUSD(earnings.shorts.monthlyEarnings), isCurrency: true },
                ]}
            />

            {/* Total Estimated Earnings */}
            <EarningsSection
                icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
                title="Total Estimated Earnings"
                items={[
                    { label: "Daily", value: formatCurrencyUSD(earnings.total.daily), isCurrency: true },
                    { label: "Monthly", value: formatCurrencyUSD(earnings.total.monthly), isCurrency: true },
                    { label: "Yearly", value: formatCurrencyUSD(earnings.total.yearly), isCurrency: true },
                    { label: "Lifetime", value: formatCurrencyUSD(earnings.total.lifetime), isCurrency: true },
                ]}
            />

            {/* Real Life Estimated Range */}
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5">
                <h4 className="mb-4 text-center text-sm font-bold text-emerald-400 flex items-center justify-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Real Life Estimated Range
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <RangeCard label="Monthly Range" min={earnings.range.monthly.min} max={earnings.range.monthly.max} />
                    <RangeCard label="Yearly Range" min={earnings.range.yearly.min} max={earnings.range.yearly.max} />
                    <RangeCard label="Lifetime Range" min={earnings.range.lifetime.min} max={earnings.range.lifetime.max} />
                </div>
            </div>

            {/* Controls — immutable info */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                {/* RPM info */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Estimated RPM (based on category + country):</p>
                    <span className="text-2xl font-bold text-card-foreground">{formatCurrencyUSD(rpm * country.multiplier)}</span>
                </div>

                {/* Country + Category (immutable, auto-detected) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Audience Country:</p>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <MapPin className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-sm font-medium text-foreground">{country.label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">×{country.multiplier}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Content Category:</p>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <Tag className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium text-foreground">{category.label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">${category.rpmMin} - ${category.rpmMax}</span>
                        </div>
                    </div>
                </div>

                <div className="relative mt-2 overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-br from-card to-background p-4 transition-all hover:border-primary/30">
                    <div className="absolute -right-2 -top-2 h-12 w-12 opacity-5">
                        <Zap className="h-full w-full text-primary" />
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                                Perplexity 2026 Report Data
                            </h4>
                            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                                Cálculos baseados em dados reais de nicho e país (Relatório 2026).
                                Consideramos o prêmio de nichos lucrativos, superando estimativas genéricas.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Sub-components ---

function EarningsSection({ icon, title, items }: {
    icon: React.ReactNode
    title: string
    items: { label: string; value: string; isCurrency: boolean }[]
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <h4 className="mb-4 text-center text-sm font-bold text-card-foreground flex items-center justify-center gap-2">
                {icon}
                {title}
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border border-border/50 bg-background/50 px-3 py-3.5 text-center"
                    >
                        <p className="text-[11px] text-muted-foreground mb-1.5">{item.label}</p>
                        <p className={`text-base font-bold ${item.isCurrency ? "text-emerald-400" : "text-primary"}`}>
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RangeCard({ label, min, max }: { label: string; min: number; max: number }) {
    return (
        <div className="rounded-xl border border-emerald-500/20 bg-background/50 px-2 py-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-bold text-emerald-400">
                ${formatBRNumber(min)} - ${formatBRNumber(max)}
            </p>
        </div>
    )
}
