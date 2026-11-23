import useResource from './useResource';
import { Panel } from './UI';
import { when } from './format';

function ReviewList({ endpoint }) {
  const resource = useResource(endpoint);
  return <Panel title="Reviews" resource={resource} description="Reviews are available after the buyer confirms receipt."><div className="space-y-4">{resource.data?.map(review => <article key={review.review_id} className="rounded-xl border bg-white p-5"><p className="font-bold text-green-950">{review.rating} / 5 · Order #{review.order_id}</p><p className="mt-3 text-sm text-gray-700">{review.comment || 'No written feedback.'}</p>{review.created_at && <p className="mt-2 text-xs text-gray-500">{when(review.created_at)}</p>}</article>)}</div>{resource.data?.length === 0 && <p className="rounded-xl border bg-white p-8">No reviews yet. Buyers can leave a review from a completed order.</p>}</Panel>;
}

export default function Reviews({ farmer = false }) {
  const profile = useResource('/profiles/me');
  if (profile.loading) return <p role="status">Loading reviews…</p>;
  if (profile.error) return <p role="alert">{profile.error}</p>;
  return <ReviewList endpoint={farmer ? `/farmers/${profile.data.farmer_profile.farmer_id}/reviews` : '/reviews/my'} />;
}
