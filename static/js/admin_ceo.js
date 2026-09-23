window.godAction = function(url, data) {
    Swal.fire({ title: 'Aguarde...', didOpen: () => Swal.showLoading() });
    fetch(url, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    }).catch(e => {
        // 🔥 CORREÇÃO: Impede a tela de congelar caso o servidor trave
        console.error(e);
        Swal.fire('Erro Fatal', 'O servidor encontrou um problema interno e abortou a ação.', 'error');
    });
};


window.injetarSaldo = function(id, nome) {
    Swal.fire({
        title: `Saldo de ${nome}`, text: "Digite o valor (Use o sinal de - para remover)", input: 'number', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonText: 'Aplicar'
    }).then(r => { if(r.isConfirmed && r.value) godAction('/api/admin/injetar_saldo', {jogador_id: id, valor: parseFloat(r.value)}); });
};

window.injetarXP = function(id, nome) {
    Swal.fire({
        title: `XP de ${nome}`, text: "Digite o XP (Use o sinal de - para remover)", input: 'number', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonText: 'Aplicar'
    }).then(r => { if(r.isConfirmed && r.value) godAction('/api/admin/injetar_xp', {jogador_id: id, valor: parseInt(r.value)}); });
};

window.milagreVida = function(id, nome) {
    Swal.fire({ title: 'Milagre da Vida', text: `Zerar a fome e curar TODOS os animais de ${nome}?`, icon: 'question', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#e91e63', confirmButtonText: 'Fazer Milagre'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/milagre_vida', {jogador_id: id}); });
};

window.bencaoColheita = function(id, nome) {
    Swal.fire({ title: 'Bênção da Colheita', text: `Forçar crescimento de todas as lavouras de ${nome}?`, icon: 'question', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#8bc34a', confirmButtonText: 'Crescer Tudo'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/bencao_colheita', {jogador_id: id}); });
};

window.confiscarTerras = function(id, nome) {
    Swal.fire({ title: 'Confiscar Terras', text: `Tomar todas as fazendas de ${nome} e devolver ao Estado?`, icon: 'warning', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#ff9800', confirmButtonText: 'Confiscar'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/confiscar_terras', {jogador_id: id}); });
};

window.deletarConta = function(id, nome) {
    Swal.fire({ title: 'Banir Jogador', text: `Tem certeza que deseja deletar a conta de ${nome}?`, icon: 'error', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'DELETAR'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/deletar_conta', {jogador_id: id}); });
};

window.injetarInsumo = async function(id, nome) {
    const { value: formValues } = await Swal.fire({
        title: `Spawnar Insumos para ${nome}`,
        html: `
            <select id="swal-item" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:85%;">
                <option value="soja">Soja</option><option value="milho">Milho</option>
                <option value="racao">Ração</option><option value="sal">Sal Mineral</option>
                <option value="adubo">Adubo</option><option value="veneno">Veneno</option>
                <option value="vacina_aftosa">Vacina Aftosa</option><option value="combustivel">Combustível</option>
            </select>
            <input id="swal-qtd" type="number" class="swal2-input" placeholder="Quantidade" style="width:85%;">
        `,
        background: '#2a2a2a', color: '#fff', focusConfirm: false, showCancelButton: true, confirmButtonColor: '#9c27b0', confirmButtonText: 'Injetar',
        preConfirm: () => { return { item: document.getElementById('swal-item').value, qtd: document.getElementById('swal-qtd').value } }
    });

    if (formValues && formValues.qtd) {
        godAction('/api/admin/injetar_insumo', { jogador_id: id, item: formValues.item, quantidade: formValues.qtd });
    }
};

window.avancarTempoJogador = function(jogadorId, nomeJogador) {
    Swal.fire({
        title: 'Avançar Tempo',
        text: `Quantas horas você quer avançar na fazenda de ${nomeJogador}?`,
        input: 'number',
        inputAttributes: { min: 1, step: 1 },
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-forward"></i> Avançar',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff',
        confirmButtonColor: '#00acc1'
    }).then((result) => {
        if (result.isConfirmed) {
            let horas = parseInt(result.value);
            if (!horas || horas <= 0) return Swal.showValidationMessage('Digite um valor válido.');

            godAction('/api/admin/avancar_tempo_jogador', { jogador_id: jogadorId, horas: horas });
        }
    });
};

// ==========================================
// 🔥 NOVAS FUNÇÕES DE AUDITORIA E INTERVENÇÃO
// ==========================================

window.auditarFazendas = function(id, nome) {
    Swal.fire({ title: 'Analisando propriedades...', didOpen: () => Swal.showLoading() });
    
    // A auditoria usa o fetch manualmente porque ela não recarrega a página, ela exibe um relatório customizado.
    fetch('/api/admin/auditoria_fazendas', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ jogador_id: id })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire({ 
                title: `📋 Raio-X de ${nome}`, 
                html: `<div style="text-align:left; font-size:13px; max-height: 50vh; overflow-y: auto;">${d.msg}</div>`, 
                background: '#2a2a2a', color: '#fff',
                confirmButtonColor: '#4caf50'
            });
        } else {
            Swal.fire({title: 'Atenção', text: d.erro, icon: 'warning', background: '#2a2a2a', color: '#fff'});
        }
    }).catch(e => {
        console.error(e);
        Swal.fire({title: 'Erro Fatal', text: 'Falha ao gerar o relatório.', icon: 'error', background: '#2a2a2a', color: '#fff'});
    });
};

// ==========================================
// 🌾 CONFISCO CIRÚRGICO DE HECTARES EXTRAS (MULTIPLO)
// ==========================================
window.confiscarHectaresExtras = function(id, nome) {
    Swal.fire({ title: 'Buscando propriedades...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/admin/propriedades/' + id)
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            if (d.propriedades.length === 0) {
                Swal.fire('Aviso', `${nome} não possui nenhuma propriedade.`, 'info');
                return;
            }
            
            let optionsHtml = '';
            d.propriedades.forEach(p => {
                optionsHtml += `<option value="${p.id}">${p.nome} (${p.tipo})</option>`;
            });
            
            Swal.fire({
                title: `Selecionar Fazenda - ${nome}`,
                html: `
                    <p style="font-size: 13px; color: #aaa; text-align: left; margin-bottom: 10px;">Escolha qual fazenda deseja inspecionar:</p>
                    <select id="swal-prop-id" style="width: 100%; padding: 12px; background: #111; color: #fff; border: 1px solid #444; border-radius: 6px; font-family: 'Poppins', sans-serif;">
                        ${optionsHtml}
                    </select>
                `,
                background: '#1a1a24', color: '#fff',
                showCancelButton: true, confirmButtonText: 'Avançar para Hectares', confirmButtonColor: '#fbc02d',
                cancelButtonText: 'Cancelar'
            }).then((res) => {
                if (res.isConfirmed) {
                    const propId = document.getElementById('swal-prop-id').value;
                    carregarLotesParaConfisco(propId);
                }
            });
        } else {
            Swal.fire('Erro', 'Falha ao buscar propriedades.', 'error');
        }
    });
};

function carregarLotesParaConfisco(propId) {
    Swal.fire({ title: 'Buscando hectares...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/admin/lotes/' + propId)
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            if (d.lotes.length === 0) {
                Swal.fire('Aviso', 'Esta propriedade não possui hectares registrados.', 'info');
                return;
            }
            
            let checkboxesHtml = `
                <div style="text-align: left; margin-bottom: 10px;">
                    <label style="cursor: pointer; font-size: 13px; color: #4caf50; font-weight: bold;">
                        <input type="checkbox" id="check-todos-lotes" onchange="toggleTodosLotes(this)" style="margin-right: 6px; transform: scale(1.2);">
                        Selecionar / Desmarcar Todos
                    </label>
                </div>
                <div id="container-lotes-list" style="max-height: 220px; overflow-y: auto; text-align: left; background: #111; padding: 10px; border-radius: 6px; border: 1px solid #444;">
            `;
            
            d.lotes.forEach((l) => {
                checkboxesHtml += `
                    <label style="display: flex; align-items: center; font-size: 13px; color: #fff; margin-bottom: 8px; cursor: pointer;">
                        <input type="checkbox" class="chk-lote-item" value="${l.id}" style="margin-right: 10px; transform: scale(1.2);">
                        <span>Hectare #${l.id} <small style="color:#aaa;">(Cultivo: ${l.cultivo} | Status: ${l.status})</small></span>
                    </label>
                `;
            });
            
            checkboxesHtml += `</div>`;
            
            Swal.fire({
                title: `Selecionar Hectares`,
                html: `
                    <p style="font-size: 13px; color: #aaa; text-align: left; margin-bottom: 10px;">Marque os hectares que deseja confiscar e remover:</p>
                    ${checkboxesHtml}
                `,
                background: '#1a1a24', color: '#fff',
                showCancelButton: true, 
                confirmButtonText: 'Confiscar Selecionados', 
                confirmButtonColor: '#d32f2f',
                cancelButtonText: 'Voltar',
                preConfirm: () => {
                    const selecionados = Array.from(document.querySelectorAll('.chk-lote-item:checked')).map(cb => cb.value);
                    if (selecionados.length === 0) {
                        Swal.showValidationMessage('Selecione pelo menos 1 hectare!');
                        return false;
                    }
                    return selecionados;
                }
            }).then((res) => {
                if (res.isConfirmed && res.value) {
                    executarConfiscoLotes(res.value);
                }
            });
        } else {
            Swal.fire('Erro', 'Falha ao buscar hectares.', 'error');
        }
    });
}

