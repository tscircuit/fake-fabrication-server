import type { FabricationStep, FabricationStepSlug } from "./db/schema"

export const fabricationStepDefinitions: Array<{
  slug: FabricationStepSlug
  name: string
  description: string
}> = [
  {
    slug: "load_pcb",
    name: "Load PCB",
    description: "Place the copper board on the bed and load its lbrn files.",
  },
  {
    slug: "clamp_pcb",
    name: "Clamp PCB",
    description: "Tighten the carrier clamp until the PCB is secured.",
  },
  {
    slug: "position_carrier",
    name: "Position Carrier",
    description: "Move the carrier to its working position.",
  },
  {
    slug: "level_carrier",
    name: "Level Carrier",
    description: "Rotate the carrier to level the PCB.",
  },
  {
    slug: "top_alignment",
    name: "Top Alignment",
    description:
      "Run the top alignment LBRN and save the relative laser offset on the job.",
  },
  {
    slug: "top_deoxidation",
    name: "Top Deoxidation",
    description: "Burn the top deoxidation pattern with the saved offset.",
  },
  {
    slug: "top_copper_fill",
    name: "Top Copper Fill",
    description: "Burn the top copper fill with the saved offset.",
  },
  {
    slug: "flip_board",
    name: "Flip Board",
    description: "Rotate the carrier to flip the PCB for bottom processing.",
  },
  {
    slug: "bottom_alignment",
    name: "Bottom Alignment",
    description:
      "Run the bottom alignment LBRN and save the relative laser offset on the job.",
  },
  {
    slug: "bottom_deoxidation",
    name: "Bottom Deoxidation",
    description: "Burn the bottom deoxidation pattern with the saved offset.",
  },
  {
    slug: "bottom_copper_fill",
    name: "Bottom Copper Fill",
    description: "Burn the bottom copper fill with the saved offset.",
  },
  {
    slug: "release_pcb",
    name: "Release PCB",
    description:
      "Move the carrier to the drop position, rotate it, and unclamp the PCB.",
  },
  {
    slug: "complete",
    name: "Complete",
    description: "Job outputs are ready.",
  },
]

export const fabricationStepOrder: FabricationStepSlug[] =
  fabricationStepDefinitions.map((step) => step.slug)

export function buildInitialSteps(): FabricationStep[] {
  return fabricationStepDefinitions.map((step) => ({
    slug: step.slug,
    name: step.name,
    description: step.description,
    status: "pending",
    started_at: null,
    completed_at: null,
  }))
}

export function getNextStep(
  current: FabricationStepSlug,
): FabricationStepSlug | null {
  const index = fabricationStepOrder.indexOf(current)
  if (index === -1 || index === fabricationStepOrder.length - 1) {
    return null
  }
  return fabricationStepOrder[index + 1] ?? null
}
