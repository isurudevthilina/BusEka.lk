import { useParams, Link } from "react-router-dom";
import { useLive } from "../lib/sse";
import { Map } from "../components/Map";
import { EtaList } from "../components/EtaList";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/api";

type GroupLive = { name: string; kind: string; vehicles: Vehicle[]; watching: number };

export function Group() {
  const { code } = useParams<{ code: string }>();
  const { data, error, loading } = useLive<GroupLive>(`/api/groups/${code}/live`, 4000);

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
          <p className="text-[13px] text-text/60 dark:text-text-dark/60">
            {data.vehicles.length} vehicle{data.vehicles.length === 1 ? "" : "s"} · {data.watching} watching
          </p>
        )}
      </div>

      {data && data.vehicles.length > 0 ? (
        <>
          <div className="h-[45vh] w-full">
            <Map vehicles={data.vehicles} center={[data.vehicles[0].lat, data.vehicles[0].lng]} zoom={13} />
          </div>
          <div className="px-4 py-4 max-w-lg mx-auto w-full">
            <EtaList
              items={data.vehicles.map((v) => ({
                id: v.id,
                label: v.label,
                routeNo: v.routeNo,
                stale: v.stale,
                lastSeenMs: Date.now() - v.ts,
              }))}
            />
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
    </div>
  );
}