// Função auxiliar para Marcar/Desmarcar Todos
window.toggleTodosLotes = function(masterCb) {
    const checkboxes = document.querySelectorAll('.chk-lote-item');
    checkboxes.forEach(cb => cb.checked = masterCb.checked);
};

function executarConfiscoLotes(loteIds) {
    Swal.fire({ title: 'Confiscando hectares...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/admin/confiscar_lotes_multiplos', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_ids: loteIds })
    })
    .then(r => r.json())
    .then(res => {
        if (res.sucesso) {
            Swal.fire('Sucesso!', res.msg, 'success').then(() => location.reload());
        } else {
            Swal.fire('Atenção', res.erro, 'warning');
        }
    });
}


window.limparLavourasAdmin = function(id, nome) {
    Swal.fire({
        title: 'Destruir Lavouras?',
        text: `Zerar todas as plantações ativas nas terras de ${nome}? (A terra voltará a ficar arada)`,
        icon: 'warning', background: '#2a2a2a', color: '#fff', 
        showCancelButton: true, confirmButtonColor: '#fbc02d', confirmButtonText: 'Destruir Lavouras'
    }).then((result) => {
        if (result.isConfirmed) {
            // Usa o seu helper nativo que recarrega a página no final
            godAction('/api/admin/limpar_lavouras', { jogador_id: id });
        }
    });
};

