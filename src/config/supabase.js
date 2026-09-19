import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Aviso: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no .env. Upload para o Supabase Storage estará indisponível até a configuração.'
  );
}

// Inicializa cliente Supabase com chave administrativa para operações seguras de backend (storage, etc.)
export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const BUCKET_IMAGENS = process.env.SUPABASE_BUCKET_IMAGENS || 'produtos-imagens';
export const BUCKET_VIDEOS = process.env.SUPABASE_BUCKET_VIDEOS || 'produtos-videos';

export default supabase;
