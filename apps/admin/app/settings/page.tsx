export default function Settings() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h1>Ayarlar</h1>
      <label>
        <input type="checkbox" defaultChecked /> Sesli bildirim
      </label>
      <p className="muted">
        WhatsApp numarası WHATSAPP_NUMBER environment değişkeninden yönetilir. Bildirim izni konuşma
        ekranında yeni müşteri mesajı geldiğinde tarayıcı standardı ile istenir.
      </p>
      <h2>KVKK</h2>
      <p>
        Varsayılan kurulum anonim ziyaretçi kimliği kullanır ve IP adresini kalıcı olarak saklamaz.
      </p>
    </div>
  );
}
