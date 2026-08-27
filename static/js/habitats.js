// ==========================================
// CONTROLADOR DE HABITATS (Aves, Suínos e Peixes)
// ==========================================

window.construir = function(tipo, custo) {
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    Swal.fire({
        title: `Construir ${tipo.toUpperCase()}`,
        text: `Esta obra vai custar R$ ${custo.toLocaleString('pt-BR')}. Confirma?`,
        icon: 'question', background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#2e7d32', confirmButtonText: 'Construir'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/fazenda/construir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ tipo: tipo, custo: custo, fazenda_id: fazendaId }) // 🔥 Blindagem
            })
            .then(r => r.json()).then(d => {
                if(d.sucesso) {
                    Swal.fire('Pronto!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            });
        }
    });
};

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

window.carregarAnimaisHabitat = function(habitat) {
    const divLista = document.getElementById(`lista-${habitat}`);
    if (!divLista) return;

    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado

    divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Buscando animais...</div>`;
    
    // 🔥 Puxa os animais SOMENTE da fazenda atual!
    fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`) 
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
                <div style="background:#2a2a2a; border:1px solid #444; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:14px; text-transform: capitalize;">${a.raca} (${a.fase})</div>
                        <div style="font-size:11px; color:#aaa;">ID: #${a.id} | Sexo: <b>${a.sexo}</b> | Peso: ${a.peso.toFixed(1)} Kg</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #ccc;">
                        <div><i class="fas fa-heart" style="color:${corSaude};"></i> Saúde: ${a.saude.toFixed(1)}%</div>
                        <div><i class="fas fa-drumstick-bite" style="color:${corFome};"></i> Fome: ${a.fome.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        });
        divLista.innerHTML = html;
    });
};

window.carregarPainelComedouroHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    
    fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`) // 🔥 Blindagem
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
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    Swal.fire({ title: 'Construindo depósito...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/habitat/construir_comedouro', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) // 🔥 Blindagem
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
    let tipoInsumoEscolhido = 'soja'; 
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    
    if (habitat === 'chiqueiro') {
        const { value: insumo } = await Swal.fire({
            title: 'Escolha a Ração',
            input: 'select',
            inputOptions: { 'soja': 'Soja (do Silo)', 'milho': 'Milho (do Silo)' },
            inputPlaceholder: 'Selecione o grão',
            showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar',
            background: '#2a2a2a', color: '#fff'
        });
        if (!insumo) return;
        tipoInsumoEscolhido = insumo;
    }

    let nomesInsumo = { 'represa': 'Ração de Peixe', 'chiqueiro': tipoInsumoEscolhido === 'milho' ? 'Milho (do Silo)' : 'Soja (do Silo)', 'galinheiro': 'Milho (do Silo)' };
    
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
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ habitat: habitat, quantidade: parseInt(qtd), tipo_grao: tipoInsumoEscolhido, fazenda_id: fazendaId }) // 🔥 Blindagem
        })
        .then(r => r.json()).then(d => {
            if (d.sucesso) {
                Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
            } else {
                Swal.fire('Atenção', d.erro, 'warning');
            }
        }).catch(err => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
    }
};

window.alimentarHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    Swal.fire({ title: 'Jogando ração...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/pecuaria/alimentar_habitat', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) // 🔥 Blindagem
    })
    .then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Alimentados!', d.msg, 'success');
            carregarAnimaisHabitat(habitat); 
            carregarPainelComedouroHabitat(habitat);
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    }).catch(err => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
};

window.abrirModalRepresaVenda = function() {
    abrirModalHabitatVenda('represa', 'Peixes');
};

window.atualizarTotalVendaHabitat = function() {
    const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
    const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
    const txtTotal = document.getElementById('txt-total-venda-habitat');
    
    if (!txtTotal) return;

    if (ids.length === 0) { txtTotal.innerText = "R$ 0,00"; return; }
    
    txtTotal.innerText = "Calculando...";
    const fazendaId = window.location.pathname.split('/').pop(); 
    
    fetch('/api/animal/estimar_frigorifico', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: ids, fazenda_id: fazendaId }) 
    })
    .then(r => r.json()).then(d => {
        if(d.sucesso) txtTotal.innerHTML = '<span style="color:#4caf50;">' + d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</span>';
        else txtTotal.innerText = "R$ 0,00";
    }).catch(() => { txtTotal.innerText = "Erro ao calcular"; });
};

window.toggleSelecionarTodosHabitat = function(masterCheckbox, habitat) {
    document.querySelectorAll(`.chk-${habitat}`).forEach(chk => { chk.checked = masterCheckbox.checked; });
    atualizarTotalVendaHabitat();
};

window.abrirModalHabitatVenda = async function(habitat, nomeTipo) {
    const fazendaId = window.location.pathname.split('/').pop(); // 🔥 GPS Adicionado
    const resposta = await fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`); // 🔥 Blindagem
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
                        <span style="font-size: 11px; color: #888;">ID: #${a.id} | Sexo: <b>${a.sexo}</b> | Peso: ${a.peso.toFixed(1)} Kg | Fome: ${a.fome.toFixed(1)}%</span>
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
                body: JSON.stringify({ animal_ids: result.value, fazenda_id: fazendaId }) // Já estava blindado aqui!
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
