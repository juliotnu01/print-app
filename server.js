// // server.js
// const express = require('express');
// import escpos from "escpos"
// const escpos = require('escpos');
import express from 'express'
import escpos from "escpos"
import USB from "escpos-usb"
import cors from 'cors'
escpos.USB = USB;
const app = express();
app.use(cors());
app.use(express.json());


app.post('/print', (req, res) => {
    const content = req.body.content;

    try {
        // Enumerar dispositivos USB
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            throw new Error('No se encontraron impresoras USB compatibles.');
        }

        // Usar el primer dispositivo encontrado (puedes ajustar esto según tus necesidades)
        const device = new escpos.USB(devices[0].vendorId, devices[0].productId);
        const printer = new escpos.Printer(device);

        device.open(function (error) {
            if (error) {
                console.error("Error al abrir el dispositivo:", error);
                return res.status(500).send("Error al abrir el dispositivo: " + error.message);
            }

            printer
                .text(content)
                .cut()
                .close(function () {
                    res.json({ message: 'Impresión completada' });
                });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error: " + error.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
