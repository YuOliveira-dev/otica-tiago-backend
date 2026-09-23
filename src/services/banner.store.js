import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/banners.json');

const DEFAULT_HERO_BANNERS = [
  {
    id: 'banner-1',
    title: 'SEU ESTILO FAZ A DIFERENÇA!',
    subtitle:
      'Escolha TS EYEWEAR e tenha armações nobres em acetato italiano e titânio com lentes de tecnologia óptica certificada e Frete Grátis.',
    ctaText: 'CONFERIR COLEÇÃO',
    ctaUrl: '/catalogo',
    badgeTitle: 'Excelência Óptica',
    badgeSub: '5 Anos de Tradição',
    imageUrl:
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1330&h=400&q=80',
    order: 1,
    isActive: true,
  },
  {
    id: 'banner-2',
    title: 'CLIP-ON MAGNÉTICO 2 EM 1',
    subtitle:
      'Grau e Solar em apenas 1 segundo com fixação magnética de alta precisão. Lentes solares polarizadas com proteção total UV400.',
    ctaText: 'VER MODELOS CLIP-ON',
    ctaUrl: '/catalogo?categoria=clip-on',
    badgeTitle: 'Lentes Polarizadas',
    badgeSub: 'Proteção UV400 Certificada',
    imageUrl:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1330&h=400&q=80',
    order: 2,
    isActive: true,
  },
  {
    id: 'banner-3',
    title: 'CONSULTORIA & LENTES DE GRAU',
    subtitle:
      'Envie sua receita médica direto pelo WhatsApp. Orientação especializada no melhor índice de refração para o seu grau sem sair de casa.',
    ctaText: 'FALAR COM CONSULTOR',
    ctaUrl:
      'https://wa.me/5511987729981?text=Ol%C3%A1%2C%20TS%20EYEWEAR!%20Gostaria%20de%20consultoria%20personalizada%20para%20minhas%20lentes%20de%20grau.',
    badgeTitle: 'Atendimento 100% Online',
    badgeSub: 'Suporte Óptico Especializado',
    imageUrl:
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1330&h=400&q=80',
    order: 3,
    isActive: true,
  },
];

function carregarBanners() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const conteudo = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(conteudo);
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível ler data/banners.json, usando padrão:', err.message);
  }
  return DEFAULT_HERO_BANNERS;
}

function salvarBanners(banners) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(banners, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao persistir banners em data/banners.json:', err.message);
  }
}

let bannersMemoria = carregarBanners();

export const BannerStore = {
  obterTodos: () => bannersMemoria,
  obterAtivos: () => bannersMemoria.filter((b) => b.isActive).sort((a, b) => a.order - b.order),
  obterPorId: (id) => bannersMemoria.find((b) => b.id === id),
  salvar: (banner) => {
    const indice = bannersMemoria.findIndex((b) => b.id === banner.id);
    if (indice >= 0) {
      bannersMemoria[indice] = { ...bannersMemoria[indice], ...banner };
    } else {
      bannersMemoria.push(banner);
    }
    salvarBanners(bannersMemoria);
    return banner;
  },
  excluir: (id) => {
    bannersMemoria = bannersMemoria.filter((b) => b.id !== id);
    salvarBanners(bannersMemoria);
    return true;
  },
};
