import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLive } from "../lib/sse";
import { relTime } from "../lib/format";
import { Map } from "../components/Map";
import { EtaList } from "../components/EtaList";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/api";

type GroupLive = { name: string; kind: string; vehicles: Vehicle[]; watching: number };

export function Group() {
  const { code } = useParams<{ code: string }>();
  const { data, error, loading } = useLive<GroupLive>(`/api/groups/${code}/live`, 4000);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10">
        <EmptyState
          tone="error"
          icon="error"
          title="Can't load this group"
          message={error instanceof ApiError ? error.message : "Something went wrong."}
        />
      </div>
    );
  }

  const primary = data?.vehicles[0];

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareCode() {
    if (!code) return;
    if (navigator.share) {
      navigator.share({ title: "BusEka group tracking", text: `Track ${data?.name ?? "our group"} live on BusEka with code: ${code}` }).catch(() => {});
    } else {
      copyCode();
    }
  }

  function notImplemented(what: string) {
    setToast(`${what} isn't wired up in this demo yet.`);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[20px] font-semibold">{loading && !data ? "Loading…" : (data?.name ?? code)}</h1>
          {data && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-live/15 text-live text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {data && (
          <p className="text-[13px] text-text/60 dark:text-text-dark/60 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">directions_bus</span>
            {data.vehicles.length} vehicle{data.vehicles.length === 1 ? "" : "s"}
            <span className="text-border dark:text-border-dark">•</span>
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            {data.watching} watching
          </p>
        )}
      </div>

      {data && data.vehicles.length > 0 ? (
        <>
          <div className="h-[35vh] w-full">
            <Map vehicles={data.vehicles} center={[data.vehicles[0].lat, data.vehicles[0].lng]} zoom={13} />
          </div>

          <div className="px-4 py-4 max-w-lg mx-auto w-full flex flex-col gap-3">
            {/* Driver / lead vehicle card */}
            {primary && (
              <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-page dark:bg-page-dark flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px] text-text/40 dark:text-text-dark/40">person</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/driver/${code}`} className="font-bold text-[15px] hover:text-primary truncate">
                          {primary.label}
                        </Link>
                        {primary.routeNo && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                            {primary.routeNo}
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-text/60 dark:text-text-dark/60">
                        Updated {relTime(Date.now() - primary.ts)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => notImplemented("Calling the driver")}
                    className="min-h-11 flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-[14px] font-semibold active:scale-[0.98] transition-transform"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    Call Driver
                  </button>
                  <button
                    onClick={() => notImplemented("Van Chat")}
                    className="min-h-11 flex items-center justify-center gap-2 rounded-lg bg-page dark:bg-page-dark text-[14px] font-medium active:scale-[0.98] transition-transform"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                    Van Chat
                  </button>
                </div>
              </div>
            )}

            <EtaList
              items={data.vehicles.map((v) => ({
                id: v.id,
                label: v.label,
                routeNo: v.routeNo,
                stale: v.stale,
                lastSeenMs: Date.now() - v.ts,
              }))}
            />

            {/* Group invite / passcode panel */}
            <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold">Group Invite</span>
                  <span className="text-[13px] text-text/60 dark:text-text-dark/60">Share the tracking code</span>
                </div>
                <span className="material-symbols-outlined text-primary text-[22px]">family_restroom</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-page dark:bg-page-dark">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-text/50 dark:text-text-dark/50 font-semibold">Group Code</span>
                  <span className="font-mono text-[18px] text-primary tracking-wider">{code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyCode} className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark shadow-sm flex items-center gap-1.5 text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-primary">content_copy</span>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={shareCode} className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary flex items-center gap-1.5 text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    Share
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-page dark:bg-page-dark flex items-center gap-2.5 text-text/60 dark:text-text-dark/60">
              <span className="material-symbols-outlined text-live text-[20px]">verified_user</span>
              <span className="text-[12px] leading-tight">
                Only people with this group's code can see these positions. Coordinates are never shared beyond this group.
              </span>
            </div>
          </div>
        </>
      ) : (
        !loading && (
          <div className="px-4 pt-4">
            <EmptyState
              icon="bedtime"
              title="No one is driving right now"
              message="You'll see the van here as soon as the driver starts their trip."
            />
          </div>
        )
      )}

      <div className="px-4 pb-10 max-w-lg mx-auto w-full text-center">
        <Link to="/join" className="text-[13px] text-primary">
          Leave group
        </Link>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-text dark:bg-text-dark text-page dark:text-page-dark text-[13px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
