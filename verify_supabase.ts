import fs from "fs"
import path from "path"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Manual .env.local loader (sem dependência externa)
function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local")
    if (!fs.existsSync(envPath)) {
        console.warn("⚠️ .env.local não encontrado")
        return
    }
    
    const content = fs.readFileSync(envPath, "utf-8")
    content.split("\n").forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) return
        
        const [key, ...valueParts] = trimmed.split("=")
        if (key && valueParts.length > 0) {
            let value = valueParts.join("=").trim()
            // Remover aspas se existirem
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
            process.env[key.trim()] = value
        }
    })
}

loadEnv()

async function verify() {
    console.log("🚀 Iniciando verificação do Supabase...")
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        console.error("❌ ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.local")
        return
    }

    // Criar o cliente admin diretamente aqui para evitar erros de importação precoce
    const supabase = createSupabaseClient(url, key)

    try {
        // 1. Verificar conexão e Tabelas
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
        
        if (profileError) {
            console.error("❌ Erro ao acessar tabela 'profiles':", profileError.message)
        } else {
            console.log("✅ Tabela 'profiles' acessível.")
        }

        // 2. Verificar Niches
        const { data: niches, error: nicheError } = await supabase
            .from('niches')
            .select('name, label')
            .limit(5)
        
        if (nicheError) {
            console.error("❌ Erro ao acessar tabela 'niches':", nicheError.message)
        } else if (!niches || niches.length === 0) {
            console.warn("⚠️ Tabela 'niches' está vazia.")
        } else {
            console.log(`✅ Tabela 'niches' contém ${niches.length} registros.`)
        }

        // 3. Verificar Storage
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
        if (storageError) {
            console.error("❌ Erro ao listar buckets:", storageError.message)
        } else {
            console.log("✅ Conexão com Storage OK.")
        }

        console.log("\n✨ Verificação concluída!")

    } catch (err) {
        console.error("💥 Erro fatal:", err)
    }
}

verify()
