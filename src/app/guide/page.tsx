import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Method Hub
      </Link>
      <h1 className="text-3xl font-bold text-tertiary-dark mb-2">How to Use This Database</h1>
      <p className="text-tertiary mb-10 text-base leading-relaxed">
        The EU Climate Policy Navigator is a collaborative research tool for exploring, annotating,
        and analysing EU legislation. Here is how to get the most out of it.
      </p>

      <div className="space-y-10">
        {/* Section 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">1</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Explore the Policy Network</h2>
          </div>
          <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
            <p>
              The <strong>Policy Map</strong> on the home page shows an interactive network graph of all EU policies
              and their connections. Each node is a policy, sized by the number of connections it has.
            </p>
            <p>
              <strong>Click a node</strong> to navigate to that policy&apos;s detail page.
              Use the <strong>domain filters</strong> on the left to show/hide policy areas.
              Hover over a node to highlight its direct connections.
            </p>
            <p>
              The <strong>Legislative Calendar</strong> on the right shows upcoming deadlines, reviews, and
              implementation dates.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm flex items-center justify-center">2</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Read and Annotate Policy Text</h2>
          </div>
          <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
            <p>
              From any policy detail page, click <strong>&ldquo;View Full Legislative Text&rdquo;</strong> to open the
              full text viewer. The text is fetched directly from EUR-Lex.
            </p>
            <p>
              <strong>To create an annotation:</strong> Select any text passage, then choose a tag
              (e.g., &ldquo;policy gap&rdquo;, &ldquo;strong commitment&rdquo;, &ldquo;ambiguity&rdquo;) and optionally add a note.
              You will be asked to sign in if you haven&apos;t already.
            </p>
            <p>
              All annotations are <strong>shared across all users</strong> &mdash; you can see annotations
              made by other researchers, and they can see yours. Only you can delete your own annotations.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-accent-violet/10 text-accent-violet font-bold text-sm flex items-center justify-center">3</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Comment and Discuss</h2>
          </div>
          <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
            <p>
              Each policy page has a <strong>Discussion</strong> section at the bottom where you can
              post general comments, reply to others, and have threaded conversations about the policy.
            </p>
            <p>
              The <strong>Recent Activity</strong> panel in the sidebar shows a live feed of all
              annotations, comments, and tags added to that policy by any user.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-accent-orange/10 text-accent-orange font-bold text-sm flex items-center justify-center">4</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Analyse Patterns</h2>
          </div>
          <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
            <p>
              The <strong>Analytics</strong> page provides two views:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Policy Data</strong> &mdash; charts showing policy distribution by domain, status, document type, and connection patterns across the database.</li>
              <li><strong>User Activity</strong> &mdash; statistics on annotations, comments, and tags contributed by the research community.</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">5</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Available Tags</h2>
          </div>
          <div className="ml-11">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'policy_gap', color: '#EF4444', desc: 'Missing implementation detail or policy coverage' },
                { name: 'ambiguity', color: '#F59E0B', desc: 'Unclear or ambiguous language in legislation' },
                { name: 'strong_commitment', color: '#10B981', desc: 'Clear, binding commitment or obligation' },
                { name: 'weak_language', color: '#F97316', desc: 'Non-binding or hedged phrasing' },
                { name: 'cross_reference', color: '#3B82F6', desc: 'Reference to another policy instrument' },
                { name: 'quantitative_target', color: '#8B5CF6', desc: 'Specific numeric target or threshold' },
                { name: 'implementation_mechanism', color: '#06B6D4', desc: 'How a provision will be implemented' },
                { name: 'review_clause', color: '#6366F1', desc: 'Scheduled review or revision clause' },
              ].map(tag => (
                <div key={tag.name} className="flex items-start gap-2 p-2 rounded border border-grey-100">
                  <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: tag.color }} />
                  <div>
                    <p className="text-xs font-medium text-tertiary-dark">{tag.name.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-grey-500">{tag.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-grey-100 text-tertiary font-bold text-sm flex items-center justify-center">6</span>
            <h2 className="text-xl font-bold text-tertiary-dark">Account and Sign In</h2>
          </div>
          <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
            <p>
              You can <strong>browse all policies and data freely</strong> without signing in.
              An account is only required when you want to create annotations, post comments, or add tags.
            </p>
            <p>
              Click <strong>&ldquo;Sign In&rdquo;</strong> in the top navigation bar, or you will be prompted
              automatically when you try to annotate. Sign up with your email and password.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
