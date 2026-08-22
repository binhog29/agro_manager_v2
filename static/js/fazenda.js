// --- INICIALIZAÇÃO DE SEGURANÇA E PREÇOS ---
window.PRECOS_BASE = {};

document.addEventListener('DOMContentLoaded', () => {
    // Busca a tabela de preços no servidor
    fetch('/api/mercado/precos')
        .then(r => r.json())
        .then(data => { window.PRECOS_BASE = data; })
        .catch(e => console.log("Aviso: Falha ao carregar preços do mercado."));
        
    // 1. RECUPERA A ABA SALVA E FORÇA A ABERTURA DELA
    const abaSalva = localStorage.getItem('aba_ativa_fazenda') || 'sede';
    window.trocarAba(abaSalva);

    // 2. RECUPERA MODAL SALVO E REABRE (O Pulo do Gato pro Curral!)
    const modalSalvo = localStorage.getItem('modal_aberto_fazenda');
    if (modalSalvo) {
        setTimeout(() => {
            const modalEl = document.getElementById(modalSalvo);
            if (modalEl) modalEl.style.display = 'flex';
            
            // Apaga a memória logo em seguida para não prender o jogador no modal
            localStorage.removeItem('modal_aberto_fazenda');
        }, 100);
    }

    // 3. RECUPERA A POSIÇÃO DA TELA (SCROLL)
    const scrollPos = localStorage.getItem('scroll_pos_fazenda');
    if (scrollPos) {
        setTimeout(() => window.scrollTo(0, parseInt(scrollPos)), 150);
    }
});

