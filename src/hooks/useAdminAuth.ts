import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/admin/login", { replace: true });
          return;
        }

        setUserId(user.id);

        // Check if user has admin role using the has_role function
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (error) throw error;

        if (!data) {
          // Not an admin, redirect to admin login
          navigate("/admin/login", { replace: true });
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin role:", error);
        navigate("/admin/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { isAdmin, loading, userId };
}
