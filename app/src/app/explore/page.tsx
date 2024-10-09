import { CampaignCard } from "@/components/campaign-card";
import { HomeView } from "@/components/home-view";

export default function Home() {
  return (
    <div className="w-full grid grid-cols-3 gap-6 py-10">
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
      <CampaignCard />
    </div>
  );
}
