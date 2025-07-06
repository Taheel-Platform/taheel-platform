export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";
import { collection, getDocs } from "firebase-admin/firestore";

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(adminFirestore, "services"));
    let services = [];
    querySnapshot.forEach((doc) =>
      services.push({ id: doc.id, ...doc.data() })
    );
    return NextResponse.json({ services });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
