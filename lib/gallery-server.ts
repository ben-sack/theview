import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET } from "@/lib/gallery";

export function galleryPhotoUrl(storagePath: string) {
  return supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
