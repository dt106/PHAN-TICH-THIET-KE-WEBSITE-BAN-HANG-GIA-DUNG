import type { FormEvent } from "react";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";

export function ContactPage() {
  function submit(event: FormEvent) {
    event.preventDefault();
    showToast("Message sent. We will reply by email.", "success");
    if (event.currentTarget instanceof HTMLFormElement) event.currentTarget.reset();
  }

  return (
    <>
      <PageBanner title="Contact" />
      <section className="wrap" style={{ padding: "64px 0", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48 }}>
        <div>
          <h2>Get In Touch With Us</h2>
          <p>
            For more information about our product and services, please feel free to drop us an email. Our staff always be there to help you out. Do not hesitate!
          </p>
          <p>
            <strong>Address</strong>
            <br />
            236 5th SE Avenue, New York NY10000, United States
          </p>
          <p>
            <strong>Phone</strong>
            <br />
            Mobile: +(84) 546-6789
            <br />
            Hotline: +(84) 456-6789
          </p>
          <p>
            <strong>Working Time</strong>
            <br />
            Monday–Friday: 9:00 – 22:00
            <br />
            Saturday–Sunday: 9:00 – 21:00
          </p>
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          <TextInput label="Your name" name="name" required fullWidth placeholder="Abc" />
          <TextInput label="Email address" name="email" type="email" required fullWidth placeholder="Abc@def.com" />
          <TextInput label="Subject" name="subject" fullWidth placeholder="This is an optional" />
          <TextInput label="Message" name="message" required fullWidth placeholder="Hi! I’d like to ask about" />
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </form>
      </section>
      <FeatureBar />
    </>
  );
}
