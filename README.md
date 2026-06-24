# claude-bootcamp 💪

**English** | [日本語](https://github.com/wonder-boooy/claude-bootcamp/blob/main/README.ja.md)

Replace Claude Code's "waiting for response" spinner words with bootcamp-style workout cues. Turn the time you spend waiting at your desk into a nudge for some light exercise.

```text
Do squats…
Roll your shoulders…
March in place…
```

The words come in **sets** you can switch between — pick one that matches your mood or condition.

| Set | Vibe | Examples |
|---|---|---|
| `bootcamp` (default) | Drill-sergeant workout commands | Do squats / Roll your shoulders |
| `hiit` | High-intensity, all-out in place | Drop down and jump up / Run with high knees |
| `yoga` | Slow, breath-and-pose focused | Round your back like a cat / Breathe in deeply |
| `stiff` | Anti-stiffness, made for desk work | Roll your shoulders back wide / Look away from the screen into the distance |
| `hulk` | Serious lifting you can only do at the gym | Bench press 100 kg / Flip the tire |

## Usage

```bash
# Install (interactively pick "language" and "set")
npx claude-bootcamp install

# Non-interactive (you can specify the set too)
npx claude-bootcamp install --lang en --set yoga --mode replace --yes

# Revert
npx claude-bootcamp uninstall

# List / preview words (check a set before installing it)
npx claude-bootcamp list --lang en --set hiit
npx claude-bootcamp preview --set stiff
```

The `install` prompt is a **wizard**: it shows one step per screen (language → set). Move the cursor (`*`) with `↑↓` (`j`/`k` and number keys also work) and press `Enter` to go to the next step. Press `←` (or `Backspace`) to go back to the previous step and re-choose.

```text
[2/2] Choose a set (↑↓ move / ← back / Enter confirm)
* Bootcamp
  HIIT
  Yoga
  Anti-stiffness
  HULK
```

Outside a terminal (CI, pipes) it automatically falls back to numbered input. After installing, restart Claude Code to apply the change.

## Options

| Option | Values | Default |
|---|---|---|
| `--lang` | `ja` / `en` / `both` | Auto-detected from your environment locale (`ja` if it starts with `ja*`, otherwise `en`). In the `install` wizard, the detected value is the initial selection |
| `--set` | `bootcamp` / `hiit` / `yoga` / `stiff` / `hulk` | Asked interactively (`bootcamp`) |
| `--mode` | `replace` / `append` | `replace` |
| `--scope` | `user` (`~/.claude`) / `project` (`./.claude`) | `user` |
| `--yes` | Skip confirmation | false |

## How it works

It merges Claude Code's [`spinnerVerbs`](https://docs.claude.com/en/docs/claude-code/settings) setting into your `settings.json`. Existing settings are backed up (`settings.json.bak-*`) and written atomically, and the state is recorded in `~/.claude/.claude-bootcamp.json`. `uninstall` removes only the values this tool added, and does nothing if they have been changed by hand — for safety.

## Contributing

PRs that add or translate words in `data/verbs.*.json` are welcome (the policy is no rep counts or numbers).

- `bootcamp` (default): `data/verbs.ja.json` / `data/verbs.en.json`
- Other sets: `data/verbs.<lang>.<set>.json` (e.g. `data/verbs.ja.yoga.json`)

To add a new set, provide both the Japanese and English files, and add the set to `SETS` in `src/core/verbs.ts` and to `VerbSet` in `src/types.ts`. The guiding principle is "a concrete action you understand the moment you read it, with no rep counts." `hulk` is the only exception, where specific weights (kg) are allowed.

## License

MIT
