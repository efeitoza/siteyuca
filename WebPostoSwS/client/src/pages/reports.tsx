import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Package, DollarSign, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type PeriodType = 'hour' | 'day' | 'week' | 'month';

export default function Reports() {
  const [period, setPeriod] = useState<PeriodType>('day');
  const [days, setDays] = useState(30);

  const { data: transactionsByPeriod, isLoading: loadingPeriod } = useQuery({
    queryKey: ['/api/analytics/transactions-by-period', period, days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/transactions-by-period?period=${period}&days=${days}`);
      return response.json();
    },
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery<Array<{
    productDescription: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }>>({
    queryKey: ['/api/analytics/top-products', days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/top-products?limit=10&days=${days}`);
      return response.json();
    },
  });

  const { data: successRate, isLoading: loadingSuccess } = useQuery({
    queryKey: ['/api/analytics/success-rate', days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/success-rate?days=${days}`);
      return response.json();
    },
  });

  const { data: revenueSummary, isLoading: loadingRevenue } = useQuery({
    queryKey: ['/api/analytics/revenue-summary', days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/revenue-summary?days=${days}`);
      return response.json();
    },
  });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const successRateData = successRate ? [
    { name: 'Bem Sucedidas', value: successRate.successful, color: COLORS[0] },
    { name: 'Falhadas', value: successRate.failed, color: COLORS[1] },
    { name: 'Pendentes', value: successRate.pending, color: COLORS[2] },
  ] : [];

  const isLoading = loadingPeriod || loadingProducts || loadingSuccess || loadingRevenue;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground" data-testid="text-reports-title">Relatórios Analíticos</h1>
            <p className="text-sm text-muted-foreground mt-1">Análise detalhada de transações e performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-32" data-testid="select-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card data-testid="card-revenue">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    R$ {revenueSummary?.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {revenueSummary?.transactionCount || 0} transações processadas
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-average">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-average-value">
                    R$ {revenueSummary?.averageTransactionValue?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por transação
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-success-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-success-rate">
                    {successRate?.successRate?.toFixed(1) || '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {successRate?.successful || 0} de {successRate?.total || 0} transações
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="transactions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="transactions" data-testid="tab-transactions">Transações</TabsTrigger>
                <TabsTrigger value="products" data-testid="tab-products">Produtos</TabsTrigger>
                <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <div>
                      <CardTitle>Volume de Transações</CardTitle>
                      <CardDescription>Análise temporal do volume de transações</CardDescription>
                    </div>
                    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                      <SelectTrigger className="w-32" data-testid="select-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Por hora</SelectItem>
                        <SelectItem value="day">Por dia</SelectItem>
                        <SelectItem value="week">Por semana</SelectItem>
                        <SelectItem value="month">Por mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={transactionsByPeriod || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="period" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke={COLORS[0]} 
                          name="Total"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="successful" 
                          stroke={COLORS[1]} 
                          name="Sucesso"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="failed" 
                          stroke={COLORS[2]} 
                          name="Falhas"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Produtos</CardTitle>
                    <CardDescription>Produtos mais vendidos por receita</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topProducts || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="productDescription" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          width={150}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="totalRevenue" 
                          fill={COLORS[0]} 
                          name="Receita (R$)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Status</CardTitle>
                    <CardDescription>Proporção de transações por status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={successRateData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {successRateData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
