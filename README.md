# fake-fabrication-server

A fake fabrication API for testing PCB fabrication workflows.

Reference style:

- https://github.com/tscircuit/fake-stripe/tree/main

## API Spec

The API uses HTTP RPC endpoints, following the Seam resource/action path style. Do not version endpoint paths. Request and response fields use `snake_case`, with resource IDs and command parameters at the top level.

Read-only endpoints can be called with `GET` or `POST`. Mutating endpoints use `POST`.

Resource endpoints wrap returned objects with their resource name, for example `{ fabrication_job: {...} }`.

### Fabrication Jobs

- `POST /fabrication_jobs/create` - create a new fabrication job. Body: `{ lbrn_files: {}, string>, metadata?: {...} }`. `lbrn_files` is a free-form map of VFS file path to file content. Returns `{ fabrication_job: {...} }` with `status: "in_progress"` and `current_stage: "load_pcb"`.
- `GET|POST /fabrication_jobs/get` - `{ fabrication_job_id }`. Retrieve a job's full state, including stages, laser state, carrier state, and saved alignment origins. Returns `{ fabrication_job: {...} }`.
- `GET|POST /fabrication_jobs/list` - `{ limit? }`. List fabrication jobs. Returns `{ fabrication_jobs: [...] }`.
- `POST /fabrication_jobs/next_stage` - `{ fabrication_job_id, current_stage: "..." }`. Confirms the current stage is complete and advances the job. When the final stage is confirmed, `status` becomes `"complete"` and `current_stage` becomes `null`. Returns `{ fabrication_job: {...} }`.

### Laser Commands

Laser command endpoints take top-level `fabrication_job_id`.

- `POST /laser/set_origin` - `{ fabrication_job_id, origin: { x, y } }`. Save the laser origin. When called during `top_deoxidation` or `top_copper_fill`, also persists `top_alignment_origin` on the job. When called during `bottom_deoxidation` or `bottom_copper_fill`, also persists `bottom_alignment_origin`. Returns `{ fabrication_job_id, laser: {...} }`.
- `POST /laser/burn` - `{ fabrication_job_id, lbrn_vfs_path, passes? }`. Execute one or more burn passes for the current burn stage. Validates `lbrn_vfs_path` matches the current stage slug, reads content from `lbrn_files[lbrn_vfs_path]`, and applies the saved alignment origin. Stores `last_burn_lbrn`, `last_burn_passes`, `last_burn_origin`, and `last_burn_file_content` on the burn run. Returns `{ fabrication_job_id, laser: {...}, laser_burn_run: {...} }`.
- `GET|POST /laser_burn_runs/list` - `{ fabrication_job_id, limit? }`. List burn runs for a fabrication job. Returns `{ laser_burn_runs: [...] }`.
- `GET|POST /laser_burn_runs/get` - `{ laser_burn_run_id }`. Retrieve one burn run. Returns `{ laser_burn_run: {...} }`.

### Carrier Commands

Carrier command endpoints take top-level `fabrication_job_id`.

- `POST /carrier/move_along_rail` - `{ fabrication_job_id, x }`. Move the carrier to an absolute x position along the rail. Returns `{ fabrication_job_id, carrier: {...} }`.
- `POST /carrier/clamp` - `{ fabrication_job_id }`. Clamp the PCB. Returns `{ fabrication_job_id, carrier: {...} }`.
- `POST /carrier/release` - `{ fabrication_job_id }`. Release the PCB. Returns `{ fabrication_job_id, carrier: {...} }`.
- `POST /carrier/rotate_to_orientation` - `{ fabrication_job_id, orientation: "top" | "bottom" | "pcb_insertion" | "pcb_drop" }`. Rotate the carrier to a named orientation. Returns `{ fabrication_job_id, carrier: {...} }`.
- `POST /carrier/rotate` - `{ fabrication_job_id, angle_deg }`. Rotate the carrier to an absolute angle. Stored value is normalized to `[0, 360)`. Returns `{ fabrication_job_id, carrier: {...} }`.

## Workflow

Stages must be completed in order. Each stage has preconditions that must be satisfied before `POST /fabrication_jobs/next_stage` is accepted.

| Stage | Description |
| --- | --- |
| `load_pcb` | Place the copper board on the carrier and load its lbrn files |
| `clamp_pcb` | Clamp the PCB |
| `move_carrier_under_laser` | Move the carrier to its position under the laser |
| `level_carrier` | Rotate the carrier to level the PCB |
| `top_alignment` | Complete the top-side alignment scan |
| `top_deoxidation` | Call `set_origin` to record the top alignment origin, then burn the top deoxidation pattern |
| `top_copper_fill` | Burn the top copper fill with the saved top alignment origin |
| `flip_board` | Rotate the carrier to the bottom orientation |
| `bottom_alignment` | Complete the bottom-side alignment scan |
| `bottom_deoxidation` | Call `set_origin` to record the bottom alignment origin, then burn the bottom deoxidation pattern |
| `bottom_copper_fill` | Burn the bottom copper fill with the saved bottom alignment origin |
| `move_carrier_to_loading_position` | Move carrier to x=10 (loading/loadout position) |
| `release_pcb` | Unclamp the PCB (`carrier/release`) |
| `complete` | Job outputs are ready |
