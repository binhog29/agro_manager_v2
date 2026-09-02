// Desativa o pulo nativo do navegador
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.PRECOS_BASE = {};

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 CORREÇÃO 1: Força a tela a acender imediatamente (Desbuga a tela preta)
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease';

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
