import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

const isInvalid = (val) => !val || val === 'undefined' || val === 'null' || val === '';

const finalUrl = isInvalid(SUPABASE_URL) ? 'https://knbtifrtswccfxnoaymv.supabase.co' : SUPABASE_URL;
const finalKey = isInvalid(SUPABASE_ANON_KEY) ? 'sb_publishable_wpzK9ny7mIeUermZDefzkQ_oPUsr6Pi' : SUPABASE_ANON_KEY;

export const supabase = createClient(finalUrl, finalKey);



