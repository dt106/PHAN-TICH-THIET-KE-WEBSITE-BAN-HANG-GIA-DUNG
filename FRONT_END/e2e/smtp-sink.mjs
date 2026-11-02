import fs from "node:fs";
import net from "node:net";

const file = process.env.E2E_MAIL_FILE || "/tmp/furniro-e2e-mail.txt";
const port = Number(process.env.E2E_SMTP_PORT || 2525);

const server = net.createServer((socket) => {
  let buffer = "";
  let mode = "command";
  let data = "";
  socket.write("220 localhost ESMTP e2e\r\n");

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    while (buffer.length) {
      if (mode === "data") {
        const end = buffer.indexOf("\r\n.\r\n");
        if (end === -1) {
          data += buffer;
          buffer = "";
          return;
        }
        data += buffer.slice(0, end);
        buffer = buffer.slice(end + 5);
        fs.writeFileSync(file, data);
        data = "";
        mode = "command";
        socket.write("250 queued\r\n");
        continue;
      }

      const nl = buffer.indexOf("\r\n");
      if (nl === -1) return;
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      const upper = line.toUpperCase();

      if (mode === "auth-user") {
        mode = "auth-pass";
        socket.write("334 UGFzc3dvcmQ6\r\n");
        continue;
      }
      if (mode === "auth-pass") {
        mode = "command";
        socket.write("235 authenticated\r\n");
        continue;
      }

      if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
        socket.write("250-localhost\r\n250 AUTH LOGIN PLAIN\r\n");
      } else if (upper.startsWith("AUTH LOGIN")) {
        mode = "auth-user";
        socket.write("334 VXNlcm5hbWU6\r\n");
      } else if (upper.startsWith("AUTH")) {
        socket.write("235 authenticated\r\n");
      } else if (upper === "DATA") {
        mode = "data";
        socket.write("354 start mail input\r\n");
      } else if (upper.startsWith("QUIT")) {
        socket.write("221 bye\r\n");
        socket.end();
      } else {
        socket.write("250 OK\r\n");
      }
    }
  });
});

server.listen(port, "127.0.0.1");
console.log(`smtp sink ${port} -> ${file}`);
