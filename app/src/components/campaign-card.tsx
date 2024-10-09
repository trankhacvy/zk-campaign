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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconRight } from "react-day-picker";

export function CampaignCard() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>
          <div className="aspect-square rounded-md overflow-hidden">
            <img
              alt="logo"
              className="w-full h-full object-cover"
              src="https://api-prod-minimal-v610.pages.dev/assets/images/cover/cover-8.webp"
            />
          </div>
        </CardTitle>
        <CardDescription hidden>
          Enter your email below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="">
        <h2 className="text-3xl font-semibold tracking-tight transition-colors">
          The King's Plan
        </h2>
      </CardContent>
      <CardFooter>
        <div className="flex w-full space-x-2">
          <Input value="http://example.com/link/to/document" readOnly />
          <Button variant="secondary" className="shrink-0">
            Copy Link
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
