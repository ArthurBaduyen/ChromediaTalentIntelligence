import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function SvgBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgBase>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </SvgBase>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgBase>
  );
}

export function DotsVerticalIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="6" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="18" r="1.6" fill="currentColor" />
    </SvgBase>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m8 10 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8 14 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </SvgBase>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M5 5h6v6H5zM13 5h6v4h-6zM13 11h6v8h-6zM5 13h6v6H5z" stroke="currentColor" strokeWidth="1.6" />
    </SvgBase>
  );
}

export function CandidatesIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 18.5c.8-2.3 2.8-3.5 4.5-3.5 1.7 0 3.7 1.2 4.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 18.5c.6-1.7 1.9-2.5 3.2-2.5 1 0 2 .5 2.8 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgBase>
  );
}

export function SkillsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M7 5h10v14H7z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9h4M10 13h4M10 17h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 8h3M4 12h3M4 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="18" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.2 11 15.7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m8.2 13 7.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgBase>
  );
}

export function AuditIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5.8c-.6-.5-1.3-.9-2-1.1L14 3h-4l-.4 2.7c-.7.2-1.4.6-2 1.1l-2.5-.8-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-.8c.6.5 1.3.9 2 1.1L10 21h4l.4-2.7c.7-.2 1.4-.6 2-1.1l2.5.8 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgBase>
  );
}

export function UserCircleIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.7 16.5c.8-1.4 2-2.1 3.3-2.1 1.3 0 2.5.7 3.3 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M10 5h-2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgBase>
  );
}
