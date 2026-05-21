import { z } from "zod"

export const fabricationStepSlugs = [
  "load_pcb",
  "clamp_pcb",
  "position_carrier",
  "level_carrier",
  "top_alignment",
  "top_deoxidation",
  "top_copper_fill",
  "flip_board",
  "bottom_alignment",
  "bottom_deoxidation",
  "bottom_copper_fill",
  "release_pcb",
  "complete",
] as const

export const fabricationStepSlugSchema = z.enum(fabricationStepSlugs)
export type FabricationStepSlug = z.infer<typeof fabricationStepSlugSchema>

export const fabricationStepStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
])
export type FabricationStepStatus = z.infer<typeof fabricationStepStatusSchema>

export const fabricationStepSchema = z.object({
  slug: fabricationStepSlugSchema,
  name: z.string(),
  description: z.string(),
  status: fabricationStepStatusSchema,
  started_at: z.number().nullable(),
  completed_at: z.number().nullable(),
})
export type FabricationStep = z.infer<typeof fabricationStepSchema>

export const laserPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type LaserPosition = z.infer<typeof laserPositionSchema>

export const laserStateSchema = z.object({
  alignment_on: z.boolean(),
  alignment_lbrn: z.string().nullable(),
  alignment_origin: laserPositionSchema.nullable(),
  position: laserPositionSchema,
  last_burn_lbrn: z.string().nullable(),
  last_burn_passes: z.number().nullable(),
  last_burn_offset: laserPositionSchema.nullable(),
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
  has_been_positioned: z.boolean(),
  rotation_deg: z.number(),
  has_been_rotated: z.boolean(),
  clamp_position: z.number(),
  last_command_at: z.number().nullable(),
})
export type CarrierState = z.infer<typeof carrierStateSchema>

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

export const jobLbrnFilesSchema = z
  .object({
    top_alignment: z.string(),
    bottom_alignment: z.string(),
    top_deoxidation: z.string(),
    top_copper_fill: z.string(),
    bottom_deoxidation: z.string(),
    bottom_copper_fill: z.string(),
  })
  .strict()
export type JobLbrnFiles = z.infer<typeof jobLbrnFilesSchema>

export const jobSchema = z.object({
  id: z.string(),
  object: z.literal("fabrication.job"),
  created: z.number(),
  status: jobStatusSchema,
  current_step: fabricationStepSlugSchema.nullable(),
  steps: z.array(fabricationStepSchema),
  laser: laserStateSchema,
  carrier: carrierStateSchema,
  lbrn_files: jobLbrnFilesSchema,
  top_alignment_offset: laserPositionSchema.nullable(),
  bottom_alignment_offset: laserPositionSchema.nullable(),
  metadata: jobMetadataSchema,
})
export type Job = z.infer<typeof jobSchema>

export const createJobRequestSchema = z.object({
  metadata: createJobMetadataSchema.optional(),
  lbrn_files: jobLbrnFilesSchema,
})
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>

export const laserAlignmentRequestSchema = z
  .object({
    job_id: z.string(),
    lbrn: z.string(),
    on: z.boolean(),
  })
  .strict()
export type LaserAlignmentRequest = z.infer<typeof laserAlignmentRequestSchema>

export const laserMoveRequestSchema = z
  .object({
    job_id: z.string(),
    dx: z.number(),
    dy: z.number(),
  })
  .strict()
export type LaserMoveRequest = z.infer<typeof laserMoveRequestSchema>

export const laserBurnRequestSchema = z
  .object({
    job_id: z.string(),
    lbrn: z.string(),
    passes: z.number().int().positive().optional(),
  })
  .strict()
export type LaserBurnRequest = z.infer<typeof laserBurnRequestSchema>

export const laserResponseSchema = z.object({
  ok: z.literal(true),
  job_id: z.string(),
  laser: laserStateSchema,
})
export type LaserResponse = z.infer<typeof laserResponseSchema>

export const carrierMoveRequestSchema = z
  .object({
    job_id: z.string(),
    x: z.number().optional(),
    dx: z.number().optional(),
  })
  .strict()
  .refine((body) => (body.x == null) !== (body.dx == null), {
    message: "Provide exactly one of x or dx",
  })
export type CarrierMoveRequest = z.infer<typeof carrierMoveRequestSchema>

export const carrierRotateRequestSchema = z
  .object({
    job_id: z.string(),
    delta_deg: z.number().optional(),
    angle_deg: z.number().optional(),
  })
  .strict()
  .refine((body) => (body.delta_deg == null) !== (body.angle_deg == null), {
    message: "Provide exactly one of delta_deg or angle_deg",
  })
export type CarrierRotateRequest = z.infer<typeof carrierRotateRequestSchema>

export const carrierClampRequestSchema = z
  .object({
    job_id: z.string(),
    delta: z.number(),
  })
  .strict()
export type CarrierClampRequest = z.infer<typeof carrierClampRequestSchema>

export const carrierResponseSchema = z.object({
  ok: z.literal(true),
  job_id: z.string(),
  carrier: carrierStateSchema,
})
export type CarrierResponse = z.infer<typeof carrierResponseSchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(1),
  jobs: z.array(jobSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
