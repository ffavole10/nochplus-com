import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, MapPin, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerLogo } from "@/components/CustomerLogo";
import { useCustomers, type Customer } from "@/hooks/useCustomers";

interface CompanyGridProps {
  onSelect: (customer: Customer) => void;
  onNewCustomer: () => void;
}

export function CompanyGrid({ onSelect, onNewCustomer }: CompanyGridProps) {
  const { data: customers = [], isLoading } = useCustomers();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.contact_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search by company name, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        {filtered.map((customer) => (
          <Card
            key={customer.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 group"
            onClick={() => onSelect(customer)}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <CustomerLogo
                logoUrl={customer.logo_url}
                companyName={customer.company}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {customer.company}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {customer.contact_name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {customer.ticket_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3" />
                      {customer.ticket_count} tickets
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* New Customer Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 border-dashed border-2"
          onClick={onNewCustomer}
        >
          <CardContent className="p-3 flex items-center justify-center gap-2 h-full min-h-[80px]">
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">New Customer</span>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 && search && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No customers match "{search}" —{" "}
          <button className="text-primary underline" onClick={onNewCustomer}>
            create a new customer
          </button>
        </p>
      )}
    </div>
  );
}
