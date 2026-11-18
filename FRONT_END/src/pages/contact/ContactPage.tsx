import type { FormEvent } from "react";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { site } from "../../constants/site.ts";

export function ContactPage() {
  function submit(event: FormEvent) {
    event.preventDefault();
    showToast("Đã gửi. Chúng tôi sẽ trả lời qua email.", "success");
    if (event.currentTarget instanceof HTMLFormElement) event.currentTarget.reset();
  }

  return (
    <>
      <PageBanner title="Liên hệ" />
      <section className="wrap section split">
        <div className="stack">
          <h2>Liên hệ với {site.name}</h2>
          <p>Cần thêm thông tin về sản phẩm hoặc dịch vụ, hãy gửi email. Nhân viên luôn sẵn sàng hỗ trợ.</p>
          <p>
            <strong>Địa chỉ</strong>
            <br />
            {site.address.join(", ")}
          </p>
          <p>
            <strong>Điện thoại</strong>
            <br />
            Di động: {site.phone}
            <br />
            Tổng đài: {site.hotline}
          </p>
          <p>
            <strong>Giờ làm việc</strong>
            <br />
            {site.hours[0]}
            <br />
            {site.hours[1]}
          </p>
        </div>
        <form onSubmit={submit} className="stack">
          <TextInput label="Họ tên" name="name" required fullWidth placeholder="Nguyễn Văn A" />
          <TextInput label="Email" name="email" type="email" required fullWidth placeholder="ban@email.com" />
          <TextInput label="Tiêu đề" name="subject" fullWidth placeholder="Không bắt buộc" />
          <TextInput label="Nội dung" name="message" required fullWidth placeholder="Tôi muốn hỏi về…" />
          <Button type="submit" variant="primary">Gửi</Button>
        </form>
      </section>
      <FeatureBar />
    </>
  );
}
