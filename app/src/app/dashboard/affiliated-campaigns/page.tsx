"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AffiliatedCampaignsTable from "@/components/affiliated-campaign-table";

export default function DashboardPage() {
  return (
    <div className="p-8 pt-6">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle>Affiliated campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliatedCampaignsTable />
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
