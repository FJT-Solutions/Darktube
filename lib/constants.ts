import type { NicheCategory } from "./types"

export const NICHES: NicheCategory[] = [
  {
    id: "motivation",
    label: "Motivação",
    keywords: ["motivação", "motivational", "motivation", "inspiração", "mindset"],
    estimatedCpm: 6,
    icon: "Flame",
    description: "Vídeos inspiradores com narrações potentes e trilhas épicas.",
    growthPotential: 7,
    difficulty: 6,
    revenuePotential: "Medium",
    aiFriendliness: 9,
    aiWorkflow: {
      visuals: "Midjourney + Runway (Imagens cinematográficas)",
      script: "ChatGPT (Roteiros persuasivos)",
      voice: "ElevenLabs (Vozes inspiradoras/profundas)"
    }
  },
  {
    id: "top10",
    label: "Top 10 / Rankings",
    keywords: ["top 10", "top 5", "ranking", "melhores", "best of"],
    estimatedCpm: 4,
    icon: "Trophy",
    description: "Curiosidades em formato de lista sobre qualquer assunto.",
    growthPotential: 6,
    difficulty: 4,
    revenuePotential: "Medium",
    aiFriendliness: 8,
    aiWorkflow: {
      visuals: "Stock Footage + Leonardo.ai",
      script: "ChatGPT (Listagem e fatos)",
      voice: "ElevenLabs (Voz enérgica)"
    }
  },
  {
    id: "curiosities",
    label: "Curiosidades",
    keywords: ["curiosidades", "facts", "fatos", "você sabia", "did you know"],
    estimatedCpm: 5,
    icon: "Lightbulb",
    description: "Fatos interessantes e teorias sobre o mundo e a ciência.",
    growthPotential: 8,
    difficulty: 5,
    revenuePotential: "Medium",
    aiFriendliness: 8,
    aiWorkflow: {
      visuals: "Midjourney + Vídeos de Estoque",
      script: "Claude (Pesquisa de fatos reais)",
      voice: "ElevenLabs (Voz documental)"
    }
  },
  {
    id: "compilations",
    label: "Compilações",
    keywords: ["compilation", "compilação", "best moments", "melhores momentos"],
    estimatedCpm: 3,
    icon: "Film",
    description: "Recortes de momentos engraçados, satisfatórios ou épicos.",
    growthPotential: 5,
    difficulty: 3,
    revenuePotential: "Low",
    aiFriendliness: 4,
    aiWorkflow: {
      visuals: "Curadoria de vídeos reais",
      script: "N/A (Legendas IA)",
      voice: "ElevenLabs (Narração rápida)"
    }
  },
  {
    id: "asmr",
    label: "ASMR / Relaxamento",
    keywords: ["asmr", "relaxing", "relaxamento", "sleep", "calming"],
    estimatedCpm: 8,
    icon: "Moon",
    description: "Sons e visuais relaxantes para ajudar a dormir ou focar.",
    growthPotential: 6,
    difficulty: 7,
    revenuePotential: "Medium",
    aiFriendliness: 7,
    aiWorkflow: {
      visuals: "Ambientes 3D IA (Luma/Midjourney)",
      script: "Puro Som / Roteiro Minimalista",
      voice: "Sons ambiente purificados"
    }
  },
  {
    id: "meditation",
    label: "Meditação / Espiritualidade",
    keywords: ["meditação", "meditation", "spiritual", "mindfulness", "yoga"],
    estimatedCpm: 10,
    icon: "Heart",
    description: "Guias de meditação e conteúdos sobre bem-estar mental.",
    growthPotential: 7,
    difficulty: 6,
    revenuePotential: "High",
    aiFriendliness: 9,
    aiWorkflow: {
      visuals: "Imagens abstratas Midjourney + Kaiber",
      script: "ChatGPT (Meditação guiada)",
      voice: "ElevenLabs (Voz calma e serena)"
    }
  },
  {
    id: "stories",
    label: "Histórias / Narrações",
    keywords: ["historia", "story", "storytime", "narração", "narrated"],
    estimatedCpm: 6,
    icon: "BookOpen",
    description: "Contos originais ou relatos reais narrados de forma envolvente.",
    growthPotential: 9,
    difficulty: 8,
    revenuePotential: "High",
    aiFriendliness: 10,
    aiWorkflow: {
      visuals: "Midjourney (Ilustração de cada cena)",
      script: "ChatGPT (Storytelling dinâmico)",
      voice: "ElevenLabs (Narração imersiva)"
    }
  },
  {
    id: "horror",
    label: "Horror / Mistério",
    keywords: ["horror", "terror", "misterio", "mystery", "creepy", "scary"],
    estimatedCpm: 7,
    icon: "Skull",
    description: "Relatos de terror, creepypastas e mistérios não resolvidos.",
    growthPotential: 8,
    difficulty: 7,
    revenuePotential: "Medium",
    aiFriendliness: 9,
    aiWorkflow: {
      visuals: "Midjourney (Imagens sombrias/horror)",
      script: "ChatGPT (Creepypastas)",
      voice: "ElevenLabs (Voz assustadora/sussurrada)"
    }
  },
  {
    id: "finance",
    label: "Finanças / Investimentos",
    keywords: ["finanças", "finance", "investimento", "money", "dinheiro", "cripto"],
    estimatedCpm: 15,
    icon: "DollarSign",
    description: "Dicas de economia, investimentos e mercado financeiro.",
    growthPotential: 6,
    difficulty: 9,
    revenuePotential: "High",
    aiFriendliness: 7,
    aiWorkflow: {
      visuals: "Infográficos IA + B-roll financeiro",
      script: "Claude (Dados financeiros precisos)",
      voice: "ElevenLabs (Voz profissional/séria)"
    }
  },
  {
    id: "tech",
    label: "Tecnologia",
    keywords: ["tech", "tecnologia", "ai", "artificial intelligence", "gadgets"],
    estimatedCpm: 12,
    icon: "Cpu",
    description: "Notícias sobre gadgets, IA e o futuro da tecnologia.",
    growthPotential: 9,
    difficulty: 8,
    revenuePotential: "High",
    aiFriendliness: 9,
    aiWorkflow: {
      visuals: "B-roll Tech + Imagens IA futuristas",
      script: "ChatGPT (Análise tecnológica)",
      voice: "ElevenLabs (Voz moderna)"
    }
  },
  {
    id: "gaming",
    label: "Gaming Clips",
    keywords: ["gaming", "gameplay", "game clips", "best plays", "highlights"],
    estimatedCpm: 5,
    icon: "Gamepad2",
    description: "Destaques e melhores momentos de jogos populares.",
    growthPotential: 7,
    difficulty: 4,
    revenuePotential: "Low",
    aiFriendliness: 3,
    aiWorkflow: {
      visuals: "Captura de tela de jogos",
      script: "Comentários simples",
      voice: "ElevenLabs (Voz gamer)"
    }
  },
  {
    id: "nature",
    label: "Natureza / Animais",
    keywords: ["nature", "natureza", "animals", "animais", "wildlife"],
    estimatedCpm: 5,
    icon: "TreePine",
    description: "Beleza natural e curiosidades sobre o reino animal.",
    growthPotential: 5,
    difficulty: 6,
    revenuePotential: "Medium",
    aiFriendliness: 6,
    aiWorkflow: {
      visuals: "Stock Footage (Pexels) + Upscale IA",
      script: "ChatGPT (Fatos naturais)",
      voice: "ElevenLabs (Voz estilo Discovery)"
    }
  },
  {
    id: "education",
    label: "Educação",
    keywords: ["educação", "education", "learn", "tutorial", "como fazer", "how to"],
    estimatedCpm: 8,
    icon: "GraduationCap",
    description: "Explicações visuais de temas complexos ou tutoriais.",
    growthPotential: 7,
    difficulty: 7,
    revenuePotential: "High",
    aiFriendliness: 8,
    aiWorkflow: {
      visuals: "Canvas + HeyGen (Avatar tutor)",
      script: "ChatGPT (Estrutura didática)",
      voice: "ElevenLabs (Voz clara/didática)"
    }
  },
  {
    id: "luxury",
    label: "Luxo / Lifestyle",
    keywords: ["luxury", "luxo", "rich", "millionaire", "lifestyle", "expensive"],
    estimatedCpm: 12,
    icon: "Crown",
    description: "Exibição de mansões, carros de luxo e vidas milionárias.",
    growthPotential: 8,
    difficulty: 6,
    revenuePotential: "High",
    aiFriendliness: 9,
    aiWorkflow: {
      visuals: "Midjourney (Imagens aspiracionais) + Vídeos Estoque",
      script: "ChatGPT (Narrativa aspiracional)",
      voice: "ElevenLabs (Voz elegante/sofisticada)"
    }
  },
]

export const LANGUAGES = [
  { value: "all", label: "Todos os idiomas" },
  { value: "pt", label: "Portugues" },
  { value: "en", label: "Ingles" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Frances" },
  { value: "de", label: "Alemao" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "Japones" },
  { value: "ko", label: "Coreano" },
  { value: "hi", label: "Hindi" },
]

export const COUNTRIES = [
  { value: "all", label: "Todos os paises" },
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "GB", label: "Reino Unido" },
  { value: "ES", label: "Espanha" },
  { value: "FR", label: "Franca" },
  { value: "DE", label: "Alemanha" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japao" },
  { value: "MX", label: "Mexico" },
]

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "subscribers", label: "Mais inscritos" },
  { value: "views", label: "Mais visualizacoes" },
  { value: "date", label: "Mais recente" },
]

export const SUBSCRIBER_RANGES = [
  { value: "0", label: "Sem minimo" },
  { value: "1000", label: "1K+" },
  { value: "10000", label: "10K+" },
  { value: "50000", label: "50K+" },
  { value: "100000", label: "100K+" },
  { value: "500000", label: "500K+" },
  { value: "1000000", label: "1M+" },
]
