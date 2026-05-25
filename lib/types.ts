export type {
  CarrierClampRequest,
  CarrierMoveRequest,
  CarrierPosition,
  CarrierResponse,
  CarrierRotateRequest,
  CarrierRotateToOrientationRequest,
  CarrierState,
  CreateJobRequest,
  CreateJobMetadata,
  FabricationStage,
  FabricationStageSlug,
  FabricationStageStatus,
  FabricationStep,
  FabricationStepSlug,
  FabricationStepStatus,
  Job,
  JobLbrnFiles,
  JobMetadata,
  JobStatus,
  LaserBurnRun,
  LaserBurnRunResponse,
  LaserBurnRunsListResponse,
  LaserBurnRequest,
  LaserAlignmentRequest,
  LaserSetOriginRequest,
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
