export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";

export async function GET() {
  try {
    const snapshot = await adminFirestore.collection("services").get();
    let services = [];
    snapshot.forEach(doc => {
      services.push({ id: doc.id, ...doc.data() });
    });
    return NextResponse.json({ services });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
