// Função auxiliar para alternar entre Kg e Arrobas (@)
function formatarPeso(peso) {
    let p = parseFloat(peso) || 0;
    if (p >= 15.0) {
        // 1 Arroba (@) = 15 kg
        return (p / 15.0).toFixed(1) + ' @';
    } else {
        return p.toFixed(1) + ' kg';
    }
}

window.abrirGerenciamentoPasto = async function(loteId, tipoCapim, temCocho, temBebedouro, temCochoRacao, qtdSal, qtdRacao) {
    const response = await fetch(`/api/pecuaria/listar_pasto?pasto_id=${loteId}`);
    const data = await response.json();
    
    // Mostra o status realista da infraestrutura usando as variáveis novas separadas
    let infoCocho = '';
    if(temCocho) { infoCocho += `✅ Sal (${Math.round(qtdSal)}/10 un) | `; } else { infoCocho += `❌ Sal | `; }
    if(temCochoRacao) { infoCocho += `✅ Ração (${Math.round(qtdRacao)}/20 un) | `; } else { infoCocho += `❌ Ração | `; }
    infoCocho += temBebedouro ? `✅ Água` : `❌ Água`;
    
    // Lista de animais usando a formatação dinâmica de peso (Kg ou @)
    let animaisHtml = data.animais.map(a => {
        const cAft = a.vacinado_aftosa ? '#2196f3' : '#444';
        const cBruc = a.vacinado_brucelose ? '#f44336' : '#444';
        const cMed = a.medicado ? '#9c27b0' : '#444';
        const cSup = a.suplementado ? '#4caf50' : '#444';

        return `
        <div style="background: #222; padding: 8px; margin-bottom: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid #555;">
            <div style="text-align: left;">
                <div style="font-weight: bold; font-size: 13px; color: #fff;">${a.raca}</div>
                <div style="font-size: 10px; color: #888;">ID: #${a.id} | ${formatarPeso(a.peso)}</div>
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
            <div style="text-align: left; font-size: 14px;">
                <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #444;">
                    <p style="margin: 2px 0;">Capim: <b>${tipoCapim.toUpperCase()}</b></p>
                    <p style="margin: 2px 0;">Infra: ${infoCocho}</p>
                </div>
                
                ${temCocho ? `<button class="swal2-styled" style="background: #ff9800; width: 100%; margin: 0 0 6px 0; font-size: 12px; font-weight: bold;" onclick="reabastecerCochoPasto(${loteId}, 'sal')"><i class="fas fa-cube"></i> Reabastecer Cocho de Sal</button>` : ''}
                ${temCochoRacao ? `<button class="swal2-styled" style="background: #8d6e63; width: 100%; margin: 0 0 10px 0; font-size: 12px; font-weight: bold;" onclick="reabastecerCochoPasto(${loteId}, 'racao')"><i class="fas fa-bars"></i> Reabastecer Linha de Ração</button>` : ''}

                <div style="max-height: 35vh; overflow-y: auto; margin-bottom: 10px;">
                    ${animaisHtml}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="swal2-styled" style="background: #2e7d32; margin:0;" onclick="abrirSeletorAnimais(${loteId}, 'curral_para_pasto')">Trazer</button>
                <button class="swal2-styled" style="background: #2e7d32; margin:0;" onclick="abrirSeletorAnimais(${loteId}, 'pasto_para_curral')">Levar</button>
                <button class="swal2-styled" style="background: #0288d1; grid-column: span 2; margin:0;" onclick="abrirLojaInfra(${loteId}, ${temCocho}, ${temBebedouro}, ${temCochoRacao})">Manutenção</button>
                
                <button class="swal2-styled" style="background: #c62828; color: #fff; grid-column: span 2; margin:0; font-weight: bold;" onclick="reverterPasto(${loteId})">
                    <i class="fas fa-tractor"></i> Passar Trator (Destruir Pasto)
                </button>
            </div>
        `,
        background: '#1a1a1a',
        color: '#fff',
        width: '95%',
        confirmButtonText: 'Voltar',
        allowOutsideClick: false
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
    
    // Adicionamos IDs únicos aos botões e passamos o Custo + ID na função
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

// Configuração do "Toast" (Aviso Silencioso no canto da tela)
const AvisoSilencioso = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

window.comprarInfraPasto = function(loteId, tipoObra, custoObra, btnId) {
    const btn = document.getElementById(btnId);
    const textoOriginal = btn.innerHTML; // Salva o texto original do botão

    // 1. Muda o botão para modo "Carregando" para evitar cliques duplos
    if (btn) {
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
            
            // 2. Se deu certo, transforma o botão em "Concluído" (Verde)
            if(btn) {
                btn.style.background = '#4caf50';
                btn.style.opacity = '0.8';
                btn.style.cursor = 'not-allowed';
                
                if(tipoObra === 'cocho') btn.innerHTML = '<img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Cocho Mineral Instalado';
                else if(tipoObra === 'cocho_racao') btn.innerHTML = '<img src="/static/img/cocheira.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Linha de Ração Instalada';
                else if(tipoObra === 'bebedouro') btn.innerHTML = '<img src="/static/img/tanque.png" style="width: 20px; vertical-align: middle; margin-right: 8px;"><i class="fas fa-check"></i> Água Instalada';
            }

            // 3. Dispara o aviso silencioso no canto da tela!
            AvisoSilencioso.fire({ icon: 'success', title: d.msg });

            // 4. A Mágica: Procura o dinheiro na tela e desconta o valor em tempo real
            let carteiras = document.querySelectorAll('.carteira, #saldo-jogador, .saldo, div[class*="saldo"]'); 
            carteiras.forEach(el => {
                let textoAtual = el.innerText;
                // Extrai apenas os números do HTML atual
                let valorNumerico = parseFloat(textoAtual.replace(/[^\d,-]/g, '').replace(',', '.'));
                if(!isNaN(valorNumerico)) {
                    let novoValor = valorNumerico - custoObra;
                    el.innerText = 'R$ ' + novoValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
            });

        } else {
            // Se falhou (sem dinheiro, etc), devolve o botão original e mostra o erro
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

window.abrirSeletorAnimais = async function(pastoId, acao) {
    let endpointListagem = '';
    let tituloModal = '';
    let destinoFinal = 'pasto_' + pastoId; 

    if (acao === 'curral_para_pasto') {
        endpointListagem = '/api/pecuaria/listar_curral';
        tituloModal = 'Trazer do Curral';
    } else {
        endpointListagem = `/api/pecuaria/listar_pasto?pasto_id=${pastoId}`;
        tituloModal = 'Devolver ao Curral';
        destinoFinal = 'curral';
    }
    
    const resposta = await fetch(endpointListagem);
    const dados = await resposta.json();
    
    if (!dados.animais || dados.animais.length === 0) {
        Swal.fire('Aviso', 'Nenhum animal disponível para esta ação.', 'info');
        return;
    }

    let todosIds = dados.animais.map(a => a.id);
    let htmlCartoes = '<div style="display: flex; flex-direction: column; gap: 10px; max-height: 60vh; overflow-y: auto; padding-right: 5px;">';
    
    if (dados.animais.length > 1) {
        htmlCartoes += `
            <button class="swal2-confirm swal2-styled" style="background-color: #f57c00; width: 100%; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="confirmarMovimentacaoLote([${todosIds.join(',')}], '${destinoFinal}')">
                <i class="fas fa-truck-loading"></i> Mover Todos (${dados.animais.length})
            </button>
            <hr style="border: 0; border-top: 1px solid #444; margin: 5px 0 10px 0;">
        `;
    }

    dados.animais.forEach(a => {
        let imgSrc = `/static/img/${a.raca.toLowerCase()}.png`;
        
        htmlCartoes += `
            <div onclick="confirmarMovimentacao(${a.id}, '${destinoFinal}')" 
                 style="background: #222; border: 1px solid #444; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.2s;">
                
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${imgSrc}" width="45" style="border-radius: 8px; background: #333; padding: 3px;" onerror="this.src='/static/img/nelore.png'">
                    <div style="text-align: left;">
                        <h4 style="margin: 0; color: #fff; font-size: 15px; text-transform: capitalize;">${a.raca} (${a.fase})</h4>
                        <span style="color: #aaa; font-size: 12px;">ID: #${a.id} | Sexo: ${a.sexo}</span>
                    </div>
                </div>
                <!-- Usando a formatação dinâmica de peso também no seletor -->
                <div style="color: #8bc34a; font-weight: bold; font-size: 16px;">${formatarPeso(a.peso)}</div>
            </div>
        `;
    });
    htmlCartoes += '</div>';

    Swal.fire({
        title: tituloModal,
        html: htmlCartoes,
        background: '#2a2a2a',
        color: '#fff',
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });
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

window.comprarInfraPasto = function(loteId, tipoObra) {
    Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() || true });
    
    fetch('/api/fazenda/infra_pasto', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, obra: tipoObra })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Sucesso!', d.msg, 'success').then(() => {
                localStorage.setItem('aba_ativa_fazenda', 'pastos');
                location.reload();
            });
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    }).catch(e => Swal.fire('Erro', 'Falha na comunicação.', 'error'));
};
