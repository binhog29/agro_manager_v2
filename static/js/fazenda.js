// Desativa o pulo nativo do navegador
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.PRECOS_BASE = {};

// Força o recarregamento limpo quando o utilizador usa o botão de voltar do telemóvel
window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // 🔥 CORREÇÃO 1: Força a tela a acender imediatamente (Desbuga a tela preta)
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease';
    
    // Salva e atualiza o destino limpo da sede atual
    sessionStorage.setItem('url_ultima_fazenda', window.location.href);

    // 1. Restaura o scroll instantaneamente (sem pular na frente do jogador)
    const scrollPos = localStorage.getItem('scroll_pos_fazenda');
    if (scrollPos) {
        window.scrollTo(0, parseInt(scrollPos));
    }

    // 🔥 CORREÇÃO 2: Processa o tempo offline em segundo plano sem travar a tela
    fetch('/api/tempo/sincronizar_offline', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        // Se aconteceu algo offline, acende a caixa de correio na hora
        if(d.sucesso && d.horas > 0 && typeof window.checarNotificacoes === 'function') {
            window.checarNotificacoes();
        }
    }).catch(e => console.log("Aviso: Sincronização offline rodando no fundo."));

    fetch('/api/mercado/precos')
        .then(r => r.json())
        .then(data => { window.PRECOS_BASE = data; })
        .catch(e => console.log("Aviso: Falha ao carregar preços do mercado."));
        
    const abaSalva = localStorage.getItem('aba_ativa_fazenda') || 'sede';
    window.trocarAba(abaSalva);

    const modalSalvo = localStorage.getItem('modal_aberto_fazenda');
    if (modalSalvo) {
        const modalEl = document.getElementById(modalSalvo);
        // Remove a animação só nessa abertura automática para não bugar
        if (modalEl) {
            modalEl.style.transition = 'none'; 
            modalEl.style.display = 'flex';
            setTimeout(() => modalEl.style.transition = '', 50);
        }
        localStorage.removeItem('modal_aberto_fazenda');
    }
});

window.addEventListener('beforeunload', () => {
    // Esconde a página suavemente antes de recarregar
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.2s ease';
    
    localStorage.setItem('scroll_pos_fazenda', window.scrollY);
    
    let modalAtivo = '';
    document.querySelectorAll('div[id^="modal-"]').forEach(m => {
        if (m.style.display === 'flex' || m.style.display === 'block') {
            modalAtivo = m.id;
        }
    });
    
    if (modalAtivo) localStorage.setItem('modal_aberto_fazenda', modalAtivo);
    else localStorage.removeItem('modal_aberto_fazenda');
});

// --- FUNÇÕES DE NAVEGAÇÃO DE ABAS ---
window.trocarAba = function(nomeDaAba, elementoBotao = null) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    
    const view = document.getElementById('view-' + nomeDaAba);
    if(view) {
        view.classList.add('active');
    } else {
        const viewSede = document.getElementById('view-sede');
        if(viewSede) viewSede.classList.add('active');
        nomeDaAba = 'sede';
    }
    
    if(elementoBotao) {
        elementoBotao.classList.add('active');
    } else {
        const botaoAutomatico = document.getElementById('btn-' + nomeDaAba);
        if(botaoAutomatico) botaoAutomatico.classList.add('active');
    }
    
    localStorage.setItem('aba_ativa_fazenda', nomeDaAba);
};

// --- FUNÇÕES GERAIS DE MODAL ---
window.abrirModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'flex';
    } else {
        console.error("ERRO: O modal '" + id + "' não foi encontrado no HTML!");
    }
};

window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
};

window.fecharSeClicarFora = function(event, id) {
    if (event.target.id === id) {
        window.fecharModal(id);
    }
};

