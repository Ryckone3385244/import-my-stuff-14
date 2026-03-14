import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, Eye, EyeOff, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AdminCredentialsLog = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["credentials-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credentials_log")
        .select("*")
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.entity_name.toLowerCase().includes(q) ||
      log.email.toLowerCase().includes(q);
    const matchesType =
      typeFilter === "all" || log.entity_type === typeFilter;
    const matchesAction =
      actionFilter === "all" || log.generation_type === actionFilter;
    return matchesSearch && matchesType && matchesAction;
  });

  const handleExport = () => {
    if (!filtered.length) {
      toast.error("No records to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((c) => ({
        Type: c.entity_type,
        Name: c.entity_name,
        Email: c.email,
        Password: c.password_plain,
        Action: c.generation_type,
        Date: format(new Date(c.generated_at), "dd/MM/yyyy HH:mm"),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    XLSX.writeFile(wb, `credentials-log-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success(`Exported ${filtered.length} records`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-muted-foreground" />
          <div>
            <h3 className="text-xl font-bold uppercase tracking-wide">Credentials Log</h3>
            <p className="text-sm text-muted-foreground">
              History of all generated and reset portal credentials
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="exhibitor">Exhibitor</SelectItem>
            <SelectItem value="speaker">Speaker</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="reset">Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No credentials found</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Login Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge
                      variant={log.entity_type === "exhibitor" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.entity_name}</TableCell>
                  <TableCell className="text-muted-foreground">{log.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {visiblePasswords.has(log.id)
                          ? log.password_plain
                          : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePassword(log.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {visiblePasswords.has(log.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="capitalize"
                    >
                      {log.generation_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.generated_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
