import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  ArrowRight,
  ShieldCheck,
  ScanLine,
  BarChart3,
  LoaderCircle,
  LockKeyhole,
  Check,
} from "lucide-react";
import { pingServer } from "../services/apiService";
import { Button, Card, InlineError } from "./ui/PortalUI";
export default function UploadScreen({
  onAnalyze,
  onUseSample,
  isLoading,
  error,
  progressMessage,
}) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [validation, setValidation] = useState("");
  const [password, setPassword] = useState("");
  const [passwords, setPasswords] = useState({});
  const [status, setStatus] = useState("checking");
  const input = useRef(null);
  useEffect(() => {
    let active = true;
    pingServer()
      .then(() => {
        if (active) setStatus("online");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });
    return () => {
      active = false;
    };
  }, []);
  function addFiles(incoming) {
    if (isLoading) return;
    const next = [...files];
    const errors = [];
    for (const file of incoming) {
      if (
        !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
          file.type,
        )
      ) {
        errors.push(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: exceeds 10 MB`);
        continue;
      }
      if (next.length >= 10) {
        errors.push("Choose up to 10 files per analysis");
        break;
      }
      if (
        next.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified,
        )
      )
        continue;
      next.push(file);
    }
    setFiles(next);
    setValidation(errors.join(". "));
  }
  const needsPassword =
    error && /PDF_PASSWORD|password-protected|Incorrect password/i.test(error);
  function retryPassword(event) {
    event.preventDefault();
    const name = error?.match(/"([^"]+)"/)?.[1];
    const fallback = files.find((f) => f.type === "application/pdf")?.name;
    const next = { ...passwords, [name || fallback]: password };
    setPasswords(next);
    setPassword("");
    onAnalyze(files, next);
  }
  return (
    <div className="upload-page p-entry">
      <div className="upload-intro">
        <span className="p-badge">
          <ScanLine size={13} />A better relationship with your money
        </span>
        <h1>
          Your statement.
          <br />
          Your story, made clear.
        </h1>
        <p>
          Turn bank statements into a thoughtful picture of your spending.
          Upload, explore, and understand what comes next.
        </p>
      </div>
      <div className="upload-layout">
        <Card
          title="Start with a statement"
          subtitle="Bank PDFs, screenshots, or clear statement images"
          action={
            <span className={`p-badge ${status === "online" ? "success" : ""}`}>
              <span className="p-badge-dot" />
              {status === "online"
                ? "Service ready"
                : status === "checking"
                  ? "Checking service"
                  : "Service unavailable"}
            </span>
          }
        >
          <div
            className={`upload-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <div className="upload-icon">
              <Upload size={24} />
            </div>
            <h3>Drop your statement here</h3>
            <p>PDF, PNG, JPG or WEBP · 10 MB per file · up to 10 files</p>
            <Button onClick={() => input.current.click()} disabled={isLoading}>
              Browse files <ArrowRight size={13} />
            </Button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(event) => {
                addFiles(Array.from(event.target.files));
                event.target.value = "";
              }}
            />
          </div>
          <div className="p-card-body">
            <InlineError message={validation} />
            {files.map((file, index) => (
              <div className="upload-file" key={`${file.name}-${index}`}>
                <FileText size={18} />
                <div className="file-copy">
                  <strong>{file.name}</strong>
                  <small>
                    {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                    {file.type === "application/pdf"
                      ? "PDF statement"
                      : "Statement image"}
                  </small>
                </div>
                <Button
                  aria-label={`Remove ${file.name}`}
                  disabled={isLoading}
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
            {isLoading && (
              <div className="upload-progress" role="status">
                <LoaderCircle className="p-spin" size={20} />
                <span>{progressMessage || "Preparing your analysis…"}</span>
              </div>
            )}
            {needsPassword ? (
              <form onSubmit={retryPassword}>
                <div className="p-error" role="alert">
                  <LockKeyhole size={17} />
                  <span>{error.replace(/^PDF_PASSWORD_[A-Z]+:\s*/, "")}</span>
                </div>
                <label className="p-field">
                  PDF password
                  <input
                    className="p-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={isLoading}
                  style={{ marginTop: 12 }}
                >
                  Unlock and retry
                </Button>
              </form>
            ) : (
              <InlineError
                message={error}
                onRetry={
                  files.length ? () => onAnalyze(files, passwords) : undefined
                }
              />
            )}
            <div className="upload-submit">
              <Button onClick={onUseSample} disabled={isLoading}>
                Explore a sample
              </Button>
              <Button
                variant="primary"
                onClick={() => onAnalyze(files, passwords)}
                disabled={!files.length || isLoading}
              >
                {isLoading ? "Analyzing…" : "Analyze statement"}
                <ArrowRight size={15} />
              </Button>
            </div>
            <div className="upload-privacy">
              <ShieldCheck size={15} />
              <span>
                Statement payloads stay out of browser storage. Anonymous
                results are available for this session. Sign in before uploading
                to save your history.
              </span>
            </div>
            {status === "offline" && (
              <Button
                style={{ marginTop: 12 }}
                onClick={() => {
                  setStatus("checking");
                  pingServer()
                    .then(() => setStatus("online"))
                    .catch(() => setStatus("offline"));
                }}
              >
                Check service again
              </Button>
            )}
          </div>
        </Card>
        <Card
          title="From pages to perspective"
          subtitle="Three simple steps, one clearer picture"
        >
          <div className="p-card-body">
            {[
              [
                "01",
                "Upload securely",
                "Choose a statement or screenshot. Password-protected PDFs are supported.",
              ],
              [
                "02",
                "Let the details come together",
                "Extract transactions, organize categories, and check statement quality.",
              ],
              [
                "03",
                "Make sense of your spending",
                "Explore daily activity, merchants, refunds, and statement insights.",
              ],
            ].map(([number, title, body]) => (
              <div className="upload-side-step" key={number}>
                <span className="upload-step-number">{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 24,
                marginTop: 12,
              }}
            >
              <BarChart3 size={26} style={{ color: "var(--text-2)" }} />
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.9,
                  color: "var(--text-2)",
                }}
              >
                Less time decoding statements.
                <br />
                More clarity about where your money goes.
              </p>
              <p className="p-help">
                AI extraction can make mistakes. Review flagged dates and
                balance differences against your statement.
              </p>
            </div>
          </div>
        </Card>
      </div>
      <div className="upload-proof">
        <span>
          <Check size={12} />
          No manual entry
        </span>
        <span>
          <LockKeyhole size={12} />
          Encrypted PDF support
        </span>
        <span>
          <ShieldCheck size={12} />
          PII redaction before storage
        </span>
      </div>
    </div>
  );
}