// ==========================================
// 🏴‍☠️ CONFISCO CIRÚRGICO DE PROPRIEDADES
// ==========================================
window.abrirModalConfiscarTerra = function(jogadorId, nomeJogador) {
    Swal.fire({ title: 'Buscando propriedades...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/admin/propriedades/' + jogadorId)
    .then(r => r.json())
    .then(d => {
        if (d.sucesso) {
            if (d.propriedades.length === 0) {
                Swal.fire('Aviso', `${nomeJogador} não possui nenhuma propriedade no momento.`, 'info');
                return;
            }
            
            let optionsHtml = '';
            d.propriedades.forEach(p => {
                optionsHtml += `<option value="${p.id}">${p.nome} (${p.tipo}) - R$ ${p.preco.toLocaleString('pt-BR')}</option>`;
            });
            
            Swal.fire({
                title: `Confiscar Fazenda de ${nomeJogador}`,
                html: `
                    <p style="font-size: 13px; color: #aaa; text-align: left; margin-bottom: 10px;">Selecione qual propriedade exata você deseja confiscar e devolver ao Estado:</p>
                    <select id="select-propriedade-alvo" style="width: 100%; padding: 12px; background: #111; color: #fff; border: 1px solid #444; border-radius: 6px; font-family: 'Poppins', sans-serif;">
                        ${optionsHtml}
                    </select>
                `,
                background: '#1a1a24', color: '#fff',
                showCancelButton: true, confirmButtonText: 'Confiscar Esta Fazenda', confirmButtonColor: '#e65100',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    const propIdAlvo = document.getElementById('select-propriedade-alvo').value;
                    executarConfiscoEspecifico(propIdAlvo);
                }
            });
        } else {
            Swal.fire('Erro', 'Não foi possível carregar as propriedades.', 'error');
        }
    });
};

