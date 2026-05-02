export default function MessageBar({ msg }) {
  return (
    <div className={`message ${msg.error ? "error" : "info"}`}>
      {msg.text}
    </div>
  );
}
