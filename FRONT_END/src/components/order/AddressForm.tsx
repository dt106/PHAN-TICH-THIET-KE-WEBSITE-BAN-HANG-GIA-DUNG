import { TextInput } from "../common/TextInput/TextInput.tsx";
import styles from "./AddressForm.module.css";

const account = {
  name: "recipientName",
  phone: "phone",
  line: "addressLine",
  ward: "ward",
  district: "district",
  province: "province",
};

const checkout = {
  name: "customerName",
  phone: "customerPhone",
  line: "shippingAddress",
  ward: "shippingWard",
  district: "shippingDistrict",
  province: "shippingProvince",
};

export function AddressForm({ checkout: isCheckout = false }: { checkout?: boolean }) {
  const names = isCheckout ? checkout : account;
  return (
    <div className={isCheckout ? styles.grid : styles.stack}>
      <TextInput label="Người nhận" name={names.name} required minLength={isCheckout ? 2 : undefined} fullWidth />
      <TextInput
        label="Số điện thoại"
        name={names.phone}
        type="tel"
        required
        pattern={isCheckout ? "0\\d{9}" : undefined}
        title={isCheckout ? "Số điện thoại 10 số, bắt đầu bằng 0" : undefined}
        fullWidth
      />
      <div className={styles.full}>
        <TextInput label="Địa chỉ" name={names.line} required minLength={isCheckout ? 5 : undefined} fullWidth />
      </div>
      <TextInput label="Phường/xã" name={names.ward} fullWidth />
      <TextInput label="Quận/huyện" name={names.district} fullWidth />
      <div className={styles.full}>
        <TextInput label="Tỉnh/thành" name={names.province} fullWidth />
      </div>
    </div>
  );
}
