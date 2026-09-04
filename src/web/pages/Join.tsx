import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CodeInput } from "../components/CodeInput";
import { Field } from "../components/Field";
import { post, ApiError } from "../lib/api";

export function Join() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setCodeError(undefined);
    setNameError(undefined);
    setBanner(null);

    if (code.trim().length !== 6) {
      setCodeError(`That code is ${code.trim().length} characters — join codes are 6.`);
      return;
    }
    if (!name.trim()) {
      setNameError("Tell us who's watching.");
      return;
    }

    setLoading(true);
    try {
      const result = await post<{ code: string }>(`/api/groups/${code.trim()}/join`, {
        code: code.trim(),
        name: name.trim(),
      });
      navigate(`/g/${result.code}`);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "RATE_LIMITED") setBanner(e.message);
        else if (e.field === "code") setCodeError(e.message);
        else if (e.field === "name") setNameError(e.message);
        else setBanner(e.message);
      } else {
        setBanner("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-[420px] flex flex-col gap-5 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-6">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold">Join a group</h1>
          <p className="mt-1 text-[13px] text-text/60 dark:text-text-dark/60">
            Enter the 6-character code from whoever runs your van, shuttle or bus.
          </p>
        </div>

        {banner && (
          <div className="flex items-center gap-2 bg-delayed/15 text-text dark:text-text-dark px-3.5 py-2.5 rounded-xl text-[13px]">
            <span className="material-symbols-outlined text-delayed text-[18px]">warning</span>
            {banner}
          </div>
        )}

        <CodeInput value={code} onChange={setCode} error={codeError} />

        <Field
          id="join-name"
          label="Your name"
          helper="So the group knows who's watching."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[15px] disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {loading ? "Joining…" : "Join"}
        </button>

        <Link to="/owner" className="text-center text-[13px] text-primary">
          Have a vehicle instead? Create a group
        </Link>
      </form>
    </div>
  );
}
