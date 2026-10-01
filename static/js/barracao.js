window.abrirPainelBarracao = async function() {
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Abrindo portões...', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`/api/barracao/listar?fazenda_id=${fazendaId}`);
        const data = await res.json();

        if (!data.sucesso) {
            Swal.fire('Erro', 'Falha ao carregar o barracão.', 'error');
            return;
        }

        const limiteVagas = data.limite_vagas || 4;
        const qtdAtual = data.maquinas.length;
        const corVagas = qtdAtual >= limiteVagas ? '#f44336' : '#4caf50';

        let maquinasHtml = '';
        if (qtdAtual === 0) {
            maquinasHtml = `<div style="text-align:center; padding: 20px; color:#888; border: 1px dashed #444; border-radius: 8px;">Nenhuma máquina estacionada. Vá à Concessionária!</div>`;
        } else {
            data.maquinas.forEach(m => {
                const eDrone = m.modelo.includes('Drone');
                const eAviao = m.modelo.includes('Avião') || m.modelo.includes('Ipanema');
                
                // Cores e rótulos dinâmicos para Drone vs Avião vs Máquinas normais
                let corTanque = m.combustivel > 40 ? '#ff9800' : '#f44336';
                if (eDrone) corTanque = '#00bcd4';
                else if (eAviao) corTanque = '#e91e63';

                const corSaude = m.saude > 50 ? '#4caf50' : '#f44336';
                const imgSrc = `/static/img/${m.imagem}`;
                
                let infoSubtitulo = `Motor: ${m.potencia_hp} HP | IPVA: ${m.ipva ? '<span style="color:#4caf50">OK</span>' : 'Atrasado'}`;
                if (eDrone) {
                    infoSubtitulo = '<span style="color:#00bcd4; font-weight: bold;">Tecnologia Agrícola | 100% Elétrico</span>';
                } else if (eAviao) {
                    infoSubtitulo = '<span style="color:#e91e63; font-weight: bold;">Alta Performance | QAV-1</span>';
                }

                let rotuloEnergia = '<i class="fas fa-gas-pump"></i> Tanque';
                if (eDrone) {
                    rotuloEnergia = '<i class="fas fa-battery-three-quarters" style="color:#00bcd4;"></i> Bateria';
                } else if (eAviao) {
                    rotuloEnergia = '<i class="fas fa-plane-departure" style="color:#e91e63;"></i> QAV (Aviação)';
                }

                let botaoAbastecerRecarregar = '';
                if (eDrone) {
                    botaoAbastecerRecarregar = `
                        <button onclick="recarregarDrone(${m.id})" style="flex: 1; min-width: 45%; background: linear-gradient(135deg, #00bcd4, #00838f); color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-bolt"></i> Recarregar
                        </button>`;
                } else if (eAviao) {
                    botaoAbastecerRecarregar = `
                    <button onclick="executarVooAviaoBarracao(${m.id})" style="flex: 1; min-width: 45%; background: linear-gradient(135deg, #e91e63, #ad1457); color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    <i class="fas fa-paper-plane"></i> Voar & Pulverizar
                    </button>`;
                } else {
                    botaoAbastecerRecarregar = `
                        <button onclick="abastecerMaquina(${m.id})" style="flex: 1; min-width: 45%; background: #ff9800; color: #000; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-gas-pump"></i> Abastecer
                        </button>`;
                }

                let botoesAcaoHtml = '';
                if (m.em_viagem) {
                    botoesAcaoHtml = `
                        <div style="background: rgba(255, 152, 0, 0.2); border: 1px solid #ff9800; color: #ff9800; padding: 8px; text-align: center; border-radius: 6px; font-weight: bold; width: 100%; margin-top: 10px;">
                            <i class="fas fa-truck-loading"></i> EM TRÂNSITO (${m.horas_restantes}h)
                        </div>
                    `;
                } else {
                    botoesAcaoHtml = `
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
                            ${botaoAbastecerRecarregar}
                            <button onclick="repararMaquina(${m.id})" style="flex: 1; min-width: 45%; background: #0288d1; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas fa-tools"></i> Oficina
                            </button>
                            <button onclick="venderMaquina(${m.id}, '${m.modelo}')" style="flex: 1; min-width: 45%; background: #d32f2f; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas fa-dollar-sign"></i> Vender
                            </button>
                            <button onclick="prepararTransferenciaMaquina(${m.id}, '${m.modelo}', '${m.tipo}')" style="flex: 1; min-width: 45%; background: #9c27b0; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas fa-truck"></i> Transferir
                            </button>
                        </div>
                    `;
                }
                
                maquinasHtml += `
                <div style="background: #222; border: 1px solid #444; border-radius: 8px; padding: 12px; margin-bottom: 12px; text-align: left;">
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        <img src="${imgSrc}" style="width: 60px; height: 60px; object-fit: contain; background: #111; padding: 5px; border-radius: 8px; border: 1px solid #333;" onerror="this.src='/static/img/trator.png'">
                        <div>
                            <h4 style="margin: 0; color: #fff; font-size: 16px;">${m.modelo}</h4>
                            <span style="font-size: 11px; color: #aaa;">${infoSubtitulo}</span>
                        </div>
                    </div>
                    
                    <!-- Barra de Bateria / Combustível -->
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-bottom: 3px;">
                            <span>${rotuloEnergia}</span> <span>${m.combustivel}%</span>
                        </div>
                        <div style="width: 100%; background: #111; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #333;">
                            <div style="width: ${m.combustivel}%; background: ${corTanque}; height: 100%;"></div>
                        </div>
                    </div>

                    <!-- Barra de Saúde -->
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-bottom: 3px;">
                            <span><i class="fas fa-wrench"></i> Condição (Desgaste)</span> <span>${m.saude}%</span>
                        </div>
                        <div style="width: 100%; background: #111; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #333;">
                            <div style="width: ${m.saude}%; background: ${corSaude}; height: 100%;"></div>
                        </div>
                    </div>

                    ${botoesAcaoHtml}
                </div>`;
            });
        }

        Swal.fire({
            title: 'Barracão Agrícola',
            html: `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; text-align: left; margin-bottom: 10px;">
                    <span>Diesel: <b style="color: #ff9800;">${data.estoque_diesel} galões</b></span>
                    <span>Vagas: <b style="color: ${corVagas};">${qtdAtual} / ${limiteVagas}</b></span>
                </div>
                <div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">
                    ${maquinasHtml}
                </div>
                <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
                <div style="display: flex; gap: 8px;">
                    <button onclick="expandirBarracao()" style="flex: 1; background: #f57c00; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">
                        <i class="fas fa-plus"></i> Expandir
                    </button>
                </div>
            `,
            background: '#1a1a1a', color: '#fff',
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Fechar'
        });

    } catch (e) {
        Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    }
};

