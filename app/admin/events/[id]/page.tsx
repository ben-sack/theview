"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Event = {
  id: string;
  title: string;
  date: string;
  capacity: number;
  location: string | null;
  partners: string | null;
  allow_guests: boolean;
};

type Rsvp = {
  id: string;
  party_size: number;
  checked_in: boolean;
  created_at: string;
  guest_name: string | null;
  contacts: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    ig_handle: string | null;
  } | null;
};

type WaitlistEntry = {
  id: string;
  party_size: number;
  created_at: string;
  contacts: {
    name: string;
    email: string;
    phone: string | null;
    ig_handle: string | null;
    referred_by: string | null;
  };
};

type InviteCandidate = {
  id: string;
  name: string;
  invited: boolean;
  rsvped: boolean;
};

type GenderBreakdown = {
  male: number;
  female: number;
  unsure: number;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [removingRsvpId, setRemovingRsvpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blasting, setBlasting] = useState(false);
  const [blastResult, setBlastResult] = useState<{ sent: number; failures: string[] } | null>(null);
  const [blastTemplate, setBlastTemplate] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageResult, setMessageResult] = useState<{ sent: number; failures: string[] } | null>(null);
  const [rsvpBlastOpen, setRsvpBlastOpen] = useState(false);
  const [textBlastOpen, setTextBlastOpen] = useState(false);
  const [guestListOpen, setGuestListOpen] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState<InviteCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteFilter, setInviteFilter] = useState<"all" | "not_invited" | "invited" | "invited_no_rsvp">("all");
  const [genderBreakdown, setGenderBreakdown] = useState<GenderBreakdown | null>(null);
  const [textBlastSentIds, setTextBlastSentIds] = useState<Set<string>>(new Set());
  const [textSelectedIds, setTextSelectedIds] = useState<Set<string>>(new Set());
  const [textFilter, setTextFilter] = useState<"all" | "not_sent" | "sent">("all");
  const [blastSaving, setBlastSaving] = useState(false);
  const [blastSaved, setBlastSaved] = useState(false);
  const [eventMessageSaving, setEventMessageSaving] = useState(false);
  const [eventMessageSaved, setEventMessageSaved] = useState(false);
  const [panelSearch, setPanelSearch] = useState("");
  const [panelSort, setPanelSort] = useState<"date" | "alpha">("date");

  function loadEvent(isInitial: boolean) {
    const eventPromise = fetch(`/api/admin/events/${id}`).then((r) => {
      if (r.status === 401) { router.push("/admin"); return null; }
      return r.json();
    });

    const settingsPromise = isInitial ? fetch("/api/admin/settings").then((r) => r.json()) : Promise.resolve(null);

    Promise.all([eventPromise, settingsPromise]).then(([d, settings]) => {
      if (!d) return;
      setEvent(d.event);
      setRsvps(d.rsvps ?? []);
      setWaitlist(d.waitlist ?? []);
      setInviteCandidates(d.inviteCandidates ?? []);
      setGenderBreakdown(d.genderBreakdown ?? null);
      setTextBlastSentIds(new Set(d.textBlastSentIds ?? []));
      if (isInitial) {
        setBlastTemplate(
          settings?.rsvp_blast_default_template ||
          `Hey {name}, you're invited to {event} on {date}. Spots are limited — RSVP here to claim yours: {rsvp_link}`
        );
        setEventMessage(
          settings?.event_text_blast_default_template ||
          `Hey, just a reminder that doors open at {door_time} this Saturday. Here is the address: {address}. Entry is first come first serve based on capacity — make sure you arrive early to secure your spot. This event is 21+ // Government Issued ID will be required upon entry.`
        );
        setLoading(false);
      }
    });
  }

  useEffect(() => {
    loadEvent(true);
  }, [id, router]);

  function toggleSelect(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  const filteredCandidates = inviteCandidates.filter((c) => {
    if (inviteFilter === "all") return true;
    if (inviteFilter === "invited") return c.invited;
    if (inviteFilter === "invited_no_rsvp") return c.invited && !c.rsvped;
    return !c.invited;
  });
  const notInvitedCount = inviteCandidates.filter((c) => !c.invited).length;
  const invitedCount = inviteCandidates.filter((c) => c.invited).length;
  const invitedNoRsvpCount = inviteCandidates.filter((c) => c.invited && !c.rsvped).length;

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
  }

  function toggleTextSelect(contactId: string) {
    setTextSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function selectAllFilteredText(ids: string[]) {
    setTextSelectedIds(new Set(ids));
  }

  async function sendEventMessage() {
    if (!eventMessage.trim()) return;
    setSendingMessage(true);
    setMessageResult(null);
    const res = await fetch(`/api/admin/events/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: eventMessage,
        contact_ids: textSelectedIds.size > 0 ? Array.from(textSelectedIds) : undefined,
      }),
    });
    const data = await res.json();
    setMessageResult(data);
    setSendingMessage(false);
    if (data.sent > 0) {
      setEventMessage("");
      setTextSelectedIds(new Set());
      loadEvent(false);
    }
  }

  async function saveBlastDefault() {
    setBlastSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "rsvp_blast_default_template", value: blastTemplate }),
    });
    setBlastSaving(false);
    setBlastSaved(true);
    setTimeout(() => setBlastSaved(false), 3000);
  }

  async function saveEventMessageDefault() {
    setEventMessageSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "event_text_blast_default_template", value: eventMessage }),
    });
    setEventMessageSaving(false);
    setEventMessageSaved(true);
    setTimeout(() => setEventMessageSaved(false), 3000);
  }

  async function sendBlast() {
    setBlasting(true);
    setBlastResult(null);
    const res = await fetch(`/api/admin/events/${id}/blast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_template: blastTemplate,
        contact_ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
      }),
    });
    const data = await res.json();
    setBlastResult(data);
    setBlasting(false);
    if (data.sent > 0) {
      setSelectedIds(new Set());
      loadEvent(false);
    }
  }

  async function promoteFromWaitlist(waitlistId: string) {
    setPromotingId(waitlistId);
    const res = await fetch(`/api/admin/events/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waitlist_id: waitlistId }),
    });
    if (res.ok) {
      const promoted = waitlist.find((w) => w.id === waitlistId);
      if (promoted) {
        setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
        setRsvps((prev) => [
          ...prev,
          {
            id: promoted.id,
            party_size: promoted.party_size,
            checked_in: false,
            created_at: promoted.created_at,
            guest_name: null,
            contacts: {
              id: "",
              name: promoted.contacts.name,
              email: promoted.contacts.email,
              phone: promoted.contacts.phone,
              ig_handle: promoted.contacts.ig_handle,
            },
          },
        ]);
      }
    }
    setPromotingId(null);
  }

  async function removeRsvp(rsvpId: string, name: string) {
    if (!confirm(`Remove ${name} from the guest list? This cannot be undone.`)) return;
    setRemovingRsvpId(rsvpId);
    const res = await fetch(`/api/admin/events/${id}/rsvps/${rsvpId}`, { method: "DELETE" });
    if (res.ok) {
      loadEvent(false);
    } else {
      alert("Failed to remove. Please try again.");
    }
    setRemovingRsvpId(null);
  }

  const totalAttending = rsvps.reduce((sum, r) => sum + r.party_size, 0);
  const totalCheckedIn = rsvps.filter((r) => r.checked_in).reduce((sum, r) => sum + r.party_size, 0);
  const capacityPct = event ? totalAttending / event.capacity : 0;
  const capacityColor = capacityPct >= 1 ? "text-rust" : capacityPct >= 0.8 ? "text-amber" : "text-espresso";
  const eventDate = event
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })
    : "";

  const blastRecipientCount = selectedIds.size > 0 ? selectedIds.size : inviteCandidates.length;
  const blastSegments = getSegmentCount(blastTemplate);
  const blastCost = blastSegments > 0
    ? (blastRecipientCount * blastSegments * TWILIO_PRICE_PER_SEGMENT).toFixed(2)
    : null;

  const textableRsvps = rsvps.filter((r) => r.contacts?.phone);
  const textCandidates = textableRsvps.map((r) => ({
    id: r.contacts!.id,
    name: r.contacts!.name,
    sent: textBlastSentIds.has(r.contacts!.id),
  }));
  const textNotSentCount = textCandidates.filter((c) => !c.sent).length;
  const textSentCount = textCandidates.filter((c) => c.sent).length;
  const filteredTextCandidates = textCandidates.filter((c) => {
    if (textFilter === "sent") return c.sent;
    if (textFilter === "not_sent") return !c.sent;
    return true;
  });

  const textRecipientCount = textSelectedIds.size > 0 ? textSelectedIds.size : textableRsvps.length;
  const eventMessageSegments = getSegmentCount(eventMessage);
  const eventMessageCost = eventMessageSegments > 0
    ? (textRecipientCount * eventMessageSegments * TWILIO_PRICE_PER_SEGMENT).toFixed(2)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
      </div>
    );
  }

  if (!event) return null;

  function getRsvpName(r: Rsvp) {
    return r.contacts?.name ?? r.guest_name ?? "Guest";
  }

  function igUrl(handle: string) {
    return `https://instagram.com/${handle.replace(/^@/, "")}`;
  }

  const panelQuery = panelSearch.trim().toLowerCase();

  const filteredRsvps = rsvps.filter((r) => {
    if (!panelQuery) return true;
    const name = getRsvpName(r).toLowerCase();
    const handle = (r.contacts?.ig_handle ?? "").toLowerCase();
    return name.includes(panelQuery) || handle.includes(panelQuery);
  });
  const sortedRsvps = [...filteredRsvps].sort((a, b) =>
    panelSort === "alpha"
      ? getRsvpName(a).localeCompare(getRsvpName(b))
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const waitlistPositions = new Map(waitlist.map((w, i) => [w.id, i + 1]));
  const filteredWaitlist = waitlist.filter((w) => {
    if (!panelQuery) return true;
    const name = w.contacts.name.toLowerCase();
    const handle = (w.contacts.ig_handle ?? "").toLowerCase();
    return name.includes(panelQuery) || handle.includes(panelQuery);
  });
  const sortedWaitlist = [...filteredWaitlist].sort((a, b) =>
    panelSort === "alpha"
      ? a.contacts.name.localeCompare(b.contacts.name)
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const guestListPanel = (
    <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-tan/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWaitlist(false)}
            className={`font-body text-sm font-medium transition-colors ${!showWaitlist ? "text-espresso" : "text-tan hover:text-espresso"}`}
          >
            Guest List
          </button>
          {waitlist.length > 0 && (
            <>
              <span className="text-tan/30">|</span>
              <button
                onClick={() => setShowWaitlist(true)}
                className={`font-body text-sm font-medium transition-colors ${showWaitlist ? "text-espresso" : "text-tan hover:text-espresso"}`}
              >
                Waitlist
                <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-body ${showWaitlist ? "bg-rust text-ivory" : "bg-tan/20 text-espresso"}`}>
                  {waitlist.length}
                </span>
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-xs text-tan">
            {showWaitlist ? `${waitlist.length} waiting` : `${totalAttending} / ${event.capacity}`}
          </span>
          <button
            type="button"
            onClick={() => setGuestListOpen((v) => !v)}
            aria-label={guestListOpen ? "Collapse guest list" : "Expand guest list"}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-tan transition-transform duration-200 ${guestListOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {guestListOpen && (
        <>
          <div className="px-5 py-3 border-b border-tan/20 space-y-2">
            <input
              type="text"
              placeholder="Search by name or @handle…"
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              className="w-full bg-ivory border border-tan/20 rounded px-3 py-2 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust"
            />
            <div className="flex items-center gap-1">
              <span className="font-body text-[11px] text-tan/60 mr-1">Sort</span>
              {([["date", "Date"], ["alpha", "A–Z"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPanelSort(v)}
                  className={`font-body text-[11px] px-2.5 py-1 rounded border transition-colors ${
                    panelSort === v ? "bg-espresso text-ivory border-espresso" : "border-tan/30 text-tan hover:border-tan/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!showWaitlist ? (
            sortedRsvps.length === 0 ? (
              <p className="font-body text-sm text-tan italic px-5 py-6 text-center">{panelQuery ? "No matches." : "No RSVPs yet."}</p>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] divide-y divide-tan/10">
                {sortedRsvps.map((r) => (
                  <div key={r.id} className="px-5 py-3 hover:bg-ivory/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-body text-sm font-medium text-espresso truncate">{getRsvpName(r)}</p>
                      {r.party_size > 1 && (
                        <span className="font-body text-xs text-tan shrink-0">+{r.party_size - 1}</span>
                      )}
                    </div>
                    <p className="font-body text-xs text-tan truncate">
                      {r.contacts ? (
                        r.contacts.ig_handle ? (
                          <a
                            href={igUrl(r.contacts.ig_handle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rust hover:underline"
                          >
                            @{r.contacts.ig_handle.replace(/^@/, "")}
                          </a>
                        ) : (
                          r.contacts.email
                        )
                      ) : (
                        "Walk-in (door add)"
                      )}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="font-body text-xs text-tan/50">
                        {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeRsvp(r.id, getRsvpName(r))}
                        disabled={removingRsvpId === r.id}
                        className="font-body text-xs text-rust/50 hover:text-rust transition-colors disabled:opacity-40 shrink-0"
                      >
                        {removingRsvpId === r.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            sortedWaitlist.length === 0 ? (
              <p className="font-body text-sm text-tan italic px-5 py-6 text-center">{panelQuery ? "No matches." : "Waitlist is empty."}</p>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] divide-y divide-tan/10">
                {sortedWaitlist.map((w) => (
                  <div key={w.id} className="px-5 py-3 hover:bg-ivory/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs text-tan/50 shrink-0">#{waitlistPositions.get(w.id)}</span>
                          <p className="font-body text-sm font-medium text-espresso truncate">{w.contacts.name}</p>
                          {w.party_size > 1 && (
                            <span className="font-body text-xs text-tan shrink-0">+{w.party_size - 1}</span>
                          )}
                        </div>
                        <p className="font-body text-xs text-tan truncate">
                          {w.contacts.ig_handle ? (
                            <a
                              href={igUrl(w.contacts.ig_handle)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rust hover:underline"
                            >
                              @{w.contacts.ig_handle.replace(/^@/, "")}
                            </a>
                          ) : (
                            w.contacts.email
                          )}
                          {w.contacts.referred_by && (
                            <span className="text-tan/50"> · via {w.contacts.referred_by}</span>
                          )}
                        </p>
                        <p className="font-body text-xs text-tan/50 mt-0.5">
                          Joined {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => promoteFromWaitlist(w.id)}
                        disabled={promotingId === w.id}
                        className="shrink-0 font-body text-xs px-2.5 py-1 bg-espresso text-ivory rounded hover:bg-rust transition-colors disabled:opacity-50 mt-0.5"
                      >
                        {promotingId === w.id ? "…" : "Admit"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <header className="bg-espresso px-4 sm:px-8 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push("/admin")}
            className="font-body text-xs tracking-widest uppercase text-tan hover:text-ivory transition-colors shrink-0"
          >
            ← Admin
          </button>
          <span className="text-tan text-sm shrink-0">/</span>
          <span className="font-display text-base sm:text-lg text-ivory font-light truncate">{event.title}</span>
        </div>
      </header>

      <main className="px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Left column — controls */}
          <div className="w-full flex-1 min-w-0 space-y-6 lg:space-y-8">
            {/* Event info — name, date, live attendance */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-display text-2xl sm:text-3xl text-espresso font-bold">{event.title}</h1>
                  <p className="font-body text-sm text-tan">{eventDate}</p>
                </div>
                <div className="text-right shrink-0 space-y-2">
                  <div>
                    <p className={`font-display text-2xl sm:text-4xl font-light ${capacityColor}`}>{totalAttending}<span className="text-tan/50 text-lg sm:text-2xl">/{event.capacity}</span></p>
                    <p className="font-body text-xs text-tan tracking-widest uppercase">
                      {capacityPct >= 1 ? "Full" : capacityPct >= 0.8 ? "Nearly Full" : "Attending"}
                    </p>
                  </div>
                  {totalCheckedIn > 0 && (
                    <div>
                      <p className="font-display text-lg sm:text-2xl text-green-600 font-light">{totalCheckedIn}</p>
                      <p className="font-body text-xs text-tan tracking-widest uppercase">Checked In ({totalAttending > 0 ? Math.round((totalCheckedIn / totalAttending) * 100) : 0}%)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gender breakdown (estimated from first names) */}
            {genderBreakdown && rsvps.length > 0 && (
              <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="font-body text-sm font-medium text-espresso">Gender Breakdown</p>
                  <p className="font-body text-[10px] text-tan/60">Estimated from first names</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-tan/15">
                  <div className="text-center">
                    <p className="font-display text-xl sm:text-2xl text-espresso font-light">{genderBreakdown.male}</p>
                    <p className="font-body text-xs text-tan tracking-widest uppercase">Male</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl sm:text-2xl text-espresso font-light">{genderBreakdown.female}</p>
                    <p className="font-body text-xs text-tan tracking-widest uppercase">Female</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl sm:text-2xl text-tan font-light">{genderBreakdown.unsure}</p>
                    <p className="font-body text-xs text-tan tracking-widest uppercase">Unsure</p>
                  </div>
                </div>
              </div>
            )}

            {/* Event details — location, co-promoter, guest policy */}
            {(event.location || event.partners || event.allow_guests) && (
              <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6 space-y-1">
                {event.location && <p className="font-body text-sm text-tan">{event.location}</p>}
                {event.partners && <p className="font-body text-sm text-tan">With {event.partners}</p>}
                {event.allow_guests && (
                  <p className="font-body text-xs text-tan/50 tracking-widest uppercase pt-1">Guests allowed</p>
                )}
              </div>
            )}

            {/* Guest list — mobile only, sits right under event info */}
            <div className="lg:hidden">{guestListPanel}</div>

            {/* Send RSVP blast */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setRsvpBlastOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <p className="font-body text-sm font-medium text-espresso">RSVP Invite Blast</p>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-tan transition-transform duration-200 ${rsvpBlastOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {rsvpBlastOpen && (
                <>
                  <p className="font-body text-xs text-tan -mt-2">
                    Sends a personalized invite. Leave everyone unselected below to send to all approved members, or pick specific people. Use{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{name}"}</span>,{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{event}"}</span>,{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{date}"}</span>, and{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{rsvp_link}"}</span> to personalize it.
                  </p>
                  <div className="space-y-1">
                    <textarea
                      value={blastTemplate}
                      onChange={(e) => setBlastTemplate(e.target.value)}
                      rows={4}
                      className="w-full bg-ivory border border-tan/30 rounded px-4 py-3 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between font-body text-xs text-tan">
                      <span>{blastTemplate.length} characters · {blastSegments} {blastSegments === 1 ? "segment" : "segments"}</span>
                      {blastCost !== null && (
                        <span>Est. cost: <strong className="text-espresso">${blastCost}</strong></span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={saveBlastDefault}
                      disabled={blastSaving || !blastTemplate.trim()}
                      className="font-body text-xs text-rust hover:underline disabled:opacity-40"
                    >
                      {blastSaving ? "Saving…" : blastSaved ? "Saved as default ✓" : "Save as default"}
                    </button>
                  </div>

                  {/* Recipient selection */}
                  <div className="border-t border-tan/15 pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-body text-xs font-medium text-espresso">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : `All ${inviteCandidates.length} approved members`}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          ["all", `All (${inviteCandidates.length})`],
                          ["not_invited", `Not Invited (${notInvitedCount})`],
                          ["invited", `Invited (${invitedCount})`],
                          ["invited_no_rsvp", `Invited, No RSVP (${invitedNoRsvpCount})`],
                        ] as const).map(([f, label]) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setInviteFilter(f)}
                            className={`font-body text-[11px] px-2.5 py-1 rounded border transition-colors ${
                              inviteFilter === f ? "bg-espresso text-ivory border-espresso" : "border-tan/30 text-tan hover:border-tan/50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button type="button" onClick={selectAllFiltered} className="font-body text-xs text-rust hover:underline">
                        Select all {filteredCandidates.length}
                      </button>
                      {selectedIds.size > 0 && (
                        <button type="button" onClick={() => setSelectedIds(new Set())} className="font-body text-xs text-tan hover:underline">
                          Clear selection
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-tan/20 rounded divide-y divide-tan/10">
                      {filteredCandidates.length === 0 ? (
                        <p className="font-body text-xs text-tan italic px-3 py-4 text-center">No one matches this filter.</p>
                      ) : (
                        filteredCandidates.map((c) => (
                          <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-ivory/60 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="w-4 h-4 accent-rust shrink-0"
                            />
                            <span className="font-body text-sm text-espresso flex-1 truncate">{c.name}</span>
                            {c.invited && (
                              <span className="font-body text-[10px] uppercase tracking-wide text-green-600 shrink-0">Invited</span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {blastResult && (
                    <div className={`rounded-lg px-4 py-3 font-body text-sm ${blastResult.failures.length === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                      <p>Sent to {blastResult.sent} members.</p>
                      {blastResult.failures.length > 0 && <p className="mt-1">Failed: {blastResult.failures.join(", ")}</p>}
                    </div>
                  )}
                  <button
                    onClick={sendBlast}
                    disabled={blasting || !blastTemplate.trim()}
                    className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
                  >
                    {blasting
                      ? "Sending…"
                      : selectedIds.size > 0
                      ? `Send to ${selectedIds.size} Selected`
                      : `Send RSVP Blast to All ${inviteCandidates.length} Members`}
                  </button>
                </>
              )}
            </div>

            {/* Event-specific text blast */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setTextBlastOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <p className="font-body text-sm font-medium text-espresso">Event Text Blast</p>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-tan transition-transform duration-200 ${textBlastOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {textBlastOpen && (
                <>
                  <p className="font-body text-xs text-tan -mt-2">
                    Sends only to people who've RSVP'd and have a phone on file. Leave everyone unselected to send to all {textableRsvps.length}, or pick specific people — handy for catching up latecomers after an earlier send. Use{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{name}"}</span>,{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{event}"}</span>,{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{date}"}</span>,{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{door_time}"}</span>, and{" "}
                    <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{address}"}</span> to personalize it.
                  </p>
                  <div className="space-y-1">
                    <textarea
                      value={eventMessage}
                      onChange={(e) => setEventMessage(e.target.value)}
                      rows={5}
                      placeholder=""
                      className="w-full bg-ivory border border-tan/30 rounded px-4 py-3 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between font-body text-xs text-tan">
                      <span>{eventMessage.length} characters · {eventMessageSegments} {eventMessageSegments === 1 ? "segment" : "segments"}</span>
                      {eventMessageCost !== null && (
                        <span>Est. cost: <strong className="text-espresso">${eventMessageCost}</strong></span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={saveEventMessageDefault}
                      disabled={eventMessageSaving || !eventMessage.trim()}
                      className="font-body text-xs text-rust hover:underline disabled:opacity-40"
                    >
                      {eventMessageSaving ? "Saving…" : eventMessageSaved ? "Saved as default ✓" : "Save as default"}
                    </button>
                  </div>

                  {/* Recipient selection */}
                  <div className="border-t border-tan/15 pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-body text-xs font-medium text-espresso">
                        {textSelectedIds.size > 0 ? `${textSelectedIds.size} selected` : `All ${textableRsvps.length} RSVP'd`}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          ["all", `All (${textCandidates.length})`],
                          ["not_sent", `Not Sent Yet (${textNotSentCount})`],
                          ["sent", `Already Sent (${textSentCount})`],
                        ] as const).map(([f, label]) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setTextFilter(f)}
                            className={`font-body text-[11px] px-2.5 py-1 rounded border transition-colors ${
                              textFilter === f ? "bg-espresso text-ivory border-espresso" : "border-tan/30 text-tan hover:border-tan/50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => selectAllFilteredText(filteredTextCandidates.map((c) => c.id))}
                        className="font-body text-xs text-rust hover:underline"
                      >
                        Select all {filteredTextCandidates.length}
                      </button>
                      {textSelectedIds.size > 0 && (
                        <button type="button" onClick={() => setTextSelectedIds(new Set())} className="font-body text-xs text-tan hover:underline">
                          Clear selection
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-tan/20 rounded divide-y divide-tan/10">
                      {filteredTextCandidates.length === 0 ? (
                        <p className="font-body text-xs text-tan italic px-3 py-4 text-center">No one matches this filter.</p>
                      ) : (
                        filteredTextCandidates.map((c) => (
                          <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-ivory/60 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={textSelectedIds.has(c.id)}
                              onChange={() => toggleTextSelect(c.id)}
                              className="w-4 h-4 accent-rust shrink-0"
                            />
                            <span className="font-body text-sm text-espresso flex-1 truncate">{c.name}</span>
                            {c.sent && (
                              <span className="font-body text-[10px] uppercase tracking-wide text-green-600 shrink-0">Sent</span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {messageResult && (
                    <div className={`rounded-lg px-4 py-3 font-body text-sm ${messageResult.failures.length === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                      <p>Sent to {messageResult.sent} {messageResult.sent === 1 ? "person" : "people"}.</p>
                      {messageResult.failures.length > 0 && <p className="mt-1">Failed: {messageResult.failures.join(", ")}</p>}
                    </div>
                  )}
                  <button
                    onClick={sendEventMessage}
                    disabled={sendingMessage || !eventMessage.trim()}
                    className="font-body text-sm font-medium px-6 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
                  >
                    {sendingMessage
                      ? "Sending…"
                      : textSelectedIds.size > 0
                      ? `Send to ${textSelectedIds.size} Selected`
                      : `Send to All ${textableRsvps.length} ${textableRsvps.length === 1 ? "RSVP" : "RSVPs"}`}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right column — desktop only, sticky guest list */}
          <div className="hidden lg:block lg:w-80 shrink-0 lg:sticky lg:top-8 space-y-4">
            {guestListPanel}
          </div>
        </div>
      </main>
    </div>
  );
}

const TWILIO_PRICE_PER_SEGMENT = 0.0079;

function getSegmentCount(text: string) {
  if (text.length === 0) return 0;
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}