// 4. SALVA TUDO ANTES DE QUALQUER RELOAD
window.addEventListener('beforeunload', () => {
    localStorage.setItem('scroll_pos_fazenda', window.scrollY);
    
    let modalAtivo = '';
    document.querySelectorAll('div[id^="modal-"]').forEach(m => {
        if (m.style.display === 'flex' || m.style.display === 'block') {
            modalAtivo = m.id;
        }
    });
    
    if (modalAtivo) {
        localStorage.setItem('modal_aberto_fazenda', modalAtivo);
    } else {
        localStorage.removeItem('modal_aberto_fazenda');
    }
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
// NOVO RH DINÂMICO E PAINEL DE GESTÃO
// ==========================================
window.abrirModalFuncionarios = async function() {
    const prop_id = window.location.pathname.split('/').pop();

    Swal.fire({ title: 'Buscando dados do RH...', didOpen: () => Swal.showLoading() });

    try {
        // 1. Pergunta ao servidor quem já está contratado
        const res = await fetch(`/api/rh/listar/${prop_id}`);
        const data = await res.json();
        
        if (!data.sucesso) {
            Swal.fire('Erro', data.erro, 'error');
            return;
        }

        const equipeAtual = data.equipe;

        // 2. Catálogo de Funcionários Orientado a Objetos
        const catalogoRH = [
            { id: 'peoes', nome: 'Peão', custo: 1000, salario: 25, icone: 'fa-shield-alt', benef: 'Protege Animais' },
            { id: 'tratoristas', nome: 'Tratorista', custo: 2500, salario: 45, icone: 'fa-tractor', benef: '+15% Colheita' },
            { id: 'capatazes', nome: 'Capataz', custo: 10000, salario: 150, icone: 'fa-dollar-sign', benef: '+10% Venda' },
            { id: 'veterinarios', nome: 'Veterinário', custo: 8000, salario: 120, icone: 'fa-notes-medical', benef: 'Reduz Doenças' },
            { id: 'agronomos', nome: 'Agrônomo', custo: 9000, salario: 130, icone: 'fa-seedling', benef: 'Safra Rápida' }
        ];

        // 3. Monta a sessão "Equipe Ativa"
        let equipeHtml = '';
        let totalFolha = 0;

        catalogoRH.forEach(c => {
            let qtd = equipeAtual[c.id] || 0;
            if (qtd > 0) {
                totalFolha += (qtd * c.salario);
                equipeHtml += `
                <div style="background: #1a1a1a; padding: 10px; border-radius: 6px; margin-bottom: 6px; border-left: 4px solid #4caf50; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #fff; font-weight: bold; font-size: 14px;"><i class="fas ${c.icone}" style="color: #4caf50;"></i> ${qtd}x ${c.nome}</div>
                        <div style="font-size: 11px; color: #aaa;">Status: Trabalhando no campo</div>
                        <div style="font-size: 11px; color: #8bc34a; font-weight: bold;">Efeito ativo: ${c.benef}</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #ff5252; font-size: 13px; font-weight: bold;">R$ ${qtd * c.salario}/h</span>
                    </div>
                </div>`;
            }
        });

        if (equipeHtml === '') {
            equipeHtml = '<div style="text-align:center; padding: 15px; color:#888; font-size: 13px; background: #1a1a1a; border-radius: 6px; border: 1px dashed #444;">Sua fazenda não tem nenhum funcionário ainda.</div>';
        }

        // 4. Monta a sessão "Catálogo de Contratação"
        let listaContratacaoHtml = catalogoRH.map(c => `
            <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #444;">
                <div>
                    <h4 style="margin: 0; color: #fff; font-size: 15px;">${c.nome}</h4>
                    <span style="font-size: 12px; color: #ff5252; font-weight: bold;">Custo: R$ ${c.custo.toLocaleString('pt-BR')} (R$ ${c.salario}/h)</span>
                    <div style="font-size: 11px; color: #4caf50; margin-top: 3px; font-weight: bold;"><i class="fas ${c.icone}"></i> ${c.benef}</div>
                </div>
                <button style="padding: 8px 12px; font-size: 12px; background: #2e7d32; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;" onclick="Swal.close(); setTimeout(() => contratarFuncionario('${prop_id}', '${c.id}'), 300)">CONTRATAR</button>
            </div>
        `).join('');

        // 5. Junta tudo no visual final
        const htmlConteudo = `
            <div style="text-align: left; margin-top: 10px; font-family: 'Poppins', sans-serif;">
                
                <h4 style="color: #4caf50; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 5px;">
                    <i class="fas fa-users"></i> Sua Equipe
                    <span style="float: right; color: #ff5252; font-size: 12px;">Folha: R$ ${totalFolha}/h</span>
                </h4>
                
                <div style="max-height: 25vh; overflow-y: auto; margin-bottom: 20px; padding-right: 5px;">
                    ${equipeHtml}
                </div>

                <h4 style="color: #f9a825; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 5px;">
                    <i class="fas fa-briefcase"></i> Contratar Profissionais
                </h4>
                <p style="color: #aaa; font-size: 12px; margin-bottom: 10px;">Adicione novos membros para otimizar a produção:</p>
                
                <div style="max-height: 35vh; overflow-y: auto; padding-right: 5px;">
                    ${listaContratacaoHtml}
                </div>
            </div>
        `;
        
        Swal.fire({
            title: '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><img src="/static/img/rh.png" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.style.display=\'none\'"> Alojamento (RH)</div>',
            html: htmlConteudo,
            background: '#1e1e1e',
            color: '#fff',
            showConfirmButton: false,
            showCloseButton: true,
            width: '90%'
        });

    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Falha ao buscar dados do RH', 'error');
    }
}

window.contratarFuncionario = function(prop_id, cargo) {
    Swal.fire({
        title: 'Assinar Contrato',
        text: "Deseja contratar este profissional para a sua equipe?",
        icon: 'question',
        background: '#2a2a2a', color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#2e7d32',
        confirmButtonText: 'Sim, Contratar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando contratação...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/rh/contratar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ propriedade_id: prop_id, cargo: cargo })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Contratado!', d.msg, 'success').then(() => {
                        location.reload(); 
                    });
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            })
            .catch(e => {
                console.error(e);
                Swal.fire('Erro', 'Falha na conexão com o servidor.', 'error');
            });
        }
    });
}

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
        background: '#1a1a1a',
        color: '#fff',
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            carregarMensagensChat();
            // Atualiza as mensagens a cada 3 segundos silenciosamente
            window.chatInterval = setInterval(carregarMensagensChat, 3000);
            
            // Permite enviar apertando a tecla ENTER
            document.getElementById('chat-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') enviarMensagemChat();
            });
        },
        willClose: () => {
            clearInterval(window.chatInterval); // Desliga o motor do chat ao fechar a janela
        }
    });
};

window.carregarMensagensChat = async function() {
    try {
        const res = await fetch('/api/chat/listar');
        const data = await res.json();
        if (data.sucesso) {
            const box = document.getElementById('chat-mensagens');
            if (!box) return; // Segurança: se o modal já fechou, ignora
            
            // Descobre se o jogador estava lendo mensagens antigas (scroll para cima)
            const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 20;
            
            box.innerHTML = data.mensagens.map(m => {
                let corNome = m.is_admin ? '#ffb300' : '#4caf50';
                let badge = m.is_admin ? '👑' : `<span style="color:#888; font-size:10px;">[Nvl ${m.nivel}]</span>`;
                return `<div style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 5px;">
                            <span style="font-weight: bold; color: ${corNome};">${badge} ${m.autor}:</span> 
                            <span style="color: #ddd;">${m.texto}</span>
                        </div>`;
            }).join('');
            
            // Só rola pra baixo se o usuário já estava lá embaixo
            if (isScrolledToBottom) {
                box.scrollTop = box.scrollHeight;
            }
        }
    } catch(e) { console.error("Erro no chat", e); }
};

window.enviarMensagemChat = async function() {
    const input = document.getElementById('chat-input');
    const texto = input.value;
    if (!texto.trim()) return;
    
    input.value = ''; // Limpa a caixa na hora para ficar rápido
    input.focus();
    
    await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ texto: texto })
    });
    carregarMensagensChat(); // Atualiza a tela instantaneamente
};