window.dispararAviaoAgricola = async function(eAluguel, tipoAluguel) {
    const fazendaId = window.location.pathname.split('/').pop();
    
    let tipoAplicacao = tipoAluguel || 'aluguel_aviao';

    // Se não veio pré-definido, pergunta ao jogador o que deseja aplicar
    if (!eAluguel && !tipoAluguel) {
        const { value: escolha } = await Swal.fire({
            title: 'Operação Aérea',
            text: 'O que deseja aplicar na lavoura com o Avião Agrícola?',
            input: 'select',
            inputOptions: {
                'defensivo': 'Defensivos Agrícolas (Pulverização)',
                'adubo': 'Adubação Aérea (Fertilizante)'
            },
            inputPlaceholder: 'Selecione o serviço',
            showCancelButton: true,
            confirmButtonText: 'Decolar 🛩️',
            cancelButtonText: 'Cancelar',
            background: '#1a1a24',
            color: '#fff',
            confirmButtonColor: '#e91e63'
        });

        if (!escolha) return;
        tipoAplicacao = (escolha === 'adubo') ? 'aluguel_aviao_adubo' : 'aluguel_aviao';
    }

    Swal.fire({ title: 'Avião em missão...', background: '#1a1a24', color: '#fff', didOpen: () => Swal.showLoading() });

    // Envia para a rota correta do backend
    fetch(`/api/cultivo/aviao_pulverizar_tudo/${fazendaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            modo_aluguel: Boolean(eAluguel), 
            tipo: tipoAplicacao
        })
    })
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            Swal.fire('Sucesso! 🛩️', d.msg, 'success').then(() => {
                if (typeof abrirPainelBarracao === 'function') {
                    abrirPainelBarracao();
                } else {
                    location.reload();
                }
            });
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    })
    .catch(() => {
        Swal.fire('Erro', 'Falha ao processar a solicitação aérea.', 'error');
    });
};

window.executarVooAviaoBarracao = async function(maquinaId) {
    const fazendaId = window.location.pathname.split('/').pop();

    // 1. Pergunta ao jogador qual o serviço desejado
    const { value: tipoAplicacao } = await Swal.fire({
        title: 'Operação Aérea',
        text: 'O que deseja aplicar na lavoura com o Avião Agrícola?',
        input: 'select',
        inputOptions: {
            'defensivo': 'Defensivos Agrícolas (Pulverização)',
            'adubo': 'Adubação Aérea (Fertilizante)'
        },
        inputPlaceholder: 'Selecione o serviço',
        showCancelButton: true,
        confirmButtonText: 'Decolar 🛩️',
        cancelButtonText: 'Cancelar',
        background: '#1a1a24',
        color: '#fff',
        confirmButtonColor: '#e91e63'
    });

    if (!tipoAplicacao) return;

    const tipoMapeado = (tipoAplicacao === 'adubo') ? 'aluguel_aviao_adubo' : 'aluguel_aviao';

    Swal.fire({
        title: 'A verificar condições do voo...',
        background: '#1a1a24',
        color: '#fff',
        didOpen: () => Swal.showLoading()
    });

    // 2. Faz o pedido ao backend
    fetch(`/api/cultivo/aviao_pulverizar_tudo/${fazendaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            modo_aluguel: false, 
            maquina_id: maquinaId,
            tipo: tipoMapeado
        })
    })
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            Swal.close(); // Fecha o loading
            
            // 3. Dispara a animação visual do arquivo aviao_animacao.js
            if (typeof window.executarAnimacaoAviao === 'function') {
                window.executarAnimacaoAviao(function() {
                    // Quando a animação termina, mostra o sucesso e recarrega
                    Swal.fire({
                        title: '🛩️ Sucesso Aéreo!',
                        text: d.msg,
                        icon: 'success',
                        background: '#1a1a24',
                        color: '#fff'
                    }).then(() => {
                        if (typeof abrirPainelBarracao === 'function') {
                            abrirPainelBarracao();
                        } else {
                            location.reload();
                        }
                    });
                });
            } else {
                // Fallback caso a animação não carregue por algum motivo
                Swal.fire('Sucesso! 🛩️', d.msg, 'success').then(() => location.reload());
            }
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    })
    .catch(() => {
        Swal.fire('Erro', 'Falha ao processar a solicitação aérea.', 'error');
    });
};

