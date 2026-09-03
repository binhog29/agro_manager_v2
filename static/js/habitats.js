// ==========================================
// CONTROLADOR DE HABITATS (Aves, Suínos e Peixes)
// ==========================================

window.construir = function(tipo, custo) {
    const fazendaId = window.location.pathname.split('/').pop(); 
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
                body: JSON.stringify({ tipo: tipo, custo: custo, fazenda_id: fazendaId }) 
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Pronto!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Erro', d.erro, 'error');
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
    }
};

window.carregarAnimaisHabitat = function(habitat) {
    const divLista = document.getElementById(`lista-${habitat}`);
    if (!divLista) return;
    const fazendaId = window.location.pathname.split('/').pop(); 
    divLista.innerHTML = `<div style="text-align:center; padding: 20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Buscando animais...</div>`;
    
    fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`) 
    .then(r => r.json())
    .then(d => {
        let corLotacao = d.qtd_atual >= d.capacidade ? '#f44336' : '#4caf50';
        let custoExpansao = habitat === 'chiqueiro' ? 25000 : 8000;
        
        let htmlCabecalho = `
            <div style="padding: 10px; color:#aaa; font-size:13px; margin-bottom:10px; background:#222; border-radius:6px; border:1px solid #444; display: flex; justify-content: space-between; align-items: center;">
                <div>Capacidade: <b style="color:${corLotacao}; font-size: 15px;">${d.qtd_atual} / ${d.capacidade}</b></div>
                <button onclick="expandirHabitat('${habitat}', ${custoExpansao})" style="background: #1565c0; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-plus"></i> Expandir (R$ ${custoExpansao})</button>
            </div>
        `;

        if(!d.animais || d.animais.length === 0) {
            divLista.innerHTML = htmlCabecalho + `<div style="text-align:center; padding: 20px; color:#f44336; font-weight: bold;">Nenhum animal neste local. Compre no mercado!</div>`;
            return;
        }
        
        let html = htmlCabecalho;
        d.animais.forEach(a => {
            const corSaude = a.saude > 70 ? '#4caf50' : (a.saude > 30 ? '#ff9800' : '#f44336');
            const corFome = a.fome < 30 ? '#4caf50' : (a.fome < 70 ? '#ff9800' : '#f44336');
            
            // 🔥 AJUSTE VISUAL: Tag menor, inquebrável (nowrap) e perfeitamente alinhada!
            let tagReproducao = '';
            if (a.prenha) {
                let estiloTag = "background:#e91e63; color:white; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:bold; white-space:nowrap; display:inline-block;";
                
                if (habitat === 'galinheiro') {
                    tagReproducao = `<span style="${estiloTag}"><i class="fas fa-egg"></i> CHOCANDO (${a.dias_prenhez || 0}d)</span>`;
                } else if (habitat === 'chiqueiro') {
                    tagReproducao = `<span style="${estiloTag}"><i class="fas fa-heart"></i> PRENHA (${a.dias_prenhez || 0}d)</span>`;
                }
            }
            
            html += `
                <div style="background:#2a2a2a; border:1px solid #444; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:14px; text-transform: capitalize; display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                            <span>${a.raca} (${a.fase})</span> ${tagReproducao}
                        </div>
                        <div style="font-size:11px; color:#aaa; margin-top:2px;">ID: #${a.id} | Sexo: <b>${a.sexo}</b> | Peso: ${a.peso.toFixed(1)} Kg</div>
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

window.expandirHabitat = function(habitat, custo) {
    const fazendaId = window.location.pathname.split('/').pop();
    const aumento = habitat === 'chiqueiro' ? 50 : 100;
    Swal.fire({
        title: `Ampliar ${habitat.toUpperCase()}`,
        text: `Aumentar a capacidade em +${aumento} vagas vai custar R$ ${custo.toLocaleString('pt-BR')}. Confirma?`,
        icon: 'question', background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#1565c0', confirmButtonText: 'Expandir'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Ampliando obras...', didOpen: () => Swal.showLoading() });
            fetch('/api/habitat/expandir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId })
            }).then(r => r.json()).then(d => {
                if (d.sucesso) Swal.fire('Pronto!', d.msg, 'success').then(() => carregarAnimaisHabitat(habitat));
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
};

window.carregarPainelComedouroHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`)
    .then(r => r.json())
    .then(d => {
        const painel = document.getElementById(`painel-comedouro-${habitat}`);
        if (!painel) return;

        if (d.tem_comedouro) {
            painel.innerHTML = `
                <div style="background: #1a1a1a; padding: 8px 10px; border-radius: 6px; border: 1px solid #444; text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Depósito de Ração: <b>${Math.round(d.qtd_racao)} / 200 un</b></div>
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
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Construindo depósito...', didOpen: () => Swal.showLoading() });
    fetch('/api/habitat/construir_comedouro', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) 
    }).then(r => r.json()).then(d => {
        if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.reabastecerComedouroHabitat = async function(habitat) {
    let tipoInsumoEscolhido = 'soja'; 
    const fazendaId = window.location.pathname.split('/').pop(); 
    
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
        inputLabel: 'Quantas unidades deseja colocar? (Máx: 200)',
        inputAttributes: { min: 1, max: 200, step: 1 },
        showCancelButton: true, confirmButtonText: 'Despejar', cancelButtonText: 'Cancelar', background: '#2a2a2a', color: '#fff'
    });

    if (qtd) {
        Swal.fire({ title: 'Abastecendo...', didOpen: () => Swal.showLoading() });
        fetch('/api/habitat/reabastecer', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ habitat: habitat, quantidade: parseInt(qtd), tipo_grao: tipoInsumoEscolhido, fazenda_id: fazendaId })
        }).then(r => r.json()).then(d => {
            if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
            else Swal.fire('Atenção', d.erro, 'warning');
        });
    }
};

