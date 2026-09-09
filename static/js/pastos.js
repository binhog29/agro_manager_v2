// Função auxiliar para alternar entre Kg e Arrobas (@) COM SEU RENDIMENTO COMERCIAL
function formatarPeso(peso) {
    let p = parseFloat(peso) || 0;
    if (p >= 30.0) {
        // 🔥 VOLTOU O SEU PADRÃO: (30 kg vivos = 1 @)
        return (p / 30.0).toFixed(1) + ' @';
    } else {
        return p.toFixed(1) + ' kg';
    }
}

window.abrirGerenciamentoPasto = async function(loteId, tipoCapim, temCocho, temBebedouro, temCochoRacao, qtdSal, qtdRacao) {
    const response = await fetch(`/api/pecuaria/listar_pasto?pasto_id=${loteId}`);
    const data = await response.json();
    
    // Status visual da infraestrutura no topo
    let infraText = [];
    if(temCocho) infraText.push(`Sal (${Math.round(qtdSal)}/10)`);
    if(temCochoRacao) infraText.push(`Ração (${Math.round(qtdRacao)}/20)`);
    if(temBebedouro) infraText.push(`Água`);
    let infoInfra = infraText.length > 0 ? infraText.join(' | ') : 'Terra nua';
    
    // A lista antiga (agora fica oculta por padrão)
    let animaisHtml = data.animais.map(a => {
        const cAft = a.vacinado_aftosa ? '#2196f3' : '#444';
        const cBruc = a.vacinado_brucelose ? '#f44336' : '#444';
        const cMed = a.medicado ? '#9c27b0' : '#444';
        const cSup = a.suplementado ? '#4caf50' : '#444';

        // 🔥 NOVIDADE: A sua etiqueta visual da gravidez!
        let tagPrenha = '';
        if (a.sexo === 'F' && a.prenha) {
            tagPrenha = `<span style="background: #e91e63; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; margin-left: 6px; box-shadow: 0 0 5px rgba(233,30,99,0.5);"><i class="fas fa-heart"></i> PRENHA (${Math.round(a.dias_gestacao || 0)}d)</span>`;
        }
        
        return `
        <div style="background: #222; padding: 8px; margin-bottom: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid #555;">
            <div style="text-align: left;">
                <div style="font-weight: bold; font-size: 13px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase}) ${tagPrenha}</div>
                
                <!-- 🔥 AQUI FOI ADICIONADA A VARIÁVEL a.status_peso QUE VEM DO GADO.PY -->
                <div style="font-size: 10px; color: #888;">
                    ID: #${a.id} | Sexo: <b>${a.sexo}</b> | ${formatarPeso(a.peso)} <span style="margin-left: 5px; font-size: 11px;">${a.status_peso}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 4px;">
                <div style="width: 20px; height: 20px; background: ${cAft}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Aftosa">A</div>
                <div style="width: 20px; height: 20px; background: ${cBruc}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Brucelose">B</div>
                <div style="width: 20px; height: 20px; background: ${cMed}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Medicamento">M</div>
                <div style="width: 20px; height: 20px; background: ${cSup}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Suplemento">S</div>
            </div>
        </div>`;
    }).join('');

    Swal.fire({
        title: `Lote ${loteId}`,
        html: `
            <style>
                @keyframes caminhar {
                    0% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-3px) rotate(-3deg); }
                    50% { transform: translateY(0px) rotate(0deg); }
                    75% { transform: translateY(-3px) rotate(3deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .boi-andando { animation: caminhar 1.5s infinite linear; }
                .btn-painel { margin: 0 !important; font-size: 11px !important; padding: 10px 5px !important; font-weight: bold; }
            </style>

            <div style="text-align: left; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #ccc;">
                    <span>🌱 ${tipoCapim.toUpperCase()}</span>
                    <span>🛠️ ${infoInfra}</span>
                </div>
                
                <!-- 🔥 PASTO 2D - O PALCO PRINCIPAL 🔥 -->
                <div id="pasto-2d-container" style="width: 100%; height: 220px; background: radial-gradient(circle, #689f38 0%, #33691e 100%); border: 3px solid #4e342e; border-radius: 8px; position: relative; overflow: hidden; margin-bottom: 15px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
                </div>
                
                <!-- 🔥 PAINEL DE CONTROLE MODERNO (GRID) 🔥 -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                    <button class="swal2-styled btn-painel" style="background: #333; grid-column: span 2;" onclick="document.getElementById('lista-rebanho-oculta').style.display = document.getElementById('lista-rebanho-oculta').style.display === 'none' ? 'block' : 'none'">
                        <i class="fas fa-list"></i> Ver Relatório do Rebanho (${data.animais.length} cabeças) <i class="fas fa-chevron-down"></i>
                    </button>

                    ${temCocho ? `<button class="swal2-styled btn-painel" style="background: #ff9800;" onclick="reabastecerCochoPasto(${loteId}, 'sal')"><i class="fas fa-cube"></i> Pôr Sal</button>` : `<div style="opacity:0.3; text-align:center; font-size:11px; padding:10px; border: 1px dashed #555; border-radius:4px;">Sem Cocho Sal</div>`}
                    ${temCochoRacao ? `<button class="swal2-styled btn-painel" style="background: #8d6e63;" onclick="reabastecerCochoPasto(${loteId}, 'racao')"><i class="fas fa-bars"></i> Pôr Ração</button>` : `<div style="opacity:0.3; text-align:center; font-size:11px; padding:10px; border: 1px dashed #555; border-radius:4px;">Sem Cocho Ração</div>`}

                    <button class="swal2-styled btn-painel" style="background: #2e7d32;" onclick="abrirSeletorAnimais(${loteId}, 'curral_para_pasto')"><i class="fas fa-arrow-down"></i> Trazer Gado</button>
                    <button class="swal2-styled btn-painel" style="background: #1b5e20;" onclick="abrirSeletorAnimais(${loteId}, 'pasto_para_curral')"><i class="fas fa-arrow-up"></i> Levar Curral</button>

                    <button class="swal2-styled btn-painel" style="background: #0288d1; grid-column: span 2;" onclick="abrirLojaInfra(${loteId}, ${temCocho}, ${temBebedouro}, ${temCochoRacao})"><i class="fas fa-hammer"></i> Obras & Manutenção</button>
                    
                    <button class="swal2-styled btn-painel" style="background: #c62828; color: #fff; grid-column: span 2; opacity: 0.8;" onclick="reverterPasto(${loteId})">
                        <i class="fas fa-tractor"></i> Destruir Pasto
                    </button>
                </div>

                <!-- Lista Oculta -->
                <div id="lista-rebanho-oculta" style="display: none; max-height: 25vh; overflow-y: auto; border-top: 1px solid #444; padding-top: 10px;">
                    ${animaisHtml}
                </div>
            </div>
        `,
        background: '#1a1a1a', color: '#fff', width: '95%',
        showConfirmButton: false, showCloseButton: true, allowOutsideClick: false,
        didOpen: () => { iniciarAnimacaoPasto(data.animais, temCocho, temBebedouro, temCochoRacao); }
    });
};

