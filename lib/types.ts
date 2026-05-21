export type {
  CarrierClampRequest,
  CarrierMoveRequest,
  CarrierPosition,
  CarrierResponse,
  CarrierRotateRequest,
  CarrierState,
  CreateJobRequest,
  CreateJobMetadata,
  FabricationStep,
  FabricationStepSlug,
  FabricationStepStatus,
  Job,
  JobLbrnFiles,
  JobMetadata,
  JobStatus,
  LaserBurnRequest,
  LaserAlignmentRequest,
  LaserMoveRequest,
  LaserPosition,
  LaserResponse,
  LaserState,
} from "./db/schema"

export type FabricationServerOptions = {
  hostname?: string
  port?: number
}

export type AppContext = {
  db: import("./db/db-client").DbClient
}
