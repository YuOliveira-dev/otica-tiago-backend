import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
import { apiGeneralRateLimiter } from './middlewares/rateLimit.middleware.js';

// Rotas Públicas
import produtosPublicRoutes from './routes/public/produtos.routes.js';
import categoriasPublicRoutes from './routes/public/categorias.routes.js';
import bannersPublicRoutes from './routes/public/banners.routes.js';
import fretePublicRoutes from './routes/public/frete.routes.js';
import midiaPublicRoutes from './routes/public/midia.routes.js';

// Rotas Administrativas
import authAdminRoutes from './routes/admin/auth.routes.js';
import produtosAdminRoutes from './routes/admin/produtos.admin.routes.js';
import categoriasAdminRoutes from './routes/admin/categorias.admin.routes.js';
import midiaAdminRoutes from './routes/admin/midia.admin.routes.js';
import bannersAdminRoutes from './routes/admin/banners.admin.routes.js';

const app = express();

// ==========================================
// 1. SEGURANÇA E POLÍTICAS DE CABEÇALHO
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite carregar imagens geradas no frontend
  })
);

// ==========================================
// 2. CONFIGURAÇÃO DE CORS
// ==========================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://frontend-five-teal-52.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Função segura para checar origem permitida
const isAllowedOrigin = (origin) => {
  // Permite requisições sem origin (como curl, chamadas de servidor ou testes internos)
  if (!origin) return true;

  // Domínios expressamente permitidos
  if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
    return true;
  }

  // Deploys preview da Vercel para o frontend do projeto
  if (/^https:\/\/frontend-[a-z0-9-]+-yuoliveira-dev\.vercel\.app$/.test(origin) ||
      /^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // Modo desenvolvimento: permissivo apenas localmente
        callback(null, true);
      } else {
        // Bloqueia com segurança em produção sem vazar credenciais
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// ==========================================
// 3. PARSERS E RATE LIMITING
// ==========================================
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Aplica limitador de taxa padrão para prevenir abusos
app.use('/api/', apiGeneralRateLimiter);

// Servir uploads locais quando em modo de desenvolvimento ou fallback
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// 4. HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    sucesso: true,
    status: 'ONLINE',
    loja: 'TS EYEWEAR - Ótica 100% Online',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    ambiente: process.env.NODE_ENV || 'development',
  });
});

// ==========================================
// 5. ROTAS PÚBLICAS DO CATÁLOGO E CLIENTE
// ==========================================
app.use('/api/produtos', produtosPublicRoutes);
app.use('/produtos', produtosPublicRoutes);

app.use('/api/categorias', categoriasPublicRoutes);
app.use('/categorias', categoriasPublicRoutes);

app.use('/api/banners', bannersPublicRoutes);
app.use('/banners', bannersPublicRoutes);

app.use('/api/frete', fretePublicRoutes);
app.use('/frete', fretePublicRoutes);

app.use('/api/midia', midiaPublicRoutes);
app.use('/midia', midiaPublicRoutes);

// ==========================================
// 6. ROTAS ADMINISTRATIVAS TS EYEWEAR
// ==========================================
app.use('/api/admin/auth', authAdminRoutes);
app.use('/admin/auth', authAdminRoutes);

app.use('/api/admin/produtos', produtosAdminRoutes);
app.use('/admin/produtos', produtosAdminRoutes);

app.use('/api/admin/categorias', categoriasAdminRoutes);
app.use('/admin/categorias', categoriasAdminRoutes);

app.use('/api/admin/midia', midiaAdminRoutes);
app.use('/admin/midia', midiaAdminRoutes);

app.use('/api/admin/banners', bannersAdminRoutes);
app.use('/admin/banners', bannersAdminRoutes);

// ==========================================
// 7. TRATAMENTO DE ROTA NÃO ENCONTRADA (404 JSON)
// ==========================================
app.use('*', (req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: `Endpoint ${req.originalUrl} não encontrado na API TS EYEWEAR.`,
  });
});

// ==========================================
// 8. MIDDLEWARE GLOBAL DE TRATAMENTO DE ERROS
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Erro capturado no servidor:', err);

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      sucesso: false,
      erro: 'Token de autenticação inválido ou expirado. Faça login novamente.',
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      sucesso: false,
      erro: 'Arquivo enviado excede o limite máximo permitido.',
    });
  }

  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message || 'Erro interno no servidor TS EYEWEAR.',
  });
});

// ==========================================
// 9. INICIALIZAÇÃO LOCAL DO SERVIDOR
// ==========================================
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`👓 TS EYEWEAR API - Servidor Backend Online!`);
    console.log(`🌐 Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Produtos: http://localhost:${PORT}/api/produtos`);
    console.log(`📁 Categorias: http://localhost:${PORT}/api/categorias`);
    console.log(`🖼️ Banners: http://localhost:${PORT}/api/banners`);
    console.log(`🚚 Frete: http://localhost:${PORT}/api/frete/calcular`);
    console.log(`🔒 Admin Auth: http://localhost:${PORT}/api/admin/auth/login`);
    console.log(`======================================================\n`);
  });
}

export default app;
