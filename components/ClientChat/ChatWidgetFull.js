export default function ChatWidgetFull({
  messages,
  lang,
  country,
  handleSend,
}) {
  return (
    <div>
      <div>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 8 }}>
            <b>{msg.type === "bot" ? "🤖" : "🧑"}:</b> {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend}>
        <input name="chatinput" type="text" />
        <button type="submit">إرسال</button>
      </form>
    </div>
  );
}