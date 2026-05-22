# fake-fabrication-server

A Bun + [Winterspec](https://github.com/tscircuit/winterspec) fake fabrication server for testing PCB fabrication workflows. Models a 13-step laser-PCB pipeline from loading and clamping through alignment, burning, carrier release, and completion.

Reference implementation patterned after [fake-stripe](https://github.com/tscircuit/fake-stripe/tree/main).

## API

### Jobs

- `POST /fabrication_jobs` — create a new fabrication job. Body: `{ lbrn_files: {...}, metadata?: {...} }`. `lbrn_files` must include six URL keys: `top_alignment`, `bottom_alignment`, `top_deoxidation`, `top_copper_fill`, `bottom_deoxidation`, `bottom_copper_fill`. Returns the `Job` with `status: "in_progress"` and `current_step: "load_pcb"`.
- `GET /fabrication_jobs?fabrication_job_id=<id>` — retrieve a job's full state (steps, laser state, carrier state, alignment offsets).
- `POST /fabrication_jobs/steps/complete` — confirm a step finished. Body: `{ fabrication_job_id, step }`. Only the current step can be completed; `current_step` advances on success. When the final step (`complete`) is confirmed, `status` becomes `"complete"` and `current_step` becomes `null`.

### Laser commands

All laser commands take a `fabrication_job_id` and return `{ ok, fabrication_job_id, laser }`.

- `POST /laser/alignment` — `{ fabrication_job_id, lbrn, on }`. Toggle alignment mode. Turning on records the current laser position as the alignment origin and sets `alignment_lbrn`. Turning off clears both.
- `POST /laser/move` — `{ fabrication_job_id, dx, dy }`. Accumulate relative offsets on the laser head position. Used during alignment to dial in registration.
- `POST /laser/burn` — `{ fabrication_job_id, lbrn, passes? }`. Execute one or more burn passes for the current burn step. Validates the `.lbrn` URL against the expected file for the current step, fetches its content, and applies the saved alignment offset. Stores `last_burn_lbrn`, `last_burn_passes`, `last_burn_offset`, and `last_burn_file_content` on the laser state.

### Carrier commands

All carrier commands take a `fabrication_job_id` and return `{ ok, fabrication_job_id, carrier }`.

- `POST /carrier/move_along_rail` — `{ fabrication_job_id, x }` or `{ fabrication_job_id, dx }`. Absolute or relative x translation along the rail.
- `POST /carrier/clamp` — `{ fabrication_job_id, delta }`. Adjust clamp position by a relative motor delta. Cannot go below zero.
- `POST /carrier/rotate` — `{ fabrication_job_id, delta_deg }` or `{ fabrication_job_id, angle_deg }`. Relative delta or absolute angle. Stored value is normalized to `[0, 360)`.
- `POST /carrier/release` — `{ fabrication_job_id }`. Set clamp position to 0 (unclamp).

### Health

- `GET /health` — returns `{ ok: true }`.

## Workflow

Steps must be completed in order. Each step has preconditions that must be satisfied before `POST /fabrication_jobs/steps/complete` is accepted.

| Step | Description |
|------|-------------|
| `load_pcb` | Place the copper board on the bed and load its lbrn files |
| `clamp_pcb` | Tighten the carrier clamp until the PCB is secured |
| `position_carrier` | Move the carrier to its working position |
| `level_carrier` | Rotate the carrier to level the PCB |
| `top_alignment` | Run the top alignment lbrn and save the laser offset |
| `top_deoxidation` | Burn the top deoxidation pattern with the saved offset |
| `top_copper_fill` | Burn the top copper fill with the saved offset |
| `flip_board` | Rotate the carrier 180° to flip the PCB for bottom processing |
| `bottom_alignment` | Run the bottom alignment lbrn and save the laser offset |
| `bottom_deoxidation` | Burn the bottom deoxidation pattern with the saved offset |
| `bottom_copper_fill` | Burn the bottom copper fill with the saved offset |
| `release_pcb` | Move the carrier to the drop position, rotate it, and unclamp the PCB |
| `complete` | Job outputs are ready |

## Development

```bash
bun install
bun run dev       # start dev server (winterspec)
bun run test      # run tests
bun run typecheck # type-check
bun run build     # bundle for production
```
