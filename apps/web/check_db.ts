import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('users').select('*'); // Maybe users mapped to auth.users exists?
  console.log("Users:", data?.length);

  const { data: profiles, error: err2 } = await supabase.from('user_profiles').select('id, full_name, email, portal_role, admin_role, is_approved');
  console.log("Profiles:", profiles);
}
check();