// ==========================================
// MÓDULO SOCIAL E CHAT GLOBAL
// ==========================================
window.abrirChatGlobal = function() {
    const htmlConteudo = `
        <div style="background: #1e1e1e; padding: 10px; border-radius: 8px; height: 350px; display: flex; flex-direction: column;">
            <div id="chat-mensagens" style="flex: 1; overflow-y: auto; background: #121212; border-radius: 6px; padding: 10px; margin-bottom: 10px; text-align: left; font-size: 13px; border: 1px solid #333;">
                <div style="color: #aaa; text-align: center;">Carregando mensagens da comunidade...</div>
            </div>
            <div style="display: flex; gap: 5px;">
                <input type="text" id="chat-input" placeholder="Diga olá para os fazendeiros..." style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; outline: none; font-family: 'Poppins', sans-serif;">
                <button onclick="enviarMensagemChat()" style="background: #9c27b0; color: white; border: none; padding: 0 15px; border-radius: 6px; font-weight: bold; cursor: pointer;"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    
    Swal.fire({
        title: '<div style="color: #ce93d8;"><i class="fas fa-comments"></i> Comunidade</div>',
        html: htmlConteudo,
        background: '#1a1a1a', color: '#fff',
        showConfirmButton: false, showCloseButton: true,
        didOpen: () => {
            carregarMensagensChat();
            window.chatInterval = setInterval(carregarMensagensChat, 3000);
            document.getElementById('chat-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') enviarMensagemChat();
            });
        },
        willClose: () => { clearInterval(window.chatInterval); }
    });
};

window.carregarMensagensChat = async function() {
    try {
        const res = await fetch('/api/chat/listar');
        const data = await res.json();
        if (data.sucesso) {
            const box = document.getElementById('chat-mensagens');
            if (!box) return;
            const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 20;
            
            box.innerHTML = data.mensagens.map(m => {
                let corNome = m.is_admin ? '#ffb300' : '#4caf50';
                let badge = m.is_admin ? '👑' : `<span style="color:#888; font-size:10px;">[Nvl ${m.nivel}]</span>`;
                return `<div style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 5px;">
                            <span style="font-weight: bold; color: ${corNome};">${badge} ${m.autor}:</span> 
                            <span style="color: #ddd;">${m.texto}</span>
                        </div>`;
            }).join('');
            
            if (isScrolledToBottom) { box.scrollTop = box.scrollHeight; }
        }
    } catch(e) { console.error("Erro no chat", e); }
};

window.enviarMensagemChat = async function() {
    const input = document.getElementById('chat-input');
    const texto = input.value;
    if (!texto.trim()) return;
    input.value = '';
    input.focus();
    
    await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ texto: texto })
    });
    carregarMensagensChat();
};

window.abrirPainelCotacoes = function() {
    Swal.fire({ title: 'Buscando cotações...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/cotacoes_diarias').then(r => r.json()).then(d => {
        if(d.sucesso) {
            let html = '<div style="text-align:left; font-size:14px; max-height:60vh; overflow-y:auto; padding-right:5px;">';
            
            html += `<div style="color:#aaa; font-size:12px; margin-bottom:15px; text-align:center; background:#222; padding:8px; border-radius:6px; border:1px solid #333;">Fator de Mercado Atual: <b style="color:${d.fator >= 1 ? '#4caf50' : '#f44336'}; font-size:14px;">${Math.round(d.fator * 100)}%</b></div>`;
            
            // Bovinos (@)
            html += '<h4 style="color:#ff9800; border-bottom:1px solid #444; padding-bottom:5px; margin-top:0;"><i class="fas fa-cow"></i> Bovinos (Preço por Arroba)</h4>';
            for(let [nome, preco] of Object.entries(d.gado_arroba)) {
                html += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #333; font-size:13px;">
                            <span>${nome}</span> <b style="color:#ff9800;">R$ ${preco.toFixed(2).replace('.',',')} / @</b>
                         </div>`;
            }
            
            // Outros Animais (Kg)
            html += '<h4 style="color:#ff5722; border-bottom:1px solid #444; padding-bottom:5px; margin-top:15px;"><i class="fas fa-piggy-bank"></i> Outros Animais (Preço por Kg)</h4>';
            for(let [nome, preco] of Object.entries(d.gado_kg)) {
                html += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #333; font-size:13px;">
                            <span>${nome}</span> <b style="color:#ff5722;">R$ ${preco.toFixed(2).replace('.',',')} / kg</b>
                         </div>`;
            }

            // Derivados
            html += '<h4 style="color:#03a9f4; border-bottom:1px solid #444; padding-bottom:5px; margin-top:15px;"><i class="fas fa-glass-whiskey"></i> Laticínios e Derivados</h4>';
            for(let [nome, preco] of Object.entries(d.derivados)) {
                html += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #333; font-size:13px;">
                            <span>${nome}</span> <b style="color:#03a9f4;">R$ ${preco.toFixed(2).replace('.',',')}</b>
                         </div>`;
            }
            
            // Agricultura
            html += '<h4 style="color:#8bc34a; border-bottom:1px solid #444; padding-bottom:5px; margin-top:15px;"><i class="fas fa-seedling"></i> Agricultura (Preço por Kg)</h4>';
            for(let [nome, preco] of Object.entries(d.culturas)) {
                html += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #333; font-size:13px;">
                            <span>${nome}</span> <b style="color:#8bc34a;">R$ ${preco.toFixed(2).replace('.',',')} / kg</b>
                         </div>`;
            }
            
            html += '</div>';
            
            Swal.fire({
                title: '📈 Cotações de Hoje',
                html: html,
                background: '#1a1a1a', color: '#fff',
                confirmButtonText: 'Voltar', confirmButtonColor: '#555'
            });
        } else {
            Swal.fire('Erro', 'Não foi possível carregar as cotações.', 'error');
        }
    });
}

// ==========================================
// MÓDULO DE CONSTRUÇÃO DE INSTALAÇÕES
// ==========================================
window.construirInstalacao = function(tipo, nomeExibicao, custo) {
    const fazendaId = window.location.pathname.split('/').pop();
    
    Swal.fire({
        title: `Construir ${nomeExibicao.toUpperCase()}`,
        text: `Esta obra vai custar R$ ${custo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Confirma?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2e7d32',
        cancelButtonColor: '#555',
        confirmButtonText: 'Construir',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff'
    }).then((res) => {
        if (res.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/fazenda/construir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: tipo, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            }).catch(() => Swal.fire('Erro', 'Falha de comunicação.', 'error'));
        }
    });
};

