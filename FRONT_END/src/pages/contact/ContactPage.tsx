import type { FormEvent } from "react";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";

export function ContactPage() {
  function submit(event: FormEvent) {
    event.preventDefault();
    showToast("Cửa hàng chưa có API liên hệ. Vui lòng gọi hotline trên trang.", "warning");
    if (event.currentTarget instanceof HTMLFormElement) event.currentTarget.reset();
  }

  return (
    <>
      <PageBanner title="Liên hệ" />
      <section className="wrap" style={{ padding: "64px 0", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48 }}>
        <div>
          <h2>Liên hệ với chúng tôi</h2>
          <p>
            Form này chưa được nối API. Bạn có thể xem thông tin cửa hàng bên cạnh hoặc dùng khung chat AI.
          </p>
          <p>
            <strong>Địa chỉ</strong>
            <br />
            236 5th SE Avenue, New York NY10000, United States
          </p>
          <p>
            <strong>Điện thoại</strong>
            <br />
            Mobile: +(84) 546-6789
            <br />
            Hotline: +(84) 456-6789
          </p>
          <p>
            <strong>Giờ làm việc</strong>
            <br />
            Thứ hai–thứ sáu: 9:00 – 22:00
            <br />
            Thứ bảy–chủ nhật: 9:00 – 21:00
          </p>
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          <TextInput label="Họ tên" name="name" required fullWidth placeholder="Nguyễn Văn A" />
          <TextInput label="Email" name="email" type="email" required fullWidth placeholder="ban@email.com" />
          <TextInput label="Chủ đề" name="subject" fullWidth />
          <TextInput label="Nội dung" name="message" required fullWidth />
          <Button type="submit" variant="primary">
            Gửi
          </Button>
        </form>
      </section>
      <FeatureBar />
    </>
  );
}
