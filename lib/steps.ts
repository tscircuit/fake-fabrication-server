import type { FabricationStage, FabricationStageSlug } from "./db/schema"

export const fabricationStageDefinitions: Array<{
  slug: FabricationStageSlug
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
    slug: "move_carrier_under_laser",
    name: "Move Carrier Under Laser",
    description: "Move the carrier to its position under the laser.",
  },
  {
    slug: "level_carrier",
    name: "Level Carrier",
    description: "Rotate the carrier to level the PCB.",
  },
  {
    slug: "top_alignment",
    name: "Top Alignment",
    description: "Run the top alignment LBRN and save the laser origin.",
  },
  {
    slug: "top_deoxidation",
    name: "Top Deoxidation",
    description: "Burn the top deoxidation pattern with the saved origin.",
  },
  {
    slug: "top_copper_fill",
    name: "Top Copper Fill",
    description: "Burn the top copper fill with the saved origin.",
  },
  {
    slug: "flip_board",
    name: "Flip Board",
    description: "Rotate the carrier to the bottom orientation.",
  },
  {
    slug: "bottom_alignment",
    name: "Bottom Alignment",
    description: "Run the bottom alignment LBRN and save the laser origin.",
  },
  {
    slug: "bottom_deoxidation",
    name: "Bottom Deoxidation",
    description: "Burn the bottom deoxidation pattern with the saved origin.",
  },
  {
    slug: "bottom_copper_fill",
    name: "Bottom Copper Fill",
    description: "Burn the bottom copper fill with the saved origin.",
  },
  {
    slug: "move_carrier_to_loading_position",
    name: "Move Carrier To Loading Position",
    description: "Move carrier to loading/loadout position.",
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

export const fabricationStageOrder: FabricationStageSlug[] =
  fabricationStageDefinitions.map((stage) => stage.slug)

export function buildInitialStages(): FabricationStage[] {
  return fabricationStageDefinitions.map((stage) => ({
    slug: stage.slug,
    name: stage.name,
    description: stage.description,
    status: "pending",
    started_at: null,
    completed_at: null,
  }))
}

export function getNextStage(
  current: FabricationStageSlug,
): FabricationStageSlug | null {
  const index = fabricationStageOrder.indexOf(current)
  if (index === -1 || index === fabricationStageOrder.length - 1) {
    return null
  }
  return fabricationStageOrder[index + 1] ?? null
}

export const fabricationStepDefinitions = fabricationStageDefinitions
export const fabricationStepOrder = fabricationStageOrder
export const buildInitialSteps = buildInitialStages
export const getNextStep = getNextStage
