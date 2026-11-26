
// ========================================
// CONEXÃO COM O SUPABASE
// ========================================

import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

// URL do projeto Supabase
const SUPABASE_URL = "https://iiopldgxamymhkdoaoul.supabase.co";

// Publishable key do projeto
const SUPABASE_KEY = "sb_publishable_wYzPH1jpCU71xSJBJR97cA_CMdXc98O";

// Criar conexão
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
