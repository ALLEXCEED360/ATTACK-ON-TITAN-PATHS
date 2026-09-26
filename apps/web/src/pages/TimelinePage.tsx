import { useSearchParams } from "react-router";
import { OrderToggle, type TimelineOrder, TimelineList } from "../features/timeline/TimelineList";
import { PageHeader } from "../components/PageHeader";

export function TimelinePage() {
  const [params, setParams] = useSearchParams();
  const order: TimelineOrder = params.get("order") === "story" ? "story" : "world";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        label="Timeline"
        kanji="年表"
        title={order === "world" ? "In the order it happened" : "In the order it's revealed"}
        actions={
          <OrderToggle
            order={order}
            onChange={(next) => {
              setParams(next === "world" ? {} : { order: next });
            }}
          />
        }
      />
      <TimelineList order={order} />
    </div>
  );
}
