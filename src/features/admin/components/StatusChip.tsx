type Status = "Active" | "Inactive" | "Pending";

type StatusChipProps = {
  status: Status;
};

const statusClass: Record<Status, string> = {
  Active: "bg-[#ecfdf3] text-[#027a48]",
  Inactive: "bg-[#fef3f2] text-[#b42318]",
  Pending: "bg-[#fffaeb] text-[#b54708]"
};

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span
      className={`inline-flex rounded-2xl px-2 py-0.5 text-xs font-medium leading-[18px] ${statusClass[status]}`}
    >
      {status}
    </span>
  );
}
