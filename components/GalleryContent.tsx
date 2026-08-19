"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import JSZip from "jszip";
import { useInView } from "@/hooks/useInView";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";

type Photo = { id: string; url: string; width: number; height: number };
type GalleryEvent = { title: string; date: string } | null;

const DELAY_CLASSES = ["", "reveal-d1", "reveal-d2", "reveal-d3", "reveal-d4", "reveal-d5"];

function useColumnCount() {
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setColumnCount(w >= 1024 ? 4 : w >= 768 ? 3 : 2);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columnCount;
}

// Always places the next photo in the visually shortest column (true masonry),
// rather than CSS multi-column's "fill one column completely before the next"
// behavior, which leaves ragged gaps when photo heights vary.
function distributeMasonry(photos: Photo[], columnCount: number) {
  const columns: { photo: Photo; index: number }[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  photos.forEach((photo, index) => {
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push({ photo, index });
    heights[shortest] += photo.height / photo.width;
  });

  return columns;
}

export function GalleryContent() {
  const [event, setEvent] = useState<GalleryEvent>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const columnCount = useColumnCount();
  const columns = useMemo(() => distributeMasonry(photos, columnCount), [photos, columnCount]);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => {
        setEvent(d.event ?? null);
        setPhotos(d.photos ?? []);
        setLoading(false);
      });
  }, []);

  const eventDate = event
    ? new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })
    : "";

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadSelected() {
    const chosen = photos.filter((p) => selected.has(p.id));
    if (chosen.length === 0) return;
    setDownloading(true);
    try {
      if (chosen.length === 1) {
        const res = await fetch(`/api/gallery/${chosen[0].id}/download`);
        const blob = await res.blob();
        triggerDownload(blob, `the-view-photo.jpg`);
      } else {
        const zip = new JSZip();
        await Promise.all(
          chosen.map(async (p, i) => {
            const res = await fetch(`/api/gallery/${p.id}/download`);
            const blob = await res.blob();
            zip.file(`the-view-${i + 1}.jpg`, blob);
          })
        );
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, "the-view-photos.zip");
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-oxblood">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 18% 8%, rgba(140,60,24,0.22) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 95%, rgba(90,28,14,0.16) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 px-5 md:px-10 lg:px-16 pt-16 md:pt-24 pb-32">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-14 md:mb-20 space-y-3">
            <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/60">
              The View
            </p>
            {loading ? (
              <div className="w-2 h-2 mx-auto rounded-full bg-rust/40 animate-pulse" />
            ) : event ? (
              <>
                <h1 className="font-display italic text-3xl md:text-5xl text-ivory font-light">
                  {event.title}
                </h1>
                <p className="font-body text-sm text-cream/50">{eventDate}</p>
                <p className="font-body text-xs text-tan/40 tracking-wide max-w-sm mx-auto pt-2">
                  This gallery will be available until the next event, make sure to save your favorites!
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display italic text-2xl md:text-3xl text-cream/40 font-light">
                  Gallery's empty right now.
                </h1>
                <p className="font-body text-xs text-tan/40 tracking-wide">
                  Check back after the next event.
                </p>
              </>
            )}
          </header>

          {photos.length > 0 && (
            <>
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
                  className="font-body text-[10px] tracking-[0.3em] uppercase text-tan/60 hover:text-cream transition-colors border border-tan/25 hover:border-tan/50 rounded-sm px-4 py-2"
                >
                  {selecting ? "Cancel" : "Select Photos"}
                </button>
              </div>

              <div className="flex gap-3 md:gap-4">
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
                    {col.map(({ photo, index }) => (
                      <PhotoTile
                        key={photo.id}
                        photo={photo}
                        delayClass={DELAY_CLASSES[index % DELAY_CLASSES.length]}
                        selecting={selecting}
                        selected={selected.has(photo.id)}
                        onToggle={() => toggleSelect(photo.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selecting && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={downloadSelected}
            disabled={downloading}
            className="font-body text-sm font-medium tracking-widest uppercase px-8 py-4 bg-ivory text-espresso rounded hover:bg-cream transition-colors duration-200 shadow-lg disabled:opacity-60"
          >
            {downloading ? "Preparing…" : `Download (${selected.size})`}
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  delayClass,
  selecting,
  selected,
  onToggle,
}: {
  photo: Photo;
  delayClass: string;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.05);

  return (
    <div
      ref={ref}
      onClick={selecting ? onToggle : undefined}
      className={`relative rounded-sm overflow-hidden reveal ${delayClass} ${inView ? "in-view" : ""} ${
        selecting ? "cursor-pointer" : ""
      }`}
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <Image
        src={photo.url}
        alt=""
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover"
      />
      <WatermarkOverlay />
      {selecting && (
        <div className={`absolute inset-0 transition-colors duration-150 ${selected ? "bg-espresso/40" : "bg-espresso/0"}`}>
          <div
            className={`absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-150 ${
              selected ? "bg-amber border-amber" : "bg-espresso/40 border-ivory/60"
            }`}
          >
            {selected && <span className="text-espresso text-xs">✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}
