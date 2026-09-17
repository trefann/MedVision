"use client";

import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import PatientCard from "@/components/PatientCard";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientsPage() {
  const { patients, visits } = useStore();

  return (
    <PageTransition>
      <TopBar title="Patients" />
      <div className="px-4 pb-4">
        <Link href="/patients/new">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="w-full py-3.5 rounded-full bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 mb-4"
          >
            <Plus size={18} />
            New Patient
          </motion.button>
        </Link>

        <div className="space-y-3">
          {patients.map((p, i) => {
            const visitCount = visits.filter(
              (v) => v.patientId === p.id
            ).length;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PatientCard
                  id={p.id}
                  name={p.name}
                  age={p.age}
                  subtitle={`${visitCount} visit${visitCount !== 1 ? "s" : ""} · ABHA ${p.abhaNumber.slice(-4)}`}
                  status={p.status}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
