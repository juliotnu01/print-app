import express from 'express';
import escpos from 'escpos';
import USB from 'escpos-usb';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

import notifier from 'node-notifier'

import { execFile } from 'child_process';

escpos.USB = USB;
const app = express();
app.use(cors());
app.use(express.json());

// Ruta del directorio a monitorear
const directoryPath = '/Users/doctorgroup/Documents';
const FilePathEnviados = "/Users/doctorgroup/Documents/Enviados";
const FilePathEnviadosArgumento = "d:\\usr\\Enviados\\";
const FilePathRespuesta = "/Users/doctorgroup/Documents/Respuestas";

// Crear directorios si no existen
fs.promises.mkdir(FilePathEnviados, { recursive: true }).catch(console.error);
fs.promises.mkdir(FilePathRespuesta, { recursive: true }).catch(console.error);

// Función para procesar el archivo txt
function processTxtFile(filePath, filename) {
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error(`Error leyendo el archivo ${filePath}:`, err);
            return;
        }

        // Extrae las letras iniciales del nombre del archivo, incluyendo espacios antes de los números
        const match = filename.match(/^[A-Za-z\s]+(?=\d)/);
        if (match) {
            const letrasIniciales = match[0].trim(); // Elimina espacios al final de las letras capturadas
            await procesarInformacion(JSON.parse(data), letrasIniciales, filePath);

            // ejecuta el print.php impresion de la factura
            // axios(`http://localhost/print_pos/print.php?path=${FilePathEnviadosArgumento}${filename}`)
        }
    });
}

async function procesarInformacion(data, condicion, filePath) {
    // Crear directorios si no existen
    await fs.promises.mkdir(FilePathEnviados, { recursive: true });
    await fs.promises.mkdir(FilePathRespuesta, { recursive: true });

    // Mover archivo a la carpeta 'Enviados'
    const newFilePath = path.join(FilePathEnviados, path.basename(filePath));
    await fs.promises.rename(filePath, newFilePath);


    let url = '';
    switch (condicion) {
        case "FV":
            url = 'http://aristafe.com:81/api/ubl2.1/invoice';
            break;
        case "FP":
            url = 'http://aristafe.com:81/api/ubl2.1/eqdoc';
            break;
        case "NC":
            url = 'http://aristafe.com:81/api/ubl2.1/credit-note';
            break;
        case "ND":
            url = 'http://aristafe.com:81/api/ubl2.1/debit-note';
            break;
        case "DS":
            url = 'http://aristafe.com:81/api/ubl2.1/support-document';
            break;
        case "DSA":
            url = 'http://aristafe.com:81/api/ubl2.1/sd-credit-note';
            break;
        case "FE":
            url = 'http://aristafe.com:81/api/ubl2.1/invoice-export';
            break;
        default:
            console.log('Condición no reconocida, no se realiza ninguna acción');
            return;
    }

    try {

        const response = await axios.post(url, data, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.template_token}` } });

        // Guardar respuesta en la carpeta 'Respuestas'
        const responseFilePath = path.join(FilePathRespuesta, `${path.basename(`${filePath}.txt`, '.txt')}-RESP.json`);
        await fs.promises.writeFile(responseFilePath, JSON.stringify(response.data, null, 2), 'utf8');

        const { message } = response.data
        const { ResponseDian } = response.data
        const { Body } = ResponseDian.Envelope
        const { SendBillSyncResult } = Body.SendBillSyncResponse
        const { IsValid } = SendBillSyncResult
        const { string } = SendBillSyncResult.ErrorMessage
        const { StatusDescription } = SendBillSyncResult




        

        notificación(StatusDescription, string )

        // Descargar y guardar archivos adjuntos especificados en la respuesta
        const filesToDownload = [
            response.data.urlinvoicexml,
            response.data.urlinvoicepdf,
            response.data.urlinvoiceattached
        ];

        for (const fileUrl of filesToDownload) {
            if (fileUrl) {
                const fileName = path.basename(fileUrl);
                const fileSavePath = path.join(FilePathRespuesta, fileName);
                const fileData = await axios.get(`http://aristafe.com:81/api/download/${data.establishment_nit}/${fileUrl}`, { responseType: 'stream' });
                const writer = fs.createWriteStream(fileSavePath);
                fileData.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            }
        }
    } catch (error) {
        console.error('Error al procesar la información:', error);
    }
}

function notificación(titulo, mensaje) {

    for (let index = 0; index < mensaje.length; index++) {
        const element = mensaje[index];
        
        const notificationOptions = {
            title: titulo,
            message: element,
            sound: true, // Sonido de notificación
            wait: true,
            timeout: 99,
        };
    
        // Enviar la notificación
        notifier.notify(notificationOptions);
    }
}

// Monitorea el directorio
fs.watch(directoryPath, (eventType, filename) => {
    if (filename && path.extname(filename) === '.txt') {
        const filePath = path.join(directoryPath, filename);
        if (eventType === 'rename') {
            // Comprueba si el archivo fue agregado
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (!err) {
                    console.log(`Archivo agregado: ${filename}`);
                    processTxtFile(filePath, filename);
                }
            });
        }
    }
});

console.log(`Monitoreando cambios en el directorio: ${directoryPath}`);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
