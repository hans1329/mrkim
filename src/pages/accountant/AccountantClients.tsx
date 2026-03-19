import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Phone } from "lucide-react";
import { useAccountantData } from "@/hooks/useAccountantData";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountantProfile } from "@/hooks/useAccountantAuth";
import { useState } from "react";
import { AccountantClientDetail } from "@/components/accountant/AccountantClientDetail";

export default function AccountantClients() {
  const { accountant } = useOutletContext<{ accountant: AccountantProfile }>();
  const { clients, loading } = useAccountantData(accountant.id);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">담당 고객</h1>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (selectedUserId) {
    return (
      <AccountantClientDetail
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">담당 고객</h1>
        <Badge variant="secondary">{clients.length}명</Badge>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>아직 배정된 고객이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map(client => (
            <Card
              key={client.user_id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedUserId(client.user_id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {client.profile?.business_name || client.profile?.name || "미등록 사업자"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.profile?.business_type && (
                        <Badge variant="outline" className="text-xs">
                          {client.profile.business_type}
                        </Badge>
                      )}
                      {client.profile?.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.profile.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
