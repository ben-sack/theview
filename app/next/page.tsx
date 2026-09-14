import { Suspense } from "react";
import { NextEventContent } from "@/components/NextEventContent";

export default function NextEventPage() {
  return (
    <Suspense fallback={null}>
      <NextEventContent />
    </Suspense>
  );
}
