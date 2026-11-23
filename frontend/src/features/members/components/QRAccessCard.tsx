import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, ScanLine } from "lucide-react";
import { motion } from "motion/react";
import { generateDailyQr, type DailyQr } from "../../../services/api";

function QRAccessCard() {
  const [qr, setQr] = useState<DailyQr | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateQr = async () => {
    setIsLoading(true);
    setError("");

    try {
      setQr(await generateDailyQr());
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate today's QR code.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#1C1D24] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">
            GYM ACCESS
          </p>
          <h3 className="mt-2 text-xl font-semibold text-paper">
            دخولك للجيم
          </h3>
        </div>

        <div className="rounded-xl bg-lime/10 p-3 text-lime">
          <QrCode size={23} />
        </div>
      </div>

      <div className="my-7 flex min-h-[230px] flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-[#15161C] p-5">
        {qr ? (
          <motion.div
            key={qr.token}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-white p-3"
          >
            <QRCodeSVG
              value={qr.token}
              size={180}
              level="H"
              includeMargin
            />
          </motion.div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-lime/10 p-5 text-lime">
              <ScanLine size={34} />
            </div>

            <p className="font-medium text-paper">مستعد تسجل حضورك؟</p>

            <p className="mt-2 max-w-[220px] text-xs leading-5 text-muted">
              اضغط على الزرار لتوليد QR Code خاص بدخولك.
            </p>
          </div>
        )}
      </div>

      {qr && (
        <p className="mb-5 text-center text-sm text-muted">
          Daily code for{" "}
          <span className="font-semibold text-lime">{qr.qrDate}</span>
          {qr.reused ? " · Today's code restored" : ""}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 text-center text-sm text-red-300">
          {error}
        </p>
      )}

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGenerateQr}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3.5 font-semibold text-ink transition-colors hover:bg-[#D5FF36]"
      >
        {isLoading ? (
          <>Loading today's QR...</>
        ) : qr ? (
          <>
            <RefreshCw size={18} />
            Retrieve Today's QR
          </>
        ) : (
          <>
            <ScanLine size={18} />
            Generate Entry QR
          </>
        )}
      </motion.button>

      <p className="mt-4 text-center text-[11px] leading-5 text-muted">
        استخدم الكود عند بوابة الدخول لتسجيل حضورك.
      </p>
    </motion.section>
  );
}

export default QRAccessCard;