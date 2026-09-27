import { useEffect, useRef, useState } from "react";
import OtpInput from "@/components/forms/OtpInput";
import Switch from "@/components/forms/Switch";
import { TextField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import { allRoles } from "@/data/adminData";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import type { StaffRole } from "@/types";
import { cn, formatSeconds, isEmail } from "@/utils";

type AuthView = "login" | "forgot" | "reset" | "otp" | "expired" | "locked" | "unauthorized" | "first";

const screens: Array<[AuthView, string]> = [
  ["login", "Login"],
  ["forgot", "Forgot password"],
  ["reset", "Reset password"],
  ["otp", "OTP / 2FA"],
  ["expired", "Session expired"],
  ["locked", "Account locked"],
  ["unauthorized", "Access denied"],
  ["first", "First login"],
];

const centralStates: Record<string, [IconName, string, string, string]> = {
  expired: ["warning", "Your session has expired", "For your security, you were signed out after 15 minutes of inactivity.", "Sign in again"],
  locked: ["lock", "Account temporarily locked", "Too many unsuccessful attempts. Try again in 28 minutes or contact an administrator.", "Contact administrator"],
  unauthorized: ["shield", "You don’t have access", "This area is restricted to Purchase Managers and Administrators.", "Return to dashboard"],
};

const firstLoginTitles: Array<[string, string]> = [
  ["Welcome, Arjun", "Let’s personalise your secure workspace."],
  ["Your profile", "Confirm how your team will identify you."],
  ["Choose a branch", "Select the location you’ll open by default."],
  ["Your access", "Review the permissions assigned to your role."],
  ["Stay informed", "Choose which operational updates matter most."],
];

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabel = ["Too short", "Weak password", "Fair password", "Good password", "Strong password"];

export default function AuthenticationPage({
  onEnterWorkspace,
  onBackToCover,
}: {
  onEnterWorkspace?: () => void;
  onBackToCover?: () => void;
}) {
  const toast = useToast();
  const { activeRole, setActiveRole } = useAdmin();
  const [view, setView] = useState<AuthView>("login");

  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(t => window.clearTimeout(t));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  // Login
  const [email, setEmail] = useState("arjun.sharma@maharajasoap.in");
  const [password, setPassword] = useState("securepass");
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [signingIn, setSigningIn] = useState(false);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string>();
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetErrors, setResetErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [updatingPw, setUpdatingPw] = useState(false);

  // OTP
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [seconds, setSeconds] = useState(120);
  useEffect(() => {
    if (view !== "otp") return;
    setSeconds(120);
    const interval = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [view]);

  // First login wizard
  const [step, setStep] = useState(0);
  const [profileName, setProfileName] = useState("Arjun Sharma");
  const [profilePhone, setProfilePhone] = useState("+91 98201 45872");
  const [chosenBranch, setChosenBranch] = useState("jaipur");
  const [prefs, setPrefs] = useState([
    { label: "Daily sales summary", on: true },
    { label: "Approval requests", on: true },
    { label: "Low stock alerts", on: true },
    { label: "Customer follow-ups", on: false },
  ]);

  const go = (next: AuthView) => {
    setView(next);
    setStep(0);
    setOtpError(undefined);
    if (next === "otp") setDigits(Array(6).fill(""));
    if (next === "forgot") {
      setLinkSent(false);
      setForgotError(undefined);
    }
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof loginErrors = {};
    if (!isEmail(email)) errors.email = "Enter a valid work email";
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    setLoginErrors(errors);
    if (Object.keys(errors).length) return;
    setSigningIn(true);
    later(() => {
      setSigningIn(false);
      go("otp");
      toast({ tone: "info", title: "Verification code sent", message: "A 6-digit code was sent to +91 ••••• 45872." });
    }, 900);
  };

  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(forgotEmail)) {
      setForgotError("Enter the work email linked to your account");
      return;
    }
    setForgotError(undefined);
    setSendingLink(true);
    later(() => {
      setSendingLink(false);
      setLinkSent(true);
    }, 900);
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof resetErrors = {};
    if (passwordScore(newPassword) < 3) errors.pw = "Use at least 12 characters with a number and symbol";
    if (confirmPassword !== newPassword || !confirmPassword) errors.confirm = "Passwords do not match";
    setResetErrors(errors);
    if (Object.keys(errors).length) return;
    setUpdatingPw(true);
    later(() => {
      setUpdatingPw(false);
      go("login");
      toast({ tone: "success", title: "Password updated", message: "Sign in with your new password." });
    }, 900);
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setOtpError("Enter the full 6-digit code");
      return;
    }
    if (code === "000000") {
      setOtpError("That code is not valid. Check the latest SMS and try again.");
      return;
    }
    setOtpError(undefined);
    setVerifying(true);
    later(() => {
      setVerifying(false);
      if (onEnterWorkspace) {
        onEnterWorkspace();
        toast({ tone: "success", title: `Signed in as ${activeRole}`, message: "Welcome back to Maharaja Soap." });
      } else {
        go("first");
      }
    }, 900);
  };

  const resendCode = () => {
    setDigits(Array(6).fill(""));
    setOtpError(undefined);
    setSeconds(120);
    toast({ tone: "info", title: "Code resent", message: "A new code was sent to +91 ••••• 45872." });
  };

  const finishWizard = () => {
    if (onEnterWorkspace) {
      onEnterWorkspace();
    } else {
      go("login");
    }
    toast({ tone: "success", title: "Workspace ready", message: "Your preferences were saved. Welcome to Maharaja Soap." });
  };

  const score = passwordScore(newPassword);
  const central = view === "expired" || view === "locked" || view === "unauthorized";

  const renderForm = () => {
    if (view === "login") {
      return (
        <form onSubmit={submitLogin} noValidate>
          <div className="auth-title">
            <p>WELCOME BACK</p>
            <h2>Sign in to Maharaja Soap</h2>
            <span>Secure access to your CRM & ERP workspace.</span>
          </div>
          <TextField
            label="Work email"
            type="email"
            icon="mail"
            autoComplete="username"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setLoginErrors(er => ({ ...er, email: undefined }));
            }}
            error={loginErrors.email}
          />
          <div className={cn("field", loginErrors.password && "error-field")}>
            <label className="field-label" htmlFor="login-password">Password</label>
            <div className="input-icon">
              <Icon name="key" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                aria-invalid={loginErrors.password ? true : undefined}
                onChange={e => {
                  setPassword(e.target.value);
                  setLoginErrors(er => ({ ...er, password: undefined }));
                }}
              />
              <button
                type="button"
                className="ghost-icon"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(s => !s)}
              >
                <Icon name="eye" />
              </button>
            </div>
            {loginErrors.password && (
              <small className="field-note error-text"><Icon name="error" size={12} />{loginErrors.password}</small>
            )}
          </div>
          <label className="field auth-role">
            <span className="field-label">Sign in as</span>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value as StaffRole)}
              aria-label="Role for this session"
            >
              {allRoles.map(r => <option key={r}>{r}</option>)}
            </select>
            <small className="field-note">Prototype role selection — the workspace opens with this role's permissions.</small>
          </label>
          <div className="form-between">
            <label className="check">
              <input type="checkbox" className="sr-input" defaultChecked />
              <i aria-hidden="true"><Icon name="check" size={12} /></i>
              Remember this device
            </label>
            <button type="button" className="link-btn" onClick={() => go("forgot")}>Forgot password?</button>
          </div>
          <Button type="submit" full loading={signingIn}>
            {signingIn ? "Verifying..." : <>Sign in securely <Icon name="arrow" /></>}
          </Button>
          <div className="secure-note"><Icon name="shield" /> Protected by enterprise-grade encryption</div>
        </form>
      );
    }

    if (view === "forgot") {
      return (
        <form onSubmit={submitForgot} noValidate>
          <button type="button" className="back-link" onClick={() => go("login")}>← Back to sign in</button>
          <div className="auth-symbol"><Icon name="mail" /></div>
          <div className="auth-title">
            <h2>Reset your password</h2>
            <span>Enter your work email and we’ll send a secure reset link.</span>
          </div>
          <TextField
            label="Work email"
            type="email"
            placeholder="name@maharajasoap.in"
            value={forgotEmail}
            onChange={e => {
              setForgotEmail(e.target.value);
              setForgotError(undefined);
            }}
            error={forgotError}
            success={linkSent ? "Reset link sent — check your inbox" : undefined}
          />
          {!linkSent ? (
            <Button type="submit" full loading={sendingLink}>
              {sendingLink ? "Sending..." : "Send reset link"}
            </Button>
          ) : (
            <Button full variant="secondary" onClick={() => go("reset")}>
              Open reset link (demo) <Icon name="arrow" />
            </Button>
          )}
        </form>
      );
    }

    if (view === "reset") {
      return (
        <form onSubmit={submitReset} noValidate>
          <div className="auth-symbol"><Icon name="key" /></div>
          <div className="auth-title">
            <h2>Create a new password</h2>
            <span>Use at least 12 characters with a number and symbol.</span>
          </div>
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => {
              setNewPassword(e.target.value);
              setResetErrors(er => ({ ...er, pw: undefined }));
            }}
            error={resetErrors.pw}
          />
          {newPassword && (
            <div className={cn("password-strength", score <= 1 && "weak", score === 2 && "fair")}>
              {[0, 1, 2, 3].map(i => <i key={i} className={i < score ? "on" : ""} />)}
              <span>{strengthLabel[score]}</span>
            </div>
          )}
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => {
              setConfirmPassword(e.target.value);
              setResetErrors(er => ({ ...er, confirm: undefined }));
            }}
            error={resetErrors.confirm}
            success={!resetErrors.confirm && confirmPassword && confirmPassword === newPassword ? "Passwords match" : undefined}
          />
          <Button type="submit" full loading={updatingPw}>
            {updatingPw ? "Updating..." : "Update password"}
          </Button>
        </form>
      );
    }

    if (view === "otp") {
      return (
        <form onSubmit={submitOtp} noValidate>
          <button type="button" className="back-link" onClick={() => go("login")}>← Back</button>
          <div className="auth-symbol"><Icon name="shield" /></div>
          <div className="auth-title">
            <h2>Verify it’s you</h2>
            <span>Enter the 6-digit code sent to +91 ••••• 45872.</span>
          </div>
          <OtpInput value={digits} onChange={d => { setDigits(d); setOtpError(undefined); }} invalid={!!otpError} />
          {otpError && <p className="otp-error" role="alert"><Icon name="error" size={13} /> {otpError}</p>}
          <Button type="submit" full loading={verifying} disabled={digits.join("").length < 6 && !verifying}>
            {verifying ? "Verifying..." : "Verify & continue"}
          </Button>
          <p className="center-note">
            {seconds > 0 ? <>Code expires in <strong>{formatSeconds(seconds)}</strong></> : <strong>Code expired</strong>}
            {" · "}
            <button type="button" className="link-btn" onClick={resendCode}>Resend code</button>
          </p>
        </form>
      );
    }

    if (view === "first") {
      return (
        <div>
          <div className="auth-title">
            <p>FIRST LOGIN · {step + 1} OF 5</p>
            <h2>{firstLoginTitles[step][0]}</h2>
            <span>{firstLoginTitles[step][1]}</span>
          </div>
          <div className="progress-line" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1}>
            <i style={{ width: `${(step + 1) * 20}%` }} />
          </div>
          {step === 0 && (
            <div className="welcome-art">
              <div className="brand-mark"><span>MS</span></div>
              <p>Vapi Plant workspace is ready.</p>
            </div>
          )}
          {step === 1 && (
            <>
              <TextField label="Full name" value={profileName} onChange={e => setProfileName(e.target.value)} />
              <TextField label="Phone" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} />
            </>
          )}
          {step === 2 && (
            <div className="choice-list" role="radiogroup" aria-label="Default branch">
              {[
                ["jaipur", "Vapi Plant", "GIDC Char Rasta · Head office"],
                ["mumbai", "Ahmedabad Depot", "Narol GIDC · Regional depot"],
              ].map(([id, name, area]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={chosenBranch === id}
                  className={cn(chosenBranch === id && "selected")}
                  onClick={() => setChosenBranch(id)}
                >
                  <Icon name="building" />
                  <span><strong>{name}</strong><small>{area}</small></span>
                  {chosenBranch === id && <Icon name="check" />}
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="role-card">
              <Icon name="shield" />
              <div>
                <small>ASSIGNED ROLE</small>
                <strong>Shop Manager</strong>
                <p>Full customer, sales and inventory access. Purchase approvals up to ₹5,00,000.</p>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="preference-list">
              {prefs.map((pref, i) => (
                <div key={pref.label}>
                  <span>{pref.label}</span>
                  <Switch
                    on={pref.on}
                    label={pref.label}
                    onChange={on => setPrefs(p => p.map((x, idx) => (idx === i ? { ...x, on } : x)))}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="wizard-actions">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            <Button onClick={() => (step < 4 ? setStep(step + 1) : finishWizard())}>
              {step === 4 ? "Enter workspace" : "Continue"} <Icon name="arrow" />
            </Button>
          </div>
        </div>
      );
    }

    const s = centralStates[view];
    return (
      <div className={`auth-state ${view}`}>
        <div className="state-icon"><Icon name={s[0]} /></div>
        <h2>{s[1]}</h2>
        <p>{s[2]}</p>
        <Button full onClick={() => go("login")}>{s[3]}</Button>
        <Button
          full
          variant="ghost"
          onClick={() => toast({ tone: "info", title: "Help & support", message: "Reach the admin desk at support@maharajasoap.in." })}
        >
          Get help
        </Button>
        <small>Reference: MS-AUTH-24038</small>
      </div>
    );
  };

  return (
    <div className="auth-page">
      {onBackToCover && (
        <button type="button" className="auth-back" onClick={onBackToCover}>
          <Icon name="arrow" size={14} /> Back to overview
        </button>
      )}
      <div className="screen-switcher">
        <span id="auth-preview-label">Preview screen</span>
        <div role="tablist" aria-labelledby="auth-preview-label">
          {screens.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={view === id ? "active" : ""}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("auth-preview", central && "central")}>
        {!central && (
          <aside className="auth-brand">
            <Brand />
            <div className="auth-brand-copy">
              <Badge tone="gold">TRUSTED OPERATIONS</Badge>
              <h1>Built for the plant floor.<br />Secured for the boardroom.</h1>
              <p>Manage every customer relationship and production batch with the care it deserves.</p>
              <ul className="auth-points">
                <li><Icon name="shield" size={14} /> Role-based access across 16 workspaces</li>
                <li><Icon name="check" size={14} /> Approvals, audit trail and notifications built in</li>
                <li><Icon name="gem" size={14} /> CRM → Production → Dispatch → Accounts, connected</li>
              </ul>
            </div>
            <div className="auth-quote">
              “Consistency in every batch is not a feature. It is our standard.”
              <span>Maharaja Soap · Vapi, Gujarat</span>
            </div>
          </aside>
        )}
        <main className="auth-form-wrap">
          {central && <Brand />}
          <div className="auth-form">{renderForm()}</div>
          {!central && <p className="auth-footer">© 2026 Maharaja Soap · Privacy · Support</p>}
        </main>
      </div>
    </div>
  );
}
