document.addEventListener('DOMContentLoaded', function() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');

    // 🔥 NOVIDADE: Lembrar Usuário na memória do celular
    const inputUsuario = document.querySelector('#form-login input[name="usuario"]');
    const checkLembrar = document.getElementById('lembrar-conta');

    if (inputUsuario && checkLembrar) {
        // Carrega o usuário salvo ao abrir a tela
        const usuarioSalvo = localStorage.getItem('agro_usuario_salvo');
        if (usuarioSalvo) {
            inputUsuario.value = usuarioSalvo;
            checkLembrar.checked = true;
        }

        // Salva o usuário ao enviar o formulário
        formLogin.addEventListener('submit', function() {
            if (checkLembrar.checked) {
                localStorage.setItem('agro_usuario_salvo', inputUsuario.value);
            } else {
                localStorage.removeItem('agro_usuario_salvo');
            }
        });
    }

    tabLogin.addEventListener('click', function() {
        tabLogin.classList.add('active');
        tabRegistro.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegistro.classList.add('hidden');
    });

    tabRegistro.addEventListener('click', function() {
        tabRegistro.classList.add('active');
        tabLogin.classList.remove('active');
        formRegistro.classList.remove('hidden');
        formLogin.classList.add('hidden');
    });
});
