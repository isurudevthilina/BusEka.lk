/// <reference path="../../shared/vehicle.d.ts" />

export async function fetchWialon(env: Env): Promise<Vehicle[]> {
  const tokens = [
    env.WIALON_TOKEN_KOLLUPITIYA,
    env.WIALON_TOKEN_JAELA,
    env.WIALON_TOKEN_NEGOMBO,
  ].filter(Boolean) as string[];

  if (!env.WIALON_HOST || tokens.length === 0) {
    return [];
  }

  const vehicles: Vehicle[] = [];
  const now = Date.now();

  for (const token of tokens) {
    try {
      // 1. Login to get SID
      const loginUrl = `${env.WIALON_HOST}/wialon/ajax.html?svc=token/login&params=${encodeURIComponent(
        JSON.stringify({ token })
      )}`;
      const loginRes = await fetch(loginUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!loginRes.ok) continue;
      const loginData = (await loginRes.json()) as any;
      const sid = loginData.eid;
      if (!sid) continue;

      // 2. Fetch buses
      const searchParams = {
        spec: { itemsType: "avl_unit", propName: "sys_name", propValueMask: "*", sortType: "sys_name" },
        force: 1,
        flags: 1025,
        from: 0,
        to: 0,
      };
      const searchUrl = `${env.WIALON_HOST}/wialon/ajax.html?svc=core/search_items&sid=${sid}&params=${encodeURIComponent(
        JSON.stringify(searchParams)
      )}`;
      const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!searchRes.ok) continue;
      const searchData = (await searchRes.json()) as any;

      if (searchData.items) {
        for (const item of searchData.items) {
          if (item.pos) {
            vehicles.push({
              id: `wialon:${item.id}`,
              source: "wialon",
              label: item.nm,
              routeNo: "SLIIT", // As requested by user: a group called SLIIT
              lat: item.pos.y,
              lng: item.pos.x,
              speedKmh: item.pos.s ?? 0,
              ts: item.pos.t * 1000,
              stale: now - item.pos.t * 1000 > 120_000,
            });
          }
        }
      }
    } catch (err) {
      console.error("fetchWialon failed for token:", err);
    }
  }

  return vehicles;
}
