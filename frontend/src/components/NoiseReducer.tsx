// src/components/OnsetEditor.tsx
import { Construction, Zap } from "lucide-react";

import { Card, EmptyState, ModuleTemplate } from "./UI";

export default function NoiseReducer() {
  return (
    <ModuleTemplate
      icon={Zap}
      title="Titulo X"
      subtitle="Módulo X"
    >
      <Card title="Editor" subtitle="Pendiente de implementación">
        <EmptyState
          icon={Construction}
          title="Módulo en construcción"
          description="(Pendiente de implementación)"
        />
      </Card>
    </ModuleTemplate>
  );
}