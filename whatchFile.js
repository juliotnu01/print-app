// watcher.js
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Crear una aplicación de Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const directoryPath = '/Users/doctorgroup/Documents';

// Función para procesar el archivo txt
function processTxtFile(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error leyendo el archivo ${filePath}:`, err);
            return;
        }
        // Enviar el contenido del archivo a todos los clientes conectados
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ filePath, data }));
            }
        });
    });
}

// Monitorea el directorio
const watcher = chokidar.watch(directoryPath, {
    ignored: /(^|[\/\\])\../, // ignora archivos ocultos
    persistent: true
});

watcher
    .on('add', filePath => {
        if (path.extname(filePath) === '.txt') {
            console.log(`Archivo agregado: ${filePath}`);
            processTxtFile(filePath);
        }
    })
    .on('error', error => console.error(`Watcher error: ${error}`));

console.log(`Monitoreando cambios en el directorio: ${directoryPath}`);

// Servir el frontend
app.use(express.static('dist'));

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
