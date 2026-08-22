document.addEventListener('DOMContentLoaded', () => {
    // 0. Injeta o HTML do Modal de Avisos Customizado se ele ainda não existir na página
    if (!document.getElementById('modal-aviso-custom')) {
        const modalHtml = `
        <div id="modal-aviso-custom" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.75); z-index: 99999; justify-content: center; align-items: center; font-family: sans-serif;">
            <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 25px; width: 90%; max-width: 420px; color: #fff; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                <div style="font-size: 32px; margin-bottom: 10px;">⚠️</div>
                <h3 style="margin: 0 0 15px 0; color: #ffcc00; font-size: 18px;">Acontecimentos na Fazenda</h3>
                <div id="texto-aviso-custom" style="margin-bottom: 20px; font-size: 14px; color: #ccc; line-height: 1.6; text-align: left; max-height: 160px; overflow-y: auto; background: #252525; padding: 10px; border-radius: 6px;"></div>
                <button onclick="window.fecharModalAvisoCustom()" style="background: #4caf50; color: white; border: none; padding: 11px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s;">OK</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

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

// Funções Globais de Controle do Modal de Avisos
window.mostrarAvisoCustomizado = function(mensagem) {
    const modal = document.getElementById('modal-aviso-custom');
    const texto = document.getElementById('texto-aviso-custom');
    if (modal && texto) {
        texto.innerHTML = mensagem.replace(/\n/g, '<br>');
        modal.style.display = 'flex';
    }
};

window.fecharModalAvisoCustom = function() {
    const modal = document.getElementById('modal-aviso-custom');
    if (modal) {
        modal.style.display = 'none';
        location.reload(); // Recarrega para atualizar os dados da fazenda após fechar
    }
};

// --- FUNÇÃO PARA AVANÇAR O TEMPO VIA SERVIDOR ---
window.confirmarAvanco = function(horas, custo) {
    // 1. Esconde o modal de escolha de tempo para evitar cliques duplos
    const modalTempo = document.getElementById('modal-tempo');
    if (modalTempo) modalTempo.style.display = 'none';
    
    // 2. Envia a ordem para o backend
    fetch('/api/avancar_tempo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ horas: horas, custo: custo })
    })
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            // Se houver avisos gerados pelo motor biológico (como mortes), exibe o modal elegante
            if (d.avisos && d.avisos.length > 0) {
                window.mostrarAvisoCustomizado(d.avisos.join("\n"));
            } else {
                location.reload();
            }
        } else {
            // Se não tem dinheiro, mostra o aviso bonito com SweetAlert
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: d.erro,
                background: '#1e1e1e',
                color: '#fff',
                confirmButtonColor: '#43a047'
            });
        }
    })
    .catch(e => {
        console.error(e);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro de comunicação com o servidor.',
            background: '#1e1e1e',
            color: '#fff',
            confirmButtonColor: '#d33'
        });
    });
};
