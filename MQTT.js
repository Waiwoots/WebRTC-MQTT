const WebSocket = require("ws");
const { RTCPeerConnection, RTCSessionDescription } = require("wrtc");

const wss = new WebSocket.Server({ port: 8080 });

let espConnection, clientConnection;
let espDataChannel, clientDataChannel;

wss.on("connection", (ws) => {
    console.log("อุปกรณ์เชื่อมต่อกับ WebSocket Signaling Server!");

    ws.on("message", async (message) => {
        const data = JSON.parse(message);

        if (data.device === "esp32") {
            console.log("ESP32 เชื่อมต่อ!");
            espConnection = new RTCPeerConnection();
            espDataChannel = espConnection.createDataChannel("data");

            espDataChannel.onopen = () => console.log("ESP32 DataChannel เปิดแล้ว!");
            espDataChannel.onmessage = (event) => {
                console.log("📡 ได้รับข้อมูลจาก ESP32:", event.data);
                if (clientDataChannel && clientDataChannel.readyState === "open") {
                    clientDataChannel.send(event.data); // ส่งข้อมูลไปให้อุปกรณ์ปลายทาง
                }
            };

            const offer = await espConnection.createOffer();
            await espConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", offer }));
        } 
        
        else if (data.device === "client") {
            console.log("อุปกรณ์ปลายทางเชื่อมต่อ!");
            clientConnection = new RTCPeerConnection();
            clientDataChannel = clientConnection.createDataChannel("data");

            clientDataChannel.onopen = () => console.log("Client DataChannel เปิดแล้ว!");
            clientDataChannel.onmessage = (event) => {
                console.log("📩 Client ส่งข้อมูล:", event.data);
                if (espDataChannel && espDataChannel.readyState === "open") {
                    espDataChannel.send(event.data); // ส่งข้อมูลกลับไปให้ ESP32
                }
            };

            const offer = await clientConnection.createOffer();
            await clientConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", offer }));
        }
    });
});
