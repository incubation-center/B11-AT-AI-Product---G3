"use client";

type BillRow = {
  id: string;
  serviceName: string;
  amount: number;
  billDate: string;
  dueDate: string | null;
  invoiceType: string;
};

type Props = {
  bills: BillRow[];
};

function toBillsCSV(bills: BillRow[]): string {
  const header = ["ID", "Service", "Amount (USD)", "Bill Date", "Due Date", "Type"];
  const rows = bills.map((b) => [
    b.id,
    `"${b.serviceName.replace(/"/g, '""')}"`,
    b.amount.toFixed(2),
    b.billDate,
    b.dueDate ?? "",
    b.invoiceType,
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export default function ExportCsvButton({ bills }: Props) {
  function handleExport() {
    const csv = toBillsCSV(bills);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      Export CSV
    </button>
  );
}
