document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega os dados que vieram do Banco de Dados (Python)
    let s_hora = window.TEMPO_SERVIDOR.hora;
    let s_dia = window.TEMPO_SERVIDOR.dia;
    let s_mes = window.TEMPO_SERVIDOR.mes;
    let s_ano = window.TEMPO_SERVIDOR.ano;

    // 2. Verifica se o jogador usou o "Avançar Tempo" comparando com o último registro
    let ultimaHoraServer = Number(localStorage.getItem('agro_server_h'));
    let ultimoDiaServer = Number(localStorage.getItem('agro_server_d'));

    if (ultimaHoraServer !== s_hora || ultimoDiaServer !== s_dia) {
        // O tempo no servidor mudou de propósito! Vamos resetar o relógio local.
        localStorage.setItem('agro_server_h', s_hora);
        localStorage.setItem('agro_server_d', s_dia);

        localStorage.setItem('agro_local_h', s_hora);
        localStorage.setItem('agro_local_min', 0); // Zera os minutos
        localStorage.setItem('agro_local_d', s_dia);
        localStorage.setItem('agro_local_m', s_mes);
        localStorage.setItem('agro_local_a', s_ano);
    }

    // 3. Carrega o tempo CORRENTE da memória do navegador
    let horaJogo = Number(localStorage.getItem('agro_local_h')) || s_hora;
    let minutoJogo = Number(localStorage.getItem('agro_local_min')) || 0;
    let diaJogo = Number(localStorage.getItem('agro_local_d')) || s_dia;
    let mesJogo = Number(localStorage.getItem('agro_local_m')) || s_mes;
    let anoJogo = Number(localStorage.getItem('agro_local_a')) || s_ano;

    // Função de Estação
    function obterEstacao(mes) {
        if (mes === 12 || mes === 1 || mes === 2) return "VERÃO";
        if (mes >= 3 && mes <= 5) return "OUTONO";
        if (mes >= 6 && mes <= 8) return "INVERNO";
        return "PRIMAVERA";
    }

    // Função que desenha na tela
    function atualizarTelaTempo() {
        let displayRelogio = document.getElementById('relogio-real');
        let displayData = document.getElementById('data-jogo');
        let displayEstacao = document.getElementById('estacao-jogo');

        if (displayRelogio) displayRelogio.innerText = String(horaJogo).padStart(2, '0') + ":" + String(minutoJogo).padStart(2, '0');
        if (displayData) displayData.innerText = String(diaJogo).padStart(2, '0') + "/" + String(mesJogo).padStart(2, '0') + "/" + anoJogo;
        if (displayEstacao) displayEstacao.innerHTML = `<i class="fas fa-leaf" style="color: #4caf50;"></i> ${obterEstacao(mesJogo)}`;
    }

    atualizarTelaTempo();

    // 4. O Motor: Roda a cada 1 segundo e SALVA na memória
    setInterval(function() {
        minutoJogo++;
        if (minutoJogo >= 60) {
            minutoJogo = 0;
            horaJogo++;
            if (horaJogo >= 24) {
                horaJogo = 0;
                diaJogo++;
                if (diaJogo > 30) {
                    diaJogo = 1;
                    mesJogo++;
                    if (mesJogo > 12) {
                        mesJogo = 1;
                        anoJogo++;
                    }
                }
            }
        }
        
        // Salva o progresso
        localStorage.setItem('agro_local_h', horaJogo);
        localStorage.setItem('agro_local_min', minutoJogo);
        localStorage.setItem('agro_local_d', diaJogo);
        localStorage.setItem('agro_local_m', mesJogo);
        localStorage.setItem('agro_local_a', anoJogo);

        atualizarTelaTempo();
    }, 1000); 
});

// --- FUNÇÃO PARA AVANÇAR O TEMPO VIA SERVIDOR ---
window.confirmarAvanco = function(horas, custo) {
    // 1. Esconde o modal para evitar cliques duplos
    document.getElementById('modal-tempo').style.display = 'none';
    
    // 2. Envia a ordem para o backend
    fetch('/api/avancar_tempo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ horas: horas, custo: custo })
    })
    .then(r => r.json())
    .then(d => {
        if(d.sucesso) {
            // Se deu certo, recarrega a página para puxar os dados novos
            location.reload();
        } else {
            // Se não tem dinheiro, mostra o erro
            alert("Erro: " + d.erro);
        }
    })
    .catch(e => {
        console.error(e);
        alert("Erro de comunicação com o servidor.");
    });
};
