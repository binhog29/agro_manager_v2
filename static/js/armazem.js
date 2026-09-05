window.prepararVendaInsumo = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} un em estoque.`,
        input: 'number',
        inputAttributes: { min: 1, max: qtdMax, step: 1 },
        inputValue: qtdMax,
        showCancelButton: true,
        confirmButtonText: 'Vender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d32f2f',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            Swal.fire({ title: 'Despachando...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Vendido!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha no servidor.', 'error'));
        }
    });
};

window.expandirArmazem = function() {
    Swal.fire({
        title: 'Construtora de Armazéns',
        html: `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('pequeno', 4000, 300)">Galpãozinho (+300 un) - R$ 4.000</button>
                <button class="swal2-styled" style="background: #f57c00; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('medio', 35000, 3500)">Armazém Médio (+3.500 un) - R$ 35.000</button>
                <button class="swal2-styled" style="background: #e65100; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('grande', 300000, 35000)">Armazém Grande (+35.000 un) - R$ 300.000</button>
                <button class="swal2-styled" style="background: #bf360c; color: #fff; width: 100%; margin: 0; font-weight: bold;" onclick="confirmarExpansaoArmazem('gigante', 2500000, 300000)">Complexo Gigante (+300.000 un) - R$ 2,5 Milhões</button>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar Obra',
        background: '#2a2a2a', color: '#fff'
    });
};

window.confirmarExpansaoArmazem = function(pacote, custo, aumento) {
    Swal.fire({
        title: 'Assinar Contrato?',
        text: `Deseja pagar R$ ${custo.toLocaleString('pt-BR')} para aumentar a capacidade do Armazém em +${aumento.toLocaleString('pt-BR')} un?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, construir!',
        cancelButtonText: 'Voltar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            const fazendaId = window.location.pathname.split('/').pop();
            Swal.fire({ title: 'Equipe em obra...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/expandir', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId, pacote: pacote })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            }).catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};

window.prepararTransferenciaEstoque = async function(itemChave, itemNome, qtdMax) {
    const fazendaId = window.location.pathname.split('/').pop();
    
    // 🔥 ARREDONDA PARA 2 CASAS DECIMAIS PARA LIMPAR O VISUAL
    const qtdFormatada = parseFloat(qtdMax || 0).toFixed(2);

    Swal.fire({ title: 'Carregando mapa logístico...', didOpen: () => Swal.showLoading() });

    try {
        const resFazendas = await fetch('/api/mapa_global');
        const todasTerras = await resFazendas.json();
        const minhasOutrasTerras = todasTerras.filter(t => t.e_minha && t.id != fazendaId);

        if (minhasOutrasTerras.length === 0) {
            Swal.fire('Aviso', 'Você precisa possuir pelo menos outra fazenda para fazer transferências!', 'info');
            return;
        }

        let options = minhasOutrasTerras.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

        let html = `
            <div style="text-align: left; background:#1a1a1a; padding: 15px; border-radius: 8px; border: 1px dashed #555;">
                <label style="color: #ccc; font-size: 13px;">Quantidade para enviar (Máx: ${qtdFormatada}):</label>
                <input type="number" id="transf-qtd" class="swal2-input" min="0.01" max="${qtdFormatada}" step="any" value="${qtdFormatada}" style="width: 100%; margin: 5px 0 15px 0; background: #111; color: #fff; border: 1px solid #444;" oninput="window.atualizarTotalFreteEstoque()">

                <label style="color: #ccc; font-size: 13px;"><i class="fas fa-map-marker-alt"></i> Fazenda de Destino:</label>
                <select id="transf-destino" class="swal2-select" style="width: 100%; display: block; margin: 5px 0 15px 0; font-size: 14px; padding: 8px; background: #111; color: #fff; border: 1px solid #444;">
                    ${options}
                </select>

                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; background: #222; padding: 10px; border-radius: 6px; border: 1px solid #444;">
                    <input type="checkbox" id="transf-caminhao" onchange="window.atualizarTotalFreteEstoque()" style="width: 18px; height: 18px;">
                    <span style="font-size: 13px; font-weight: bold; color: #ff9800;">Usar Frota Própria (Frete Grátis)</span>
                </label>
                <div style="font-size: 11px; color: #888; margin-top: 5px; margin-left: 28px;">O veículo sairá DESTA fazenda. Requer Caminhonete ou Caminhão abastecido.</div>

                <div style="margin-top: 15px; font-size: 16px; font-weight: bold; text-align: center; border-top: 1px solid #333; padding-top: 10px;">
                    Custo da Transportadora: <span id="transf-custo" style="color: #f44336;">R$ 0,00</span>
                </div>
            </div>
        `;

        Swal.fire({
            title: `🚚 Transferir ${itemNome}`,
            html: html,
            background: '#2a2a2a', color: '#fff',
            showCancelButton: true, confirmButtonText: 'Despachar Carga', cancelButtonText: 'Cancelar', confirmButtonColor: '#0288d1',
            didOpen: () => window.atualizarTotalFreteEstoque(),
            preConfirm: () => {
                const qtd = parseFloat(document.getElementById('transf-qtd').value);
                if (!qtd || qtd <= 0 || qtd > parseFloat(qtdMax)) {
                    Swal.showValidationMessage('Quantidade inválida!');
                    return false;
                }
                return {
                    origem_id: fazendaId,
                    destino_id: document.getElementById('transf-destino').value,
                    item: itemChave,
                    quantidade: qtd,
                    usa_caminhao: document.getElementById('transf-caminhao').checked
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Viajando pelas rodovias...', didOpen: () => Swal.showLoading() });
                fetch('/api/estoque/transferir', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(result.value)
                })
                .then(r => r.json()).then(d => {
                    if (d.sucesso) Swal.fire('Chegou! 🚚', d.msg, 'success').then(() => location.reload());
                    else Swal.fire('Atenção', d.erro, 'warning');
                }).catch(() => Swal.fire('Erro', 'Falha no servidor.', 'error'));
            }
        });
    } catch(e) {
        Swal.fire('Erro', 'Falha ao carregar mapa.', 'error');
    }
}

window.atualizarTotalFreteEstoque = function() {
    const qtd = parseFloat(document.getElementById('transf-qtd').value) || 0;
    const usaCaminhao = document.getElementById('transf-caminhao').checked;
    const txtCusto = document.getElementById('transf-custo');

    if (usaCaminhao) {
        txtCusto.innerText = "Grátis (Frota Própria)";
        txtCusto.style.color = "#4caf50";
    } else {
        const custo = qtd * 0.25; // Taxa fixa terceirizada
        txtCusto.innerText = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        txtCusto.style.color = "#f44336";
    }
}
