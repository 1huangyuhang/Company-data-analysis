export default function MessageBar({ msg }) {
  return (
    <div className="message" style={{ color: msg.error ? "#b42318" : "#475467" }}>
      {msg.text}
    </div>
  );
}
