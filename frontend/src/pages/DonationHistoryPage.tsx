import { Fragment, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import SiteFooter from '../components/layout/SiteFooter';
import { apiFetch } from '../api';

interface Donation {
  donationId: number;
  donationDate: string;
  donationType: string;
  amount: number | null;
  currencyCode: string | null;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string | null;
  notes: string | null;
  allocations: DonationAllocation[];
}

interface DonationAllocation {
  allocationId: number;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
}

interface Supporter {
  supporterId: number;
  displayName: string;
  email: string;
  firstDonationDate: string | null;
  status: string;
}

interface MyDonationsResponse {
  supporter: Supporter | null;
  donations: Donation[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null) return '—';
  const code = (currency ?? 'USD').toUpperCase();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

export default function DonationHistoryPage() {
  const [data, setData] = useState<MyDonationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstDonationDate = data?.supporter?.firstDonationDate ?? null;

  useEffect(() => {
    apiFetch('/api/auth/my-donations')
      .then((res: MyDonationsResponse) => setData(res))
      .catch(() => setError('Failed to load donation history.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <SiteNav />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-safira-blue flex items-center justify-center shrink-0">
              <Heart size={20} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">My Donations</h1>
              {data?.supporter && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {data.supporter.displayName} · {data.supporter.email}
                </p>
              )}
            </div>
          </div>

          {loading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your donations...</p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {!loading && !error && data && (
            <>
              {data.supporter == null ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    No donation record found for your account. Once you make a donation,
                    it will appear here.
                  </p>
                </div>
              ) : data.donations.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    You haven't made any donations yet.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                          Type
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                          Amount
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                          Campaign
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">
                          Frequency
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.donations.map((d) => (
                        <Fragment key={d.donationId}>
                          <tr
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-[#0f172a] dark:text-white font-medium whitespace-nowrap">
                              {formatDate(d.donationDate)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {d.donationType}
                            </td>
                            <td className="px-4 py-3 font-semibold text-safira-blue">
                              {formatAmount(d.amount, d.currencyCode)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                              {d.campaignName ?? '—'}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {d.isRecurring ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  Monthly
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  One-time
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <td colSpan={5} className="px-4 pb-3 pt-0">
                              {d.allocations.length === 0 ? (
                                <p className="text-xs text-slate-400 dark:text-slate-500">No recorded allocations for this donation.</p>
                              ) : (
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 mt-1">
                                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Allocations</p>
                                  <div className="space-y-2">
                                    {d.allocations.map((a) => (
                                      <div key={a.allocationId} className="text-xs text-slate-600 dark:text-slate-300">
                                        <span className="font-semibold">{a.programArea ?? 'General'}</span>
                                        {' · '}
                                        <span>{formatAmount(a.amountAllocated, d.currencyCode)}</span>
                                        {a.safehouseId != null && <span>{` · Safehouse #${a.safehouseId}`}</span>}
                                        {a.allocationDate && <span>{` · ${formatDate(a.allocationDate)}`}</span>}
                                        {a.allocationNotes && <span>{` · ${a.allocationNotes}`}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {data.donations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total donations</p>
                    <p className="text-xl font-bold text-[#0f172a] dark:text-white">
                      {data.donations.length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total given (USD)</p>
                    <p className="text-xl font-bold text-safira-blue">
                      {formatAmount(
                        data.donations
                          .filter((d) => (d.currencyCode ?? 'USD').toUpperCase() === 'USD')
                          .reduce((sum, d) => sum + (d.amount ?? 0), 0),
                        'USD'
                      )}
                    </p>
                  </div>
                  {firstDonationDate && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">First donation</p>
                      <p className="text-xl font-bold text-[#0f172a] dark:text-white">
                        {formatDate(firstDonationDate)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
