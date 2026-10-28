// Client Supabase UNIQUEMENT pour le navigateur (côté client)
// Ce fichier ne contient AUCUN import Node.js (fs, path, os)
// À utiliser dans les composants React marqués 'use client'

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkjgroptpwdhxganhqiz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vzUPyqJzuYGCX_kGChptow_i4a8iWKJ';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
