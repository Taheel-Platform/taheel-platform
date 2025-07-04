"use client";
export const dynamic = "force-dynamic";
import { Response } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin"; 
import { collection, getDocs } from "firebase-admin/firestore"; 

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(firestore, "services"));
    let services = [];
    querySnapshot.forEach(doc => services.push({ id: doc.id, ...doc.data() }));
    return Response.json({ services });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}