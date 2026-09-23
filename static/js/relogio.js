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

    // CAIXA DE CORREIO
    if (!document.getElementById('btn-caixa-entrada')) {
        const bellHTML = `
            <div id="btn-caixa-entrada" onclick="abrirCaixaEntrada()" style="position: fixed; bottom: 145px; right: 20px; background: #ff9800; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); z-index: 1000; cursor: pointer; font-size: 22px;">
                <i class="fas fa-envelope"></i>
                <span id="badge-notificacoes" style="display: none; position: absolute; top: -4px; right: -4px; background: #d32f2f; color: white; font-size: 12px; font-weight: bold; width: 22px; height: 22px; border-radius: 50%; align-items: center; justify-content: center; border: 2px solid #fff;">!</span>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', bellHTML);
    }

    // MAPEADOR DE LÂMPADAS (Não bloqueia botões e registra no F12)
    const containerMapa = document.getElementById('container-mapa');
    if (containerMapa) {
        containerMapa.addEventListener('click', function(e) {
            if (e.target.closest('button, a, .btn, [onclick], #btn-caixa-entrada, .modal')) return;

            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const leftPercent = ((x / rect.width) * 100).toFixed(1);
            const topPercent = ((y / rect.height) * 100).toFixed(1);

            const codigo = `<div class="lampada" style="top: ${topPercent}%; left: ${leftPercent}%;"></div>`;

            console.log("📍 NOVA LÂMPADA MAPEADA:", codigo);
        });
    }

    // 1. Pega os dados que vieram do Banco de Dados (Python)
    if (window.TEMPO_SERVIDOR) {
        let s_hora = Number(window.TEMPO_SERVIDOR.hora);
        let s_dia = Number(window.TEMPO_SERVIDOR.dia);
        let s_mes = Number(window.TEMPO_SERVIDOR.mes);
        let s_ano = Number(window.TEMPO_SERVIDOR.ano);

        // 2. Verifica se o servidor atualizou comparando hora, dia, mês e ano
        let ultimaHoraServer = Number(localStorage.getItem('agro_server_h'));
        let ultimoDiaServer = Number(localStorage.getItem('agro_server_d'));
        let ultimoMesServer = Number(localStorage.getItem('agro_server_m'));
        let ultimoAnoServer = Number(localStorage.getItem('agro_server_a'));

        if (
            ultimaHoraServer !== s_hora || 
            ultimoDiaServer !== s_dia || 
            ultimoMesServer !== s_mes || 
            ultimoAnoServer !== s_ano
        ) {
            localStorage.setItem('agro_server_h', s_hora);
            localStorage.setItem('agro_server_d', s_dia);
            localStorage.setItem('agro_server_m', s_mes);
            localStorage.setItem('agro_server_a', s_ano);

            localStorage.setItem('agro_local_h', s_hora);
            localStorage.setItem('agro_local_min', 0); 
            localStorage.setItem('agro_local_d', s_dia);
            localStorage.setItem('agro_local_m', s_mes);
            localStorage.setItem('agro_local_a', s_ano);
        }

        // 3. Carrega o tempo CORRENTE da memória do navegador
        let horaJogo = localStorage.getItem('agro_local_h') !== null ? Number(localStorage.getItem('agro_local_h')) : s_hora;
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

            window.atualizarCicloDiaNoite(horaJogo, minutoJogo);
        }

        window.definirTempoJogo = function(h, m, d, mes, a) {
            if (h !== undefined && h !== null) horaJogo = Number(h);
            if (m !== undefined && m !== null) minutoJogo = Number(m);
            if (d !== undefined && d !== null) diaJogo = Number(d);
            if (mes !== undefined && mes !== null) mesJogo = Number(mes);
            if (a !== undefined && a !== null) anoJogo = Number(a);

            localStorage.setItem('agro_local_h', horaJogo);
            localStorage.setItem('agro_local_min', minutoJogo);
            localStorage.setItem('agro_local_d', diaJogo);
            localStorage.setItem('agro_local_m', mesJogo);
            localStorage.setItem('agro_local_a', anoJogo);

            atualizarTelaTempo();
        };

        atualizarTelaTempo();

        // 4. O Motor: Roda a cada 500ms e SALVA na memória
        setInterval(function() {
            minutoJogo++;
            if (minutoJogo >= 60) {
                minutoJogo = 0;
                horaJogo++;
                if (horaJogo >= 24) {
                    horaJogo = 0;
                    diaJogo++;

                    if (typeof window.buscarClimaAtual === 'function') {
                        window.buscarClimaAtual();
                    }

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

        if (window.TEMPO_SERVIDOR.clima) {
            window.atualizarEfeitoClima(window.TEMPO_SERVIDOR.clima);
        }
    }
});

// ==========================================
// BUSCAR CLIMA DO SERVIDOR QUANDO O DIA VIRA
// ==========================================
window.buscarClimaAtual = function() {
    fetch('/api/clima_atual')
    .then(r => r.json())
    .then(d => {
        if (d.clima && typeof window.atualizarEfeitoClima === 'function') {
            window.atualizarEfeitoClima(d.clima);
        }
    })
    .catch(() => {});
};

// ==========================================
// CLIMA EXCLUSIVO DO MAPA COM RAIO INSTANTÂNEO
// ==========================================
let animacaoChuva = null;
let gotas = [];

function redimensionarCanvas() {
    const canvasChuva = document.getElementById('canvas-chuva');
    const container = document.getElementById('container-mapa');
    if (!canvasChuva || !container) return;

    canvasChuva.width = container.clientWidth;
    canvasChuva.height = container.clientHeight;

    gotas = [];
    for (let i = 0; i < 65; i++) {
        gotas.push({
            x: Math.random() * canvasChuva.width,
            y: Math.random() * canvasChuva.height,
            tam: Math.random() * 10 + 6,
            vel: Math.random() * 8 + 10
        });
    }
}

function desenharChuva() {
    const canvasChuva = document.getElementById('canvas-chuva');
    if (!canvasChuva) return;
    const ctxChuva = canvasChuva.getContext('2d');
    if (!ctxChuva) return;

    ctxChuva.clearRect(0, 0, canvasChuva.width, canvasChuva.height);
    ctxChuva.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctxChuva.lineWidth = 1.2;
    ctxChuva.beginPath();

    for (let g of gotas) {
        ctxChuva.moveTo(g.x, g.y);
        ctxChuva.lineTo(g.x - 2, g.y + g.tam);
        g.y += g.vel;
        g.x -= 1;
        if (g.y > canvasChuva.height) {
            g.y = -g.tam;
            g.x = Math.random() * canvasChuva.width;
        }
    }
    ctxChuva.stroke();
    animacaoChuva = requestAnimationFrame(desenharChuva);
}

function dispararClarao() {
    const divRaio = document.getElementById('efeito-raio');
    if (!divRaio) return;
    divRaio.style.backgroundColor = 'rgba(255, 255, 255, 0.75)';
    setTimeout(() => divRaio.style.backgroundColor = 'transparent', 60);
    setTimeout(() => divRaio.style.backgroundColor = 'rgba(255, 255, 255, 0.35)', 120);
    setTimeout(() => divRaio.style.backgroundColor = 'transparent', 220);
}

window.atualizarEfeitoClima = function(estadoClima) {
    const canvas = document.getElementById('canvas-chuva');
    const divRaio = document.getElementById('efeito-raio');

    if (animacaoChuva) cancelAnimationFrame(animacaoChuva);

    const ehTempestade = (estadoClima === 'tempestade' || estadoClima === 'raio');
    const ehChuva = (estadoClima === 'chuvoso' || estadoClima === 'chuva' || ehTempestade);

    if (ehChuva) {
        if (canvas) {
            canvas.style.display = 'block';
            redimensionarCanvas();
            desenharChuva();
        }
    } else {
        if (canvas) canvas.style.display = 'none';
    }

    if (ehTempestade) {
        if (divRaio) divRaio.style.display = 'block';
        dispararClarao();

        if (!window.loopRaio) {
            window.loopRaio = setInterval(() => {
                if (Math.random() < 0.60) {
                    dispararClarao();
                }
            }, 2000);
        }
    } else {
        if (divRaio) divRaio.style.display = 'none';
        if (window.loopRaio) {
            clearInterval(window.loopRaio);
            window.loopRaio = null;
        }
    }
};

window.addEventListener('resize', redimensionarCanvas);

// ==========================================
// FUNÇÕES DOS MODAIS E AVANÇAR TEMPO
// ==========================================
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
            if (d.clima && typeof window.atualizarEfeitoClima === 'function') {
                window.atualizarEfeitoClima(d.clima);
            }

            let novaHora = undefined;
            let novoMinuto = 0;

            if (d.hora) {
                let partes = d.hora.split(':');
                if (partes.length === 2) {
                    novaHora = parseInt(partes[0], 10);
                    novoMinuto = parseInt(partes[1], 10);
                    localStorage.setItem('agro_server_h', novaHora);
                }
            }

            let novoDia = d.dia !== undefined ? parseInt(d.dia, 10) : undefined;
            let novoMes = d.mes !== undefined ? parseInt(d.mes, 10) : undefined;
            let novoAno = d.ano !== undefined ? parseInt(d.ano, 10) : undefined;

            if (novoDia !== undefined) localStorage.setItem('agro_server_d', novoDia);
            if (novoMes !== undefined) localStorage.setItem('agro_server_m', novoMes);
            if (novoAno !== undefined) localStorage.setItem('agro_server_a', novoAno);

            if (typeof window.definirTempoJogo === 'function') {
                window.definirTempoJogo(novaHora, novoMinuto, novoDia, novoMes, novoAno);
            }

            if (d.avisos && d.avisos.length > 0) {
                window.mostrarAvisoCustomizado(d.avisos.join("\n"));
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
            const badge = document.getElementById('badge-notificacoes');
            if (badge) badge.style.display = 'none';

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

setTimeout(window.checarNotificacoes, 1000);

// ==========================================
// CICLO DIA / NOITE, LÂMPADAS, VAGALUMES E FAROL
// ==========================================
window.atualizarCicloDiaNoite = function(h, m) {
    let hora = h;
    let minuto = m;

    if (hora === undefined || minuto === undefined) {
        hora = Number(localStorage.getItem('agro_local_h')) || 12;
        minuto = Number(localStorage.getItem('agro_local_min')) || 0;
    }

    const tempoEmMinutos = hora * 60 + minuto;

    const overlay = document.getElementById('noite-overlay');
    const lampadas = document.querySelectorAll('.lampada, .vela, .farol-carro'); 
    const vagalumes = document.querySelectorAll('.vagalume');

    let opacidadeNoite = 0;
    let acenderLuzes = false;

    if (tempoEmMinutos >= 330 && tempoEmMinutos < 420) {
        const progresso = (tempoEmMinutos - 330) / 90;
        opacidadeNoite = 0.65 * (1 - progresso);
        acenderLuzes = tempoEmMinutos < 360;

    } else if (tempoEmMinutos >= 420 && tempoEmMinutos < 1050) {
        opacidadeNoite = 0;
        acenderLuzes = false;

    } else if (tempoEmMinutos >= 1050 && tempoEmMinutos < 1140) {
        const progresso = (tempoEmMinutos - 1050) / 90;
        opacidadeNoite = 0.65 * progresso;
        acenderLuzes = tempoEmMinutos >= 1110;

    } else {
        opacidadeNoite = 0.65;
        acenderLuzes = true;
    }

    if (overlay) {
        overlay.style.opacity = opacidadeNoite.toFixed(2);
    }

    lampadas.forEach(lampada => {
        if (acenderLuzes) {
            lampada.classList.add('acesa');
        } else {
            lampada.classList.remove('acesa');
        }
    });

    vagalumes.forEach(vagalume => {
        if (acenderLuzes) {
            vagalume.classList.add('aceso');
        } else {
            vagalume.classList.remove('aceso');
        }
    });
};

window.modoNoiteDevForcado = false;

if (typeof window.atualizarCicloDiaNoite === 'function') {
    const cicloOriginal = window.atualizarCicloDiaNoite;
    
    window.atualizarCicloDiaNoite = function(hora, minuto) {
        if (window.modoNoiteDevForcado) return;
        cicloOriginal(hora, minuto);
    };
}

// Botão 🌙 Noite (Modo Dev / ADM)
window.alternarModoNoiteDev = function() {
    window.modoNoiteDevForcado = !window.modoNoiteDevForcado;
    const btnNoite = document.querySelector('.btn-noite');
    
    const overlayNoite = document.getElementById('noite-overlay');
    const lampadas = document.querySelectorAll('.lampada, .vela, .farol-carro'); 
    const vagalumes = document.querySelectorAll('.vagalume');

    if (window.modoNoiteDevForcado) {
        if (overlayNoite) overlayNoite.style.opacity = '0.85';
        lampadas.forEach(l => l.classList.add('acesa'));
        vagalumes.forEach(v => v.classList.add('aceso'));
        
        if (btnNoite) btnNoite.style.backgroundColor = '#1565c0';
    } else {
        let h = parseInt(localStorage.getItem('agro_local_h'), 10) || 12;
        let m = parseInt(localStorage.getItem('agro_local_min'), 10) || 0;
        
        window.modoNoiteDevForcado = false;
        
        if (h >= 19 || h < 6) {
            if (overlayNoite) overlayNoite.style.opacity = '0.85';
            lampadas.forEach(l => l.classList.add('acesa'));
            vagalumes.forEach(v => v.classList.add('aceso'));
        } else {
            if (overlayNoite) overlayNoite.style.opacity = '0';
            lampadas.forEach(l => l.classList.remove('acesa'));
            vagalumes.forEach(v => v.classList.remove('aceso'));
        }
        
        if (btnNoite) btnNoite.style.backgroundColor = '#3d5af1';
    }
};