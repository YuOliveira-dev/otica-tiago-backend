import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function obterJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('CONFIG_ERROR: Variável JWT_SECRET obrigatória não foi configurada no arquivo de ambiente (.env).');
  }
  return secret;
}

/**
 * POST /api/admin/auth/login
 * Autentica o administrador, valida o hash da senha no banco e registra uma sessão exclusiva no PostgreSQL.
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

    // 1. Busca o usuário admin cadastrado no banco de dados
    const admin = await prisma.usuarioAdmin.findUnique({
      where: { email: emailNormalizado },
    });

    if (!admin) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Credenciais de acesso incorretas. Verifique seu e-mail e senha.',
      });
    }

    // 2. Validação da senha contra o hash Bcrypt armazenado no banco
    const senhaValida = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Credenciais de acesso incorretas. Verifique seu e-mail e senha.',
      });
    }

    // 3. Obtenção segura da chave JWT a partir das variáveis de ambiente (.env)
    let secret;
    try {
      secret = obterJwtSecret();
    } catch (configErr) {
      console.error('❌ Falha de configuração de segurança:', configErr.message);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro de configuração interna de autenticação no servidor.',
      });
    }

    // 4. Identificador de sessão exclusivo para este login
    const sessionId = crypto.randomUUID();
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // 5. Emissão do Token JWT com o ID da sessão exclusiva
    const token = jwt.sign(
      {
        id: admin.id,
        sessionId,
        email: admin.email,
        nome: admin.nome,
        role: 'ADMIN',
      },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 6. Registro da sessão exclusiva no banco de dados (PostgreSQL)
    await prisma.sessaoAdmin.create({
      data: {
        id: sessionId,
        usuarioId: admin.id,
        token,
        userAgent: req.headers['user-agent'] || null,
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 100) || null,
        expiraEm,
      },
    });

    // 7. Gravação do Cookie HttpOnly seguro (Padrão OWASP)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction, // HTTPS obrigatório em produção
      sameSite: isProduction ? 'none' : 'lax', // 'none' permite cross-origin seguro com secure=true
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
 * Retorna dados da sessão do administrador autenticado e confirma validação do token
 */
router.get('/me', autenticarAdmin, (req, res) => {
  res.json({
    sucesso: true,
    admin: req.admin,
    token: req.tokenAdmin || undefined,
  });
});

/**
 * POST /api/admin/auth/logout
 * Encerra a sessão, deleta o registro da sessão no banco de dados e remove o cookie HttpOnly
 */
router.post('/logout', async (req, res) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Deleta o token de sessão exclusivo do banco de dados
    if (token) {
      await prisma.sessaoAdmin.deleteMany({
        where: { token },
      }).catch((err) => {
        console.warn('Aviso ao deletar sessão do banco no logout:', err.message);
      });
    }
  } catch (err) {
    console.warn('Erro ao processar exclusão de sessão no logout:', err);
  } finally {
    res.clearCookie('admin_token', {
      path: '/',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      sucesso: true,
      mensagem: 'Sessão administrativa encerrada com segurança e token revogado.',
    });
  }
});

export default router;
