import { afterEach, expect } from "bun:test"
import ky from "ky"
import {
  FabricationServer,
  fabricationStepOrder,
  type CarrierResponse,
  type FabricationStepSlug,
  type Job,
  type JobLbrnFiles,
  type LaserResponse,
} from "../../lib/index"

export {
  fabricationStepOrder,
  type CarrierResponse,
  type FabricationStepSlug,
  type Job,
  type JobLbrnFiles,
  type LaserResponse,
}

type TestApi = ReturnType<typeof ky.create>
export type TestKy = TestApi
export type TestServer = FabricationServer
export type TestServerContext = {
  server: TestServer
  ky: TestKy
}

const testServers = new Set<FabricationServer>()

afterEach(async () => {
  await Promise.all([...testServers].map((server) => server.stop()))
  testServers.clear()
})

export async function getTestServer(): Promise<TestServerContext> {
  const server = new FabricationServer()
  await server.start()
  testServers.add(server)
  return {
    server,
    ky: ky.create({
      prefixUrl: server.url,
      throwHttpErrors: false,
    }),
  }
}

export const testLbrnFiles: JobLbrnFiles = {
  top_alignment: "https://fake-r2.tscircuit.com/job_abc/top-alignment.lbrn",
  bottom_alignment:
    "https://fake-r2.tscircuit.com/job_abc/bottom-alignment.lbrn",
  top_deoxidation: "https://fake-r2.tscircuit.com/job_abc/top-deoxidation.lbrn",
  top_copper_fill: "https://fake-r2.tscircuit.com/job_abc/top-copper-fill.lbrn",
  bottom_deoxidation:
    "https://fake-r2.tscircuit.com/job_abc/bottom-deoxidation.lbrn",
  bottom_copper_fill:
    "https://fake-r2.tscircuit.com/job_abc/bottom-copper-fill.lbrn",
}

export async function createTestJob(ky: TestKy): Promise<Job> {
  const response = await ky.post("fabrication_jobs/create", {
    json: { lbrn_files: testLbrnFiles },
  })
  expect(response.status).toBe(200)
  return response.json<Job>()
}
