"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Halaman /hasil — redirect ke /scraping
export default function HasilPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/scraping"); }, [router]);
  return null;
}