// ==========================================
// 🐄 O MOTOR DO PASTO ANIMADO (COM GRAMA E IMAGENS)
// ==========================================
window.iniciarAnimacaoPasto = function(animais, temCocho, temBebedouro, temCochoRacao) {
    const container = document.getElementById('pasto-2d-container');
    if (!container) return;
    
    let infraHtml = '';

    // 🌿 1. GERADOR DE CAPIM ORGÂNICO
    // Cria 35 tufos de grama espalhados aleatoriamente pelo pasto
    for(let i = 0; i < 35; i++) {
        let posX = Math.random() * 95; // Posição horizontal
        let posY = Math.random() * 90; // Posição vertical
        let tamanho = 8 + (Math.random() * 10); // Tamanhos variados para dar realismo
        
        infraHtml += `
            <div style="position: absolute; left: ${posX}%; top: ${posY}%; font-size: ${tamanho}px; opacity: 0.25; z-index: 1; pointer-events: none; filter: sepia(1) hue-rotate(50deg) saturate(3);">
                🌱
            </div>
        `;
    }
    
    // 🚰 2. BEBEDOURO ESCAVADO
    if (temBebedouro) {
        infraHtml += `
            <div style="position: absolute; top: 15px; left: 15px; width: 75px; height: 45px; background: radial-gradient(ellipse, #0288d1 30%, #4e342e 95%); border-radius: 50%; border: 3px solid #3e2723; box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 2px 4px 6px rgba(0,0,0,0.5); z-index: 2;" title="Bebedouro Escavado"></div>
        `;
    }
    
    // 🏚️ 3. COCHO RÚSTICO DE RONDÔNIA
    if (temCocho || temCochoRacao) {
        let corComida = temCochoRacao ? '#cddc39' : '#fff'; // Amarelo (Ração) ou Branco (Sal)
        infraHtml += `
            <div style="position: absolute; bottom: 10px; right: 15px; width: 65px; height: 40px; z-index: 100;" title="Cocheira Rústica">
                <div style="position: absolute; bottom: 0; left: 2px; width: 60px; height: 12px; background: #5d4037; border: 1px solid #3e2723; border-radius: 2px;"></div>
                <div style="position: absolute; bottom: 3px; left: 5px; width: 54px; height: 8px; background: ${corComida}; border-radius: 2px;"></div>
                <div style="position: absolute; bottom: 12px; left: 8px; width: 4px; height: 18px; background: #3e2723;"></div>
                <div style="position: absolute; bottom: 12px; right: 8px; width: 4px; height: 18px; background: #3e2723;"></div>
                <div style="position: absolute; top: 0; left: -5px; width: 75px; height: 15px; background: #4e342e; transform: skewX(-15deg); border-bottom: 2px solid #27140f; box-shadow: 2px 3px 5px rgba(0,0,0,0.6);"></div>
            </div>
        `;
    }
    container.innerHTML = infraHtml;

    // 🐄 4. GADO ANIMADO
    animais.forEach((a, index) => {
        if (index >= 20) return; // Limite para não travar o celular

        let containerBoi = document.createElement('div');
        containerBoi.style.position = 'absolute';
        containerBoi.style.transition = 'left 4s linear, top 4s linear'; 
        containerBoi.style.cursor = 'pointer';
        containerBoi.title = 'Clique para ver dados';
        containerBoi.style.width = '45px';
        containerBoi.style.height = '45px';
        containerBoi.style.display = 'flex';
        containerBoi.style.alignItems = 'center';
        containerBoi.style.justifyContent = 'center';
        containerBoi.style.filter = 'drop-shadow(2px 5px 3px rgba(0,0,0,0.5))';

        let imgBoi = document.createElement('img');
        imgBoi.src = `/static/img/${a.raca.toLowerCase()}.png`;
        imgBoi.onerror = function() { this.src = '/static/img/nelore.png'; };
        imgBoi.style.width = '100%';
        imgBoi.style.pointerEvents = 'none'; 
        imgBoi.style.transition = 'transform 0.3s ease';

        containerBoi.appendChild(imgBoi);
        container.appendChild(containerBoi);
        
        let posX = 5 + Math.random() * 80; 
        let posY = 5 + Math.random() * 70;  
        containerBoi.style.left = posX + '%';
        containerBoi.style.top = posY + '%';
        containerBoi.style.zIndex = Math.round(posY) + 10; // +10 para ficar sempre acima da grama

        containerBoi.onclick = () => {
            Swal.fire({
                title: `${a.raca.toUpperCase()} #${a.id}`,
                html: `Peso: <b>${formatarPeso(a.peso)}</b> <br> Saúde: <b>${Math.round(a.saude)}%</b> | Fome: <b>${Math.round(a.fome || 0)}%</b>`,
                toast: true, position: 'top', showConfirmButton: false, timer: 3500, background: '#222', color: '#fff'
            });
        };

        setInterval(() => {
            let novaPosX = 5 + Math.random() * 80;
            let novaPosY = 5 + Math.random() * 70;
            
            let direcaoFlip = novaPosX > posX ? 'scaleX(-1)' : 'scaleX(1)';
            
            imgBoi.style.transform = direcaoFlip;
            imgBoi.classList.add('boi-andando');
            
            posX = novaPosX;
            posY = novaPosY;
            containerBoi.style.left = posX + '%';
            containerBoi.style.top = posY + '%';
            containerBoi.style.zIndex = Math.round(posY) + 10;
            
            setTimeout(() => {
                imgBoi.classList.remove('boi-andando');
            }, 4000);

        }, 5000 + (Math.random() * 5000)); 
    });
};


