import { join } from "node:path"
import { createServer } from "node:net"
import { createDatabase, type DbClient } from "./db/db-client"
import type { FabricationServerOptions, Job } from "./types"
import type { Middleware, WinterSpecRouteBundle } from "winterspec"
import { createWinterSpecBundleFromDir } from "winterspec/adapters/node"

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
  FabricationServerOptions,
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
} from "./types"

export {
  fabricationStageDefinitions,
  fabricationStageOrder,
  fabricationStepDefinitions,
  fabricationStepOrder,
} from "./steps"

export class FabricationServer {
  readonly hostname: string
  readonly port: number
  server: Bun.Server<Record<string, unknown>> | undefined
  serverUrl: string | undefined
  db: DbClient
  private winterspecBundle: WinterSpecRouteBundle | undefined

  constructor(options: FabricationServerOptions = {}) {
    this.hostname = options.hostname ?? "127.0.0.1"
    this.port = options.port ?? 0
    this.db = createDatabase()
  }

  get jobs(): Map<string, Job> {
    return this.db.getJobsMap()
  }

  get url(): string {
    if (this.serverUrl == null) {
      throw new Error("FabricationServer has not been started")
    }
    return this.serverUrl
  }

  async start(): Promise<string> {
    if (this.server != null) {
      return this.url
    }

    let port = this.port
    if (port === 0) {
      port = await getAvailablePort(this.hostname)
    }

    this.server = Bun.serve({
      hostname: this.hostname,
      port,
      fetch: this.handleRequest,
    })
    this.serverUrl = `http://${this.hostname}:${this.server.port}`

    return this.url
  }

  async stop(): Promise<void> {
    this.server?.stop(true)
    this.server = undefined
    this.serverUrl = undefined
    this.db.clearJobs()
  }

  handleRequest = async (request: Request): Promise<Response> => {
    const bundle = await this.getWinterSpecBundle()
    return bundle.makeRequest(request, {
      middleware: [this.getDbMiddleware()],
    })
  }

  private async getWinterSpecBundle(): Promise<WinterSpecRouteBundle> {
    this.winterspecBundle ??= await createWinterSpecBundleFromDir(
      join(import.meta.dir, "../routes"),
    )
    return this.winterspecBundle
  }

  private getDbMiddleware(): Middleware {
    return async (req, ctx, next) => {
      ;(ctx as { db?: DbClient }).db = this.db
      return next(req, ctx)
    }
  }
}

function getAvailablePort(hostname: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on("error", reject)
    server.listen(0, hostname, () => {
      const address = server.address()
      if (typeof address === "string" || address == null) {
        server.close(() => reject(new Error("Could not allocate a test port")))
        return
      }

      server.close(() => resolve(address.port))
    })
  })
}
