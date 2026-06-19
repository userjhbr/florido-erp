import { createClient } from '@supabase/supabase-js';

// Cole aqui a URL e a chave "anon public" do seu projeto Supabase
// (Project Settings > API)
const SUPABASE_URL = 'https://mclsjtowccdanqgtswrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbHNqdG93Y2NkYW5xZ3Rzd3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTc1MTEsImV4cCI6MjA5NzM5MzUxMX0.O45n_uA4Vcnv6bTv3B6H7WdHFu6qcI_4OQkuJMCpG78';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