window.reabastecerCochoPasto = async function(loteId, tipoInsumo) {
    const nomeInsumo = tipoInsumo === 'sal' ? 'Sal' : 'Ração';
    const capMax = tipoInsumo === 'sal' ? 10 : 20;

    const { value: quantidade } = await Swal.fire({
        title: `Abastecer ${nomeInsumo}`,
        input: 'number',
        inputLabel: `Quantos sacos deseja colocar? (Máx: ${capMax})`,
        inputAttributes: {
            min: 1,
            max: capMax,
            step: 1
        },
        showCancelButton: true,
        confirmButtonText: 'Despejar',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a',
        color: '#fff'
    });

    if (quantidade) {
        Swal.fire({ title: 'Reabastecendo cocho...', didOpen: () => Swal.showLoading() });
        
        fetch('/api/pasto/reabastecer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lote_id: loteId, tipo: tipoInsumo, quantidade: parseInt(quantidade) })
        })
        .then(r => r.json())
        .then(res => {
            if (res.sucesso) {
                Swal.fire('Sucesso!', res.msg, 'success').then(() => {
                    localStorage.setItem('aba_ativa_fazenda', 'pastos');
                    location.reload();
                });
            } else {
                Swal.fire('Atenção', res.erro, 'warning');
            }
        })
        .catch(e => {
            console.error(e);
            Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
        });
    }
};

