import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Field, SelectField } from "../components/Field";
import { post, ApiError } from "../lib/api";

type Vehicle = { label: string; plate: string; routeNo?: string; driveToken: string; driveUrl: string; qr?: string };

export function Owner() {
  const [code, setCode] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [openDriveUrl, setOpenDriveUrl] = useState<string | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-6">
      {!code ? (
        <CreateGroup
          onCreated={(c, p) => {
            setCode(c);
            setPin(p);
          }}
        />
      ) : (
        <>
          <GroupCard code={code} pin={pin} onRotate={setCode} />
          <VehicleList vehicles={vehicles} onOpenQr={setOpenDriveUrl} />
          <AddVehicle
            code={code}
            pin={pin}
            onAdded={(v) => setVehicles((list) => [...list, v])}
          />
        </>
      )}

      {openDriveUrl && <QrModal url={openDriveUrl} onClose={() => setOpenDriveUrl(null)} />}

      {!code && (
        <div className="mt-2">
          <ManageExisting onUnlocked={(c, p) => { setCode(c); setPin(p); }} />
        </div>
      )}
    </div>
  );
}

function CreateGroup({ onCreated }: { onCreated: (code: string, pin: string) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("school");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErrors({});
    setLoading(true);
    try {
      const result = await post<{ code: string }>("/api/groups", { name, kind, pin: pinValue, pinConfirm });
      onCreated(result.code, pinValue);
    } catch (e) {
      if (e instanceof ApiError) setErrors({ [e.field ?? "form"]: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-5">
      <h1 className="text-[20px] font-semibold">Create a group</h1>
      <Field id="owner-name" label="Group name" helper="e.g. Lyceum Van 12" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <SelectField id="owner-kind" label="Group type" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="school">School van</option>
        <option value="shuttle">Staff shuttle</option>
        <option value="public">Public bus route</option>
        <option value="tour">Tour group</option>
      </SelectField>
      <Field id="owner-pin" label="Owner PIN" type="password" inputMode="numeric" maxLength={4} value={pinValue} onChange={(e) => setPinValue(e.target.value)} error={errors.pin} />
      <Field id="owner-pin-confirm" label="Confirm PIN" type="password" inputMode="numeric" maxLength={4} value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value)} error={errors.pinConfirm} />
      {errors.form && <p className="text-[13px] text-delayed">{errors.form}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[15px] disabled:opacity-60 active:scale-[0.98] transition-transform"
      >
        {loading ? "Creating…" : "Create group"}
      </button>
    </div>
  );
}

function ManageExisting({ onUnlocked }: { onUnlocked: (code: string, pin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");

  if (!open) {
    return (
      <button className="text-[13px] text-primary" onClick={() => setOpen(true)}>
        Already have a group? Manage it
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-5">
      <h2 className="text-[16px] font-semibold">Manage an existing group</h2>
      <Field id="manage-code" label="Group code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <Field id="manage-pin" label="Owner PIN" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} />
      <button
        className="w-full py-2.5 rounded-xl bg-text text-page dark:bg-text-dark dark:text-page-dark font-semibold text-[15px]"
        onClick={() => onUnlocked(code.trim().toUpperCase(), pin.trim())}
        disabled={code.trim().length !== 6 || pin.trim().length !== 4}
      >
        Continue
      </button>
    </div>
  );
}

function GroupCard({ code, pin, onRotate }: { code: string; pin: string; onRotate: (code: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function rotate() {
    if (!confirm("The old code stops working immediately. Rotate anyway?")) return;
    setRotating(true);
    setError(null);
    try {
      const result = await post<{ code: string }>(`/api/groups/${code}/rotate`, { pin });
      onRotate(result.code);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't rotate the code.");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-5">
      <h2 className="text-[16px] font-semibold">Your group</h2>
      <div className="flex items-center justify-between gap-3 bg-page dark:bg-page-dark rounded-xl px-4 py-3">
        <span className="font-mono text-[28px] font-bold tracking-[0.15em]">{code}</span>
        <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-[13px] font-semibold">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-[13px] text-text/60 dark:text-text-dark/60">Share this code with parents or passengers.</p>
      <button onClick={rotate} disabled={rotating} className="self-start text-[13px] text-delayed font-semibold">
        {rotating ? "Rotating…" : "Rotate code"}
      </button>
      <p className="text-[11px] text-text/45 dark:text-text-dark/45">The old code stops working immediately.</p>
      {error && <p className="text-[13px] text-delayed">{error}</p>}
    </div>
  );
}

function VehicleList({ vehicles, onOpenQr }: { vehicles: Vehicle[]; onOpenQr: (url: string) => void }) {
  if (vehicles.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[16px] font-semibold">Vehicles</h2>
      {vehicles.map((v) => (
        <div key={v.driveToken} className="flex items-center justify-between gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3.5">
          <div className="min-w-0">
            <div className="font-semibold text-[14px] truncate">{v.label}</div>
            <div className="text-[12px] font-mono text-text/60 dark:text-text-dark/60">{v.plate}</div>
          </div>
          <button onClick={() => onOpenQr(v.driveUrl)} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[13px] font-semibold">
            Driver link
          </button>
        </div>
      ))}
    </div>
  );
}

function AddVehicle({ code, pin, onAdded }: { code: string; pin: string; onAdded: (v: Vehicle) => void }) {
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [routeNo, setRouteNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErrors({});
    setLoading(true);
    try {
      const result = await post<{ driveToken: string; driveUrl: string }>(`/api/groups/${code}/vehicles`, {
        label,
        plate,
        routeNo: routeNo || undefined,
        pin,
      });
      onAdded({ label, plate, routeNo: routeNo || undefined, driveToken: result.driveToken, driveUrl: result.driveUrl });
      setLabel("");
      setPlate("");
      setRouteNo("");
    } catch (e) {
      if (e instanceof ApiError) setErrors({ [e.field ?? "form"]: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-5">
      <h2 className="text-[16px] font-semibold">Add vehicle</h2>
      <Field id="vehicle-label" label="Label" value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} />
      <Field id="vehicle-plate" label="Plate" helper="Like ND-7217" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} error={errors.plate} />
      <Field id="vehicle-route" label="Route number (optional)" value={routeNo} onChange={(e) => setRouteNo(e.target.value)} />
      {errors.form && <p className="text-[13px] text-delayed">{errors.form}</p>}
      {errors.pin && <p className="text-[13px] text-delayed">{errors.pin}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-[15px] disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add vehicle"}
      </button>
    </div>
  );
}

function QrModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface dark:bg-surface-dark rounded-2xl p-6 max-w-xs w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {dataUrl && <img src={dataUrl} alt="Driver link QR code" className="rounded-xl" />}
        <p className="text-[13px] text-center text-text/60 dark:text-text-dark/60">
          Send this to the driver. Opening it on their phone starts tracking.
        </p>
        <div className="w-full flex items-center gap-2">
          <input readOnly value={url} className="flex-1 min-w-0 truncate text-[12px] font-mono bg-page dark:bg-page-dark rounded-lg px-2.5 py-2 border border-border dark:border-border-dark" />
          <button onClick={copy} className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-[12px] font-semibold">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button onClick={onClose} className="text-[13px] text-text/60 dark:text-text-dark/60 mt-1">
          Close
        </button>
      </div>
    </div>
  );
}