window.alimentarHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    Swal.fire({ title: 'Jogando ração...', didOpen: () => Swal.showLoading() });
    fetch('/api/pecuaria/alimentar_habitat', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) 
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Alimentados!', d.msg, 'success');
            carregarAnimaisHabitat(habitat); 
            carregarPainelComedouroHabitat(habitat);
        } else Swal.fire('Atenção', d.erro, 'warning');
    });
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
    }).then(r => r.json()).then(d => {
        if(d.sucesso) txtTotal.innerHTML = '<span style="color:#4caf50;">' + d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</span>';
        else txtTotal.innerText = "R$ 0,00";
    });
};

window.toggleSelecionarTodosHabitat = function(masterCheckbox, habitat) {
    document.querySelectorAll(`.chk-${habitat}`).forEach(chk => { chk.checked = masterCheckbox.checked; });
    atualizarTotalVendaHabitat();
};

window.abrirModalHabitatVenda = async function(habitat, nomeTipo) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    const resposta = await fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`); 
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
        // 🔥 CORREÇÃO TELA DE VENDA: Usa a.prenha direto
        let tagReproducao = '';
        if (a.prenha) {
            if (habitat === 'galinheiro') tagReproducao = `<span style="background:#e91e63; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;"><i class="fas fa-egg"></i> CHOCANDO</span>`;
            else if (habitat === 'chiqueiro') tagReproducao = `<span style="background:#e91e63; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;"><i class="fas fa-heart"></i> PRENHA</span>`;
        }

        htmlCheckboxes += `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 10px; margin-bottom: 6px; border-radius: 6px; cursor: pointer; border: 1px solid #444;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="chk-habitat-item chk-${habitat}" value="${a.id}" onchange="atualizarTotalVendaHabitat()" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; margin-right: 5px;">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase}) ${tagReproducao}</div>
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
        title: `Comercializar ${nomeTipo}`, html: htmlCheckboxes, background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonText: 'Vender Lote', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) Swal.showValidationMessage('Selecione pelo menos um animal!');
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando venda...', didOpen: () => { Swal.showLoading(); } });
            fetch('/api/animal/vender_lote_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_ids: result.value, fazenda_id: window.location.pathname.split('/').pop() })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido! 💰', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};
