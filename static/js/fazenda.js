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
        const res = await fetch(`/api/rh/listar/${prop_id}`);
        const data = await res.json();
        
        if (!data.sucesso) {
            Swal.fire('Erro', data.erro, 'error');
            return;
        }

        const equipeAtual = data.equipe;

        const catalogoRH = [
            { id: 'peoes', nome: 'Peão', custo: 1000, salario: 25, icone: 'fa-shield-alt', benef: 'Protege Animais' },
            { id: 'tratoristas', nome: 'Tratorista', custo: 2500, salario: 45, icone: 'fa-tractor', benef: '+15% Colheita' },
            { id: 'capatazes', nome: 'Capataz', custo: 10000, salario: 150, icone: 'fa-dollar-sign', benef: '+10% Venda' },
            { id: 'veterinarios', nome: 'Veterinário', custo: 8000, salario: 120, icone: 'fa-notes-medical', benef: 'Reduz Doenças' },
            { id: 'agronomos', nome: 'Agrônomo', custo: 9000, salario: 130, icone: 'fa-seedling', benef: 'Safra Rápida' }
        ];

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
                <div style="max-height: 35vh; overflow-y: auto; padding-right: 5px;">
                    ${listaContratacaoHtml}
                </div>
            </div>
        `;
        
        Swal.fire({
            title: '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><img src="/static/img/rh.png" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.style.display=\'none\'"> Alojamento (RH)</div>',
            html: htmlConteudo,
            background: '#1e1e1e', color: '#fff',
            showConfirmButton: false, showCloseButton: true, width: '90%'
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
        showCancelButton: true, confirmButtonColor: '#2e7d32', confirmButtonText: 'Sim, Contratar'
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
                    Swal.fire('Contratado!', d.msg, 'success').then(() => { location.reload(); });
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

// ==========================================
// MÓDULO DE HABITATS E DEPÓSITOS DE RAÇÃO
// ==========================================

window.abrirModalHabitat = function(nomeHabitat) {
    const modal = document.getElementById(`modal-${nomeHabitat}`);
    if (modal) {
        modal.style.display = 'flex';
        carregarAnimaisHabitat(nomeHabitat);
        carregarPainelComedouroHabitat(nomeHabitat);
    } else {
        console.error(`Modal modal-${nomeHabitat} não encontrado!`);
    }
};

window.carregarPainelComedouroHabitat = function(habitat) {
    fetch(`/api/pecuaria/habitat/${habitat}`)
    .then(r => r.json())
    .then(d => {
        const painel = document.getElementById(`painel-comedouro-${habitat}`);
        if (!painel) return;

        if (d.tem_comedouro) {
            painel.innerHTML = `
                <div style="background: #1a1a1a; padding: 8px 10px; border-radius: 6px; border: 1px solid #444; text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Depósito de Ração: <b>${Math.round(d.qtd_racao)} / 50 un</b></div>
                    <button onclick="reabastecerComedouroHabitat('${habitat}')" style="width: 100%; background: #ff9800; color: #fff; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-cube"></i> Reabastecer Depósito
                    </button>
                </div>
            `;
        } else {
            let custo = habitat === 'represa' ? 800 : (habitat === 'chiqueiro' ? 1000 : 600);
            painel.innerHTML = `
                <button onclick="construirComedouroHabitat('${habitat}')" style="width: 100%; background: #f57c00; color: #fff; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; margin-bottom: 10px;">
                    <i class="fas fa-hammer"></i> Construir Depósito (R$ ${custo.toLocaleString('pt-BR')})
                </button>
            `;
        }
    });
};

window.construirComedouroHabitat = function(habitat) {
    Swal.fire({ title: 'Construindo depósito...', didOpen: () => Swal.showLoading() });
    fetch('/api/habitat/construir_comedouro', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat })
    })
    .then(r => r.json()).then(d => {
        if (d.sucesso) {
            Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    });
};

window.reabastecerComedouroHabitat = async function(habitat) {
    let tipoInsumoEscolhido = 'soja'; // Padrão para o chiqueiro
    
    // Se for o Chiqueiro, pergunta se quer usar Soja ou Milho
    if (habitat === 'chiqueiro') {
        const { value: insumo } = await Swal.fire({
            title: 'Escolha a Ração para o Chiqueiro',
            input: 'select',
            inputOptions: {
                'soja': 'Soja (do Silo)',
                'milho': 'Milho (do Silo)'
            },
            inputPlaceholder: 'Selecione o grão',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
            background: '#2a2a2a', color: '#fff'
        });
        if (!insumo) return;
        tipoInsumoEscolhido = insumo;
    }

    let nomesInsumo = { 
        'represa': 'Ração de Peixe', 
        'chiqueiro': tipoInsumoEscolhido === 'milho' ? 'Milho (do Silo)' : 'Soja (do Silo)', 
        'galinheiro': 'Milho (do Silo)' 
    };
    
    const { value: qtd } = await Swal.fire({
        title: `Abastecer com ${nomesInsumo[habitat]}`,
        input: 'number',
        inputLabel: 'Quantas unidades deseja colocar? (Máx: 50)',
        inputAttributes: { min: 1, max: 50, step: 1 },
        showCancelButton: true, confirmButtonText: 'Despejar', cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff'
    });

    if (qtd) {
        Swal.fire({ title: 'Abastecendo...', didOpen: () => Swal.showLoading() });
        
        fetch('/api/habitat/reabastecer', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                habitat: habitat, 
                quantidade: parseInt(qtd),
                tipo_grao: tipoInsumoEscolhido // Envia a escolha para o Python
            })
        })
        .then(async res => {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return res.json();
            } else {
                throw new Error("Erro interno no servidor.");
            }
        })
        .then(d => {
            if (d.sucesso) {
                Swal.fire('Sucesso!', d.msg, 'success').then(() => {
                    if (typeof carregarPainelComedouroHabitat === 'function') {
                        carregarPainelComedouroHabitat(habitat);
                    } else {
                        location.reload();
                    }
                });
            } else {
                Swal.fire('Atenção', d.erro, 'warning');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
        });
    }
};

window.alimentarHabitat = function(habitat) {
    Swal.fire({ title: 'Alimentando animais...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/pecuaria/alimentar_habitat', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat })
    })
    .then(async res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        } else {
            throw new Error("Erro interno no servidor.");
        }
    })
    .then(d => {
        if(d.sucesso) {
            Swal.fire('Alimentados!', d.msg, 'success');
            if (typeof carregarAnimaisHabitat === 'function') carregarAnimaisHabitat(habitat);
            if (typeof carregarPainelComedouroHabitat === 'function') carregarPainelComedouroHabitat(habitat);
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    });
};

window.carregarAnimaisHabitat = function(habitat) {
    const divLista = document.getElementById(`lista-${habitat}`);
    if (!divLista) return;

    divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Buscando animais...</div>`;
    
    fetch(`/api/pecuaria/habitat/${habitat}`)
    .then(r => r.json())
    .then(d => {
        if(!d.animais || d.animais.length === 0) {
            divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#f44336; font-weight: bold;">Nenhum animal neste local. Compre no mercado!</div>`;
            return;
        }
        
        let html = '';
        d.animais.forEach(a => {
            const corSaude = a.saude > 70 ? '#4caf50' : (a.saude > 30 ? '#ff9800' : '#f44336');
            const corFome = a.fome < 30 ? '#4caf50' : (a.fome < 70 ? '#ff9800' : '#f44336');
            
            html += `
                <div style="background:#2a2a2a; border:1px solid #444; border-radius:8px; padding:10px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:13px;">${a.raca} (${a.fase})</div>
                        <div style="font-size:11px; color:#aaa;">ID: #${a.id} | Peso: ${a.peso.toFixed(1)} Kg</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #ccc;">
                        <div><i class="fas fa-heart" style="color:${corSaude};"></i> Saúde: ${a.saude}%</div>
                        <div><i class="fas fa-drumstick-bite" style="color:${corFome};"></i> Fome: ${a.fome}%</div>
                    </div>
                </div>
            `;
        });
        divLista.innerHTML = html;
    });
};

