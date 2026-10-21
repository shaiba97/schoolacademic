import { Shell } from "@/components/layout/shell";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";

export default function ShellLayout({ children }: LayoutProps<"/">) {
  return (
    <Shell>
      <TenantLockedNotice />
      {children}
    </Shell>
  );
}
