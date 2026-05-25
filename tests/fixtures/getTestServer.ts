import { afterEach, expect } from "bun:test"
import ky from "ky"
import {
  FabricationServer,
  fabricationStageOrder,
  type CarrierResponse,
  type FabricationStageSlug,
  type Job,
  type JobLbrnFiles,
  type LaserResponse,
} from "../../lib/index"

export {
  fabricationStageOrder,
  type CarrierResponse,
  type FabricationStageSlug,
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

const FAKE_LBRN_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<LightBurnProject AppVersion="1.7.00" FormatVersion="1" MaterialHeight="0" MirrorX="False" MirrorY="False">
</LightBurnProject>`

export const testLbrnFiles = {
  top_alignment: FAKE_LBRN_CONTENT,
  bottom_alignment: FAKE_LBRN_CONTENT,
  top_deoxidation: FAKE_LBRN_CONTENT,
  top_copper_fill: FAKE_LBRN_CONTENT,
  bottom_deoxidation: FAKE_LBRN_CONTENT,
  bottom_copper_fill: FAKE_LBRN_CONTENT,
} satisfies JobLbrnFiles

export async function createTestJob(ky: TestKy): Promise<Job> {
  const response = await ky.post("fabrication_jobs/create", {
    json: { lbrn_files: testLbrnFiles },
  })
  expect(response.status).toBe(200)
  return response.json<Job>()
}
