import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canValidateAdminAccess = Boolean(supabaseUrl && serviceRoleKey);

describe("SUPABASE_SERVICE_ROLE_KEY", () => {
  it.skipIf(!canValidateAdminAccess)(
    "can make a minimal server-side Supabase Admin request",
    async () => {
      const admin = createClient(supabaseUrl!, serviceRoleKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      expect(error).toBeNull();
    },
  );
});
