// src/main.js
// document.getElementById('printButton').addEventListener('click', () => {
//   const content = document.getElementById('content').value;

//   fetch('http://localhost:3001/posts', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body:
//   })
//     .then(response => response.json())
//     .then(data => {
//       console.log(

//         { resultado: data }
//       );
//     })
//     .catch(error => {
//       console.error('Error al imprimir:', error);
//     });
// });
import Echo from "laravel-echo";
window.io = require('socket.io-client');

window.Echo = new Echo({
  broadcaster: 'socket.io',
  host: 'http://185.217.126.117:6001'
});

window.Echo.channel('print-channel')
  .listen('printEvent', (e) => {
    console.log(e.data);
  });