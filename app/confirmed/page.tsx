import { Suspense } from "react";
import { ConfirmedContent } from "@/components/ConfirmedContent";

export default function ConfirmedPage() {
  return (
    <Suspense>
      <ConfirmedContent />
    </Suspense>
  );
}
