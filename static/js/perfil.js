function salvarPerfil() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const alertaBox = document.getElementById('alerta-box');

    fetch('/api/perfil/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_nome: nome, novo_email: email, nova_senha: senha })
    })
    .then(r => r.json())
    .then(data => {
        if (data.sucesso) {
            alertaBox.innerHTML = `<div class="msg-alerta msg-sucesso"><i class="fas fa-check-circle"></i> ${data.msg}</div>`;
            setTimeout(() => location.reload(), 1500); // Atualiza a página após 1,5s
        } else {
            alertaBox.innerHTML = `<div class="msg-alerta msg-erro"><i class="fas fa-exclamation-circle"></i> ${data.msg}</div>`;
        }
    })
    .catch(erro => console.error("Erro:", erro));
}
