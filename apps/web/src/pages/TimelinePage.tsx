import { useSearchParams } from "react-router";
import { OrderToggle, type TimelineOrder, TimelineList } from "../features/timeline/TimelineList";

export function TimelinePage() {
  const [params, setParams] = useSearchParams();
  const order: TimelineOrder = params.get("order") === "story" ? "story" : "world";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Timeline</p>
          <h1 className="text-3xl font-semibold">
            {order === "world" ? "In the order it happened" : "In the order it's revealed"}
          </h1>
        </div>
        <OrderToggle
          order={order}
          onChange={(next) => {
            setParams(next === "world" ? {} : { order: next });
          }}
        />
      </header>
      <TimelineList order={order} />
    </div>
  );
}