window.executarConfiscoEspecifico = function(propId) {
    Swal.fire({ title: 'Executando desapropriação...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/admin/confiscar_fazenda_especifica', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ propriedade_id: propId })
    })
    .then(r => r.json())
    .then(res => {
        if (res.sucesso) {
            Swal.fire('Sucesso!', res.msg, 'success').then(() => location.reload());
        } else {
            Swal.fire('Atenção', res.erro, 'warning');
        }
    });
};

// ==========================================
// 🧹 RESETAR PROPRIEDADES SEM DONO (DO ESTADO)
// ==========================================
window.resetarPropriedadesOrfas = function() {
    Swal.fire({
        title: 'Resetar Terras do Estado?',
        text: 'Todas as propriedades que estão sem dono serão restauradas ao padrão inicial de fábrica (removendo melhorias, construções, hectares extras e estoques).',
        icon: 'warning',
        background: '#2a2a2a', color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#e65100',
        confirmButtonText: '<i class="fas fa-broom"></i> Sim, Resetar Terras',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            godAction('/api/admin/resetar_propriedades_orfas', {});
        }
    });
};

// ==========================================
// 🐄 GESTÃO DINÂMICA DE ANIMAIS (RECONHECE REBANHO ATUAL)
// ==========================================
window.gerenciarAnimais = function(id, nome) {
    Swal.fire({ title: 'Buscando rebanho do jogador...', didOpen: () => Swal.showLoading() });

    fetch('/api/admin/animais_jogador/' + id)
    .then(r => r.json())
    .then(data => {
        if (!data.sucesso) {
            Swal.fire('Aviso', data.erro, 'info');
            return;
        }

        const propriedades = data.propriedades;
        if (propriedades.length === 0) {
            Swal.fire('Aviso', `${nome} não possui propriedades.`, 'info');
            return;
        }

        // Guarda temporariamente para troca rápida ao selecionar outra propriedade no modal
        window._propriedadesAnimaisTemp = propriedades;

        let propOptions = '';
        propriedades.forEach(p => {
            propOptions += `<option value="${p.id}">${p.nome} (${p.tipo}) — Total: ${p.total_animais} cabeças</option>`;
        });

        function gerarHtmlResumo(propId) {
            const prop = window._propriedadesAnimaisTemp.find(p => p.id == propId);
            if (!prop || prop.resumo.length === 0) {
                return `<span style="color:#aaa; font-style:italic; font-size:12px;">Nenhum animal nesta propriedade.</span>`;
            }
            return prop.resumo.map(item => 
                `<div style="display:inline-block; background:#111; border:1px solid #444; border-radius:4px; padding:4px 8px; margin:2px; font-size:12px;">
                    <strong>${item.raca}</strong> (${item.sexo}): <span style="color:#4caf50; font-weight:bold;">${item.qtd}</span>
                 </div>`
            ).join('');
        }

        Swal.fire({
            title: `Rebanho de ${nome}`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #ccc;">
                    <label style="display:block; margin-bottom:4px; font-weight:bold;">Selecione a Propriedade:</label>
                    <select id="swal-prop-animal" onchange="atualizarResumoRebanho(this.value)" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:100%; margin:0 0 10px 0; padding:8px;">
                        ${propOptions}
                    </select>

                    <div style="background:#181824; border:1px solid #333; padding:10px; border-radius:6px; margin-bottom:12px;">
                        <label style="display:block; font-size:11px; color:#aaa; margin-bottom:6px; text-transform:uppercase; font-weight:bold;">📋 Rebanho Atual na Propriedade:</label>
                        <div id="container-resumo-rebanho">
                            ${gerarHtmlResumo(propriedades[0].id)}
                        </div>
                    </div>

                    <hr style="border:0; border-top:1px solid #444; margin:12px 0;">

                    <label style="display:block; margin-bottom:4px; font-weight:bold;">Ação Desejada:</label>
                    <select id="swal-acao" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:100%; margin:0 0 10px 0; padding:8px;">
                        <option value="adicionar">➕ Adicionar Animais</option>
                        <option value="remover">➖ Remover Animais</option>
                    </select>

                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:4px; font-weight:bold;">Raça:</label>
                            <select id="swal-raca" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:100%; margin:0 0 10px 0; padding:8px;">
                                <option value="Nelore">Nelore</option>
                                <option value="Angus">Angus</option>
                                <option value="Brahman">Brahman</option>
                                <option value="Girolando">Girolando</option>
                                <option value="Holandês">Holandês</option>
                                <option value="Senepol">Senepol</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:4px; font-weight:bold;">Sexo:</label>
                            <select id="swal-sexo" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:100%; margin:0 0 10px 0; padding:8px;">
                                <option value="Macho">Macho</option>
                                <option value="Fêmea">Fêmea</option>
                            </select>
                        </div>
                    </div>

                    <label style="display:block; margin-bottom:4px; font-weight:bold;">Quantidade:</label>
                    <input id="swal-qtd" type="number" min="1" class="swal2-input" placeholder="Digite a quantidade" style="background:#111; color:#fff; border:1px solid #444; width:100%; margin:0; padding:8px;">
                </div>
            `,
            background: '#1a1a24', color: '#fff', focusConfirm: false, showCancelButton: true, confirmButtonColor: '#e91e63', confirmButtonText: 'Executar Operação', cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const propId = document.getElementById('swal-prop-animal').value;
                const acao = document.getElementById('swal-acao').value;
                const raca = document.getElementById('swal-raca').value;
                const sexo = document.getElementById('swal-sexo').value;
                const qtd = parseInt(document.getElementById('swal-qtd').value);
                
                if (!qtd || qtd <= 0) {
                    Swal.showValidationMessage('Insira uma quantidade válida!');
                    return false;
                }
                return { propId, acao, raca, sexo, qtd };
            }
        }).then((res) => {
            if (res.isConfirmed && res.value) {
                godAction('/api/admin/gerenciar_animais', { 
                    jogador_id: id, 
                    propriedade_id: res.value.propId,
                    acao: res.value.acao, 
                    raca: res.value.raca, 
                    sexo: res.value.sexo, 
                    quantidade: res.value.qtd 
                });
            }
        });
    })
    .catch(e => {
        console.error(e);
        Swal.fire('Erro Fatal', 'Falha ao buscar informações do rebanho.', 'error');
    });
};

window.atualizarResumoRebanho = function(propId) {
    const container = document.getElementById('container-resumo-rebanho');
    if (!container || !window._propriedadesAnimaisTemp) return;

    const prop = window._propriedadesAnimaisTemp.find(p => p.id == propId);
    if (!prop || prop.resumo.length === 0) {
        container.innerHTML = `<span style="color:#aaa; font-style:italic; font-size:12px;">Nenhum animal nesta propriedade.</span>`;
        return;
    }

    container.innerHTML = prop.resumo.map(item => 
        `<div style="display:inline-block; background:#111; border:1px solid #444; border-radius:4px; padding:4px 8px; margin:2px; font-size:12px;">
            <strong>${item.raca}</strong> (${item.sexo}): <span style="color:#4caf50; font-weight:bold;">${item.qtd}</span>
         </div>`
    ).join('');
};
