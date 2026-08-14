import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return errorResponse("This request is not allowed.", 403);

  try {
    const supabase = await createClient();
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) return errorResponse("Your session has ended. Please sign in again.", 401);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return errorResponse("Account deletion is not configured. Please contact support.", 500);

    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) return errorResponse("Unable to delete your account. Please try again.", 500);

    return NextResponse.json({ ok: true });
  } catch {
    return errorResponse("Unable to delete your account. Please try again.", 500);
  }
}
