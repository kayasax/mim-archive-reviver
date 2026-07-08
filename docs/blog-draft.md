# From "someone should fix this" to a working demo with an AI agent

## The constraint

A colleague still working FIM/MIM support flagged it plainly: the TechNet Wiki
content for FIM/MIM got archived, and along with the move, it basically
stopped showing up in search. Years of real troubleshooting knowledge, still
technically online, practically invisible.

That's the kind of problem that used to sit on a "someday" list. Not anymore.

## The conversation that got it going

I explained the pain point to Scout, then added the one fact that mattered:
I have a personal Azure subscription, and access to Azure AI Foundry. Given
that, how would you actually bring semantic search to this?

That's how I first heard the terms LanceDB and text embeddings. Neither
meant anything to me a few minutes earlier. Scout walked me through what
each one does and why they fit together, and it clicked fast enough that
the only reasonable next step was: let's experiment with this.

The part that stuck with me most isn't even the FIM/MIM search itself.
It's that I now roughly understand what a vector database is and what a
text embedding does, well enough to see that the exact same technique
applies to any other pile of hard-to-search content. That's a repeatable
skill now, not a one-off script.

## The deployment surprise: why the index shouldn't ship with the code

Early on, redeploying the whole thing after every tiny code change felt
slow, and it took me a while to notice why: the vector index (the actual
searchable data) was being rebuilt and shipped inside the same container
image as the code. Once I split the two, one build for code, one for data,
code changes turned into a seconds-fast rebuild, and the data only rebuilds
when it actually changes. Small decision, disproportionate payoff.

## The part that almost derailed it: parsing the archive itself

Getting the actual list of FIM/MIM articles was harder than the search
part. Our first instinct, Scout's included, was to crawl the archive by
following its internal "See Also" links, and it mostly produced 404s and a
handful of pages. I had to push back more than once to keep things simple:
forget clever link-following, just walk the archive's own alphabetical
index pages and keep the titles that mention FIM or MIM. That's what
actually worked, 450 real articles, on the first straightforward attempt.
Sometimes the boring, direct path beats the clever one, and someone still
has to insist on it.

There's a second, quieter pattern worth naming here. Once a first working
version of something exists, an AI agent's default instinct is often to
rebuild it from scratch rather than reuse it, even when a proven
implementation of the exact same problem is sitting right there in another
of my own projects. I had to actively point Scout back to that existing
code more than once and say "reuse this, don't reinvent it." Left
unsupervised, it will happily solve an already-solved problem a second,
third, or fourth time. That's a real limitation to plan around, not a
one-off glitch.

## Before / after

Before: I would have spent 30 minutes just scaffolding a new repo, picking a
stack, wiring up the boilerplate, before writing a single line that touches
the actual problem.

This time: I described the idea to Scout in one sentence, and the repo was
initialized and structured, ready to build on, in a couple of minutes.

## What I actually wanted to prove

Not "look, a search tool." That part is almost incidental. What I wanted to
test was this:

- How smooth is the path from a one-line idea to a working, public demo,
  when an AI agent is doing the heavy lifting?
- Does working this way actually make it easier to pick up new agentic
  tools and push past constraints that used to mean "not worth the effort"?
- Can the result still be genuinely simpler to use than what existed before,
  not just faster to build?

## What's next in this series

- How the search actually works (semantic search, briefly, not a deep dive)
- The live demo, rate-limited to keep Azure costs sane
- Exposing the same capability as an MCP tool, so it's not just a website,
  it's a capability any AI agent can call

Repo: [MIM Archive Reviver](https://github.com/kayasax/mim-archive-reviver)
(link goes live once pushed)

#AI #AIAgents #BuildInPublic #GenerativeAI
