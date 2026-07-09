# From "someone should fix this" to a working demo, with an AI agent

## TL;DR

A colleague flagged that FIM/MIM troubleshooting content on the TechNet Wiki
archive had become nearly unsearchable. I built a semantic search engine over
it with an AI agent (Scout) doing most of the implementation work: 450 real
articles scraped, embedded, and indexed, deployed on my own Azure
subscription. This post is the honest version of how that went, including
the parts that didn't work on the first try.

## The problem

A colleague still working FIM/MIM support flagged it plainly: the TechNet
Wiki content for FIM/MIM got archived, and along with the move, it basically
stopped showing up in search. Years of real troubleshooting knowledge, still
technically online, practically invisible.

That's the kind of problem that used to sit on a "someday" list. Not anymore.

## The conversation that got it going

I explained the pain point to Scout, then added the one fact that mattered:
I have a personal Azure subscription, and access to Azure AI Foundry. Given
that, how would you actually bring semantic search to this?

That's how I first heard the terms LanceDB and text embeddings. Neither
meant anything to me a few minutes earlier. Scout walked me through what
each one does and why they fit together, and it clicked fast enough that the
only reasonable next step was: let's experiment with this.

The part that stuck with me most isn't even the FIM/MIM search itself. It's
that I now roughly understand what a vector database is and what a text
embedding does, well enough to see that the exact same technique applies to
any other pile of hard-to-search content. That's a repeatable skill now, not
a one-off script.

## Building the first working version

Before writing a line that touched the actual problem, there used to be 30
minutes of repo scaffolding and stack decisions. This time: one sentence to
Scout, and the repo was initialized and structured in a couple of minutes.

The harder part wasn't the search engine, it was getting the actual list of
FIM/MIM articles. Our first instinct, Scout's included, was to crawl the
archive by following its internal "See Also" links. That mostly produced
404s and a handful of pages. I had to push back more than once to keep
things simple: forget clever link-following, just walk the archive's own
alphabetical index and keep the titles that mention FIM or MIM. That's what
actually worked: 450 real articles, on the first straightforward attempt.
Sometimes the boring, direct path beats the clever one, and someone still
has to insist on it.

There's a second pattern worth naming here. Once a first working version of
something exists, an AI agent's default instinct is often to rebuild it from
scratch rather than reuse it, even when a proven implementation of the exact
same problem is sitting right there in another of my own projects. I had to
actively point Scout back to existing code more than once and say "reuse
this, don't reinvent it." Left unsupervised, it will happily solve an
already-solved problem a second, third, or fourth time.

## Scaling from a handful of articles to the whole archive

Once the pipeline worked on a small sample, the obvious next step was: do
the whole archive, not a sample. That meant embedding several thousand
chunks instead of a few dozen, and the first real run of it quietly
stalled: no crash, no clear error, just nothing moving. My Azure OpenAI
deployment's default capacity was set too low, and a real batch got
throttled into silence. I'd actually adjusted this exact setting before on
a different project and needed the reminder. Bumping the deployment's
capacity and adding retry-with-backoff on the embedding calls fixed it.

The full run: 450 articles scraped (1 too thin to keep, 0 errors), indexed
into roughly 1,350 vector chunks in LanceDB.

## Deploying it: why the index shouldn't ship with the code

Once the data was ready, redeploying after every tiny code change felt
slow, and it took me a while to notice why: the vector index was being
rebuilt and shipped inside the same container image as the application
code. Splitting the two, one build for code and one for data, turned code
changes into a seconds-fast rebuild, with the (larger, slower) data image
only rebuilding when the data itself changes. Small decision,
disproportionate payoff.

## What I actually wanted to prove

Not "look, a search tool." That part is almost incidental. What I wanted to
test was this:

- How smooth is the path from a one-line idea to a working, public demo,
  when an AI agent is doing the heavy lifting?
- Does working this way make it easier to pick up new tools (LanceDB,
  embeddings, Azure AI Foundry) and push past constraints that used to mean
  "not worth the effort"?
- Can the result still be genuinely simpler to use than what existed
  before, not just faster to build?

On all three, the honest answer is yes, with real friction along the way
(bad first instincts, a silent rate-limit wall, a deploy that needed
rethinking), not a frictionless demo reel.

Repo: [MIM Archive Reviver](https://github.com/kayasax/mim-archive-reviver)
Live demo: https://mimar.yespapa.eu

#AI #AIAgents #BuildInPublic #Azure #OpenSource
