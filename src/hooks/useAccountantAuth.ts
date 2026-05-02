import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export interface AccountantProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  firm_name: string | null;
  specialties: string[];
  industry_types: string[];
  region: string | null;
  bio: string | null;
  profile_image_url: string | null;
}

export function useAccountantAuth() {
  const [accountant, setAccountant] = useState<AccountantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/accountant/login", { replace: true });
          return;
        }

        // First try by user_id
        let { data, error } = await supabase
          .from("tax_accountants")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // If not found, try by email and link user_id
        if (!data && user.email) {
          const { data: emailMatch } = await supabase
            .from("tax_accountants")
            .select("*")
            .eq("email", user.email)
            .is("user_id", null)
            .maybeSingle();

          if (emailMatch) {
            await supabase
              .from("tax_accountants")
              .update({ user_id: user.id })
              .eq("id", emailMatch.id);
            data = { ...emailMatch, user_id: user.id };
          }
        }

        if (error || !data) {
          navigate("/accountant/login", { replace: true });
          return;
        }

        setAccountant(data as unknown as AccountantProfile);
      } catch {
        navigate("/accountant/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { accountant, loading };
}
