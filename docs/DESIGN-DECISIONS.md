# Design decisions

The questions I would expect to be asked about this, and the answers.

## Why lower quartile?

First-time buyers mostly buy cheaper homes than movers do, and are younger
and paid less than the average worker. The ONS publishes its lower-quartile
ratio, the cheaper quarter of sales over the lower-paid quarter of full-time
earnings, for exactly that reason. The median version is reported alongside
and tells the same story.

## Why a tenth of pay and a 10% deposit?

Because they are round, plausible and easy to hold in your head, and because
together they make the on-paper answer equal to the ONS's own ratio, which
anyone can look up. A 10% deposit is common for first-time buyers; saving a
tenth of gross pay is demanding but possible for many. The app lets the
reader change both, and the README shows the only thing that matters is one
over the other: a 5% deposit, a fifth of pay and two earners are the same
case.

## Why chase at all, when the ratio already says it?

The ratio says how many years of saving a deposit is worth in one year, as if
prices and pay then stood still. They do not. Following a saver through the
years that came next shows how far the target moved while they saved, which
is the part of the experience the ratio leaves out. In London the 1997 ratio
said four years and the saver needed eight.

## Why the one-year bond rate?

The pot needs a return, and a savings rate a person could actually have had
is better than none. The Bank of England's quoted rate on one-year fixed-rate
bonds for households runs from 1996, so it covers every year here, and a
saver rolling their pot into a new bond each year would have earned about
that. Fixed bonds usually pay more than easy-access accounts, so if anything
it flatters the saver. Without any interest the chase takes a year longer for
most starts before 2005 and a few after, and never changes the story.

## Why add the saving at the end of each year?

It is the simplest rule that never overstates the pot: the year's saving
earns no interest in the year it is saved. Monthly saving would earn a little
more, which matters only in the years when rates were high.

## Why does the saver's pay follow the area's lower quartile?

So the saver stays the same kind of person in the same place: always paid what
a lower-paid full-time worker in that area was paid that year. Real careers
usually rise faster than that, which the README says; the saver here is a
position in the pay distribution, not a person growing older.

## What does "still saving" mean for recent starts?

That by 2025, the last year of data, the pot had not reached the deposit. It
is not a prediction that they never will. A 2019 starter has had seven years;
a 2023 starter three. The headline uses the 2015 start because ten years is
long enough for "still saving" to mean something.

## Why local authorities on today's boundaries?

That is how the ONS publishes the series: every year recalculated for today's
areas, so a place means the same thing in 1997 and 2025. Where the ONS
suppressed a figure (337 ratios, mostly early years in small areas), the
chase for that area and start year has no answer rather than a guessed one.

## Why no rent, when rent is the real obstacle?

Because there is no local rent series back to 1997, and building one in for
recent years only would make the early and late chases incomparable. The
saving rate is an assumption, stated, and the app lets the reader put in what
they can actually save.

## Why no charting library?

The charts are bars and dots. Drawn as SVG directly they resize to the screen
so their text stays readable on a phone, and the page stays small.