// Atalho para garantir compatibilidade com os botões existentes
window.dispararAviaoAgricola = window.executarVooAviaoBarracao;

window.recarregarDrone = function(maquinaId) {
    Swal.fire({ title: 'Carregando baterias na rede elétrica...', didOpen: () => Swal.showLoading() });

    fetch('/api/barracao/recarregar_drone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maquina_id: maquinaId })
    })
    .then(r => r.json())
    .then(d => {
        if(d.sucesso) {
            Swal.fire('⚡ Bateria Cheia!', d.msg, 'success').then(() => {
                if (typeof abrirPainelBarracao === 'function') abrirPainelBarracao();
            });
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    });
};

window.venderMaquina = function(id, modelo) {
    Swal.fire({
        title: 'Vender Máquina?',
        text: `Deseja vender o(a) ${modelo} para o ferro-velho? Eles pagam 50% do valor de tabela da concessionária.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Sim, Vender',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Vendendo...', didOpen: () => Swal.showLoading() });
            fetch('/api/barracao/vender', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ maquina_id: id })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido!', d.msg, 'success').then(() => abrirPainelBarracao());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};

window.expandirBarracao = function() {
    Swal.fire({
        title: 'Expandir Barracão',
        text: 'Aumentar a estrutura do barracão em +4 vagas custa R$ 150.000,00. Deseja realizar a obra?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, Construir',
        cancelButtonText: 'Voltar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            const fazendaId = window.location.pathname.split('/').pop();
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            fetch('/api/barracao/expandir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Obra Concluída!', d.msg, 'success').then(() => abrirPainelBarracao());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};

window.abastecerMaquina = function(maquinaId) {
    fetch('/api/barracao/abastecer', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ maquina_id: maquinaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) abrirPainelBarracao(); 
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.repararMaquina = function(maquinaId) {
    fetch('/api/barracao/manutencao', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ maquina_id: maquinaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Oficina', d.msg, 'success').then(() => abrirPainelBarracao());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.prepararTransferenciaMaquina = async function(maquinaId, modeloNome, tipoMaquina) {
    const fazendaId = window.location.pathname.split('/').pop();
    
    Swal.fire({ title: 'Procurando rotas...', didOpen: () => Swal.showLoading() });
    
    try {
        const resFazendas = await fetch('/api/mapa_global');
        const todasTerras = await resFazendas.json();
        const minhasOutrasTerras = todasTerras.filter(t => t.e_minha && t.id != fazendaId);

        if (minhasOutrasTerras.length === 0) {
            Swal.fire('Aviso', 'Você precisa de pelo menos uma outra fazenda para transferir máquinas!', 'info');
            return;
        }

        let options = minhasOutrasTerras.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

        let html = `
            <div style="text-align: center; margin-bottom: 15px;">
                <i class="fas fa-truck-loading" style="font-size: 30px; color: #ff9800; margin-bottom: 10px;"></i>
                <h4 style="color: #fff; margin: 0;">Transportar ${modeloNome}</h4>
        `;

        let isVeiculo = (tipoMaquina === 'Veiculo' || tipoMaquina === 'Caminhao');

        if (isVeiculo) {
            html += `<p style="color: #4caf50; font-size: 13px; font-weight:bold;">Este veículo vai rodando! (Gasta apenas o próprio diesel)</p></div>`;
        } else {
            html += `
                <p style="color: #aaa; font-size: 13px;">Máquinas pesadas exigem guincho prancha.</p>
            </div>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; background: #222; padding: 10px; border-radius: 6px; border: 1px solid #444; margin-bottom: 10px;">
                <input type="checkbox" id="check-prancha-propria" style="width: 18px; height: 18px;">
                <span style="font-size: 13px; font-weight: bold; color: #ff9800;">Usar meu Caminhão Prancha (Frete Grátis)</span>
            </label>
            `;
        }

        html += `
            <div style="text-align: left; background:#1a1a1a; padding: 15px; border-radius: 8px; border: 1px dashed #555;">
                <label style="color: #aaa; font-size: 12px;"><i class="fas fa-map-marker-alt"></i> Fazenda de Destino:</label>
                <select id="modal-destino-maq" class="swal2-select" style="width: 100%; display: block; margin: 5px 0 10px 0; font-size: 14px; padding: 10px; background: #111; color: #fff; border: 1px solid #444;">
                    ${options}
                </select>
        `;
        if (!isVeiculo) {
            html += `
                <div style="margin-top: 15px; font-size: 13px; color: #ccc;">
                    <b>Atenção:</b> O frete terceirizado custa R$ 500 na mesma cidade e R$ 1.500 para fora.
                </div>
            `;
        }
        html += `</div>`;

        Swal.fire({
            title: 'Logística de Máquinas',
            html: html,
            background: '#2a2a2a', color: '#fff',
            showCancelButton: true, confirmButtonText: isVeiculo ? 'Ir Dirigindo' : 'Embarcar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ff9800',
            preConfirm: () => {
                let usaPrancha = false;
                let checkEl = document.getElementById('check-prancha-propria');
                if (checkEl) usaPrancha = checkEl.checked;

                return {
                    maquina_id: maquinaId,
                    destino_id: document.getElementById('modal-destino-maq').value,
                    usa_prancha: usaPrancha
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Preparando a viagem...', didOpen: () => Swal.showLoading() });
                fetch('/api/barracao/transferir', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(result.value)
                })
                .then(r => r.json()).then(d => {
                    if(d.sucesso) Swal.fire('Na Estrada! 🚜', d.msg, 'success').then(()=> { location.reload(); });
                    else Swal.fire('Atenção', d.erro, 'warning');
                });
            }
        });
    } catch (e) {
        Swal.fire('Erro', 'Falha de comunicação.', 'error');
    }
};
