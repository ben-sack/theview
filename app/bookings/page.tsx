import { Suspense } from "react";
import { BookingsContent } from "@/components/BookingsContent";

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsContent />
    </Suspense>
  );
}
