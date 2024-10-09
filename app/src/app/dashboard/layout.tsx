import { Metadata } from "next";
import DashboardLayout from "./components/layout";

export const metadata: Metadata = {
  title: "ZK Campaign",
  description: "ZK Campaign",
};

interface ExamplesLayoutProps {
  children: React.ReactNode;
}

export default function ExamplesLayout({ children }: ExamplesLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
