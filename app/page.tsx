import { RunoHome } from "@/components/runo-home";
import { AccountWorkspace } from "@/components/account-workspace";
import { StartupLoadingProvider } from "@/components/startup-loading-provider";

export default function Home() {
  return (
    <StartupLoadingProvider>
      <AccountWorkspace>
        <RunoHome />
      </AccountWorkspace>
    </StartupLoadingProvider>
  );
}
