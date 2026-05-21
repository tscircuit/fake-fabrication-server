import { createStore } from "zustand/vanilla"
import { combine } from "zustand/middleware"
import { hoist } from "zustand-hoist"

import { type Job, databaseSchema, type DatabaseSchema } from "./schema"

export const createDatabase = () => {
  return hoist(createStore(initializer))
}

export type DbClient = ReturnType<typeof createDatabase>

const initializer = combine(databaseSchema.parse({}), (set, get) => ({
  createId: (prefix: string) => {
    const idCounter = get().idCounter
    set({ idCounter: idCounter + 1 })
    return `${prefix}_${idCounter}`
  },
  getJob: (id: string) => {
    return get().jobs.find((job) => job.id === id)
  },
  setJob: (job: Job) => {
    set((state: DatabaseSchema) => ({
      jobs: [...state.jobs.filter(({ id }) => id !== job.id), job],
    }))
  },
  getJobsMap: () => {
    return new Map(get().jobs.map((job) => [job.id, job] as const))
  },
  clearJobs: () => {
    set({ jobs: [] })
  },
}))