// Funções específicas e genéricas de Venda para a Represa e Habitats
window.abrirModalRepresaVenda = function() {
    abrirModalHabitatVenda('represa', 'Peixes');
};

// ==========================================
// FUNÇÃO DE VENDA DE HABITATS COM CÁLCULO EM TEMPO REAL
// ==========================================

window.atualizarTotalVendaHabitat = function() {
    const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
    const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
    const txtTotal = document.getElementById('txt-total-venda-habitat');
    
    if (!txtTotal) return;

    if (ids.length === 0) {
        txtTotal.innerText = "R$ 0,00";
        return;
    }
    
    txtTotal.innerText = "Calculando...";
    const fazendaId = window.location.pathname.split('/').pop();
    
    fetch('/api/animal/estimar_frigorifico', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: ids, fazenda_id: fazendaId })
    })
    .then(r => r.json()).then(d => {
        if(d.sucesso) {
            txtTotal.innerHTML = '<span style="color:#4caf50;">' + d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</span>';
        } else {
            txtTotal.innerText = "R$ 0,00";
        }
    }).catch(() => { txtTotal.innerText = "Erro ao calcular"; });
};

window.toggleSelecionarTodosHabitat = function(masterCheckbox, habitat) {
    document.querySelectorAll(`.chk-${habitat}`).forEach(chk => {
        chk.checked = masterCheckbox.checked;
    });
    atualizarTotalVendaHabitat();
};

