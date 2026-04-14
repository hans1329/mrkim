import { WeatherAnchor } from "@/components/v2/WeatherAnchor";
import { StickyActions } from "@/components/v2/StickyActions";
import { SecretaryFeed } from "@/components/v2/SecretaryFeed";
import { VoiceBubble } from "@/components/v2/VoiceBubble";
import { V2Layout } from "@/components/v2/V2Layout";

const V2Dashboard = () => {
  return (
    <V2Layout>
      <WeatherAnchor />
      <StickyActions />
      <SecretaryFeed />
      <VoiceBubble />
    </V2Layout>
  );
};

export default V2Dashboard;
