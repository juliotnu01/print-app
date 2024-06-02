// src/main.js
document.getElementById('printButton').addEventListener('click', () => {
  const content = document.getElementById('content').value;

  fetch('http://localhost:3000/print', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })
    .then(response => response.json())
    .then(data => {
      console.log('Impresión enviada:', data.message);
    })
    .catch(error => {
      console.error('Error al imprimir:', error);
    });
});
