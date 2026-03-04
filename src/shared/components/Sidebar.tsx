import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type NavItem = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  to?: string;
  onClick?: () => void;
};

type SidebarProps = {
  topItems: NavItem[];
  bottomItems: NavItem[];
  logo: ReactNode;
};

function NavItemView({ item }: { item: NavItem }) {
  const baseClass =
    "mx-2 flex h-14 items-center gap-2 rounded-lg px-6 text-left font-medium text-text-secondary";
  const activeClass = item.active ? "bg-action-secondary px-4 text-text-primary" : "bg-transparent";
  const className = `${baseClass} ${activeClass}`;

  const content = (
    <>
      <span className="h-5 w-5 text-current">{item.icon}</span>
      <span className="text-base leading-6">{item.label}</span>
    </>
  );

  if (!item.to) {
    return (
      <button key={item.label} type="button" className={className} onClick={item.onClick}>
        {content}
      </button>
    );
  }

  return (
    <NavLink key={item.label} to={item.to} className={className}>
      {content}
    </NavLink>
  );
}

export function Sidebar({ topItems, bottomItems, logo }: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col bg-surface-app py-8" aria-label="Main navigation">
      <div className="mb-2 flex h-[38px] items-center justify-center px-4 py-2">{logo}</div>

      <nav className="flex flex-col pt-8">{topItems.map((item) => <NavItemView key={item.label} item={item} />)}</nav>

      <nav className="mt-auto flex flex-col gap-2">
        {bottomItems.map((item) => <NavItemView key={item.label} item={item} />)}
      </nav>
    </aside>
  );
}