// ==========================================
// MÓDULO DE INFRAESTRUTURA (ATUALIZAÇÃO SILENCIOSA)
// ==========================================

window.abrirLojaInfra = function(loteId, temCocho, temBebedouro, temCochoRacao) {
    let htmlBotoes = '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">';
    
    if (!temCocho) {
        htmlBotoes += `
            <button id="btn-infra-cocho" class="swal2-styled" style="background: #f57c00; width: 100%; font-weight: bold;" onclick="comprarInfraPasto(${loteId}, 'cocho', 400, 'btn-infra-cocho')">
                <img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-cube"></i> Construir Cocho Mineral (R$ 400)
            </button>`;
    } else {
        htmlBotoes += `
            <button class="swal2-styled" style="background: #4caf50; width: 100%; opacity: 0.7;" disabled>
                <img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-check"></i> Cocho Mineral Instalado
            </button>`;
    }

    if (!temCochoRacao) {
        htmlBotoes += `
            <button id="btn-infra-racao" class="swal2-styled" style="background: #8d6e63; width: 100%; font-weight: bold;" onclick="comprarInfraPasto(${loteId}, 'cocho_racao', 1200, 'btn-infra-racao')">
                <img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-bars"></i> Construir Linha de Ração (R$ 1200)
            </button>`;
    } else {
        htmlBotoes += `
            <button class="swal2-styled" style="background: #4caf50; width: 100%; opacity: 0.7;" disabled>
                <img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-check"></i> Linha de Ração Instalada
            </button>`;
    }

    if (!temBebedouro) {
        htmlBotoes += `
            <button id="btn-infra-agua" class="swal2-styled" style="background: #0288d1; width: 100%; font-weight: bold;" onclick="comprarInfraPasto(${loteId}, 'bebedouro', 700, 'btn-infra-agua')">
                <img src="/static/img/tanque.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-tint"></i> Escavar Tanque d'Água (R$ 700)
            </button>`;
    } else {
        htmlBotoes += `
            <button class="swal2-styled" style="background: #4caf50; width: 100%; opacity: 0.7;" disabled>
                <img src="/static/img/tanque.png" style="width: 20px; vertical-align: middle; margin-right: 8px;">
                <i class="fas fa-check"></i> Água Instalada
            </button>`;
    }
    
    htmlBotoes += '</div>';

    Swal.fire({
        title: 'Infraestrutura',
        text: 'O que deseja construir neste pasto?',
        html: htmlBotoes,
        background: '#2a2a2a',
        color: '#fff',
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Voltar'
    });
};

