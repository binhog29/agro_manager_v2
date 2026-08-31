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

    // 🔥 CAIXA DE CORREIO: Posição ajustada para 145px (fica acima do botão de ajuda)
    if (!document.getElementById('btn-caixa-entrada')) {
        const bellHTML = `
            <div id="btn-caixa-entrada" onclick="abrirCaixaEntrada()" style="position: fixed; bottom: 145px; right: 20px; background: #ff9800; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); z-index: 1000; cursor: pointer; font-size: 22px;">
                <i class="fas fa-envelope"></i>
                <span id="badge-notificacoes" style="display: none; position: absolute; top: -4px; right: -4px; background: #d32f2f; color: white; font-size: 12px; font-weight: bold; width: 22px; height: 22px; border-radius: 50%; align-items: center; justify-content: center; border: 2px solid #fff;">!</span>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', bellHTML);
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
        localStorage.setItem('agro_server_h', s_hora);
        localStorage.setItem('agro_server_d', s_dia);

        localStorage.setItem('agro_local_h', s_hora);
        localStorage.setItem('agro_local_min', 0); 
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

    function obterEstacao(mes) {
        if (mes === 12 || mes === 1 || mes === 2) return "VERÃO";
        if (mes >= 3 && mes <= 5) return "OUTONO";
        if (mes >= 6 && mes <= 8) return "INVERNO";
        return "PRIMAVERA";
    }

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
        
        localStorage.setItem('agro_local_h', horaJogo);
        localStorage.setItem('agro_local_min', minutoJogo);
        localStorage.setItem('agro_local_d', diaJogo);
        localStorage.setItem('agro_local_m', mesJogo);
        localStorage.setItem('agro_local_a', anoJogo);

        atualizarTelaTempo();
    }, 500); 
});

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
        location.reload(); 
    }
};

window.confirmarAvanco = function(horas, custo) {
    const modalTempo = document.getElementById('modal-tempo');
    if (modalTempo) modalTempo.style.display = 'none';
    
    fetch('/api/avancar_tempo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ horas: horas, custo: custo })
    })
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            if (d.avisos && d.avisos.length > 0) {
                window.mostrarAvisoCustomizado(d.avisos.join("\n"));
            } else {
                location.reload();
            }
        } else {
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

// ==========================================
// FUNÇÕES DA CAIXA DE CORREIO
// ==========================================
window.abrirCaixaEntrada = function() {
    Swal.fire({ title: 'Buscando cartas...', didOpen: () => Swal.showLoading() });
    fetch('/api/notificacoes')
    .then(r => r.json())
    .then(d => {
        if(d.sucesso) {
            document.getElementById('badge-notificacoes').style.display = 'none';
            let html = '<div style="max-height: 50vh; overflow-y: auto; text-align: left; font-size: 13px;">';
            
            if(d.notificacoes.length === 0) {
                html += '<div style="text-align: center; color: #888; padding: 20px;"><i class="fas fa-inbox" style="font-size:30px; margin-bottom:10px; display:block;"></i>Nenhuma carta na sua caixa de correio.</div>';
            } else {
                d.notificacoes.forEach(n => {
                    let icone = n.texto.includes('Folha') ? 'fa-briefcase' : (n.texto.includes('morreu') ? 'fa-skull' : 'fa-info-circle');
                    let corBorder = n.texto.includes('morreu') ? '#f44336' : '#ff9800';
                    
                    html += `
                    <div style="background: #222; border-left: 4px solid ${corBorder}; padding: 10px; margin-bottom: 8px; border-radius: 4px; display:flex; gap: 10px; align-items:center;">
                        <i class="fas ${icone}" style="color:${corBorder}; font-size:18px;"></i>
                        <div>
                            <div style="color: #aaa; font-size: 10px; margin-bottom: 2px;">${n.data}</div>
                            <div style="color: #fff;">${n.texto}</div>
                        </div>
                    </div>`;
                });
            }
            html += '</div>';
            
            if(d.notificacoes.length > 0) {
                html += `<button onclick="limparCaixaEntrada()" style="width: 100%; margin-top: 15px; background: #d32f2f; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;"><i class="fas fa-trash"></i> Esvaziar Caixa</button>`;
            }
            
            Swal.fire({
                title: '📫 Caixa de Correio',
                html: html,
                background: '#1a1a1a', color: '#fff',
                showConfirmButton: false, showCloseButton: true
            });
        }
    });
};

window.limparCaixaEntrada = function() {
    Swal.fire({title: 'Limpando...', didOpen:()=>Swal.showLoading()});
    fetch('/api/notificacoes/limpar', {method:'POST'})
    .then(r=>r.json()).then(d => { if(d.sucesso) window.abrirCaixaEntrada(); });
};

window.checarNotificacoes = function() {
    fetch('/api/notificacoes/nao_lidas').then(r=>r.json()).then(d=>{
        const badge = document.getElementById('badge-notificacoes');
        if(badge && d.qtd > 0) {
            badge.style.display = 'flex';
            badge.innerText = d.qtd > 9 ? '9+' : d.qtd;
        }
    });
};

// Verifica os e-mails 1 segundo após a tela carregar
setTimeout(window.checarNotificacoes, 1000);
