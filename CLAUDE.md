# Working with Claude here

## End every response with What's Next

The last thing in every reply is a short block naming who owns the next step.
It is what gets read on a wall display across a room, and the project
dashboard parses the owner out of it.

```
**What's Next**
YOU: <the single next thing the human must do>
CLAUDE: <what I will do next, if anything>
NOTHING: everything here is done
```

Rules that make it useful rather than decorative:

- **One line per owner, at most one each.** A list of five things is a status
  report, not a next step. If several are outstanding, name the one that
  unblocks the rest.
- **`YOU:` is an instruction, not a summary.** "19 commits deployed to main"
  describes the past. "Trigger the Netlify deploy on main" is a next step. If
  the human has nothing to do, do not write a `YOU:` line at all.
- **Say `NOTHING` when it is true.** A block that always finds something for
  someone to do teaches people to ignore it.
- **Keep it under about 15 words.** It has to survive being summarised into
  the session's status line, which is where the dashboard actually reads it.

## Push straight to main

Commit and push your work directly to `main`. That is the default for every
change — no feature branch, no pull request, no waiting on a review.

- **Unless the request says otherwise.** Asked for a branch, a PR, or a review
  first? Do that instead — an explicit instruction beats this default.
- **Push as soon as the work stands on its own.** A commit that never leaves
  the session has not landed, and nothing else is collecting it.