const AvisoSilencioso = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

window.comprarInfraPasto = function(loteId, tipoObra, custoObra, btnId) {
    const btn = document.getElementById(btnId);
    let textoOriginal = '';
    
    if (btn) {
        textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Construindo...';
    }
    
    fetch('/api/fazenda/infra_pasto', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, obra: tipoObra })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            if(btn) {
                btn.style.background = '#4caf50';
                btn.style.opacity = '0.8';
                btn.style.cursor = 'not-allowed';
                
                if(tipoObra === 'cocho') btn.innerHTML = '<img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Cocho Mineral Instalado';
                else if(tipoObra === 'cocho_racao') btn.innerHTML = '<img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Linha de Ração Instalada';
                else if(tipoObra === 'bebedouro') btn.innerHTML = '<img src="/static/img/tanque.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Água Instalada';
            }

            AvisoSilencioso.fire({ icon: 'success', title: d.msg });

            let carteiras = document.querySelectorAll('.carteira, #saldo-jogador, .saldo, div[class*="saldo"]'); 
            carteiras.forEach(el => {
                let textoAtual = el.innerText;
                let valorNumerico = parseFloat(textoAtual.replace(/[^\d,-]/g, '').replace(',', '.'));
                if(!isNaN(valorNumerico)) {
                    let novoValor = valorNumerico - custoObra;
                    el.innerText = 'R$ ' + novoValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
            });

            // 🔥 A MÁGICA AQUI: Atualiza a tela suavemente após 1.5s para pintar os ícones no fundo!
            setTimeout(() => {
                localStorage.setItem('aba_ativa_fazenda', 'pastos');
                location.reload();
            }, 1500);

        } else {
            if(btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = textoOriginal;
            }
            Swal.fire('Atenção', d.erro, 'warning');
        }
    }).catch(e => {
        if(btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = textoOriginal;
        }
        Swal.fire('Erro', 'Falha na comunicação.', 'error');
    });
};


