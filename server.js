import express from 'express';
import escpos from 'escpos';
import USB from 'escpos-usb';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

escpos.USB = USB;
const app = express();
app.use(cors());
app.use(express.json());

// Ruta del directorio a monitorear
const directoryPath = '/Users/doctorgroup/Documents';
const FilePathEnviados = "/Users/doctorgroup/Documents/Enviados";
const FilePathRespuesta = "/Users/doctorgroup/Documents/Respuestas";

// Crear directorios si no existen
fs.promises.mkdir(FilePathEnviados, { recursive: true }).catch(console.error);
fs.promises.mkdir(FilePathRespuesta, { recursive: true }).catch(console.error);

// Función para procesar el archivo txt
function processTxtFile(filePath, filename) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error leyendo el archivo ${filePath}:`, err);
            return;
        }

        // Extrae las letras iniciales del nombre del archivo, incluyendo espacios antes de los números
        const match = filename.match(/^[A-Za-z\s]+(?=\d)/);
        if (match) {
            const letrasIniciales = match[0].trim(); // Elimina espacios al final de las letras capturadas
            console.log(`Letras iniciales del archivo: ${letrasIniciales}`);
            procesarInformacion(JSON.parse(data), letrasIniciales, filePath);
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
        const startTime = Date.now(); // Iniciar el cronómetro antes de la petición
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.template_token}`
            }
        });
        const endTime = Date.now(); // Detener el cronómetro después de la petición
        console.log(`Tiempo de respuesta: ${endTime - startTime} ms`); // Mostrar el tiempo de respuesta en milisegundos

        const responseData = response.data;

        // Guardar respuesta en la carpeta 'Respuestas'
        const responseFilePath = path.join(FilePathRespuesta, `${path.basename(filePath, '.json')}-response.json`);
        await fs.promises.writeFile(responseFilePath, JSON.stringify(responseData, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al procesar la información:', error);
    }
}

// Monitorea el directorio
fs.watch(directoryPath, (eventType, filename) => {
    if (filename && path.extname(filename) === '.json') {
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
