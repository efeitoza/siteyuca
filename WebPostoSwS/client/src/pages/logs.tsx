import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertCircle, Info, AlertTriangle, Bug, ScrollText } from "lucide-react";
import type { IntegrationLog } from "@shared/schema";

export default function Logs() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery<IntegrationLog[]>({
    queryKey: ["/api/logs"],
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-chart-3" />;
      case "debug":
        return <Bug className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-chart-3 text-chart-3">Aviso</Badge>;
      case "debug":
        return <Badge variant="secondary">Debug</Badge>;
      default:
        return <Badge variant="default">Info</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "webposto":
        return <Badge variant="outline">WebPosto</Badge>;
      case "sws":
        return <Badge variant="outline">SwS</Badge>;
      default:
        return <Badge variant="outline">Sistema</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground" data-testid="text-logs-title">
            Logs de Integração
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rastreamento detalhado de todas as operações
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Registro de Eventos</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar em logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-logs"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-level-filter">
                    <SelectValue placeholder="Nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-source-filter">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="webposto">WebPosto</SelectItem>
                    <SelectItem value="sws">SwS</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 p-4 rounded-md border border-border hover-elevate"
                    data-testid={`log-${log.id}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getLevelBadge(log.level)}
                        {getSourceBadge(log.source)}
                        <Badge variant="secondary" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{log.message}</p>
                      {log.details && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-primary hover:underline">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {search || levelFilter !== "all" || sourceFilter !== "all"
                    ? "Nenhum log encontrado"
                    : "Nenhum log registrado ainda"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || levelFilter !== "all" || sourceFilter !== "all"
                    ? "Tente ajustar os filtros"
                    : "Os logs de integração aparecerão aqui"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
