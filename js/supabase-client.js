/**
 * Supabase Client — KodingIoT
 *
 * Initialises the Supabase JS client from the CDN build loaded
 * via <script> in each HTML file.
 *
 * ▸ SETUP INSTRUCTIONS
 *   1. Create a free project at https://supabase.com
 *   2. Go to Project Settings → API
 *   3. Replace SUPABASE_URL  with your project URL
 *   4. Replace SUPABASE_ANON with your anon/public key
 */

const SUPABASE_URL  = 'https://cqdxdwlsfbrdgyxyprzz.supabase.co';   // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON = 'sb_publishable_wuKspSbl8vI3H2knM6ysSw_mgZxacSp';

// The CDN exposes `supabase` on `window`
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
