import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import QrScanner from "qr-scanner";
import { Link } from "react-router-dom";
import { ApiError, scanQr, type QrScanResult } from "../../../services/api";

function scanErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "The QR scan failed.";
  }

  switch (error.code) {
    case "INVALID_QR":
      return "This QR code is not recognized. Ask the member to display today's code.";
    case "QR_EXPIRED":
      return "This QR code is from a different Cairo business date.";
    case "SUBSCRIPTION_INACTIVE":
      return "This member does not have an active subscription today.";
    case "QR_ALREADY_USED":
      return "This QR code has already been used.";
    case "QR_ATTENDANCE_INTEGRITY_ERROR":
      return "Attendance data is inconsistent. Ask a manager to investigate.";
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "An admin account is required to scan member QR codes.";
    default:
      return error.message;
  }
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera permission was denied. Allow camera access and try again.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No usable camera was found on this device.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is already in use by another application.";
    }
  }

  return error instanceof Error
    ? error.message
    : "The camera could not be started.";
}

function AdminAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const processingRef = useRef(false);
  const decodeHandlerRef = useRef<(token: string) => void>(() => undefined);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cameraSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    decodeHandlerRef.current = (token) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;
      setScanError("");
      setResult(null);
      setIsSubmitting(true);
      void scannerRef.current?.pause(true);

      scanQr(token)
        .then(setResult)
        .catch((error: unknown) => setScanError(scanErrorMessage(error)))
        .finally(() => setIsSubmitting(false));
    };
  }, []);

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    if (!video || !cameraSupported) {
      return;
    }

    const scanner = new QrScanner(
      video,
      (decoded) => decodeHandlerRef.current(decoded.data),
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      },
    );
    scannerRef.current = scanner;

    QrScanner.hasCamera()
      .then((available) => {
        if (active) {
          setCameraAvailable(available);
          if (!available) {
            setCameraError("No camera is available on this device.");
          }
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCameraAvailable(false);
          setCameraError(cameraErrorMessage(error));
        }
      });

    return () => {
      active = false;
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [cameraSupported]);

  async function startCamera() {
    const scanner = scannerRef.current;
    if (!scanner) {
      setCameraError("The QR scanner could not be initialized.");
      return;
    }

    setIsStarting(true);
    setCameraError("");
    try {
      await scanner.start();
      setCameraAvailable(true);
    } catch (error) {
      setCameraError(cameraErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function scanNextMember() {
    const scanner = scannerRef.current;
    if (!scanner) {
      setCameraError("The QR scanner could not be initialized.");
      return;
    }

    setResult(null);
    setScanError("");
    processingRef.current = false;
    try {
      scanner.stop();
      await scanner.start();
    } catch (error) {
      setCameraError(cameraErrorMessage(error));
    }
  }

  const hasOutcome = result !== null || scanError !== "";

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
              Member check-in
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              QR attendance scanner
            </h1>
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-lime hover:text-lime"
          >
            <ArrowLeft size={17} />
            Admin
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Scan a member’s QR code</h2>
            <p className="mt-2 text-sm text-muted">
              Use the member’s daily code. The server verifies the code and
              subscription before recording attendance.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                muted
                playsInline
                aria-label="QR scanner camera preview"
              />
            </div>

            {(cameraError || !cameraSupported) && (
              <p role="alert" className="mt-4 flex gap-2 text-sm text-red-300">
                <AlertCircle size={18} className="shrink-0" />
                {cameraError ||
                  "Camera scanning is not supported in this browser. Use a recent browser over HTTPS."}
              </p>
            )}
            {scanError && (
              <p role="alert" className="mt-4 flex gap-2 text-sm text-red-300">
                <AlertCircle size={18} className="shrink-0" />
                {scanError}
              </p>
            )}
            {isSubmitting && (
              <p role="status" className="mt-4 text-sm text-lime">
                Verifying QR and recording attendance...
              </p>
            )}

            {!hasOutcome && !isSubmitting && (
              <button
                type="button"
                onClick={startCamera}
                disabled={isStarting || !cameraSupported}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3 font-semibold text-ink disabled:opacity-60"
              >
                <Camera size={18} />
                {isStarting
                  ? "Starting camera..."
                  : cameraAvailable === false
                    ? "Try camera anyway"
                    : "Start camera"}
              </button>
            )}

            {hasOutcome && (
              <button
                type="button"
                onClick={scanNextMember}
                className="mt-5 w-full rounded-xl bg-lime px-5 py-3 font-semibold text-ink"
              >
                Scan next member
              </button>
            )}
          </section>

          <section
            className="min-h-72 rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7"
            aria-live="polite"
          >
            {!result ? (
              <div className="flex h-full min-h-60 flex-col items-center justify-center text-center text-muted">
                <Camera size={34} className="text-lime" />
                <p className="mt-4 font-medium text-paper">
                  Member details will appear here
                </p>
                <p className="mt-2 max-w-sm text-sm">
                  Keep the member’s QR code inside the camera frame.
                </p>
              </div>
            ) : (
              <div>
                <div
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    result.alreadyProcessed ? "text-amber-300" : "text-lime"
                  }`}
                >
                  <CheckCircle2 size={19} />
                  {result.alreadyProcessed
                    ? "Attendance was already recorded"
                    : "Attendance recorded"}
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink text-2xl font-semibold text-lime">
                    {result.member.profilePhotoUrl ? (
                      <img
                        src={result.member.profilePhotoUrl}
                        alt={`${result.member.name}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      result.member.name.trim().charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold">
                      {result.member.name}
                    </h2>
                    <p className="mt-1 text-muted">{result.member.phone}</p>
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-ink/60 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Membership</dt>
                    <dd className="mt-1 font-semibold text-lime">
                      {result.subscription.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Expires (exclusive)</dt>
                    <dd className="mt-1 font-semibold">
                      {result.subscription.endDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Attendance date · Cairo</dt>
                    <dd className="mt-1 font-semibold">
                      {result.attendance.date}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Recorded at</dt>
                    <dd className="mt-1 font-semibold">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Cairo",
                      }).format(new Date(result.attendance.timestamp))}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminAttendancePage;
