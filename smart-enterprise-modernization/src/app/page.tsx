'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-4xl p-8 rounded-3xl bg-hero text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-extrabold"
            >
              Smart Enterprise Modernization
            </motion.h1>
            <p className="mt-4 text-lg text-blue-50/90">
              Transform legacy systems into API-first, cloud-ready platforms
              with zero downtime and real-time telemetry.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 rounded-full bg-white text-slate-900 font-semibold shadow hover:scale-[1.02] transition"
              >
                Launch Dashboard
              </Link>
              <a
                href="#features"
                className="inline-block px-6 py-3 rounded-full border border-white/30 text-white/90"
              >
                Learn more
              </a>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="w-70 h-60 rounded-xl bg-white/10 border border-white/20 p-4 flex items-center justify-center"
          >
            <img
              src="/placeholder.jpg"
              alt="dashboard"
              className="rounded-lg w-80 h-59 object-cover"
              height="200px"
              width="300px"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
