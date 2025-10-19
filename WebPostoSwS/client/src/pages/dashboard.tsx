import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  recentTransactions: any[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral das integrações WebPosto-SwS</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Transações",
      value: stats?.totalTransactions || 0,
      description: "Desde o início",
      icon: Activity,
      color: "text-primary",
    },
    {
      title: "Bem Sucedidas",
      value: stats?.successfulTransactions || 0,
      description: "Enviadas para SwS",
      icon: CheckCircle2,
      color: "text-chart-2",
    },
    {
      title: "Falhas",
      value: stats?.failedTransactions || 0,
      description: "Erro no processamento",
      icon: XCircle,
      color: "text-destructive",
    },
    {
      title: "Pendentes",
      value: stats?.pendingTransactions || 0,
      description: "Aguardando envio",
      icon: Clock,
      color: "text-chart-3",
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral das integrações WebPosto-SwS</p>
          </div>
          <Link href="/settings">
            <Button variant="outline" data-testid="button-configure">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Configurar Integração
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="hover-elevate" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-foreground" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transações Recentes</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Últimas transações processadas</p>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" data-testid="button-view-all">
                  Ver Todas
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentTransactions.map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-md border border-border hover-elevate"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-sm font-medium text-foreground">
                          {transaction.codigoVenda}
                        </p>
                        <Badge
                          variant={
                            transaction.status === "sent" ? "default" :
                            transaction.status === "failed" ? "destructive" :
                            "secondary"
                          }
                          data-testid={`status-${transaction.id}`}
                        >
                          {transaction.status === "sent" ? "Enviado" :
                           transaction.status === "failed" ? "Falha" :
                           transaction.status === "validated" ? "Validado" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.codigoEmpresa} • {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {transaction.errorMessage && (
                      <p className="text-xs text-destructive max-w-xs truncate">
                        {transaction.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">As transações aparecerão aqui quando forem processadas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
