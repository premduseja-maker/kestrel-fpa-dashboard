import type { Metadata } from "next";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "About this demo · Kestrel Outdoor Co.",
  description:
    "What this demonstration is, what the data is, and how a live engagement differs.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="heading text-[17px] text-ink">About this demo</h1>

      <div className="mt-4 space-y-4">
        <Card className="p-4 sm:p-5">
          <h2 className="heading text-[14px] text-ink">
            The data is synthetic
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Kestrel Outdoor Co. does not exist. Every figure on these screens was
            generated for demonstration: the P&amp;L, the budget, the SKU
            history, the inventory positions, the receivables ledger and the cash
            statement. No client data appears anywhere in this application, and
            nothing here should be read as the performance of a real business.
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            Because it is generated, the files carry a few internal
            inconsistencies. Rather than smooth those over, the screens name them
            where they matter — the collection-period note beside the cash
            forecast and the receivables ageing note both point at real
            disagreements between files. Naming them is the point: an analyst who
            quietly reconciles away a discrepancy is an analyst you cannot check.
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            The same discipline applies in reverse. An earlier revision of the
            data had SKU-level revenue failing to tie to the P&amp;L, and this
            site said so prominently. The refreshed files reconcile exactly, so
            that warning has been removed rather than left standing as a caveat
            that sounds careful and is simply out of date.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="heading text-[14px] text-ink">
            The architecture is production-grade
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            The demonstration reads static JSON, but no component knows that.
            Every screen depends on a <code>DataSource</code> interface, and the
            static files sit behind one implementation of it. Pointing the same
            components at a live warehouse means writing a second implementation
            and changing a single export — no screen changes, no chart changes.
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            Derived numbers live in pure functions, separate from the components
            that display them, so each one is testable on its own and the same
            calculation cannot drift between two screens. Formatting is
            centralised too, which is why every negative on this site wears
            parentheses rather than a minus sign.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="heading text-[14px] text-ink">
            A live engagement
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            In a real engagement this connects to your own accounting system —
            the ledger, the commerce platform, the inventory records — and the
            screens populate from your numbers on your close calendar. The work
            is the same shape as what you see here: agree the measures, build the
            decomposition, and put the driver model in front of the decision it
            is meant to inform.
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            What a demonstration cannot show is the part that matters most: the
            conversation about which questions are worth instrumenting. This
            dashboard answers one — where the margin went, and what recovering it
            is worth. Yours would answer yours.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="heading text-[14px] text-ink">Reading the figures</h2>
          <dl className="mt-2 space-y-1.5 text-[13px] text-muted">
            <Row term="Currency" detail="US dollars throughout." />
            <Row
              term="Negatives"
              detail="Shown in parentheses, as ($89,724), never with a minus sign."
            />
            <Row
              term="Rate movements"
              detail="Stated in percentage points and labelled pts, because a margin moving from 44% to 42% has moved two points, not two percent."
            />
            <Row
              term="Period"
              detail="Twenty-four months of history, August 2024 to July 2026, split into two twelve-month comparatives."
            />
            <Row
              term="Forecast"
              detail="Twelve months forward from the trailing three-month run rate. Projections are always drawn as a dashed series, never as a continuation of an actual line."
            />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="font-semibold text-ink">{term}</dt>
      <dd className="m-0 flex-1 basis-64">{detail}</dd>
    </div>
  );
}
