import { Suspense } from "react";
import { GalleryContent } from "@/components/GalleryContent";

export default function GalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryContent />
    </Suspense>
  );
}
