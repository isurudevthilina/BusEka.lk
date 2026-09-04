import type { ReactNode } from "react";

export function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-12 flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-[24px] font-semibold">The problem we chose</h1>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-text/80 dark:text-text-dark/80 max-w-[65ch]">
          <p>
            A commuter in Sri Lanka waiting for a bus has no way to know if one is coming. Three separate operators
            already track buses live — SPRPTA tracks 1,192 buses in the Southern Province, Lanka Metro tracks the
            Colombo MetroBus corridors, and private depots track their own fleets on Wialon — but each sits in its
            own app, and none of them talk to each other.
          </p>
          <p>
            Meanwhile the vehicles families care about most — the school van, the office shuttle, the factory bus —
            have no tracking at all, so a parent's only option is to phone the driver.
          </p>
          <p>
            BusEka is one map for every operator, plus a way for any owner to put their own vehicle on it in 60
            seconds using nothing but the driver's phone.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Who this helps</h2>
        <ul className="flex flex-col gap-3">
          <WhoRow icon="directions_walk" title="Daily commuters" body="On 356+ Southern Province routes and Colombo MetroBus corridors CM01/CM02." />
          <WhoRow icon="family_restroom" title="Parents of school-van children" body="Who currently have no way to know where the van is except to call the driver." />
          <WhoRow icon="local_shipping" title="Small van and bus owners" body="With no way to offer tracking to passengers without buying hardware." />
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">The team</h2>
        <div className="overflow-x-auto rounded-xl border border-border dark:border-border-dark">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-page dark:bg-page-dark text-left">
                <Th>Name</Th>
                <Th>Student ID</Th>
                <Th>What they built</Th>
              </tr>
            </thead>
            <tbody>
              <TeamRow name="—" id="—" built="Fill in — data lane (fleet snapshot, geo/eta math)" />
              <TeamRow name="—" id="—" built="Fill in — UI (design canvas, components, Home/Map)" />
              <TeamRow name="—" id="—" built="Fill in — groups and driver (join/owner/drive)" />
              <TeamRow name="—" id="—" built="Fill in — AI journey assistant and trains board" />
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">How we used AI</h2>
        <div className="overflow-x-auto rounded-xl border border-border dark:border-border-dark">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-page dark:bg-page-dark text-left">
                <Th>Tool</Th>
                <Th>What it was used for</Th>
              </tr>
            </thead>
            <tbody>
              <TeamRow name="Google Stitch" built="Generated the twelve screen layouts and the design system from a written spec." id="" hideId />
              <TeamRow name="Claude Code" built="Wrote the Worker routes and React pages against DESIGN.md, converting the Stitch mockups to Tailwind components." id="" hideId />
              <TeamRow name="Cloudflare Workers AI" built="Runs inside the app to parse journey questions and phrase answers — all distances and ETAs are computed in TypeScript, never invented by the model." id="" hideId />
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Data sources</h2>
        <ul className="text-[14px] text-text/80 dark:text-text-dark/80 flex flex-col gap-1.5 list-disc list-inside">
          <li>
            SPRPTA live bus positions —{" "}
            <a href="https://spgps.lk" target="_blank" rel="noreferrer" className="text-primary">
              spgps.lk
            </a>
          </li>
          <li>Train positions — passenger reports, since Sri Lanka Railways publishes no live GPS feed</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5 flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold">Try it</h2>
        <p className="text-[13px] text-text/60 dark:text-text-dark/60">Use this code on the Join page to see a group in action.</p>
        <div className="self-start font-mono text-[22px] font-bold tracking-[0.15em] bg-page dark:bg-page-dark px-4 py-2 rounded-lg">
          DEMO24
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 font-semibold border-b border-border dark:border-border-dark">{children}</th>;
}

function TeamRow({ name, id, built, hideId }: { name: string; id: string; built: string; hideId?: boolean }) {
  return (
    <tr className="border-b border-border dark:border-border-dark last:border-0">
      <td className="px-3 py-2 font-medium">{name}</td>
      {!hideId && <td className="px-3 py-2 text-text/60 dark:text-text-dark/60">{id}</td>}
      <td className="px-3 py-2 text-text/70 dark:text-text-dark/70">{built}</td>
    </tr>
  );
}

function WhoRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <div className="font-semibold text-[14px]">{title}</div>
        <div className="text-[13px] text-text/60 dark:text-text-dark/60">{body}</div>
      </div>
    </li>
  );
}
