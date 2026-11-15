// frontend/src/App.tsx
import { useState } from "react";
import type { ReactNode } from "react";

import MainLayout from "./layouts/MainLayout";
import type { TabId } from "./layouts/tabs";
import { ActiveAudioProvider } from "./context/ActiveAudioProvider";
import HomeDashboard from "./components/HomeDashboard";
import OnsetEditor from "./components/OnsetEditor";
import PitchStretchPanel from "./components/PitchStretchPanel";
import NoiseReducer from "./components/NoiseReducer";
import ClusterExplorer from "./components/ClusterExplorer";

function renderTab(tab: TabId, navigate: (tab: TabId) => void): ReactNode {
  switch (tab) {
    case "home":
      return <HomeDashboard onNavigate={navigate} />;
    case "onset":
      return <OnsetEditor />;
    case "vocoder":
      return <PitchStretchPanel />;
    case "noise":
      return <NoiseReducer />;
    case "cluster":
      return <ClusterExplorer />;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <ActiveAudioProvider>
      <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTab(activeTab, setActiveTab)}
      </MainLayout>
    </ActiveAudioProvider>
  );
}