window.abrirModalHabitatVenda = async function(habitat, nomeTipo) {
    const resposta = await fetch(`/api/pecuaria/habitat/${habitat}`);
    const dados = await resposta.json();

    if (!dados.animais || dados.animais.length === 0) {
        Swal.fire('Aviso', `Não há animais neste ${habitat} para comercializar.`, 'info');
        return;
    }

    let htmlCheckboxes = `
        <div style="text-align: left; max-height: 40vh; overflow-y: auto; padding: 5px;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <label style="cursor: pointer; font-size: 13px; color: #4caf50; font-weight: bold;">
                    <input type="checkbox" id="selecionar-todos-${habitat}" onclick="toggleSelecionarTodosHabitat(this, '${habitat}')"> Selecionar Todos
                </label>
                <span style="font-size: 11px; color: #aaa;">Total: ${dados.animais.length} ${nomeTipo}</span>
            </div>
    `;

    dados.animais.forEach(a => {
        htmlCheckboxes += `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 10px; margin-bottom: 6px; border-radius: 6px; cursor: pointer; border: 1px solid #444;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="chk-habitat-item chk-${habitat}" value="${a.id}" onchange="atualizarTotalVendaHabitat()" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; margin-right: 5px;">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase})</div>
                        <span style="font-size: 11px; color: #888;">ID: #${a.id} | Peso: ${a.peso} Kg | Fome: ${a.fome}%</span>
                    </div>
                </div>
            </label>
        `;
    });
    htmlCheckboxes += `</div>`;

    htmlCheckboxes += `
        <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:15px; width:100%; text-align:center;">
            <div style="font-size:14px; color:#aaa;">Valor Estimado da Venda</div>
            <div style="font-size:22px; font-weight:bold; color:#4caf50;" id="txt-total-venda-habitat">R$ 0,00</div>
        </div>
    `;

    Swal.fire({
        title: `Comercializar ${nomeTipo}`,
        html: htmlCheckboxes,
        background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonText: 'Vender Lote', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) Swal.showValidationMessage('Selecione pelo menos um animal!');
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const fazendaId = window.location.pathname.split('/').pop();
            
            Swal.fire({ title: 'Processando venda...', didOpen: () => { Swal.showLoading(); } });
            
            fetch('/api/animal/vender_lote_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_ids: result.value, fazenda_id: fazendaId })
            })
            .then(r => r.json()).then(d => {
                if(d.sucesso) {
                    Swal.fire('Vendido! 💰', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            });
        }
    });
};