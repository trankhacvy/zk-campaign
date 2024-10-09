"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import CampaignTable from "@/components/campaign-table";

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex flex-row justify-between">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription className="mt-2">
              Manage your campaigns and view their performance.
            </CardDescription>
          </div>
          <Link href="/dashboard/new">
            <Button>New Campaign</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <CampaignTable />
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-10</strong> of <strong>32</strong> products
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
