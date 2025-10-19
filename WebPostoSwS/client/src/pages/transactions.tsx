import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Filter } from "lucide-react";
import type { Transaction } from "@shared/schema";

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const filteredTransactions = transactions.filter(
    (t) =>
      t.codigoVenda.toLowerCase().includes(search.toLowerCase()) ||
      t.codigoEmpresa.toLowerCase().includes(search.toLowerCase()) ||
      (t.codigoVoucher && t.codigoVoucher.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" data-testid={`badge-status-sent`}>Enviado</Badge>;
      case "validated":
        return <Badge variant="secondary" data-testid={`badge-status-validated`}>Validado</Badge>;
      case "failed":
        return <Badge variant="destructive" data-testid={`badge-status-failed`}>Falha</Badge>;
      case "cancelled":
        return <Badge variant="outline" data-testid={`badge-status-cancelled`}>Cancelado</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-pending`}>Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
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
          <h1 className="text-3xl font-semibold text-foreground" data-testid="text-transactions-title">
            Transações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico completo de transações processadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Lista de Transações</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:flex-initial sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código de venda, empresa ou voucher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-transactions"
                  />
                </div>
                <Button variant="outline" size="icon" data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código Venda</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover-elevate" data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell className="font-mono text-sm font-medium">
                          {transaction.codigoVenda}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.codigoEmpresa}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {transaction.codigoVoucher || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.dataVenda && transaction.horaVenda
                            ? `${transaction.dataVenda} ${transaction.horaVenda}`
                            : new Date(transaction.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {transaction.retryCount || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTransaction(transaction)}
                            data-testid={`button-view-${transaction.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {search ? "Nenhuma transação encontrada" : "Nenhuma transação registrada"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search
                    ? "Tente ajustar os termos de busca"
                    : "As transações do WebPosto aparecerão aqui"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              Código de Venda: {selectedTransaction?.codigoVenda}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-sm font-mono mt-1">{selectedTransaction.codigoEmpresa}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voucher</p>
                  <p className="text-sm font-mono mt-1">{selectedTransaction.codigoVoucher || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID Transação</p>
                  <p className="text-sm font-mono mt-1">{selectedTransaction.idTransacao || "-"}</p>
                </div>
              </div>

              {selectedTransaction.tipoCodigo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de Código</p>
                  <Badge variant="outline">
                    {selectedTransaction.tipoCodigo === "D" ? "Desconto" :
                     selectedTransaction.tipoCodigo === "R" ? "Resgate CashBack" : "Pontuação"}
                  </Badge>
                </div>
              )}

              {selectedTransaction.errorMessage && (
                <div>
                  <p className="text-sm font-medium text-destructive mb-2">Mensagem de Erro</p>
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{selectedTransaction.errorMessage}</p>
                  </div>
                </div>
              )}

              {selectedTransaction.webpostoData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Dados WebPosto</p>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto font-mono">
                    {JSON.stringify(selectedTransaction.webpostoData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTransaction.swsData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Dados SwS</p>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto font-mono">
                    {JSON.stringify(selectedTransaction.swsData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
