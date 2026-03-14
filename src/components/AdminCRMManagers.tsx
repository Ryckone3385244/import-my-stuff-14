import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";

interface CRMManager {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  meeting_url: string | null;
  // Visibility fields from customer_managers (synced)
  is_active: boolean;
  show_email: boolean;
  show_calendly: boolean;
  customer_manager_id: string | null;
}

export const AdminCRMManagers = () => {
  const queryClient = useQueryClient();

  const { data: managers = [], isLoading } = useQuery({
    queryKey: ["crm_managers_from_roles"],
    queryFn: async () => {
      // 1. Get all users with customer_service role
      const { data: csRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer_service");

      if (rolesError) throw rolesError;
      if (!csRoles || csRoles.length === 0) return [];

      const userIds = csRoles.map((r) => r.user_id);

      // 2. Get their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // 3. Get matching customer_managers rows for visibility toggles
      const { data: cmRows, error: cmError } = await supabase
        .from("customer_managers")
        .select("*");

      if (cmError) throw cmError;

      // Match by email (case-insensitive)
      const cmByEmail = new Map(
        (cmRows || []).map((cm) => [cm.email.toLowerCase(), cm])
      );

      // Build merged list
      const result: CRMManager[] = (profiles || []).map((profile) => {
        const cm = profile.email
          ? cmByEmail.get(profile.email.toLowerCase())
          : undefined;

        return {
          id: profile.id,
          user_id: profile.user_id,
          display_name: profile.display_name,
          email: profile.email,
          phone: profile.phone,
          role_title: profile.role_title,
          meeting_url: profile.meeting_url,
          is_active: cm?.is_active ?? false,
          show_email: cm?.show_email ?? false,
          show_calendly: cm?.show_calendly ?? false,
          customer_manager_id: cm?.id ?? null,
        };
      });

      return result;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      manager,
      field,
      value,
    }: {
      manager: CRMManager;
      field: string;
      value: boolean;
    }) => {
      if (manager.customer_manager_id) {
        // Update existing customer_managers row
        const { error } = await supabase
          .from("customer_managers")
          .update({ [field]: value })
          .eq("id", manager.customer_manager_id);
        if (error) throw error;
      } else {
        // Create a new customer_managers row for this user
        const { error } = await supabase.from("customer_managers").insert({
          name: manager.display_name || "Unknown",
          email: manager.email || "",
          phone: manager.phone || "",
          role: manager.role_title || "Customer Service Manager",
          meeting_url: manager.meeting_url,
          [field]: value,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_managers_from_roles"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Client Relations Managers
        </CardTitle>
        <CardDescription>
          Showing users with the Client Relations role. Control which managers are displayed in the exhibitor portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {managers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users with the Client Relations role found. Add them via Admin &gt; Users.
          </p>
        )}

        {managers.map((manager) => (
          <div key={manager.id} className="border rounded-lg p-4 space-y-3">
            <div>
              <h4 className="font-semibold">
                {manager.display_name || "Unnamed"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {manager.email || "No email"}
              </p>
              {manager.role_title && (
                <p className="text-xs text-muted-foreground">
                  {manager.role_title}
                </p>
              )}
              {manager.meeting_url && (
                <p className="text-xs text-muted-foreground">
                  Meeting URL configured
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={manager.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({
                      manager,
                      field: "is_active",
                      value: checked,
                    })
                  }
                />
                <Label className="text-sm">Show in Portal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={manager.show_email}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({
                      manager,
                      field: "show_email",
                      value: checked,
                    })
                  }
                />
                <Label className="text-sm">Show Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={manager.show_calendly}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({
                      manager,
                      field: "show_calendly",
                      value: checked,
                    })
                  }
                />
                <Label className="text-sm">Show Calendly</Label>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
