document.addEventListener('DOMContentLoaded', function() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');

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
