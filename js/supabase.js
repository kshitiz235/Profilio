// Supabase client — shared by the portfolio (app.js) and the admin panel (admin.js).
// The anon key is meant to be public; your data is protected by Row Level Security.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://dlltiizwdevhxsnjqzdq.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHRpaXp3ZGV2aHhzbmpxemRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTY5NDAsImV4cCI6MjEwMjA5Mjk0MH0.AY-kJNuEC_RJKbOi116T5Kldmk9W2LV1ZGJBrsBk4Cs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Upload a File to the public "media" bucket and return its public URL.
export async function uploadMedia(file, folder = "uploads") {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
