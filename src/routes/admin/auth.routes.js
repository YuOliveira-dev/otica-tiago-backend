import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

const FALLBACK_DEV_SECRET = 'ts_eyewear_jwt_secret_super_segura_2026_otica_tiago';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function obterJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.trim() === '' || secret === FALLBACK_DEV_SECRET) {
      throw new Error('CONFIG_ERROR: Variável JWT_SECRET obrigatória e segura não foi configurada em ambiente de produção.');
    }
    return secret;
  }
  return secret || FALLBACK_DEV_SECRET;
}

/**
 * POST /api/admin/auth/login
 * Autentica o administrador com proteção contra força bruta e cookie HttpOnly seguro
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Informe o e-mail e a senha de acesso administrativo.',
      });
    }

    const emailNormalizado = email.toLowerCase().trim();

    // 1. Busca o usuário admin
    const admin = await prisma.usuarioAdmin.findUnique({
      where: { email: emailNormalizado },
    });

    if (!admin) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Credenciais de acesso incorretas. Verifique seu e-mail e senha.',
      });
    }

    // 2. Validação da senha com Bcrypt
    const senhaValida = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Credenciais de acesso incorretas. Verifique seu e-mail e senha.',
      });
    }

    // 3. Obtenção segura da chave JWT
    let secret;
    try {
      secret = obterJwtSecret();
    } catch (configErr) {
      console.error('❌ Falha de segurança:', configErr.message);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro de configuração interna de autenticação no servidor.',
      });
    }

    // 4. Emissão do Token JWT
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
        role: 'ADMIN',
      },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 4. Gravação do Cookie HttpOnly seguro (Padrão OWASP)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction, // HTTPS obrigatório em produção
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: '/',
    });

    res.json({
      sucesso: true,
      mensagem: `Bem-vindo ao Painel TS EYEWEAR, ${admin.nome}!`,
      token,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Erro no login administrativo:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Ocorreu um erro interno ao processar sua autenticação.',
    });
  }
});

/**
 * GET /api/admin/auth/me
 * Retorna dados da sessão do administrador autenticado
 */
router.get('/me', autenticarAdmin, (req, res) => {
  res.json({
    sucesso: true,
    admin: req.admin,
  });
});

/**
 * POST /api/admin/auth/logout
 * Encerra a sessão e remove o cookie HttpOnly
 */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', {
    path: '/',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.json({
    sucesso: true,
    mensagem: 'Sessão administrativa encerrada com segurança.',
  });
});

export default router;
