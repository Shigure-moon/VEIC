export function DetailList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; title: string; detail: string }>;
}) {
  return (
    <div className="detail-list">
      <span className="block-label">{title}</span>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        items.map((item, index) => (
          <div className="detail-row" key={item.key || `${item.title}-${index}`}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        ))
      )}
    </div>
  );
}
