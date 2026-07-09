# From "someone should fix this" to a working demo, with an AI agent

## The problem

A colleague still working FIM/MIM support flagged it plainly: the TechNet
Wiki content for FIM/MIM got archived, and along with the move, it
basically stopped showing up in search. Years of real troubleshooting
knowledge, still technically online, practically invisible.

## The conversation that got it going

I explained the problem to [Microsoft Scout](https://www.microsoft.com/en-us/microsoft-365/blog/2026/06/02/introducing-microsoft-scout-your-always-on-personal-agent/),
then added the one fact that mattered: I have a personal Azure subscription,
and access to Azure AI Foundry. Given that, how would you actually bring
semantic search to this?

That's how I first heard the terms LanceDB and text embeddings. Neither
meant anything to me a few minutes earlier. Scout walked me through what
each one does and why they fit together, and it clicked fast enough that
the only reasonable next step was: let's experiment with this.

I wasn't trying to prove anything going in. I was curious whether I could
actually build something real this way, in a reasonable amount of time,
on a problem I actually cared about.

## What came out of it

In about half a day: a working semantic search engine over the FIM/MIM
TechNet archive, deployed publicly, answering the original need. Along the
way I picked up a working understanding of vector databases and text
embeddings, not from a tutorial, but from building with them and asking
questions as I went. That's knowledge I can reuse on the next unrelated
problem, not a one-off script I'll forget by next week.

## What it actually took

The honest part: this wasn't "describe it once, walk away, come back to a
finished thing." Getting a real result took active involvement the whole
way through. A few examples from this build:

- The first approach to discovering the archive's articles didn't work,
  and I had to push back and redirect toward a simpler one that did.
- Once something already existed elsewhere that solved the same problem,
  I had to explicitly point back to it, or it would get rebuilt from
  scratch instead of reused.
- When the pipeline stalled silently while scaling up, I had to notice it,
  investigate, and steer the fix.

None of that is a knock against the tool. It's the actual shape of working
this way: real leverage, paired with real supervision. You don't get a
working result by clicking a button and walking away. You get it by
staying in the loop, catching what's going sideways, and making the calls
an agent won't make on its own. Done that way, it delivers on what it
promises.

## The result

A public semantic search demo over the FIM/MIM archive, running on my own
infrastructure.

Repo: [MIM Archive Reviver](https://github.com/kayasax/mim-archive-reviver)
Live demo: https://mimar.yespapa.eu

#AI #AIAgents #BuildInPublic
