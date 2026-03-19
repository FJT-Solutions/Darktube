import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function sendAccessGrantedEmail(email: string, name: string, setupLink: string) {
    const mailOptions = {
        from: `"DarkTube Miner" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🚀 Seu acesso ao DarkTube Miner foi aprovado!',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #141417;">
                <h1 style="color: #ef4444;">Bem-vindo ao DarkTube Miner, ${name}!</h1>
                <p>Boas notícias! Sua solicitação de acesso foi aprovada por um administrador.</p>
                <p>Agora você pode acessar a ferramenta e começar sua mineração de canais dark.</p>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${setupLink}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Definir minha senha de acesso
                    </a>
                </div>
                
                <p style="font-size: 13px; color: #666;">Ao clicar no botão acima, você será direcionado para criar sua senha exclusiva e acessar o dashboard.</p>
                <p style="font-size: 13px; color: #ef4444;">${setupLink}</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 11px; color: #999;">Esta é uma ferramenta exclusiva. Por favor, não compartilhe seus dados de acesso.</p>
            </div>
        `,
    }

    try {
        await transporter.sendMail(mailOptions)
        return { success: true }
    } catch (error) {
        console.error('Error sending email:', error)
        return { success: false, error }
    }
}
