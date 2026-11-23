import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const PORT = 3001;

// 1. إنشاء الـ HTTP Server لقراءة ملف index.html وعرضه للمستخدم
const server = http.createServer((req, res) => {
  fs.readFile('./public/index.html', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
});

// 2. إنشاء سيرفر الـ WebSocket وربطه بسيرفر الـ HTTP
const wss = new WebSocketServer({ server });

// دالة مساعدة لإرسال (بث) الرسائل لجميع المستخدمين المتصلين حالياً
const broadcast = (data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 تعني أن الاتصال مفتوح ونشط (OPEN)
      client.send(message);
    }
  });
};

// 3. تسجيل مستمع عند اتصال مستخدم جديد (connection)
wss.on('connection', (socket, req) => {
  // أ. قراءة اسم المستخدم من رابط الاتصال (Query String)
  const username = new URL(req.url, "http://localhost").searchParams.get("username");

  // ب. بث رسالة للنظام فوراً تفيد بدخول المستخدم
  broadcast({ type: "system", text: `${username} joined` });

  // 4. تسجيل مستمع عند استقبال رسالة جديدة من المستخدم (message)
  socket.on('message', (data) => {
    try {
      const { username: msgUser, text } = JSON.parse(data);
      // بث الرسالة لجميع المتصلين بصيغة chat
      broadcast({ type: 'chat', username: msgUser, text });
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  // 5. تسجيل مستمع عند مغادرة المستخدم وإغلاق الاتصال (close)
  socket.on('close', () => {
    // بث رسالة للنظام تفيد بخروج المستخدم
    broadcast({ type: 'system', text: `${username} left` });
  });
});

// 6. تشغيل السيرفر على بورت 3001 وطباعة الجملة المطلوبة نصاً
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