// Alias para alinhar com os botões simplificados do HTML (ex: represa, chiqueiro, galinheiro)
window.construir = function(tipo, custo) {
    const nomesBonitos = {
        'represa': 'Represa',
        'chiqueiro': 'Chiqueiro',
        'galinheiro': 'Galinheiro',
        'aprisco': 'Aprisco',
        'haras': 'Haras'
    };
    const nomeExibicao = nomesBonitos[tipo] || tipo;
    window.construirInstalacao(tipo, nomeExibicao, custo);
};

function iniciarIrrigadoresJS() {
    const aspersores = document.querySelectorAll('.aspersor-agua');

    aspersores.forEach(el => {
        // Limpa qualquer canvas anterior para garantir que reinicia
        el.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        el.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        let anguloJato = 0;
        const gotas = [];

        function animar() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Rotação contínua do aspersor
            anguloJato += 0.08; 

            // Dispara gotículas em 2 direções opostas
            for (let i = 0; i < 2; i++) {
                const anguloBase = anguloJato + (i * Math.PI);
                const dispersao = (Math.random() - 0.5) * 0.35; // Leve leque de água
                const anguloFinal = anguloBase + dispersao;
                const velocidade = 2.0 + Math.random() * 1.2;

                gotas.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(anguloFinal) * velocidade,
                    vy: Math.sin(anguloFinal) * velocidade,
                    vida: 0,
                    vidaMaxima: 14 + Math.random() * 6,
                    tamanho: 0.9 + Math.random() * 0.8 // Tamanho ideal para ser visível sem engrossar
                });
            }

            // Renderiza cada gota
            for (let i = gotas.length - 1; i >= 0; i--) {
                const g = gotas[i];
                g.x += g.vx;
                g.y += g.vy;
                g.vida++;

                const opacidade = (1 - (g.vida / g.vidaMaxima)) * 0.8;

                ctx.beginPath();
                ctx.arc(g.x, g.y, g.tamanho, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(220, 245, 255, ${opacidade})`;
                ctx.fill();

                if (g.vida >= g.vidaMaxima) {
                    gotas.splice(i, 1);
                }
            }

            requestAnimationFrame(animar);
        }

        animar();
    });
}

// Executa a função
iniciarIrrigadoresJS();


// 🌊 BRILHO E MOVIMENTO DO LAGO (Suporta múltiplos pontos no mapa)
function criarMovimentoLago() {
    const containers = document.querySelectorAll('.container-lago, #container-lago');
    
    containers.forEach(container => {
        container.innerHTML = ''; 

        const rect = container.getBoundingClientRect();
        const largura = rect.width || container.clientWidth || 100;
        const altura = rect.height || container.clientHeight || 100;

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Quantidade de traços proporcional ao tamanho do container
        const qtdMarolas = Math.max(5, Math.floor((largura * altura) / 400));
        const marolas = [];

        for (let i = 0; i < qtdMarolas; i++) {
            marolas.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                comprimento: 8 + Math.random() * 14,
                espessura: 1.2 + Math.random() * 1.2,
                opacidade: Math.random() * 0.4,
                velocidade: 0.006 + Math.random() * 0.01,
                crescendo: Math.random() > 0.5
            });
        }

        function animarLago() {
            ctx.clearRect(0, 0, largura, altura);

            marolas.forEach(m => {
                if (m.crescendo) {
                    m.opacidade += m.velocidade;
                    if (m.opacidade >= 0.55) m.crescendo = false;
                } else {
                    m.opacidade -= m.velocidade;
                    if (m.opacidade <= 0.03) {
                        m.crescendo = true;
                        m.x = Math.random() * Math.max(5, largura - m.comprimento);
                        m.y = Math.random() * altura;
                    }
                }

                const grad = ctx.createLinearGradient(m.x, m.y, m.x + m.comprimento, m.y);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                grad.addColorStop(0.5, `rgba(255, 255, 255, ${m.opacidade.toFixed(2)})`);
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = grad;
                ctx.fillRect(m.x, m.y, m.comprimento, m.espessura);
            });

            requestAnimationFrame(animarLago);
        }

        animarLago();
    });
}

// Inicialização conjunta
function inicializarEfeitosAgua() {
    criarCachoeiras();
    criarMovimentoLago();
}

document.addEventListener('DOMContentLoaded', inicializarEfeitosAgua);
window.addEventListener('load', inicializarEfeitosAgua);


// 🏞️ ANIMAÇÃO DAS CACHOEIRAS
function criarCachoeiras() {
    const containers = document.querySelectorAll('.container-cachoeira');
    
    containers.forEach(container => {
        container.innerHTML = ''; 

        const largura = container.clientWidth || 25;
        const altura = container.clientHeight || 50;

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const filetes = [];
        const espumas = [];

        for (let i = 0; i < 22; i++) {
            filetes.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                comprimento: 6 + Math.random() * 12,
                velocidade: 2.5 + Math.random() * 2.5,
                largura: 0.8 + Math.random() * 1.2,
                opacidade: 0.3 + Math.random() * 0.5,
                fase: Math.random() * Math.PI * 2
            });
        }

        function animarCachoeira() {
            ctx.clearRect(0, 0, largura, altura);

            filetes.forEach(f => {
                f.fase += 0.08;
                const desvioX = Math.sin(f.fase) * 0.4;

                const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.comprimento);
                grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
                grad.addColorStop(0.3, `rgba(255, 255, 255, ${f.opacidade})`);
                grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = f.largura;
                ctx.beginPath();
                ctx.moveTo(f.x + desvioX, f.y);
                ctx.lineTo(f.x + desvioX, f.y + f.comprimento);
                ctx.stroke();

                f.y += f.velocidade;

                if (f.y >= altura - 2) {
                    f.y = -f.comprimento;
                    f.x = Math.random() * largura;

                    espumas.push({
                        x: f.x + (Math.random() - 0.5) * 4,
                        y: altura - 1,
                        raio: 0.8 + Math.random() * 1.5,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: -(Math.random() * 0.8),
                        opacidade: 0.6
                    });
                }
            });

            for (let i = espumas.length - 1; i >= 0; i--) {
                const e = espumas[i];
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.raio, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${e.opacidade})`;
                ctx.fill();

                e.x += e.vx;
                e.y += e.vy;
                e.raio += 0.05;
                e.opacidade -= 0.04;

                if (e.opacidade <= 0) {
                    espumas.splice(i, 1);
                }
            }

            requestAnimationFrame(animarCachoeira);
        }

        animarCachoeira();
    });
}

// 🚀 EXECUÇÃO CONJUNTA
function inicializarEfeitosAgua() {
    criarCachoeiras();
    criarMovimentoLago('container-lago');
}

document.addEventListener('DOMContentLoaded', inicializarEfeitosAgua);
window.addEventListener('load', inicializarEfeitosAgua);
