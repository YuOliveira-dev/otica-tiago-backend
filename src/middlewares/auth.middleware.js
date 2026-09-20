import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const FALLBACK_DEV_SECRET = 'ts_eyewear_jwt_secret_super_segura_2026_otica_tiago';

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
 * Middleware para proteger rotas administrativas (/api/admin/*).
 * Valida o token JWT obtido prioritariamente do Cookie HttpOnly ou do cabeçalho Bearer.
 */
export async function autenticarAdmin(req, res, next) {
  try {
    let token = null;

    // 1. Extração do token: Prioridade para Cookie HttpOnly (padrão OWASP seguro)
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Acesso não autorizado. Sessão administrativa não encontrada ou expirada.',
      });
    }

    // 2. Verificação e decodificação do JWT
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

    const decoded = jwt.verify(token, secret);

    // 3. Validação do usuário no banco
    const admin = await prisma.usuarioAdmin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nome: true,
        email: true,
        criadoEm: true,
      },
    });

    if (!admin) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Administrador não encontrado no sistema ou acesso revogado.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        erro: 'Sua sessão expirou. Por favor, realize login novamente.',
      });
    }

    return res.status(401).json({
      sucesso: false,
      erro: 'Token de autenticação inválido ou corrompido.',
    });
  }
}

export default autenticarAdmin;
