import fs from "fs"
import path from "path"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local")
    if (!fs.existsSync(envPath)) return
    const content = fs.readFileSync(envPath, "utf-8")
    content.split("\n").forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) return
        const [key, ...valueParts] = trimmed.split("=")
        if (key && valueParts.length > 0) {
            let value = valueParts.join("=").trim()
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
            process.env[key.trim()] = value
        }
    })
}

loadEnv()

async function setup() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return

    const supabase = createSupabaseClient(url, key)
    const email = "nathan.jordan@fjt-solutions.com"

    console.log(`👤 Provisionando usuário: ${email}...`)

    // 1. Criar usuário no Auth (se não existir)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "Nathan Jordan" }
    })

    if (authError) {
        if (authError.message.includes("already registered")) {
            console.log("ℹ️ Usuário já existe no Auth.")
        } else {
            console.error("❌ Erro ao criar usuário no Auth:", authError.message)
            return
        }
    } else {
        console.log("✅ Usuário criado no Auth.")
    }

    // 2. Garantir que o perfil seja ADMIN e APROVADO
    // O trigger handle_new_user deve ter criado o perfil, mas vamos forçar os campos
    const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single()
    
    if (user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                role: 'admin',
                status: 'approved'
            })
            .eq('id', user.id)
        
        if (profileError) {
            console.error("❌ Erro ao atualizar perfil:", profileError.message)
        } else {
            console.log("👑 Usuário promovido a ADMIN e APROVADO com sucesso.")
        }
    } else {
        console.warn("⚠️ Perfil não encontrado. Verifique se o trigger handle_new_user está funcionando.")
    }

    // 3. Verificação Final do Sistema
    console.log("\n🔍 Rodando verificação final...")
    const { data: niches } = await supabase.from('niches').select('count')
    console.log(`✅ Conexão OK. Nichos encontrados: ${niches?.[0]?.count || 0}`)
}

setup()
