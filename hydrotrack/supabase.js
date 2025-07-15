import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const initializeSupabase = () => {
    return createClient(
        'https://kxejefkdnhcmpbccnkyn.supabase.co/',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZWplZmtkbmhjbXBiY2Nua3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDE4NTksImV4cCI6MjA2ODE3Nzg1OX0.LdJvLDdGF60DeKuHpjG2NHc-5Sy5ns9jkcFw3RnVu5k'
    );
};