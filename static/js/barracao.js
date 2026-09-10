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
                const corTanque = m.combustivel > 40 ? '#ff9800' : '#f44336';
                const corSaude = m.saude > 50 ? '#4caf50' : '#f44336';
                const imgSrc = `/static/img/${m.imagem}`;
                
                // 🔥 NOVA LÓGICA: Se a máquina está na prancha, bloqueia tudo. Se não, exibe os 4 botões!
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
                            <button onclick="abastecerMaquina(${m.id})" style="flex: 1; min-width: 45%; background: #ff9800; color: #000; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas fa-gas-pump"></i> Abastecer
                            </button>
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
                            <span style="font-size: 11px; color: #aaa;">Motor: ${m.potencia_hp} HP | IPVA: ${m.ipva ? '<span style="color:#4caf50">OK</span>' : 'Atrasado'}</span>
                        </div>
                    </div>
                    
                    <!-- Barra de Combustível -->
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-bottom: 3px;">
                            <span><i class="fas fa-gas-pump"></i> Tanque</span> <span>${m.combustivel}%</span>
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

// 🔥 FUNÇÃO NOVA: Abre o painel para embarcar a máquina no guincho
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
}