// 🔥 AQUI ESTÁ A CORREÇÃO DE OURO: AGORA ELE ENVIA A FAZENDA PARA O PYTHON!
window.abrirSeletorAnimais = async function(pastoId, acao) {
    let endpointListagem = '';
    let tituloModal = '';
    let destinoFinal = 'pasto_' + pastoId;
    let btnConfirmarText = '';

    const fazendaId = window.location.pathname.split('/').pop();

    if (acao === 'curral_para_pasto') {
        endpointListagem = `/api/pecuaria/listar_curral?fazenda_id=${fazendaId}`;
        tituloModal = 'Trazer Gado do Curral';
        btnConfirmarText = 'Mover para o Pasto';
    } else {
        endpointListagem = `/api/pecuaria/listar_pasto?pasto_id=${pastoId}`;
        tituloModal = 'Devolver ao Curral';
        destinoFinal = 'curral';
        btnConfirmarText = 'Devolver ao Curral';
    }

    const resposta = await fetch(endpointListagem);
    const dados = await resposta.json();

    if (!dados.animais || dados.animais.length === 0) {
        Swal.fire('Aviso', 'Nenhum animal disponível para esta ação.', 'info');
        return;
    }

    let htmlCheckboxes = `
        <div style="text-align: left; max-height: 50vh; overflow-y: auto; padding: 5px;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <label style="cursor: pointer; font-size: 13px; color: #ff9800; font-weight: bold;">
                    <input type="checkbox" onclick="toggleSelecionarTodosManejo(this)" style="cursor: pointer; width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"> Selecionar Todos
                </label>
                <span style="font-size: 11px; color: #aaa;">Total: ${dados.animais.length} animais</span>
            </div>
    `;

    dados.animais.forEach(a => {
        let imgSrc = `/static/img/${a.raca.toLowerCase()}.png`;

        htmlCheckboxes += `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 10px; margin-bottom: 6px; border-radius: 6px; cursor: pointer; border: 1px solid #444;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="chk-animal-manejo" value="${a.id}" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; margin-right: 5px;">
                    <img src="${imgSrc}" width="40" style="border-radius: 6px; background: #333; padding: 2px;" onerror="this.src='/static/img/nelore.png'">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase})</div>
                        <span style="font-size: 11px; color: #888;">ID: #${a.id} | Sexo: <b>${a.sexo}</b></span>
                    </div>
                </div>
                <div style="color: #8bc34a; font-weight: bold; font-size: 14px;">${formatarPeso(a.peso)}</div>
            </label>
        `;
    });
    htmlCheckboxes += '</div>';

    Swal.fire({
        title: tituloModal,
        html: htmlCheckboxes,
        background: '#2a2a2a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#555',
        confirmButtonText: btnConfirmarText,
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-animal-manejo:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) {
                Swal.showValidationMessage('Selecione pelo menos um animal!');
            }
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            confirmarMovimentacaoLote(result.value, destinoFinal);
        }
    });
};

window.toggleSelecionarTodosManejo = function(masterCheckbox) {
    document.querySelectorAll('.chk-animal-manejo').forEach(chk => chk.checked = masterCheckbox.checked);
};

window.confirmarMovimentacaoLote = function(animalIds, destinoFinal) {
    Swal.fire({
        title: 'Movendo lote...',
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/animal/manejo_lote', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: animalIds, destino: destinoFinal })
    }).then(r => r.json()).then(result => { 
        if(result.sucesso) {
            Swal.fire('Sucesso!', result.msg, 'success').then(() => {
                localStorage.setItem('aba_ativa_fazenda', 'pastos');
                location.reload();
            });
        } else {
            Swal.fire('Atenção', result.erro, 'warning');
        }
    });
};

window.confirmarMovimentacao = function(animalId, destinoFinal) {
    Swal.fire({
        title: 'Movendo animal...',
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/animal/manejo_curral', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_id: animalId, destino: destinoFinal })
    }).then(r => r.json()).then(result => { 
        if(result.sucesso) {
            Swal.fire({
                title: 'Sucesso!',
                text: 'Animal movido.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                localStorage.setItem('aba_ativa_fazenda', 'pastos');
                location.reload();
            });
        } else {
            Swal.fire('Erro', result.erro, 'error');
        }
    });
};

window.reverterPasto = function(loteId) {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Isso destruirá o pasto e removerá a infraestrutura! Lembre-se de retirar o gado antes.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sim, destruir!'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Destruindo...', didOpen: () => Swal.showLoading() });

            fetch('/api/fazenda/reverter_pasto', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ pasto_id: loteId })
            })
            .then(r => r.json())
            .then(d => {
                if(d.sucesso) {
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => {
                        localStorage.setItem('aba_ativa_fazenda', 'pastos');
                        location.reload();
                    });
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            })
            .catch(erro => {
                console.error("Erro na requisição:", erro);
                Swal.fire('Erro no Servidor', 'Não foi possível completar a ação.', 'error');
            });
        }
    });
};
