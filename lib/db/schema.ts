import { z } from "zod"

export const fabricationStageSlugs = [
  "load_pcb",
  "clamp_pcb",
  "move_carrier_under_laser",
  "level_carrier",
  "top_alignment",
  "top_deoxidation",
  "top_copper_fill",
  "flip_board",
  "bottom_alignment",
  "bottom_deoxidation",
  "bottom_copper_fill",
  "move_carrier_to_loading_position",
  "release_pcb",
  "complete",
] as const

export const fabricationStageSlugSchema = z.enum(fabricationStageSlugs)
export type FabricationStageSlug = z.infer<typeof fabricationStageSlugSchema>

export const fabricationStageStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
])
export type FabricationStageStatus = z.infer<typeof fabricationStageStatusSchema>

export const fabricationStageSchema = z.object({
  slug: fabricationStageSlugSchema,
  name: z.string(),
  description: z.string(),
  status: fabricationStageStatusSchema,
  started_at: z.number().nullable(),
  completed_at: z.number().nullable(),
})
export type FabricationStage = z.infer<typeof fabricationStageSchema>

export const laserPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type LaserPosition = z.infer<typeof laserPositionSchema>

export const laserStateSchema = z.object({
  alignment_origin: laserPositionSchema.nullable(),
  position: laserPositionSchema,
  last_burn_lbrn: z.string().nullable(),
  last_burn_passes: z.number().nullable(),
  last_burn_origin: laserPositionSchema.nullable(),
  last_burn_file_content: z.string().nullable(),
  last_command_at: z.number().nullable(),
})
export type LaserState = z.infer<typeof laserStateSchema>

export const carrierPositionSchema = z.object({
  x: z.number(),
})
export type CarrierPosition = z.infer<typeof carrierPositionSchema>

export const carrierStateSchema = z.object({
  position: carrierPositionSchema,
  has_been_moved: z.boolean(),
  rotation_deg: z.number(),
  orientation: z.enum(["top", "bottom", "pcb_insertion", "pcb_drop"]).nullable(),
  clamp_position: z.number(),
  last_command_at: z.number().nullable(),
})
export type CarrierState = z.infer<typeof carrierStateSchema>

export const laserBurnRunSchema = z.object({
  laser_burn_run_id: z.string(),
  fabrication_job_id: z.string(),
  lbrn_vfs_path: z.string(),
  passes: z.number().int().positive(),
  origin: laserPositionSchema,
  file_content: z.string().nullable(),
  created: z.number(),
})
export type LaserBurnRun = z.infer<typeof laserBurnRunSchema>

export const jobStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
  "failed",
])
export type JobStatus = z.infer<typeof jobStatusSchema>

export const createJobMetadataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
)
export type CreateJobMetadata = z.infer<typeof createJobMetadataSchema>

export const jobMetadataSchema = z.record(z.string())
export type JobMetadata = z.infer<typeof jobMetadataSchema>

export type FilePath = string
export type FileContent = string

export const jobLbrnFilesSchema = z.record(z.string())
export type JobLbrnFiles = Record<FilePath, FileContent>

export const jobSchema = z.object({
  id: z.string(),
  object: z.literal("fabrication.job"),
  created: z.number(),
  status: jobStatusSchema,
  current_stage: fabricationStageSlugSchema.nullable(),
  stages: z.array(fabricationStageSchema),
  laser: laserStateSchema,
  carrier: carrierStateSchema,
  lbrn_files: jobLbrnFilesSchema,
  top_alignment_origin: laserPositionSchema.nullable(),
  bottom_alignment_origin: laserPositionSchema.nullable(),
  metadata: jobMetadataSchema,
})
export type Job = z.infer<typeof jobSchema>

export const createJobRequestSchema = z.object({
  metadata: createJobMetadataSchema.optional(),
  lbrn_files: jobLbrnFilesSchema,
})
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>

export const laserSetOriginRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    origin: laserPositionSchema,
  })
  .strict()
export type LaserSetOriginRequest = z.infer<typeof laserSetOriginRequestSchema>

export const laserMoveRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    dx: z.number(),
    dy: z.number(),
  })
  .strict()
export type LaserMoveRequest = z.infer<typeof laserMoveRequestSchema>

export const laserBurnRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    lbrn_vfs_path: z.string(),
    passes: z.number().int().positive().optional(),
  })
  .strict()
export type LaserBurnRequest = z.infer<typeof laserBurnRequestSchema>

export const laserResponseSchema = z
  .object({
    fabrication_job_id: z.string(),
    laser: laserStateSchema,
    laser_burn_run: laserBurnRunSchema.optional(),
  })
  .passthrough()
export type LaserResponse = z.infer<typeof laserResponseSchema>

export const carrierMoveRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    x: z.number(),
  })
  .strict()
export type CarrierMoveRequest = z.infer<typeof carrierMoveRequestSchema>

export const carrierRotateRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    angle_deg: z.number(),
  })
  .strict()
export type CarrierRotateRequest = z.infer<typeof carrierRotateRequestSchema>

export const carrierRotateToOrientationRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
    orientation: z.enum(["top", "bottom", "pcb_insertion", "pcb_drop"]),
  })
  .strict()
export type CarrierRotateToOrientationRequest = z.infer<
  typeof carrierRotateToOrientationRequestSchema
>

export const carrierClampRequestSchema = z
  .object({
    fabrication_job_id: z.string(),
  })
  .strict()
export type CarrierClampRequest = z.infer<typeof carrierClampRequestSchema>

export const carrierResponseSchema = z.object({
  fabrication_job_id: z.string(),
  carrier: carrierStateSchema,
})
export type CarrierResponse = z.infer<typeof carrierResponseSchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(1),
  jobs: z.array(jobSchema).default([]),
  laserBurnRuns: z.array(laserBurnRunSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>

export const jobResponseSchema = z.object({
  fabrication_job: jobSchema,
})
export type JobResponse = z.infer<typeof jobResponseSchema>

export const jobsListResponseSchema = z.object({
  fabrication_jobs: z.array(jobSchema),
})
export type JobsListResponse = z.infer<typeof jobsListResponseSchema>

export const laserBurnRunResponseSchema = z.object({
  laser_burn_run: laserBurnRunSchema,
})
export type LaserBurnRunResponse = z.infer<typeof laserBurnRunResponseSchema>

export const laserBurnRunsListResponseSchema = z.object({
  laser_burn_runs: z.array(laserBurnRunSchema),
})
export type LaserBurnRunsListResponse = z.infer<
  typeof laserBurnRunsListResponseSchema
>

export type FabricationStepSlug = FabricationStageSlug
export type FabricationStep = FabricationStage
export type FabricationStepStatus = FabricationStageStatus
export type LaserAlignmentRequest = LaserSetOriginRequest
