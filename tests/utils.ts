import { afterEach } from "bun:test"
import { FabricationServer, type Job, type JobLbrnFiles } from "../lib/index"

const testServers = new Set<FabricationServer>()

afterEach(async () => {
  await Promise.all([...testServers].map((server) => server.stop()))
  testServers.clear()
})

export async function getTestServer(): Promise<FabricationServer> {
  const server = new FabricationServer()
  await server.start()
  testServers.add(server)
  return server
}

export const testLbrnFiles: JobLbrnFiles = {
  top_alignment:
    "https://fake-r2.tscircuit.com/job_abc/top-alignment.lbrn",
  bottom_alignment:
    "https://fake-r2.tscircuit.com/job_abc/bottom-alignment.lbrn",
  top_deoxidation:
    "https://fake-r2.tscircuit.com/job_abc/top-deoxidation.lbrn",
  top_copper_fill:
    "https://fake-r2.tscircuit.com/job_abc/top-copper-fill.lbrn",
  bottom_deoxidation:
    "https://fake-r2.tscircuit.com/job_abc/bottom-deoxidation.lbrn",
  bottom_copper_fill:
    "https://fake-r2.tscircuit.com/job_abc/bottom-copper-fill.lbrn",
}

export async function createTestJob(server: FabricationServer): Promise<Job> {
  const res = await fetch(`${server.url}/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lbrn_files: testLbrnFiles }),
  })
  return (await res.json()) as Job
}
